import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Callback() {
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const hasProcessed = useRef(false);
  const [statusMessage, setStatusMessage] = useState('Finalizando conexión...');

  useEffect(() => {
    const processCallback = async () => {
      // 1. Evitar doble ejecución (React StrictMode)
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      // 2. Validar si la URL tiene los parámetros necesarios
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      // Si hay error de Spotify (ej: usuario denegó acceso)
      if (error) {
        console.error('Spotify Error:', error);
        navigate('/login?error=' + error);
        return;
      }

      // Si NO hay código, no podemos autenticar. Redirigir a login.
      if (!code) {
        console.warn('No se encontró código en la URL. Redirigiendo...');
        navigate('/login');
        return;
      }

      try {
        // 3. Intentar el intercambio de tokens
        const success = await handleCallback();

        if (success) {
          navigate('/');
        } else {
          setStatusMessage('No se pudo verificar la sesión.');
          // Dar tiempo al usuario para leer el mensaje antes de redirigir
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (err) {
        console.error('Error en callback:', err);
        setStatusMessage('Error en el proceso de autenticación.');
      }
    };

    processCallback();
  }, [handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
        <p className="text-xl text-gray-400">{statusMessage}</p>
        
        {/* Botón de emergencia por si se queda pegado */}
        <button 
          onClick={() => navigate('/login')}
          className="mt-8 text-sm text-gray-600 hover:text-white underline cursor-pointer"
        >
          ¿Tarda demasiado? Volver al inicio
        </button>
      </div>
    </div>
  );
}