import { useState, useEffect, useRef, useCallback } from 'react'; // <--- Importar useCallback
import { SPOTIFY_CONFIG, STORAGE_KEYS } from '../utils/constants';
import { generateCodeVerifier, generateCodeChallenge, saveCodeVerifier, getCodeVerifier, clearCodeVerifier } from '../utils/pkce';

export function useSpotifyAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  const tokenRef = useRef(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    
    if (token && expiry && Date.now() < parseInt(expiry)) {
      tokenRef.current = token;
      setIsAuthenticated(true);
      const savedUser = localStorage.getItem('spotify_user_profile');
      if (savedUser) setUser(JSON.parse(savedUser));
    } else {
      logout();
    }
    setIsLoading(false);
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      const verifier = generateCodeVerifier();
      saveCodeVerifier(verifier);
      const challenge = await generateCodeChallenge(verifier);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        scope: SPOTIFY_CONFIG.SCOPES,
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });

      window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (err) {
      console.error('Login error:', err);
      setError('Error iniciando login');
      setIsLoading(false);
    }
  };

  const handleCallback = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error || !code) throw new Error(error || 'No code returned');

      const verifier = getCodeVerifier();
      if (!verifier) throw new Error('No PKCE verifier found');

      const response = await fetch('/api/spotify/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Token exchange failed');
      }

      const data = await response.json();
      const expiryTime = Date.now() + (data.expires_in * 1000);
      
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime);
      localStorage.setItem('spotify_user_profile', JSON.stringify(data.profile));

      tokenRef.current = data.access_token;
      setUser(data.profile);
      setIsAuthenticated(true);
      clearCodeVerifier();
      
      return true;
    } catch (err) {
      console.error('Callback error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem('spotify_user_profile');
    tokenRef.current = null;
    setIsAuthenticated(false);
    setUser(null);
  };

  // SOLUCIÓN: useCallback para que la referencia no cambie
  const getAccessToken = useCallback(() => {
    return tokenRef.current;
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    logout,
    handleCallback,
    getAccessToken
  };
}