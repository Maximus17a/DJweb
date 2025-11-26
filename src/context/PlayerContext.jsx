import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { PLAYER_CONFIG, AI_CONFIG } from '../utils/constants';
import { optimizeQueue } from '../utils/bpmMatcher';
// Eliminamos getMultipleAudioFeatures porque ahora usamos la IA
import { getRecommendations,  } from '../services/spotifyApi'; 

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
  const [autoPlay, setAutoPlay] = useState(true);

  // Refs
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const isAIModeRef = useRef(isAIMode);
  const isProcessingRef = useRef(false);
  const handleTrackEndRef = useRef(null);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const autoPlayRef = useRef(autoPlay);

  useEffect(() => { isAIModeRef.current = isAIMode; }, [isAIMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // --- FUNCIONES ---

  const playTrack = useCallback(async (track, startPosition = 0) => {
    if (!playerRef.current || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          uris: [track.uri],
          position_ms: startPosition
        }),
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

  const nextTrack = useCallback(async (startPos = 0) => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;

    if (currentIndex < currentQ.length - 1) {
      const nextIndex = currentIndex + 1;
      setQueueIndex(nextIndex);
      await playTrack(currentQ[nextIndex], startPos);
    } else if (autoPlayRef.current) {
      console.log('Autoplay...');
      const lastTrack = currentQ[currentQ.length - 1] || currentTrack;
      if (lastTrack) {
        try {
          const recommendations = await getRecommendations(lastTrack.id);
          if (recommendations.length > 0) {
            const newQueue = [...currentQ, ...recommendations];
            setQueue(newQueue);
            setQueueIndex(currentIndex + 1);
            await playTrack(recommendations[0], startPos);
          }
        } catch (e) { console.error(e); }
      }
    }
  }, [playTrack, currentTrack]);

  const executeTransition = useCallback(async (durationMs, cuePointSeconds = 0) => {
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

    // Cambiar Pista
    const cuePointMs = Math.round(cuePointSeconds * 1000);
    await nextTrack(cuePointMs);

    await new Promise(r => setTimeout(r, 800));
    
    // Fade In
    for (let i = 0; i <= steps; i++) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime / 2));
    }
    if (playerRef.current) await playerRef.current.setVolume(startVolume);
  }, [volume, nextTrack]);
/**
   * Función DJ Mode (100% IA - Sin errores 403)
   */
  const performSmartMix = useCallback(async () => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;
    
    if (currentIndex >= currentQ.length - 1) {
        await nextTrack();
        return "Autoplay activado";
    }

    const nextTrackItem = currentQ[currentIndex + 1];
    
    // Construimos el objeto con SOLO los datos básicos (Nombre y Artista)
    // La IA se encargará de "recordar" el resto.
    const trackData = {
      current: {
        name: currentTrack?.name || 'Unknown',
        artist: currentTrack?.artists?.[0]?.name || 'Unknown',
      },
      next: {
        name: nextTrackItem.name,
        artist: nextTrackItem.artists?.[0]?.name || 'Unknown',
      }
    };

    try {
      console.log('🎧 DJ AI analizando estructura y letra (Modo Conocimiento)...');
      
      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'dj_mix', trackData })
      });
      
      const { mixData } = await response.json();
      console.log('🎚️ Plan de Mezcla:', mixData);
      
      // Ejecutar la transición con los datos inventados/estimados por la IA
      await executeTransition(
        mixData?.fadeDuration || 5000,
        mixData?.cuePoint || 0
      );
      
      return mixData?.rationale;

    } catch (error) {
      console.error('Error en smart mix:', error);
      // Si falla la IA, hacemos transición normal
      await nextTrack();
    }
  }, [currentTrack, executeTransition, nextTrack]);

  // --- MANEJADOR DE EVENTOS ---

  const handleTrackEnd = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (isAIModeRef.current) {
      await performSmartMix();
    } else {
      await nextTrack();
    }

    setTimeout(() => { isProcessingRef.current = false; }, 3000);
  }, [nextTrack, performSmartMix]);

  useEffect(() => { handleTrackEndRef.current = handleTrackEnd; }, [handleTrackEnd]);

  // --- INICIALIZACIÓN ---

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

        if (!state.paused && state.position > 0 && state.duration > 0) {
          const remaining = state.duration - state.position;
          if (remaining < 1500 && !isProcessingRef.current) {
             if (handleTrackEndRef.current) handleTrackEndRef.current();
          }
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    };

    return () => { if (playerRef.current) playerRef.current.disconnect(); };
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (!isPaused && player) {
      intervalRef.current = setInterval(async () => {
        try {
            const state = await player.getCurrentState();
            if (state) setPosition(state.position);
        } catch { /* ignore */ }
      }, PLAYER_CONFIG.UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, player]);

  // --- FUNCIONES PÚBLICAS ---

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

  // Optimización usando IA (Groq) en lugar de Spotify API Features
  const optimizeQueueWithAI = async (flowType = 'maintain') => {
    if (queue.length <= 1) return;
    
    try {
      setIsOptimizing(true);
      
      const tracksToAnalyze = queue.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.[0]?.name || 'Unknown'
      }));

      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'analyze_tracks', 
          tracks: tracksToAnalyze 
        })
      });

      const { features } = await response.json();
      
      const tracksWithFeatures = queue.map((track) => {
        const aiData = features?.[track.id] || { tempo: 120, energy: 0.5, key: 0 };
        return {
          ...track,
          audioFeatures: {
            tempo: aiData.tempo || 120,
            energy: aiData.energy || 0.5,
            key: aiData.key || 0,
            mode: 1,
            danceability: aiData.energy || 0.5
          }
        };
      });
      
      const optimized = optimizeQueue(tracksWithFeatures, flowType);
      setQueue(optimized);
      setIsOptimizing(false);
      return optimized;
    } catch (error) {
      console.error('Error optimizing queue:', error);
      setIsOptimizing(false);
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