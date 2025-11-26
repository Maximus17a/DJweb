import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { PLAYER_CONFIG, AI_CONFIG } from '../utils/constants';
import { optimizeQueue } from '../utils/bpmMatcher';
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
  
  // Refs para evitar Stale Closures en event listeners
  const isAIModeRef = useRef(isAIMode);
  const handleAutoMixRef = useRef(null);

  // Sincronizar Refs
  useEffect(() => {
    isAIModeRef.current = isAIMode;
  }, [isAIMode]);

  /**
   * Reproducir un track específico
   */
  const playTrack = useCallback(async (track) => {
    if (!playerRef.current || !deviceId) return;
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=$${deviceId}`, {
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
      console.warn('Error playing track:', error);
    }
  }, [deviceId, getAccessToken]);

  /**
   * Siguiente track
   */
  const nextTrack = useCallback(async () => {
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      await playTrack(queue[nextIndex]);
    }
  }, [queue, queueIndex, playTrack]);

  /**
   * Lógica de desvanecimiento manual (Crossfade simulado)
   * Envuelto en useCallback para ser dependencia estable
   */
  const executeTransition = useCallback(async (durationMs) => {
    if (!playerRef.current) return;

    const steps = 20;
    const stepTime = durationMs / steps;
    const startVolume = volume;
    
    // Fade Out
    for (let i = steps; i >= 0; i--) {
      const newVol = startVolume * (i / steps);
      // Usamos playerRef para asegurar acceso a la instancia actual
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime));
    }

    // Cambiar Pista
    await nextTrack();

    // Esperar un poco a que cargue el buffer
    await new Promise(r => setTimeout(r, 800));
    
    // Fade In
    for (let i = 0; i <= steps; i++) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime / 2));
    }
    
    // Restaurar volumen original
    if (playerRef.current) await playerRef.current.setVolume(startVolume);
  }, [volume, nextTrack]); // Dependencias: volume y nextTrack

  /**
   * Función DJ Mode (Mezcla Inteligente)
   * Envuelto en useCallback con todas las dependencias
   */
  const performSmartMix = useCallback(async () => {
    if (!currentTrack || queue.length <= queueIndex + 1) return;

    const nextTrackData = queue[queueIndex + 1];
    const trackData = {
      current: {
        name: currentTrack.name,
        bpm: currentTrack.audioFeatures?.tempo || 120,
        energy: currentTrack.audioFeatures?.energy || 0.5
      },
      next: {
        name: nextTrackData.name,
        bpm: nextTrackData.audioFeatures?.tempo || 120,
        energy: nextTrackData.audioFeatures?.energy || 0.5
      }
    };

    try {
      console.log('🎧 Consultando al DJ AI...');
      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'dj_mix', trackData })
      });
      
      const { mixData } = await response.json();
      console.log('🎚️ Estrategia:', mixData);
      
      // Ahora executeTransition es una dependencia válida
      await executeTransition(mixData?.fadeDuration || 5000);

    } catch (error) {
      console.error('Error smart mix:', error);
      await nextTrack();
    }
  }, [currentTrack, queue, queueIndex, nextTrack, executeTransition]); 

  /**
   * Manejar AI Auto-Mix
   */
  const handleAutoMix = useCallback(async () => {
    if (!currentTrack || queue.length <= queueIndex + 1) return;
    
    const nextTrackItem = queue[queueIndex + 1];
    
    setTimeout(() => {
      playTrack(nextTrackItem);
      setQueueIndex((prev) => prev + 1);
    }, AI_CONFIG.CROSSFADE_DURATION || 5000);
  }, [currentTrack, queue, queueIndex, playTrack]);

  // Actualizar la referencia de handleAutoMix
  useEffect(() => {
    handleAutoMixRef.current = handleAutoMix;
  }, [handleAutoMix]);

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
        
        // Usar Refs para acceder al estado más reciente dentro del callback
        if (isAIModeRef.current && !state.paused) {
          const timeRemaining = state.duration - state.position;
          if (timeRemaining <= AI_CONFIG.CROSSFADE_DURATION && timeRemaining > 0) {
            if (handleAutoMixRef.current) {
              handleAutoMixRef.current();
            }
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
  }, [isAuthenticated, getAccessToken]);

  /**
   * Actualizar posición
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, player]);

  // Otras funciones que no requieren useCallback complejo
  const previousTrack = async () => {
    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      await playTrack(queue[prevIndex]);
    }
  };

  const addToQueue = async (track) => {
    const newQueue = [...queue, track];
    setQueue(newQueue);
    if (newQueue.length === 1) playTrack(track);
  };

  const addMultipleToQueue = async (tracks) => {
    const newQueue = [...queue, ...tracks];
    setQueue(newQueue);
    if (queue.length === 0 && tracks.length > 0) playTrack(tracks[0]);
  };

  const optimizeQueueWithAI = async (flowType = 'maintain') => {
    if (queue.length <= 1) return;
    try {
      setIsOptimizing(true);
      const trackIds = queue.map(track => track.id);
      let features = [];
      try {
        features = await getMultipleAudioFeatures(trackIds);
      } catch (err) {
        console.warn('Could not fetch features', err);
        features = new Array(trackIds.length).fill(null);
      }
      
      const tracksWithFeatures = queue.map((track, index) => ({
        ...track,
        audioFeatures: features[index] || { tempo: 0, energy: 0, key: 0, mode: 1, danceability: 0 },
      }));
      
      const optimized = optimizeQueue(tracksWithFeatures, flowType);
      setQueue(optimized);
      setIsOptimizing(false);
      return optimized;
    } catch (error) {
      console.warn('Error optimizing:', error);
      setIsOptimizing(false);
      throw error;
    }
  };

  const togglePlay = async () => {
    if (!player) return;
    await player.togglePlay();
  };

  const changeVolume = async (newVolume) => {
    if (!player) return;
    await player.setVolume(newVolume);
    setVolume(newVolume);
  };

  const seek = async (positionMs) => {
    if (!player) return;
    await player.seek(positionMs);
    setPosition(positionMs);
  };

  const toggleAIMode = () => setIsAIMode(!isAIMode);
  const clearQueue = () => { setQueue([]); setQueueIndex(0); };
  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    if (index < queueIndex) setQueueIndex(queueIndex - 1);
  };

  const value = {
    player, deviceId, isPaused, isActive, currentTrack, position, duration, volume,
    queue, queueIndex, isAIMode, isOptimizing,
    addToQueue, addMultipleToQueue, optimizeQueueWithAI, playTrack, togglePlay,
    nextTrack, previousTrack, changeVolume, seek, toggleAIMode, clearQueue, removeFromQueue,
    performSmartMix,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}