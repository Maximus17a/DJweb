import { Buffer } from 'node:buffer'; // <--- CRÍTICO
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} = process.env;

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE || 'placeholder'
);

async function spotifyToken(params) {
  return await fetch('https://accounts.spotify.com/api/token', { // URL Corregida
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams(params).toString(),
  }).then(r => r.json());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const supabaseToken = authHeader.split(' ')[1];
    if (!supabaseToken) return res.status(401).json({ error: 'Missing token' });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(supabaseToken);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userRow || !userRow.refresh_token) {
      return res.status(404).json({ error: 'No refresh token found' });
    }

    // Si el token aun sirve, lo devolvemos
    if (userRow.token_expiry && userRow.token_expiry > Date.now() + 300000) {
      return res.json({ access_token: userRow.access_token });
    }

    // Refrescar token
    const data = await spotifyToken({
      grant_type: 'refresh_token',
      refresh_token: userRow.refresh_token,
    });

    if (data.error) {
      return res.status(400).json({ error: 'Failed to refresh token' });
    }

    const newExpiry = Date.now() + (data.expires_in * 1000);
    await supabaseAdmin.from('users').update({
      access_token: data.access_token,
      token_expiry: newExpiry,
      refresh_token: data.refresh_token || userRow.refresh_token
    }).eq('id', user.id);

    return res.json({ access_token: data.access_token });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}