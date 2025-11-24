import { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, STORAGE_KEYS } from '../utils/constants';
import supabase from '../lib/supabaseClient';
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
  // In-memory access token for current session (avoids localStorage)
  let inMemoryAccessToken = null;

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
    // We'll rely on server-side token management. If supabase session exists,
    // assume user will be authenticated for token retrieval via server endpoints.
    supabase.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsAuthenticated(false);
      setIsLoading(false);
    });
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
      
      if (state !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Limpiar el estado después de la verificación exitosa
      localStorage.removeItem('spotify_auth_state');
      
      // Obtener code verifier
      const codeVerifier = getCodeVerifier();
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // Include Supabase session token if available so server can map auth user
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseToken = sessionData?.session?.access_token;

      const resp = await fetch('/api/spotify/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {}),
        },
        body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || err.error || 'Error al intercambiar código en el servidor');
      }

      const data = await resp.json();
      // Store access token in memory for immediate session use (not persisted)
      inMemoryAccessToken = data.access_token || null;

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
    // Token refresh now handled server-side via /api/spotify/token
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseToken = sessionData?.session?.access_token;
      if (!supabaseToken) throw new Error('No Supabase session');

      const resp = await fetch('/api/spotify/token', {
        method: 'GET',
        headers: { Authorization: `Bearer ${supabaseToken}` },
      });
      if (!resp.ok) return false;
      const d = await resp.json();
      inMemoryAccessToken = d.access_token || null;
      return !!inMemoryAccessToken;
    } catch (err) {
      console.error('Error refreshing token via server:', err);
      logout();
      return false;
    }
  };

  /**
   * Cierra la sesión del usuario
   */
  const logout = () => {
    // Limpiar todos los datos de autenticación
    inMemoryAccessToken = null;
    clearCodeVerifier();
    localStorage.removeItem('spotify_auth_state');
    // Sign out from Supabase too (if used)
    supabase.auth.signOut().catch(() => {});
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  /**
   * Obtiene el token de acceso actual
   */
  const getAccessToken = () => {
    return inMemoryAccessToken;
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
