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

      // Obtener parámetros de error si existen
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');

      if (error) {
        setErrorMsg('OAuth error: ' + error);
        return;
      }

      try {
        // Eliminamos la verificación manual de code/state.
        // Dejamos que handleCallback verifique si Supabase ha establecido la sesión.
        const success = await handleCallback();

        if (success) {
          navigate('/');
        } else {
          setErrorMsg('No se pudo verificar la sesión. Intenta conectar nuevamente.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Error en el proceso de autenticación.');
      }
    };

    processCallback();
  }, [handleCallback, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-500">{errorMsg}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
        <p className="text-xl text-gray-400">Finalizando conexión...</p>
      </div>
    </div>
  );
}