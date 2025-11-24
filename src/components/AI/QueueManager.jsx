import { Sparkles, Trash2, Music, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import TrackList from '../Library/TrackList';
import { analyzeQueue } from '../../utils/bpmMatcher';

export default function QueueManager() {
  const { queue, optimizeQueueWithAI, clearQueue, removeFromQueue, isOptimizing } = usePlayer();
  const [optError, setOptError] = useState(null);

  const stats = analyzeQueue(queue);

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-neon-purple" />
            <h2 className="text-xl font-bold">Cola de Reproducción</h2>
            <span className="badge-ai">{queue.length} canciones</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setOptError(null);
                try {
                  await optimizeQueueWithAI();
                } catch (err) {
                  console.warn('Optimization failed:', err);
                  setOptError('No se pudo optimizar la cola. Intenta iniciar sesión de nuevo.');
                }
              }}
              disabled={isOptimizing || queue.length <= 1}
              className="btn-neon-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimizando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Optimizar con IA
                </>
              )}
            </button>

            {optError && (
              <p className="text-sm text-yellow-300 ml-2">{optError}</p>
            )}

            <button
              onClick={clearQueue}
              disabled={queue.length === 0}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Limpiar cola"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Estadísticas de la cola */}
        {queue.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">BPM Promedio</p>
              <p className="text-lg font-bold text-neon-purple">{stats.avgBPM}</p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Energía Promedio</p>
              <p className="text-lg font-bold text-neon-cyan">
                {Math.round(stats.avgEnergy * 100)}%
              </p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Tonalidad Dominante</p>
              <p className="text-lg font-bold text-neon-pink">{stats.dominantKey || 'N/A'}</p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Duración Total</p>
              <p className="text-lg font-bold text-neon-blue">
                {formatDuration(stats.totalDuration)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de tracks */}
      <div className="glass rounded-xl p-4 max-h-[600px] overflow-y-auto">
        <TrackList tracks={queue} onRemove={removeFromQueue} showRemove={true} />
      </div>
    </div>
  );
}
