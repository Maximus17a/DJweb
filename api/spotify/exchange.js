import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'node:buffer'; // <--- IMPORTANTE: Soluciona error de Buffer

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} = process.env;

// Validación de seguridad
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('ERROR CRITICO: Faltan variables de entorno de Supabase en el servidor.');
}

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_SERVICE_ROLE || 'placeholder'
);

async function spotifyToken(params) {
  return await fetch('https://accounts.spotify.com/api/token', { // URL corregida
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
    const { code, code_verifier, redirect_uri } = req.body || {};

    let access_token = null;
    let refresh_token = null;
    let expires_in = null;

    if (code) {
      // Flujo 1: Intercambio manual de código
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
    } else if (supabaseToken) {
      // Flujo 2: Obtener tokens de la sesión de Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(supabaseToken);
      if (error || !user) return res.status(401).json({ error: 'Invalid Supabase token' });

      const spotifyIdentity = user.identities?.find(i => i.provider === 'spotify');
      if (!spotifyIdentity) return res.status(400).json({ error: 'No Spotify identity found' });

      const idData = spotifyIdentity.identity_data || {};
      access_token = idData.provider_access_token || idData.access_token;
      refresh_token = idData.provider_refresh_token || idData.refresh_token;
      expires_in = idData.expires_in; // Puede ser undefined
    } else {
      return res.status(400).json({ error: 'Missing code or auth token' });
    }

    if (!access_token) {
      return res.status(400).json({ error: 'Could not retrieve access token' });
    }

    // Obtener perfil de Spotify
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!profileRes.ok) {
      return res.status(profileRes.status).json({ error: 'Failed to fetch Spotify profile' });
    }
    
    const profile = await profileRes.json();
    const spotify_id = profile.id;

    // Determinar el ID de usuario (Auth UID) si existe
    let authUid = null;
    if (supabaseToken) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(supabaseToken);
      authUid = user?.id;
    }

    const expiry = expires_in ? Date.now() + (expires_in * 1000) : null;

    // Guardar en base de datos
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