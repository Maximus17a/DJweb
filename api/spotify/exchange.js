import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} = process.env;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Basic environment validation to help debugging on deploys
const missingEnvs = [];
if (!SUPABASE_URL) missingEnvs.push('SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE) missingEnvs.push('SUPABASE_SERVICE_ROLE');
if (!SPOTIFY_CLIENT_ID) missingEnvs.push('SPOTIFY_CLIENT_ID');
if (!SPOTIFY_CLIENT_SECRET) missingEnvs.push('SPOTIFY_CLIENT_SECRET');
if (!SPOTIFY_REDIRECT_URI) missingEnvs.push('SPOTIFY_REDIRECT_URI');

if (missingEnvs.length) {
  // Log so Vercel/hosted logs show missing config
  console.error('Missing required environment variables:', missingEnvs.join(', '));
}

async function spotifyToken(params) {
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams(params).toString(),
  });
  return resp.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const supabaseToken = authHeader.split(' ')[1]; // optional, used to map to auth user
    const { code, code_verifier, redirect_uri } = req.body || {};

    let access_token = null;
    let refresh_token = null;
    let expires_in = null;

    if (!code) {
      // No manual code exchange: try to extract provider tokens from Supabase identity
      if (!supabaseToken) return res.status(400).json({ error: 'missing_code_or_supabase_token' });

      const { data: userRes, error: getUserErr } = await supabaseAdmin.auth.getUser(supabaseToken);
      if (getUserErr || !userRes?.user) return res.status(401).json({ error: 'invalid_supabase_token' });

      // Find Spotify identity among user's identities
      const identities = userRes.user.identities || [];
      const spotifyIdentity = identities.find(i => i.provider === 'spotify');
      if (!spotifyIdentity) return res.status(400).json({ error: 'no_spotify_identity' });

      const idData = spotifyIdentity.identity_data || {};
      access_token = idData.access_token || idData.accessToken || idData.token || null;
      refresh_token = idData.refresh_token || null;
      // expiry may not be provided; keep null if unknown
      if (!access_token) return res.status(400).json({ error: 'no_provider_tokens' });
    } else {
      // Legacy: Exchange code for tokens (PKCE/manual) — keep for backward compatibility
      if (!code_verifier) return res.status(400).json({ error: 'missing_code_or_verifier' });

      const tokenData = await spotifyToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI,
        code_verifier,
      });

      if (tokenData.error) {
        return res.status(400).json({ error: tokenData });
      }

      access_token = tokenData.access_token;
      refresh_token = tokenData.refresh_token;
      expires_in = tokenData.expires_in;
    }

    // Get Spotify profile using the access token (from provider identity or exchange)
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileRes.ok) {
      const pd = await profileRes.text().catch(() => '');
      console.error('Failed to fetch spotify profile', profileRes.status, pd);
      return res.status(400).json({ error: 'failed_fetch_spotify_profile' });
    }
    const profile = await profileRes.json();
    const spotify_id = profile.id;

    // Determine auth_uid from supabase token if provided
    let authUid = null;
    if (supabaseToken) {
      try {
        const { data: userRes } = await supabaseAdmin.auth.getUser(supabaseToken);
        authUid = userRes?.user?.id || null;
      } catch (e) {
        // ignore — we'll still upsert by spotify_id
      }
    }

    const expiry = expires_in ? Date.now() + (expires_in * 1000) : null;

    // Upsert into users table using service role
    const upsertObj = {
      spotify_id,
      email: profile.email || null,
      display_name: profile.display_name || null,
      profile_image: profile.images?.[0]?.url || null,
      country: profile.country || null,
      product: profile.product || null,
      refresh_token,
      access_token,
      token_expiry: expiry,
    };
    if (authUid) upsertObj.auth_uid = authUid;

    await supabaseAdmin.from('users').upsert(upsertObj, { onConflict: 'spotify_id' });

    return res.status(200).json({ access_token, expires_in, spotify_id, profile });
  } catch (err) {
    console.error('exchange handler error', err);
    console.error('exchange handler error', err);
    // In development return the error message to help debugging; hide in production
    const devMessage = process.env.NODE_ENV !== 'production' ? (err?.message || err) : 'server_error';
    return res.status(500).json({ error: devMessage });
  }
}
