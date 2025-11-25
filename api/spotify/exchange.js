import { Buffer } from 'node:buffer'; // <--- CRÍTICO: Arregla el Error 500
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization || '';
    const supabaseToken = authHeader.split(' ')[1];
    
    // Recibir tokens del frontend
    const { 
      code, 
      code_verifier, 
      redirect_uri, 
      spotify_access_token, 
      spotify_refresh_token 
    } = req.body || {};

    let access_token = null;
    let refresh_token = null;
    let expires_in = null;

    // CASO 1: Tokens enviados desde el cliente (Nuevo flujo)
    if (spotify_access_token) {
      console.log('Usando tokens enviados desde el cliente');
      access_token = spotify_access_token;
      refresh_token = spotify_refresh_token;
      expires_in = 3600; 
    } 
    // CASO 2: Código manual (PKCE - Legacy)
    else if (code) {
      const tokenData = await spotifyToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI,
        code_verifier,
      });

      if (tokenData.error) return res.status(400).json({ error: tokenData });
      
      access_token = tokenData.access_token;
      refresh_token = tokenData.refresh_token;
      expires_in = tokenData.expires_in;
    } 
    // CASO 3: Fallback (Suele fallar por seguridad de Supabase)
    else if (supabaseToken) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);
      if (!error && user) {
        const spotifyIdentity = user.identities?.find(i => i.provider === 'spotify');
        const idData = spotifyIdentity?.identity_data || {};
        access_token = idData.provider_access_token || idData.access_token;
        refresh_token = idData.provider_refresh_token || idData.refresh_token;
      }
    }

    if (!access_token) {
      return res.status(400).json({ error: 'Could not retrieve access token' });
    }

    // Validar token y obtener perfil
    const profileRes = await fetch('https://api.spotify.com/v1/me', { // URL Corregida
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!profileRes.ok) {
      return res.status(profileRes.status).json({ error: 'Failed to fetch Spotify profile' });
    }
    
    const profile = await profileRes.json();
    const spotify_id = profile.id;

    // Determinar ID de usuario
    let authUid = null;
    if (supabaseToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(supabaseToken);
      authUid = user?.id;
    }

    const expiry = expires_in ? Date.now() + (expires_in * 1000) : null;

    const updateData = {
      spotify_id,
      email: profile.email,
      display_name: profile.display_name,
      profile_image: profile.images?.[0]?.url,
      country: profile.country,
      product: profile.product,
      access_token,
      refresh_token, 
      token_expiry: expiry,
      updated_at: new Date().toISOString()
    };

    if (authUid) {
      updateData.id = authUid;
      updateData.auth_uid = authUid;
    }

    // Guardar en DB
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(updateData, { onConflict: authUid ? 'id' : 'spotify_id' });

    if (upsertError) console.error('DB Upsert Error:', upsertError);

    return res.status(200).json({ access_token, expires_in, spotify_id, profile });

  } catch (err) {
    console.error('Exchange handler crash:', err);
    return res.status(500).json({ error: err.message });
  }
}