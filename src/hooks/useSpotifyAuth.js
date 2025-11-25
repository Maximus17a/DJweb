import { useState, useEffect, useRef } from 'react';
import { SPOTIFY_CONFIG } from '../utils/constants';
import supabase from '../lib/supabaseClient';

/**
 * Hook personalizado para manejar la autenticación de Spotify usando Supabase OAuth
 */
export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const inMemoryAccessTokenRef = useRef(null);
  const authListenerRef = useRef(null);

  useEffect(() => {
    checkAuth();
    authListenerRef.current = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session?.access_token) {
        inMemoryAccessTokenRef.current = session?.access_token || null;
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        inMemoryAccessTokenRef.current = null;
        setIsAuthenticated(false);
      }
    });

    return () => {
      try {
        if (authListenerRef.current?.data?.subscription?.unsubscribe) {
          authListenerRef.current.data.subscription.unsubscribe();
        } else if (typeof authListenerRef.current?.unsubscribe === 'function') {
          authListenerRef.current.unsubscribe();
        }
      } catch {
        // ignore unsubscribe errors
      }
    };
  }, []);

  const checkAuth = () => {
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

  const login = async () => {
    try {
      setError(null);
      const options = {
        redirectTo: SPOTIFY_CONFIG.REDIRECT_URI,
        scopes: SPOTIFY_CONFIG.SCOPES
      };
      await supabase.auth.signInWithOAuth({ provider: 'spotify', options });
    } catch (err) {
      console.error('Error during login:', err);
      setError('Error al iniciar sesión.');
    }
  };

  const handleCallback = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (session && session.access_token) {
        inMemoryAccessTokenRef.current = session.access_token;
        
        // === CAMBIO: Hacer la sincronización opcional (no bloquear login) ===
        try {
          const resp = await fetch('/api/spotify/exchange', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          
          if (!resp.ok) {
            const errText = await resp.text();
            console.warn('⚠️ Sync with server failed (non-critical):', resp.status, errText);
            console.warn('La app funcionará pero los tokens no se guardarán en la base de datos.');
            console.warn('Para habilitar persistencia, configura las variables de entorno del servidor.');
          } else {
            console.log('✅ Tokens sincronizados con el servidor correctamente.');
          }
        } catch (e) {
          console.warn('⚠️ Failed to sync spotify identity with server (non-critical):', e);
          console.warn('La app funcionará en modo solo-cliente sin persistencia de tokens.');
          // NO hacemos signOut aquí - permitimos que la app funcione sin sincronización
        }

        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
      
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Error handling callback:', err);
      setError(err.message || 'Error al procesar autenticación');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    inMemoryAccessTokenRef.current = null;
    supabase.auth.signOut().catch(() => {});
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  };

  const getAccessToken = () => {
    return inMemoryAccessTokenRef.current;
  };

  // Placeholder para compatibilidad
  const refreshToken = async () => { return false; };

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