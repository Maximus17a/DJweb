import { LogIn, Music } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginButton() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 text-center">
        {/* Logo/Icono */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-neon rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative glass p-8 rounded-full">
              <Music className="w-24 h-24 text-neon-purple" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-6xl font-bold mb-4">
          <span className="text-gradient">NeonFlow</span>
        </h1>
        <p className="text-2xl text-gray-400 mb-2">AI DJ</p>
        <p className="text-gray-500 mb-12 max-w-md mx-auto">
          Deja que la inteligencia artificial mezcle tu música perfectamente
        </p>

        {/* Botón de login */}
        <button
          onClick={login}
          disabled={isLoading}
          className="btn-neon inline-flex items-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn className="w-6 h-6" />
          {isLoading ? 'Conectando...' : 'Conectar con Spotify'}
        </button>

        {/* Nota sobre Spotify Premium */}
        <p className="text-sm text-gray-600 mt-8">
          Se requiere Spotify Premium para usar el reproductor web
        </p>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 bg-neon-purple/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Music className="w-6 h-6 text-neon-purple" />
            </div>
            <h3 className="font-semibold mb-2">Mezcla Inteligente</h3>
            <p className="text-sm text-gray-400">
              IA que analiza BPM, energía y tonalidad para transiciones perfectas
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 bg-neon-cyan/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Music className="w-6 h-6 text-neon-cyan" />
            </div>
            <h3 className="font-semibold mb-2">Auto-Mix</h3>
            <p className="text-sm text-gray-400">
              Transiciones automáticas entre canciones con crossfade
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 bg-neon-pink/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Music className="w-6 h-6 text-neon-pink" />
            </div>
            <h3 className="font-semibold mb-2">Cola Optimizada</h3>
            <p className="text-sm text-gray-400">
              Ordena automáticamente tu cola para un flujo musical perfecto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
