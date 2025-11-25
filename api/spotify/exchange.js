import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} = process.env;

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE || 'placeholder'
);

async function spotifyToken(params) {
  return await fetch('https://accounts.spotify.com/api/token', { // URL Oficial de Spotify
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams(params).toString(),
  }).then(r => r.json());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, code_verifier, redirect_uri } = req.body;

    if (!code || !code_verifier) {
      return res.status(400).json({ error: 'Missing code or verifier' });
    }

    // 1. Canjear código en Spotify
    const tokenData = await spotifyToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI,
      code_verifier,
    });

    if (tokenData.error) {
      console.error('Spotify Token Error:', tokenData);
      return res.status(400).json({ error: tokenData });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // 2. Obtener perfil
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!profileRes.ok) {
      return res.status(profileRes.status).json({ error: 'Failed to fetch profile' });
    }
    
    const profile = await profileRes.json();
    const spotify_id = profile.id;
    const expiry = Date.now() + (expires_in * 1000);

    // 3. Guardar SIEMPRE en Base de Datos (Upsert por spotify_id)
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        spotify_id,
        email: profile.email,
        display_name: profile.display_name,
        profile_image: profile.images?.[0]?.url,
        country: profile.country,
        product: profile.product,
        access_token,
        refresh_token, // ¡Aquí se guarda!
        token_expiry: expiry,
        updated_at: new Date().toISOString()
      }, { onConflict: 'spotify_id' });

    if (upsertError) console.error('DB Save Error:', upsertError);

    // 4. Devolver TODO al frontend (incluido refresh_token)
    return res.status(200).json({ 
      access_token, 
      refresh_token, 
      expires_in, 
      spotify_id, 
      profile 
    });

  } catch (err) {
    console.error('Exchange crash:', err);
    return res.status(500).json({ error: err.message });
  }
}