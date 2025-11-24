import { Play, Trash2, GripVertical } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export default function TrackList({ tracks, onRemove, showRemove = true }) {
  const { playTrack, currentTrack } = usePlayer();

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay canciones en la cola</p>
        <p className="text-sm mt-2">Busca y añade canciones para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => {
        const isPlaying = currentTrack?.id === track.id;

        return (
          <div
            key={`${track.id}-${index}`}
            className={`glass-hover rounded-lg p-3 flex items-center gap-3 group ${
              isPlaying ? 'ring-2 ring-neon-purple' : ''
            }`}
          >
            {/* Drag handle */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
              <GripVertical className="w-4 h-4 text-gray-500" />
            </div>

            {/* Index */}
            <div className="w-6 text-center text-sm text-gray-500">
              {index + 1}
            </div>

            {/* Album art */}
            <div className="relative">
              <img
                src={track.album?.images[2]?.url || track.album?.images[0]?.url}
                alt={track.name}
                className="w-12 h-12 rounded"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                  <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${isPlaying ? 'text-neon-purple' : ''}`}>
                {track.name}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {track.artists?.map((a) => a.name).join(', ')}
              </p>
            </div>

            {/* Audio features badge (si están disponibles). Si no hay features mostrar un badge informativo */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              {track.audioFeatures ? (
                <>
                  <span className="badge-ai">
                    {Math.round(track.audioFeatures.tempo)} BPM
                  </span>
                  <span className="badge-ai">
                    {Math.round(track.audioFeatures.energy * 100)}% Energy
                  </span>
                </>
              ) : (
                <span className="px-2 py-1 text-xs bg-white/5 rounded text-yellow-300">Sin features</span>
              )}
            </div>

            {/* Duration */}
            <span className="text-sm text-gray-500">
              {formatDuration(track.duration_ms)}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => playTrack(track)}
                className="p-2 hover:bg-neon-purple/20 rounded-lg transition-colors"
                title="Reproducir"
              >
                <Play className="w-4 h-4 text-neon-purple" />
              </button>

              {showRemove && onRemove && (
                <button
                  onClick={() => onRemove(index)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
