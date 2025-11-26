import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { PLAYER_CONFIG, AI_CONFIG } from '../utils/constants';
import { optimizeQueue } from '../utils/bpmMatcher';
import {  getRecommendations  } from '../services/spotifyApi';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // --- ESTADOS ---
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

  // --- REFS (Para acceso instantáneo dentro de listeners) ---
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Refs críticos para la lógica de automix
  const isAIModeRef = useRef(isAIMode);
  const isProcessingRef = useRef(false); // 🔒 Candado para evitar saltos dobles
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const autoPlayRef = useRef(autoPlay);
  const currentTrackRef = useRef(currentTrack);

  // Sincronizar Refs con el Estado
  useEffect(() => { isAIModeRef.current = isAIMode; }, [isAIMode]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // --- FUNCIONES BÁSICAS DE REPRODUCCIÓN ---

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
      // Reiniciamos el candado al cambiar de canción
      setTimeout(() => { isProcessingRef.current = false; }, 1000);
    } catch (error) {
      console.warn('Error playing track:', error);
    }
  }, [deviceId, getAccessToken]);

  const nextTrack = useCallback(async (startPos = 0) => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;

    // 1. Si hay canciones en la cola, seguimos
    if (currentIndex < currentQ.length - 1) {
      const nextIndex = currentIndex + 1;
      setQueueIndex(nextIndex);
      await playTrack(currentQ[nextIndex], startPos);
    } 
    // 2. Si se acabó la cola y Autoplay está activo, buscamos más
    else if (autoPlayRef.current) {
      console.log('📻 Fin de la cola. Buscando música similar...');
      const lastTrack = currentQ[currentQ.length - 1] || currentTrackRef.current;
      
      if (lastTrack) {
        try {
          const recommendations = await getRecommendations(lastTrack.id);
          if (recommendations && recommendations.length > 0) {
            const newQueue = [...currentQ, ...recommendations];
            setQueue(newQueue);
            
            // Reproducir la primera recomendada
            const nextIndex = currentIndex + 1;
            setQueueIndex(nextIndex);
            await playTrack(recommendations[0], startPos);
          }
        } catch (e) {
          console.error('Error en autoplay:', e);
        }
      }
    }
  }, [playTrack]);

  // --- LÓGICA DE TRANSICIÓN DEL DJ ---

  const executeTransition = useCallback(async (durationMs, cuePointSeconds = 0) => {
    if (!playerRef.current) return;

    const steps = 20;
    const stepTime = durationMs / steps;
    const startVolume = volume;
    
    console.log(`🎚️ Mezclando: Fade Out (${durationMs}ms) -> Salto al seg ${cuePointSeconds}`);

    // 1. FADE OUT
    for (let i = steps; i >= 0; i--) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime));
    }

    // 2. CAMBIO DE PISTA + SEEK (CUE POINT)
    const cuePointMs = Math.round(cuePointSeconds * 1000);
    await nextTrack(cuePointMs);

    // 3. ESPERA TÉCNICA (BUFFER)
    await new Promise(r => setTimeout(r, 500));
    
    // 4. FADE IN
    for (let i = 0; i <= steps; i++) {
      const newVol = startVolume * (i / steps);
      if (playerRef.current) await playerRef.current.setVolume(newVol);
      await new Promise(r => setTimeout(r, stepTime / 2));
    }
    
    // Asegurar volumen final
    if (playerRef.current) await playerRef.current.setVolume(startVolume);
  }, [volume, nextTrack]);

  /**
   * CEREBRO DEL DJ (Smart Mix)
   */
  const performSmartMix = useCallback(async () => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;

    // Verificar si hay siguiente canción
    if (currentIndex >= currentQ.length - 1 && !autoPlayRef.current) return;

    // Si es autoplay y no hay tracks, nextTrack lo resuelve, pero necesitamos datos para la IA.
    // Para simplificar: Si estamos al final de la cola, hacemos transición normal para cargar más música rápido.
    if (currentIndex >= currentQ.length - 1) {
        await nextTrack();
        return "Autoplay (Carga rápida)";
    }

    const nextTrackItem = currentQ[currentIndex + 1];

    try {
      console.log('🤖 DJ IA analizando próxima mezcla...');
      
      // Construimos los datos para la IA
      const trackData = {
        current: {
          name: currentTrackRef.current?.name || 'Unknown',
          artist: currentTrackRef.current?.artists?.[0]?.name || 'Unknown',
        },
        next: {
          name: nextTrackItem.name,
          artist: nextTrackItem.artists?.[0]?.name || 'Unknown',
        }
      };

      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'dj_mix', trackData })
      });
      
      const { mixData } = await response.json();
      console.log('✨ Estrategia recibida:', mixData);
      
      await executeTransition(
        mixData?.fadeDuration || 4000,
        mixData?.cuePoint || 0
      );

      return mixData?.rationale;

    } catch (error) {
      console.error('Error en Smart Mix:', error);
      await nextTrack(); // Fallback seguro
    }
  }, [executeTransition, nextTrack]);

  // --- CONTROLADOR AUTOMÁTICO (EL BUCLE PRINCIPAL) ---

  // Esta función decide qué hacer cuando la canción está acabando
  const handleTrackEnd = useCallback(async () => {
    // 🔒 SI EL CANDADO ESTÁ PUESTO, NO HACEMOS NADA
    if (isProcessingRef.current) return;
    
    // 🔒 PONEMOS EL CANDADO
    isProcessingRef.current = true;

    console.log('⚠️ Fin de pista detectado. Iniciando transición...');

    if (isAIModeRef.current) {
      // Si el modo DJ está activo, usamos la IA
      await performSmartMix();
    } else {
      // Si no, salto normal
      await nextTrack();
    }
    
    // El candado se libera dentro de playTrack, pero por seguridad lo forzamos aquí también después de un tiempo
    setTimeout(() => { isProcessingRef.current = false; }, 5000);

  }, [performSmartMix, nextTrack]);


  // --- INICIALIZACIÓN DEL REPRODUCTOR Y EVENTOS ---

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

      // Eventos de conexión
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      // EVENTO PRINCIPAL: CAMBIO DE ESTADO
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;

        // Actualizar estado local
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
        setPosition(state.position);
        setDuration(state.duration);

        // --- DETECTOR DE FIN DE CANCIÓN ---
        // Si la canción se está reproduciendo y faltan menos de 2 segundos...
        if (!state.paused && 
            state.position > 0 && 
            state.duration > 0 && 
            (state.duration - state.position) < 2000) {
            
            // ... y NO estamos procesando ya un cambio...
            if (!isProcessingRef.current) {
               // ... ¡ACTIVAMOS EL DJ!
               handleTrackEnd();
            }
        }
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    };
  }, [isAuthenticated, getAccessToken, handleTrackEnd]); // Añadimos handleTrackEnd a deps

  // Intervalo para UI fluida (barra de progreso)
  useEffect(() => {
    if (!isPaused && player) {
      intervalRef.current = setInterval(async () => {
        try {
            const state = await player.getCurrentState();
            if (state) setPosition(state.position);
        } catch { /* ignorar errores de estado */ }
      }, PLAYER_CONFIG.UPDATE_INTERVAL);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPaused, player]);

  // --- OTRAS FUNCIONES EXPORTADAS ---

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
      // Usamos la IA para analizar la lista
      const tracksToAnalyze = queue.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.[0]?.name || 'Unknown'
      }));

      const response = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze_tracks', tracks: tracksToAnalyze })
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
      console.error('Error optimizing:', error);
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