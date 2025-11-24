import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} = process.env;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const supabaseToken = authHeader.split(' ')[1];
    if (!supabaseToken) return res.status(401).json({ error: 'missing_supabase_token' });

    // Validate supabase token to get auth uid
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (userErr || !userRes?.user) return res.status(401).json({ error: 'invalid_supabase_token' });

    const authUid = userRes.user.id;

    // Find user row with matching auth_uid OR fallback to spotify_id if provided in query
    const { data: userRow, error } = await supabaseAdmin
      .from('users')
      .select('id, spotify_id, refresh_token, access_token, token_expiry')
      .eq('auth_uid', authUid)
      .maybeSingle();

    if (error) return res.status(500).json({ error });
    if (!userRow) return res.status(404).json({ error: 'user_not_found' });

    const now = Date.now();
    if (userRow.token_expiry && userRow.token_expiry > now + 5000) {
      return res.json({ access_token: userRow.access_token, expires_at: userRow.token_expiry });
    }

    // Refresh using refresh_token
    const tokenData = await spotifyToken({
      grant_type: 'refresh_token',
      refresh_token: userRow.refresh_token,
    });

    if (tokenData.error) {
      console.error('spotify refresh error', tokenData);
      return res.status(400).json({ error: tokenData });
    }

    const newExpiry = Date.now() + (tokenData.expires_in * 1000);
    await supabaseAdmin.from('users').update({
      access_token: tokenData.access_token,
      token_expiry: newExpiry,
      refresh_token: tokenData.refresh_token || userRow.refresh_token,
    }).eq('id', userRow.id);

    return res.json({ access_token: tokenData.access_token, expires_in: tokenData.expires_in });
  } catch (err) {
    console.error('token handler error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
