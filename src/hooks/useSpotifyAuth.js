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

  const checkAuth = () => {
    supabase.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        setIsAuthenticated(true);
        // Guardar token en memoria por si acaso
        if (data.session.provider_token) {
            inMemoryAccessTokenRef.current = data.session.provider_token;
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsAuthenticated(false);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    checkAuth();
    authListenerRef.current = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session?.access_token) {
        // Intentar recuperar el token de proveedor si está disponible
        inMemoryAccessTokenRef.current = session?.provider_token || null;
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
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const login = async () => {
    try {
      setError(null);
      const options = {
        redirectTo: SPOTIFY_CONFIG.REDIRECT_URI,
        scopes: SPOTIFY_CONFIG.SCOPES,
        queryParams: {
          access_type: 'offline', // Necesario para refresh token
          prompt: 'consent',      // Fuerza pantalla de consentimiento para asegurar refresh token
        }
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
      
      // Esperar un poco para asegurar que la sesión se establezca
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      
      if (session) {
        // Usamos el token de proveedor que viene directamente en la sesión
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;
        
        inMemoryAccessTokenRef.current = providerToken;
        
        // Enviamos los tokens explícitamente al backend
        try {
          const resp = await fetch('/api/spotify/exchange', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`, // Token de Supabase para Auth
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              // Enviamos los tokens de Spotify explícitamente
              spotify_access_token: providerToken,
              spotify_refresh_token: providerRefreshToken,
            }),
          });
          
          if (!resp.ok) {
            console.warn('Sync warning:', await resp.text());
          } else {
            console.log('Tokens guardados correctamente en DB');
          }
        } catch (e) {
          console.warn('Error contactando endpoint de intercambio:', e);
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