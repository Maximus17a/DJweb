import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Callback() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      // Obtener código y state de la URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/?error=' + error);
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state');
        navigate('/?error=missing_params');
        return;
      }

      // Procesar el callback
      const success = await handleCallback(code, state);

      if (success) {
        navigate('/');
      } else {
        navigate('/?error=auth_failed');
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
        <p className="text-xl text-gray-400">Conectando con Spotify...</p>
      </div>
    </div>
  );
}
