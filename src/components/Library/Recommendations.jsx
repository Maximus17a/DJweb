import { useState, useEffect } from 'react';
import { Sparkles, Plus, RefreshCw } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { getRecommendations } from '../../services/spotifyApi';

export default function Recommendations() {
  const { currentTrack, addToQueue } = usePlayer();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Función para cargar recomendaciones
  const loadRecommendations = async () => {
    if (!currentTrack) return;
    
    setLoading(true);
    try {
      // Pedimos 5 recomendaciones basadas en la canción actual
      const tracks = await getRecommendations(currentTrack.id, 5);
      setRecommendations(tracks);
    } catch (error) {
      console.error("Error cargando recomendaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambia la canción
  useEffect(() => {
    if (currentTrack?.id) {
      loadRecommendations();
    }
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  return (
    <div className="glass rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-neon-cyan" />
          <h3 className="font-bold text-white">Sugerencias IA</h3>
        </div>
        <button 
          onClick={loadRecommendations}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          disabled={loading}
          title="Refrescar sugerencias"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        {recommendations.map((track) => (
          <div key={track.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src={track.album.images[2]?.url || track.album.images[0]?.url} 
                alt={track.name} 
                className="w-10 h-10 rounded"
              />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate text-gray-200">{track.name}</p>
                <p className="text-xs text-gray-500 truncate">{track.artists[0].name}</p>
              </div>
            </div>
            
            <button
              onClick={() => addToQueue(track)}
              className="p-2 bg-neon-purple/10 hover:bg-neon-purple/30 rounded-full text-neon-purple transition-all opacity-0 group-hover:opacity-100"
              title="Añadir a la cola"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {recommendations.length === 0 && !loading && (
          <p className="text-xs text-gray-500 text-center py-4">
            No se encontraron sugerencias similares.
          </p>
        )}
      </div>
    </div>
  );
}