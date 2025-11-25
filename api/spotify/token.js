import { Buffer } from 'node:buffer';

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} = process.env;

export default async function handler(req, res) {
  // Permitir POST para enviar el refresh_token en el body
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Pedir nuevo token a Spotify
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }).toString(),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    // Devolvemos el nuevo token al frontend
    return res.json({ 
      access_token: data.access_token,
      expires_in: data.expires_in,
      // A veces Spotify rota el refresh token, si viene uno nuevo, lo devolvemos
      refresh_token: data.refresh_token || undefined 
    });

  } catch (err) {
    console.error('Token refresh crash:', err);
    return res.status(500).json({ error: err.message });
  }
}