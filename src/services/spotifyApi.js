import axios from 'axios';
import { SPOTIFY_API, STORAGE_KEYS } from '../utils/constants';

/**
 * Instancia de Axios configurada para la API de Spotify
 */
const spotifyAxios = axios.create({
  baseURL: SPOTIFY_API.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor para añadir el token de acceso a todas las peticiones
 */
spotifyAxios.interceptors.request.use(
  (config) => {
    // Leer token directamente de localStorage (gestionado por useSpotifyAuth)
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Variable para controlar si ya se está refrescando el token
 * para evitar múltiples llamadas simultáneas.
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Interceptor para manejar errores de autenticación (401)
 */
spotifyAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 (No autorizado) y no hemos reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya estamos refrescando, encolar la petición
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
        // Intentar refrescar el token usando nuestro backend
        const newToken = await attemptRefreshToken();
        
        // Procesar la cola de peticiones fallidas con el nuevo token
        processQueue(null, newToken);
        
        // Reintentar la petición original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return spotifyAxios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        
        // Si falla el refresh, cerrar sesión completamente
        console.warn('Sesión expirada. Cerrando sesión...');
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        localStorage.removeItem('spotify_user_profile');
        
        // Redirigir al login si no estamos ya allí
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Refresca el token llamando a nuestro backend propio
 */
async function attemptRefreshToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // Llamada a NUESTRO backend, no a Spotify directo
  const resp = await fetch('/api/spotify/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to refresh token');
  }

  const data = await resp.json();
  
  // Guardar nuevos tokens
  const expiryTime = Date.now() + (data.expires_in * 1000);
  
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  
  // A veces el refresh rota el token de refresco también
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }

  return data.access_token;
}

// --- Exportaciones de funciones de la API (Sin cambios en la lógica interna) ---

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
    console.warn('Error searching tracks:', error);
    return [];
  }
}

export async function getAudioFeatures(trackId) {
  try {
    const response = await spotifyAxios.get(
      `${SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES}/${trackId}`
    );
    return response.data;
  } catch {
    // Si falla, el interceptor ya habrá intentado el refresh. 
    // Si llega aquí es que falló definitivamente o es un 404.
    return null;
  }
}

export async function getMultipleAudioFeatures(trackIds) {
  try {
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }
    
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
  } catch {
    return new Array(trackIds.length).fill(null);
  }
}

export async function getUserPlaylists(limit = 50) {
  const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.PLAYLISTS, {
    params: { limit },
  });
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
  } catch (error) {
    if (error.response?.status === 204) return null;
    throw error;
  }
}

export async function playTrack(trackUri, deviceId = null) {
  const params = deviceId ? { device_id: deviceId } : {};
  await spotifyAxios.put(
    `${SPOTIFY_API.ENDPOINTS.PLAYER}/play`,
    { uris: [trackUri] },
    { params }
  );
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
  await spotifyAxios.put(SPOTIFY_API.ENDPOINTS.PLAYER, {
    device_ids: [deviceId],
    play,
  });
}

export default spotifyAxios;