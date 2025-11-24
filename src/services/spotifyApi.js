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
      // Prefer server-managed token via Supabase auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseToken = sessionData?.session?.access_token;
      if (supabaseToken) {
        // Request short-lived access token from serverless endpoint
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

      // Fallback: try localStorage variants to stay backward-compatible
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        || localStorage.getItem('spotify_access_token')
        || localStorage.getItem('access_token');

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('[spotifyApi] No access token found when calling', config.method?.toUpperCase(), config.url);
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
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Try server-side refresh first using Supabase session
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

      // Fallback: clear legacy localStorage tokens and redirect to login
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      window.location.href = '/';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * Intenta refrescar el token usando el refresh token almacenado en localStorage.
 * Actualiza localStorage con el nuevo access token si tiene éxito.
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

/**
 * Obtiene la información del usuario actual
 * @returns {Promise<Object>} Datos del usuario
 */
export async function getCurrentUser() {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.ME);
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}

/**
 * Busca tracks en Spotify
 * @param {string} query - Término de búsqueda
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<Array>} Array de tracks
 */
export async function searchTracks(query, limit = 20) {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.SEARCH, {
      params: {
        q: query,
        type: 'track',
        limit,
      },
    });
    return response.data.tracks.items;
  } catch (error) {
    console.warn('Error searching tracks:', error);
    // Return empty array so the UI can handle "no results" without breaking
    return [];
  }
}

/**
 * Obtiene las características de audio de un track
 * @param {string} trackId - ID del track
 * @returns {Promise<Object>} Audio features del track
 */
export async function getAudioFeatures(trackId) {
  try {
    const response = await spotifyAxios.get(
      `${SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES}/${trackId}`
    );
    return response.data;
  } catch (error) {
    // If we get a 401/403, try refreshing the token once and retry
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      try {
        await attemptRefreshToken();
        const retryResp = await spotifyAxios.get(
          `${SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES}/${trackId}`
        );
        return retryResp.data;
      } catch (retryErr) {
        if (retryErr.response && retryErr.response.status === 403) {
          console.warn('Audio features access forbidden for track', trackId);
          return null;
        }
        console.warn('Retry failed fetching audio features:', retryErr);
        return null;
      }
    }

    console.warn('Error fetching audio features:', error);
    return null;
  }
}

/**
 * Obtiene las características de audio de múltiples tracks
 * @param {Array<string>} trackIds - Array de IDs de tracks
 * @returns {Promise<Array>} Array de audio features
 */
export async function getMultipleAudioFeatures(trackIds) {
  try {
    // Spotify permite hasta 100 IDs por petición
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }
    
    const allFeatures = [];
    for (const chunk of chunks) {
      try {
        const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES, {
          params: {
            ids: chunk.join(','),
          },
        });
        allFeatures.push(...response.data.audio_features);
      } catch (err) {
        console.warn('Failed to fetch chunk of audio features', err);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          try {
            await attemptRefreshToken();
            const retryResp = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.AUDIO_FEATURES, {
              params: { ids: chunk.join(',') },
            });
            allFeatures.push(...retryResp.data.audio_features);
            continue;
          } catch (retryErr) {
            console.warn('Retry failed for chunk of audio features', retryErr);
          }
        }

        // Push nulls for this chunk to maintain index alignment
        allFeatures.push(...new Array(chunk.length).fill(null));
      }
    }
    
    return allFeatures;
  } catch (error) {
    console.warn('Error fetching multiple audio features:', error);
    // Return array of nulls instead of throwing to prevent app crash
    return new Array(trackIds.length).fill(null);
  }
}

/**
 * Obtiene las playlists del usuario
 * @param {number} limit - Número máximo de playlists
 * @returns {Promise<Array>} Array de playlists
 */
export async function getUserPlaylists(limit = 50) {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.PLAYLISTS, {
      params: { limit },
    });
    return response.data.items;
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    throw error;
  }
}

/**
 * Obtiene los tracks de una playlist
 * @param {string} playlistId - ID de la playlist
 * @returns {Promise<Array>} Array de tracks
 */
