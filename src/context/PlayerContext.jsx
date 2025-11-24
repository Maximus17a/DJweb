import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { PLAYER_CONFIG, AI_CONFIG } from '../utils/constants';
import { optimizeQueue, suggestNextTrack } from '../utils/bpmMatcher';
import { getMultipleAudioFeatures } from '../services/spotifyApi';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // Estado del reproductor
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(PLAYER_CONFIG.VOLUME);
  
  // Estado de la cola
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isAIMode, setIsAIMode] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Referencias
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  /**
   * Inicializar Spotify Web Playback SDK
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const token = getAccessToken();
      const spotifyPlayer = new window.Spotify.Player({
        name: PLAYER_CONFIG.NAME,
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: PLAYER_CONFIG.VOLUME,
      });

      // Event listeners
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        
        // Verificar si el track está por terminar para AI Auto-Mix
        if (isAIMode && !state.paused) {
          const timeRemaining = state.duration - state.position;
          if (timeRemaining <= AI_CONFIG.CROSSFADE_DURATION && timeRemaining > 0) {
            handleAutoMix();
          }
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [isAuthenticated]);

  /**
   * Actualizar posición del track periódicamente
   */
  useEffect(() => {
    if (!isPaused && player) {
      intervalRef.current = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state) {
          setPosition(state.position);
        }
      }, PLAYER_CONFIG.UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, player]);

  /**
   * Añadir track a la cola
   */
  const addToQueue = async (track) => {
    const newQueue = [...queue, track];
    setQueue(newQueue);
    
    // Si es el primer track, reproducirlo automáticamente
    if (newQueue.length === 1) {
      playTrack(track);
    }
  };

  /**
   * Añadir múltiples tracks a la cola
   */
  const addMultipleToQueue = async (tracks) => {
    const newQueue = [...queue, ...tracks];
    setQueue(newQueue);
    
    // Si la cola estaba vacía, reproducir el primer track
    if (queue.length === 0 && tracks.length > 0) {
      playTrack(tracks[0]);
    }
  };

  /**
   * Optimizar cola con IA
   */
  const optimizeQueueWithAI = async () => {
    if (queue.length <= 1) return;
    
    try {
      setIsOptimizing(true);
      
      // Obtener audio features para todos los tracks
      const trackIds = queue.map(track => track.id);
      let features = [];
      try {
        features = await getMultipleAudioFeatures(trackIds);
      } catch (err) {
        console.warn('Could not fetch audio features for optimization', err);
        features = new Array(trackIds.length).fill(null);
      }
      
      // Añadir audio features a cada track
      const tracksWithFeatures = queue.map((track, index) => ({
        ...track,
        audioFeatures: features[index] || {
          tempo: 0,
          energy: 0,
          key: 0,
          mode: 1,
          danceability: 0
        },
      }));
      
      // Optimizar usando el algoritmo de IA
      const optimized = optimizeQueue(tracksWithFeatures, 'maintain');
      
      setQueue(optimized);
      setIsOptimizing(false);
      
      return optimized;
    } catch (error) {
      console.error('Error optimizing queue:', error);
      setIsOptimizing(false);
      throw error;
    }
  };

  /**
   * Reproducir un track específico
   */
  const playTrack = async (track) => {
    if (!player || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [track.uri] }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      
      setCurrentTrack(track);
      setIsPaused(false);
      setIsActive(true);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlay = async () => {
    if (!player) return;
    
    try {
      await player.togglePlay();
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  };

  /**
   * Siguiente track
   */
  const nextTrack = async () => {
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      await playTrack(queue[nextIndex]);
    }
  };

  /**
   * Track anterior
   */
  const previousTrack = async () => {
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      await playTrack(queue[prevIndex]);
    }
  };

  /**
   * Cambiar volumen
   */
  const changeVolume = async (newVolume) => {
    if (!player) return;
    
    try {
      await player.setVolume(newVolume);
      setVolume(newVolume);
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  /**
   * Buscar posición en el track
   */
  const seek = async (positionMs) => {
    if (!player) return;
    
    try {
      await player.seek(positionMs);
      setPosition(positionMs);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  /**
   * Manejar AI Auto-Mix
   */
  const handleAutoMix = async () => {
    if (!currentTrack || queue.length <= queueIndex + 1) return;
    
    // Obtener el siguiente track de la cola
    const nextTrack = queue[queueIndex + 1];
    
    // Reproducir el siguiente track (con crossfade nativo de Spotify si está disponible)
    setTimeout(() => {
      playTrack(nextTrack);
      setQueueIndex(queueIndex + 1);
    }, AI_CONFIG.CROSSFADE_DURATION);
  };

  /**
   * Toggle AI Auto-Mix mode
   */
  const toggleAIMode = () => {
    setIsAIMode(!isAIMode);
  };

  /**
   * Limpiar cola
   */
  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(0);
  };

  /**
   * Remover track de la cola
   */
  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    
    // Ajustar índice si es necesario
    if (index < queueIndex) {
      setQueueIndex(queueIndex - 1);
    }
  };

  const value = {
    // Estado del reproductor
    player,
    deviceId,
    isPaused,
    isActive,
    currentTrack,
    position,
    duration,
    volume,
    
    // Estado de la cola
    queue,
    queueIndex,
    isAIMode,
    isOptimizing,
    
    // Funciones
    addToQueue,
    addMultipleToQueue,
    optimizeQueueWithAI,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    changeVolume,
    seek,
    toggleAIMode,
    clearQueue,
    removeFromQueue,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
