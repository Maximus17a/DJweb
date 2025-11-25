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
        console.warn('OAuth error:', error);
        navigate('/login?error=' + encodeURIComponent(error), { replace: true });
        return;
      }

      if (!code && !state) {
        // Check if we have a session from Supabase (implicit flow or cached)
        // If not, redirect to login
        // But wait, handleCallback handles the session check too.
        // If no code/state, we might just be visiting /callback manually.
      }


      if (!code || !state) {
        // Not necessarily an exceptional error — redirect quietly
        console.warn('Missing code or state in callback');
        navigate('/');
        return;
      }

      // Procesar el callback. Support both legacy PKCE (code/state)
      // and Supabase OAuth (no code/state; session available via Supabase).
      let success = false;
      if (code && state) {
        success = await handleCallback(code, state);
      } else {
        success = await handleCallback();
      }

      if (success) {
        navigate('/');
      } else {
        navigate('/login?error=auth_failed');
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
