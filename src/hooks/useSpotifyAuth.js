import { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  saveCodeVerifier,
  getCodeVerifier,
  clearCodeVerifier 
} from '../utils/pkce';

/**
 * Hook personalizado para manejar la autenticación de Spotify con PKCE
 * @returns {Object} Estado y funciones de autenticación
 */
export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Verifica si hay un token válido al montar el componente
   */
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Verifica si el usuario está autenticado
   */
  const checkAuth = () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (token && expiry) {
      const now = Date.now();
      if (now < parseInt(expiry)) {
        setIsAuthenticated(true);
      } else {
        // Token expirado
        logout();
      }
    }

    setIsLoading(false);
  };

  /**
   * Inicia el flujo de autenticación con PKCE
   */
  const login = async () => {
    try {
      setError(null);
      
      // Generar code verifier y challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Guardar code verifier para usarlo después
      saveCodeVerifier(codeVerifier);
      
      // Generar state para prevenir CSRF
      const state = generateCodeVerifier(16);
      localStorage.setItem('spotify_auth_state', state);
      
      // Construir URL de autorización
      const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state: state,
        scope: SPOTIFY_CONFIG.SCOPES,
      });
      
      // Redirigir a Spotify para autorización
      window.location.href = `${SPOTIFY_CONFIG.AUTH_ENDPOINT}?${params.toString()}`;
    } catch (err) {
      console.error('Error during login:', err);
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.');
    }
  };

  /**
   * Maneja el callback de Spotify después de la autorización
   * @param {string} code - Código de autorización
   * @param {string} state - State para verificación CSRF
   */
  const handleCallback = async (code, state) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar state para prevenir CSRF
      const savedState = localStorage.getItem('spotify_auth_state');
      // Limpiar el estado inmediatamente después de la lectura para evitar reintentos fallidos
      localStorage.removeItem('spotify_auth_state'); 

      if (state !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }
      
      // Obtener code verifier
      const codeVerifier = getCodeVerifier();
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }
      
      // Intercambiar código por token
      const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_verifier: codeVerifier,
      });
      
      const response = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Error al obtener token');
      }
      
      const data = await response.json();
      
      // Guardar tokens
      const expiryTime = Date.now() + (data.expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }
      
      // Limpiar datos temporales
      clearCodeVerifier();
      localStorage.removeItem('spotify_auth_state');
      
      setIsAuthenticated(true);
      setIsLoading(false);
      
      return true;
    } catch (err) {
      console.error('Error handling callback:', err);
      setError(err.message || 'Error al procesar autenticación');
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Refresca el token de acceso usando el refresh token
   */
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const params = new URLSearchParams({
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      
      const response = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      if (!response.ok) {
        throw new Error('Error al refrescar token');
      }
      
      const data = await response.json();
      
      // Actualizar token
      const expiryTime = Date.now() + (data.expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }
      
      return true;
    } catch (err) {
      console.error('Error refreshing token:', err);
      logout();
      return false;
    }
  };

  /**
   * Cierra la sesión del usuario
   */
  const logout = () => {
    // Limpiar todos los datos de autenticación
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    clearCodeVerifier();
    localStorage.removeItem('spotify_auth_state');
    
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  /**
   * Obtiene el token de acceso actual
   */
  const getAccessToken = () => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    logout,
    handleCallback,
    refreshToken,
    getAccessToken,
  };
}
