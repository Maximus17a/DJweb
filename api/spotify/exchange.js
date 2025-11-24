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
    if (!code || !code_verifier) return res.status(400).json({ error: 'missing_code_or_verifier' });

    // Exchange code for tokens
    const tokenData = await spotifyToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI,
      code_verifier,
    });

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get Spotify profile
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
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

    const expiry = Date.now() + (expires_in * 1000);

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
