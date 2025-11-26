import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { PLAYER_CONFIG, AI_CONFIG } from '../utils/constants';
import { optimizeQueue } from '../utils/bpmMatcher';
import { getMultipleAudioFeatures, getRecommendations } from '../services/spotifyApi'; // Importamos recomendaciones

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // Estado
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(PLAYER_CONFIG.VOLUME);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isAIMode, setIsAIMode] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true); // Autoplay activado por defecto

  // Refs
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const isAIModeRef = useRef(isAIMode);
  const isProcessingRef = useRef(false); // Candado para evitar saltos dobles
  const handleTrackEndRef = useRef(null);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const autoPlayRef = useRef(autoPlay);

  // Sincronizar Refs
  useEffect(() => { isAIModeRef.current = isAIMode; }, [isAIMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // --- FUNCIONES DE REPRODUCCIÓN ---

  const playTrack = useCallback(async (track) => {
    if (!playerRef.current || !deviceId) return;
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
      console.warn('Error playing track:', error);
    }
  }, [deviceId, getAccessToken]);

  const nextTrack = useCallback(async () => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;

    if (currentIndex < currentQ.length - 1) {
      const nextIndex = currentIndex + 1;
      setQueueIndex(nextIndex);
      await playTrack(currentQ[nextIndex]);
    } else if (autoPlayRef.current) {
      // Autoplay: Si no hay más canciones, buscar similares
      console.log('Cola terminada. Buscando recomendaciones...');
      const lastTrack = currentQ[currentQ.length - 1] || currentTrack;
      if (lastTrack) {
        try {
          const recommendations = await getRecommendations(lastTrack.id);
          if (recommendations.length > 0) {
            const newQueue = [...currentQ, ...recommendations];
            setQueue(newQueue);
            setQueueIndex(currentIndex + 1); // Avanzar al primero de los nuevos
            await playTrack(recommendations[0]);
          }
        } catch (e) {
          console.error('Error en autoplay:', e);
        }
      }
    }
  }, [playTrack, currentTrack]); // Dependencias simplificadas gracias a los Refs

  // --- LÓGICA DE TRANSICIÓN Y AI ---

  const executeTransition = useCallback(async (durationMs) => {
    if (!playerRef.current) return;
    const steps = 20;
    const stepTime = durationMs / steps;
    const startVolume = volume;
    
    // Fade Out
    for (let i = steps; i >= 0; i--) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime));
    }

    await nextTrack();

    // Buffer wait
    await new Promise(r => setTimeout(r, 800));
    
    // Fade In
    for (let i = 0; i <= steps; i++) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime / 2));
    }
    if (playerRef.current) await playerRef.current.setVolume(startVolume);
  }, [volume, nextTrack]);

  const performSmartMix = useCallback(async () => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;
    
    // Si no hay siguiente canción, usamos nextTrack que manejará el Autoplay
    if (currentIndex >= currentQ.length - 1) {
        await nextTrack();
        return;
    }

    const nextTrackItem = currentQ[currentIndex + 1];
    const trackData = {
      current: {
        name: currentTrack?.name || 'Unknown',
        bpm: currentTrack?.audioFeatures?.tempo || 120,
        energy: currentTrack?.audioFeatures?.energy || 0.5
      },
      next: {
        name: nextTrackItem.name,
        bpm: nextTrackItem.audioFeatures?.tempo || 120,
        energy: nextTrackItem.audioFeatures?.energy || 0.5
      }
    };

    try {
      console.log('🎧 DJ AI Analizando...');
      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'dj_mix', trackData })
      });
      const { mixData } = await response.json();
      console.log('🎚️ Mezcla:', mixData);
      await executeTransition(mixData?.fadeDuration || 5000);
    } catch (error) {
      console.error('Error mix:', error);
      await nextTrack();
    }
  }, [currentTrack, executeTransition, nextTrack]);

  // --- MANEJADOR DE FIN DE PISTA ---

  const handleTrackEnd = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log('Track finalizado. Avanzando...');
    if (isAIModeRef.current) {
      await performSmartMix();
    } else {
      await nextTrack();
    }

    // Liberar el candado después de un tiempo seguro
    setTimeout(() => { isProcessingRef.current = false; }, 3000);
  }, [nextTrack, performSmartMix]);

  useEffect(() => { handleTrackEndRef.current = handleTrackEnd; }, [handleTrackEnd]);

  // --- SETUP DEL PLAYER ---

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
        getOAuthToken: (cb) => { cb(token); },
        volume: PLAYER_CONFIG.VOLUME,
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready:', device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Offline:', device_id);
      });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration);

        // Detección de fin de canción
        // Si no está pausado y queda menos de 1.5s, activamos el cambio
        if (!state.paused && state.position > 0 && state.duration > 0) {
          const remaining = state.duration - state.position;
          if (remaining < 1500 && !isProcessingRef.current) {
             if (handleTrackEndRef.current) handleTrackEndRef.current();
          }
          // Resetear candado si el usuario retrocedió
          if (remaining > 5000) {
             isProcessingRef.current = false;
          }
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    };

    return () => { if (playerRef.current) playerRef.current.disconnect(); };
  }, [isAuthenticated, getAccessToken]);

  // Intervalo para UI fluida
  useEffect(() => {
    if (!isPaused && player) {
      intervalRef.current = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state) setPosition(state.position);
      }, PLAYER_CONFIG.UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, player]);

  // --- HELPERS EXTRAS ---

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
      let features = await getMultipleAudioFeatures(trackIds) || [];
      const tracksWithFeatures = queue.map((track, index) => ({
        ...track,
        audioFeatures: features[index] || { tempo: 0, energy: 0, key: 0, mode: 1, danceability: 0 },
      }));
      const optimized = optimizeQueue(tracksWithFeatures, flowType);
      setQueue(optimized);
      setIsOptimizing(false);
      return optimized;
    } catch (error) {
      setIsOptimizing(false);
      throw error;
    }
  };

  const togglePlay = async () => { if (player) await player.togglePlay(); };
  const changeVolume = async (v) => { if (player) { await player.setVolume(v); setVolume(v); } };
  const seek = async (p) => { if (player) { await player.seek(p); setPosition(p); } };
  const toggleAIMode = () => setIsAIMode(!isAIMode);
  const clearQueue = () => { setQueue([]); setQueueIndex(0); };
  const removeFromQueue = (i) => {
    const newQ = queue.filter((_, idx) => idx !== i);
    setQueue(newQ);
    if (i < queueIndex) setQueueIndex(queueIndex - 1);
  };

  const value = {
    player, deviceId, isPaused, isActive, currentTrack, position, duration, volume,
    queue, queueIndex, isAIMode, isOptimizing, autoPlay,
    addToQueue, addMultipleToQueue, optimizeQueueWithAI, playTrack, togglePlay,
    nextTrack, previousTrack, changeVolume, seek, toggleAIMode, clearQueue, removeFromQueue,
    performSmartMix, setAutoPlay
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
}