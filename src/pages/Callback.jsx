import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Callback() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const hasProcessed = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        setErrorMsg('OAuth error: ' + error);
        return;
      }

      if (!code || !state) {
        setErrorMsg('Faltan parámetros de autenticación.');
        return;
      }

      try {
        let success = false;
        if (code && state) {
          success = await handleCallback(code, state);
        } else {
          success = await handleCallback();
        }

        if (success) {
          navigate('/');
        } else {
          setErrorMsg('Error de autenticación.');
        }
      } catch {
        setErrorMsg('Error en el proceso de autenticación.');
      }
    };

    processCallback();
  }, [handleCallback, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center">
          <p className="text-xl text-red-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
        <p className="text-xl text-gray-400">Conectando con Spotify...</p>
      </div>
    </div>
  );
}
