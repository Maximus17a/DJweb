import axios from 'axios';
import { SPOTIFY_API, SPOTIFY_CONFIG, STORAGE_KEYS } from '../utils/constants';
import supabase from '../lib/supabaseClient';

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
  async (config) => {
    try {
      // Preferir token gestionado por el servidor via sesión de Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseToken = sessionData?.session?.access_token;
      
      if (supabaseToken) {
        try {
          const resp = await fetch('/api/spotify/token', {
            method: 'GET',
            headers: { Authorization: `Bearer ${supabaseToken}` },
          });
          if (resp.ok) {
            const d = await resp.json();
            if (d?.access_token) {
              config.headers = config.headers || {};
              config.headers.Authorization = `Bearer ${d.access_token}`;
              return config;
            }
          }
        } catch (e) {
          console.warn('[spotifyApi] Failed to get server token', e);
        }
      }

      // Fallback: intentar localStorage (compatibilidad hacia atrás)
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        || localStorage.getItem('spotify_access_token')
        || localStorage.getItem('access_token');

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[spotifyApi] request interceptor error', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Interceptor para manejar errores de autenticación
 */
spotifyAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Intentar refresh del lado del servidor primero
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const supabaseToken = sessionData?.session?.access_token;
        if (supabaseToken) {
          const resp = await fetch('/api/spotify/token', {
            method: 'GET',
            headers: { Authorization: `Bearer ${supabaseToken}` },
          });
          if (resp.ok) {
            const d = await resp.json();
            const originalRequest = error.config;
            if (d?.access_token && originalRequest) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${d.access_token}`;
              return spotifyAxios.request(originalRequest);
            }
          }
        }
      } catch (e) {
        console.warn('[spotifyApi] server refresh failed', e);
      }

      // === FIX: Cerrar sesión completamente para evitar recarga infinita ===
      console.warn('Sesión expirada o inválida. Cerrando sesión...');
      
      // 1. Limpiar localStorage
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      
      // 2. Cerrar sesión en Supabase explícitamente
      await supabase.auth.signOut();

      // 3. Redirigir al login
      window.location.href = '/login';
      
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * Intenta refrescar el token usando el refresh token almacenado en localStorage.
 */
async function attemptRefreshToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const resp = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await resp.json();
  const expiryTime = Date.now() + (data.expires_in * 1000);
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }

  return data.access_token;
}

// --- Exportaciones de funciones de la API ---

export async function getCurrentUser() {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.ME);
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
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
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      try {
        await attemptRefreshToken();
        const retryResp = await spotifyAxios.get(
          `${SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES}/${trackId}`
        );
        return retryResp.data;
      } catch {
        return null;
      }
    }
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