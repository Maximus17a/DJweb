import { Brain, Loader2, Sparkles } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export default function AIStatusBadge() {
  const { isAIMode, isOptimizing, toggleAIMode } = usePlayer();

  return (
    <button
      onClick={toggleAIMode}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
        isAIMode
          ? 'bg-neon-purple/20 text-neon-purple border-2 border-neon-purple/50 shadow-lg shadow-neon-purple/30'
          : 'glass hover:bg-white/10'
      }`}
      title={isAIMode ? 'Desactivar AI Auto-Mix' : 'Activar AI Auto-Mix'}
    >
      {isOptimizing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Optimizando...</span>
        </>
      ) : isAIMode ? (
        <>
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>AI Auto-Mix Activo</span>
        </>
      ) : (
        <>
          <Brain className="w-5 h-5" />
          <span>Activar AI Auto-Mix</span>
        </>
      )}
    </button>
  );
}
