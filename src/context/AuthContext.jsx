import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { getCurrentUser } from '../services/spotifyApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useSpotifyAuth();
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Envolvemos en useCallback para que la función sea estable y válida como dependencia
  const loadUser = useCallback(async () => {
    try {
      setIsLoadingUser(true);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Cargar datos del usuario cuando se autentica
  useEffect(() => {
    if (auth.isAuthenticated && !user && !isLoadingUser) {
      loadUser();
    }
  }, [auth.isAuthenticated, user, isLoadingUser, loadUser]); // Dependencias completas

  const value = {
    ...auth,
    user,
    isLoadingUser,
    reloadUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}