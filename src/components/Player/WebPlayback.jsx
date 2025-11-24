import { usePlayer } from '../../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function WebPlayback() {
  const {
    currentTrack,
    isPaused,
    position,
    duration,
    volume,
    togglePlay,
    nextTrack,
    previousTrack,
    changeVolume,
    seek,
    isActive,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    changeVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      changeVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      changeVolume(0);
      setIsMuted(true);
    }
  };

  const handleSeek = (e) => {
    const newPosition = parseFloat(e.target.value);
    seek(newPosition);
  };

  if (!isActive || !currentTrack) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-gray-500">
          Selecciona una canción para comenzar a reproducir
        </p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      {/* Album Art */}
      <div className="flex justify-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-neon rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <img
            src={currentTrack.album?.images[0]?.url}
            alt={currentTrack.name}
            className={`relative w-64 h-64 rounded-full shadow-2xl ${
              !isPaused ? 'vinyl-spin' : ''
            }`}
          />
          {/* Overlay de play/pause en hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={togglePlay}
              className="glass p-6 rounded-full hover:bg-white/20 transition-colors"
            >
              {isPaused ? (
                <Play className="w-12 h-12 text-white" fill="white" />
              ) : (
                <Pause className="w-12 h-12 text-white" fill="white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Track Info */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 truncate">{currentTrack.name}</h2>
        <p className="text-gray-400 truncate">
          {currentTrack.artists?.map((a) => a.name).join(', ')}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={duration}
          value={position}
          onChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={previousTrack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors"
          title="Anterior"
        >
          <SkipBack className="w-6 h-6" />
        </button>

        <button
          onClick={togglePlay}
          className="p-4 bg-gradient-neon rounded-full hover:shadow-lg hover:shadow-neon-purple/50 transition-all hover:scale-110"
          title={isPaused ? 'Reproducir' : 'Pausar'}
        >
          {isPaused ? (
            <Play className="w-8 h-8" fill="white" />
          ) : (
            <Pause className="w-8 h-8" fill="white" />
          )}
        </button>

        <button
          onClick={nextTrack}
          className="p-3 hover:bg-white/10 rounded-full transition-colors"
          title="Siguiente"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1"
        />
        <span className="text-sm text-gray-500 w-12 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
