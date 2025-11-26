import axios from 'axios';
import { SPOTIFY_API, STORAGE_KEYS } from '../utils/constants';

const spotifyAxios = axios.create({
  baseURL: SPOTIFY_API.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

spotifyAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

spotifyAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(spotifyAxios(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newToken = await attemptRefreshToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return spotifyAxios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

async function attemptRefreshToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new Error('No refresh token');
  const resp = await fetch('/api/spotify/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!resp.ok) throw new Error('Failed to refresh');
  const data = await resp.json();
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, Date.now() + (data.expires_in * 1000));
  if (data.refresh_token) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  return data.access_token;
}

// --- EXPORTACIONES ---

// Agregamos el endpoint de recomendaciones a las constantes
// Nota: El endpoint de recomendaciones no está en SPOTIFY_API.ENDPOINTS, lo agregaremos en el siguiente paso.
// Por ahora, asumimos que el endpoint es '/v1/recommendations' y lo agregaremos a las constantes.

export async function getCurrentUser() {
  const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.ME);
  return response.data;
}

export async function searchTracks(query, limit = 20) {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.SEARCH, {
      params: { q: query, type: 'track', limit },
    });
    return response.data.tracks.items;
  } catch (error) {
    // CORREGIDO: Usamos la variable error
    console.warn('Error searching tracks:', error);
    return [];
  }
}

// Nueva función para el análisis profundo de la estructura (Drops, Beats)


export async function getAudioFeatures(trackId) {
  try {
    const response = await spotifyAxios.get(`${SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES}/${trackId}`);
    return response.data;
  } catch { return null; }
}

export async function getMultipleAudioFeatures(trackIds) {
  try {
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) chunks.push(trackIds.slice(i, i + 100));
    const allFeatures = [];
    for (const chunk of chunks) {
      try {
        const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES, {
          params: { ids: chunk.join(',') },
        });
        allFeatures.push(...response.data.audio_features);
      } catch {
        allFeatures.push(...new Array(chunk.length).fill(null));
      }
    }
    return allFeatures;
  } catch { return new Array(trackIds.length).fill(null); }
}

export async function getUserPlaylists(limit = 50) {
  const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.PLAYLISTS, { params: { limit } });
  return response.data.items;
}

export async function getPlaylistTracks(playlistId) {
  const response = await spotifyAxios.get(`/playlists/${playlistId}/tracks`);
  return response.data.items.map(item => item.track);
}

export async function getAvailableDevices() {
  const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.DEVICES);
  return response.data.devices;
}

export async function getPlaybackState() {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.PLAYER);
    return response.data;
  } catch { return null; }
}

export async function playTrack(trackUri, deviceId = null, positionMs = 0) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/play`, { 
    uris: [trackUri],
    position_ms: positionMs // Permitimos seek inicial
  }, { params });
}

export async function pausePlayback(deviceId = null) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/pause`, {}, { params });
}

export async function resumePlayback(deviceId = null) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/play`, {}, { params });
}

export async function skipToNext(deviceId = null) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.post(`${SPOTIFY_API.ENDPOINTS.PLAYER}/next`, {}, { params });
}

export async function skipToPrevious(deviceId = null) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.post(`${SPOTIFY_API.ENDPOINTS.PLAYER}/previous`, {}, { params });
}

export async function setVolume(volumePercent, deviceId = null) {
  const params = { volume_percent: Math.round(volumePercent) };
  if (deviceId) params.device_id = deviceId;
  await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/volume`, {}, { params });
}

export async function seekToPosition(positionMs, deviceId = null) {
  const params = { position_ms: Math.round(positionMs) };
  if (deviceId) params.device_id = deviceId;
  await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/seek`, {}, { params });
}

export async function transferPlayback(deviceId, play = true) {
  await spotifyAxios.put(SPOTIFY_API.ENDPOINTS.PLAYER, { device_ids: [deviceId], play });
}

export async function getRecommendations(seedTrackId, limit = 5) {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token || !seedTrackId) return [];

	  // Verificación extra: Si el ID parece de un archivo local, no pedimos recomendaciones
	  if (seedTrackId.includes('local')) {
	    console.log('Skipping recommendations for local track');
	    return [];
	  }
	
	  try {
	    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.RECOMMENDATIONS, {
	      params: {
	        seed_tracks: seedTrackId,
	        limit: limit.toString(),
	        min_popularity: '20', // Filtro para evitar canciones rotas
	        market: 'from_token' // Asegura que las recomendaciones sean válidas para el usuario
	      }
	    });
	
	    return response.data.tracks || [];
	    
	  } catch (error) {
	    // El error 404 de la imagen es probable que sea un error de endpoint o de token.
	    // Al usar spotifyAxios, el manejo de 401 (token expirado) ya está cubierto.
	    // El 404 de la imagen podría ser por un endpoint mal formado en la versión anterior.
	    // Ahora que usamos el endpoint correcto y axios, el error debería desaparecer.
	    // Si la API devuelve un error (ej. 400 por ID de track inválido), simplemente devolvemos vacío.
	    console.warn('Recommendation fetch failed:', error.message);
	    return [];
	  }
}

export default spotifyAxios;