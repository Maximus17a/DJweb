import { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG } from '../utils/constants';
import supabase from '../lib/supabaseClient';

/**
 * Hook personalizado para manejar la autenticación de Spotify usando Supabase OAuth
 * @returns {Object} Estado y funciones de autenticación
 */
export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  // In-memory access token for current session (avoids localStorage)
  let inMemoryAccessToken = null;
  let authListener = null;

  /**
   * Verifica si hay un token válido al montar el componente
   */
  useEffect(() => {
    checkAuth();
    // Listen for auth state changes (login/logout) and update state accordingly
    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session?.access_token) {
        inMemoryAccessToken = session?.access_token || null;
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        inMemoryAccessToken = null;
        setIsAuthenticated(false);
      }
    });

    return () => {
      // Supabase v2 returns { data: { subscription } }
      try {
        if (authListener?.data?.subscription?.unsubscribe) {
          authListener.data.subscription.unsubscribe();
        } else if (typeof authListener?.unsubscribe === 'function') {
          authListener.unsubscribe();
        }
      } catch (e) {
        // ignore unsubscribe errors
      }
    };
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
   * Inicia el flujo de autenticación usando Supabase OAuth
   */
  const login = async () => {
    try {
      setError(null);
      // Use Supabase OAuth provider for Spotify.
      // We explicitly set redirectTo to ensure it returns to the current domain (localhost or production)
      const options = {
        redirectTo: SPOTIFY_CONFIG.REDIRECT_URI,
        scopes: SPOTIFY_CONFIG.SCOPES
      };

      await supabase.auth.signInWithOAuth({ provider: 'spotify', options });
    } catch (err) {
      console.error('Error during login (supabase oauth):', err);
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.');
    }
  };

  /**
   * Maneja el callback de Spotify después de la autorización
   * @param {string} code - Código de autorización
   * @param {string} state - State para verificación CSRF
   */
  const handleCallback = async () => {
    // With Supabase OAuth, after redirect the session is available via getSession
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session && session.access_token) {
        inMemoryAccessToken = session.access_token;
        setIsAuthenticated(true);
        // Sync server-side user record by calling exchange endpoint without code
        try {
          await fetch('/api/spotify/exchange', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
        } catch (e) {
          console.warn('Failed to sync spotify identity with server:', e);
        }

        setIsLoading(false);
        return true;
      }
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Error handling callback (supabase):', err);
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