export async function getPlaylistTracks(playlistId) {
  try {
    const response = await spotifyAxios.get(`/playlists/${playlistId}/tracks`);
    return response.data.items.map(item => item.track);
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    throw error;
  }
}

/**
 * Obtiene los dispositivos disponibles del usuario
 * @returns {Promise<Array>} Array de dispositivos
 */
export async function getAvailableDevices() {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.DEVICES);
    return response.data.devices;
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw error;
  }
}

/**
 * Obtiene el estado actual de reproducción
 * @returns {Promise<Object>} Estado de reproducción
 */
export async function getPlaybackState() {
  try {
    const response = await spotifyAxios.get(SPOTIFY_API.ENDPOINTS.PLAYER);
    return response.data;
  } catch (error) {
    if (error.response?.status === 204) {
      // No hay reproducción activa
      return null;
    }
    console.error('Error fetching playback state:', error);
    throw error;
  }
}

/**
 * Reproduce un track
 * @param {string} trackUri - URI del track (spotify:track:xxx)
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function playTrack(trackUri, deviceId = null) {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyAxios.put(
      `${SPOTIFY_API.ENDPOINTS.PLAYER}/play`,
      {
        uris: [trackUri],
      },
      { params }
    );
  } catch (error) {
    console.error('Error playing track:', error);
    throw error;
  }
}

/**
 * Pausa la reproducción
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function pausePlayback(deviceId = null) {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/pause`, {}, { params });
  } catch (error) {
    console.error('Error pausing playback:', error);
    throw error;
  }
}

/**
 * Reanuda la reproducción
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function resumePlayback(deviceId = null) {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/play`, {}, { params });
  } catch (error) {
    console.error('Error resuming playback:', error);
    throw error;
  }
}

/**
 * Salta al siguiente track
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function skipToNext(deviceId = null) {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyAxios.post(`${SPOTIFY_API.ENDPOINTS.PLAYER}/next`, {}, { params });
  } catch (error) {
    console.error('Error skipping to next:', error);
    throw error;
  }
}

/**
 * Vuelve al track anterior
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function skipToPrevious(deviceId = null) {
  try {
    const params = deviceId ? { device_id: deviceId } : {};
    await spotifyAxios.post(`${SPOTIFY_API.ENDPOINTS.PLAYER}/previous`, {}, { params });
  } catch (error) {
    console.error('Error skipping to previous:', error);
    throw error;
  }
}

/**
 * Ajusta el volumen
 * @param {number} volumePercent - Volumen (0-100)
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function setVolume(volumePercent, deviceId = null) {
  try {
    const params = {
      volume_percent: Math.round(volumePercent),
    };
    if (deviceId) {
      params.device_id = deviceId;
    }
    await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/volume`, {}, { params });
  } catch (error) {
    console.error('Error setting volume:', error);
    throw error;
  }
}

/**
 * Busca la posición en el track actual
 * @param {number} positionMs - Posición en milisegundos
 * @param {string} deviceId - ID del dispositivo (opcional)
 * @returns {Promise<void>}
 */
export async function seekToPosition(positionMs, deviceId = null) {
  try {
    const params = {
      position_ms: Math.round(positionMs),
    };
    if (deviceId) {
      params.device_id = deviceId;
    }
    await spotifyAxios.put(`${SPOTIFY_API.ENDPOINTS.PLAYER}/seek`, {}, { params });
  } catch (error) {
    console.error('Error seeking to position:', error);
    throw error;
  }
}

/**
 * Transfiere la reproducción a un dispositivo específico
 * @param {string} deviceId - ID del dispositivo
 * @param {boolean} play - Si debe empezar a reproducir
 * @returns {Promise<void>}
 */
export async function transferPlayback(deviceId, play = true) {
  try {
    await spotifyAxios.put(SPOTIFY_API.ENDPOINTS.PLAYER, {
      device_ids: [deviceId],
      play,
    });
  } catch (error) {
    console.error('Error transferring playback:', error);
    throw error;
  }
}

export default spotifyAxios;
