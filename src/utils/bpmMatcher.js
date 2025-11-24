import { AI_CONFIG, KEY_NAMES } from './constants';

/**
 * Calcula la similitud de BPM entre dos tracks
 * @param {number} bpm1 - BPM del primer track
 * @param {number} bpm2 - BPM del segundo track
 * @returns {number} Score de similitud (0-1)
 */
export function calculateBPMSimilarity(bpm1, bpm2) {
  const difference = Math.abs(bpm1 - bpm2);
  
  if (difference === 0) return 1;
  if (difference > AI_CONFIG.BPM_TOLERANCE * 2) return 0;
  
  // Normalizar la diferencia a un score entre 0 y 1
  return 1 - (difference / (AI_CONFIG.BPM_TOLERANCE * 2));
}

/**
 * Verifica si dos keys son compatibles según el círculo de quintas
 * @param {number} key1 - Key del primer track (0-11)
 * @param {number} key2 - Key del segundo track (0-11)
 * @returns {number} Score de compatibilidad (0, 0.5, o 1)
 */
export function calculateKeyCompatibility(key1, key2) {
  if (key1 === key2) return 1; // Misma key = perfecta compatibilidad
  
  const compatibleKeys = AI_CONFIG.KEY_COMPATIBILITY[key1] || [];
  
  if (compatibleKeys.includes(key2)) {
    return 0.7; // Keys compatibles
  }
  
  return 0; // Keys no compatibles
}

/**
 * Calcula el flujo de energía entre dos tracks
 * @param {number} energy1 - Energía del primer track (0-1)
 * @param {number} energy2 - Energía del segundo track (0-1)
 * @param {string} flowType - Tipo de flujo deseado ('build_up', 'maintain', 'cool_down')
 * @returns {number} Score de flujo (0-1)
 */
export function calculateEnergyFlow(energy1, energy2, flowType = 'maintain') {
  const difference = energy2 - energy1;
  
  switch (flowType) {
    case 'build_up':
      // Preferir aumento gradual de energía
      if (difference > 0 && difference <= 0.2) return 1;
      if (difference > 0.2) return 0.5;
      return 0.3;
      
    case 'cool_down':
      // Preferir disminución gradual de energía
      if (difference < 0 && difference >= -0.2) return 1;
      if (difference < -0.2) return 0.5;
      return 0.3;
      
    case 'maintain':
    default:
      // Preferir energía similar
      const absDiff = Math.abs(difference);
      if (absDiff <= 0.1) return 1;
      if (absDiff <= 0.2) return 0.7;
      if (absDiff <= 0.3) return 0.4;
      return 0.2;
  }
}

/**
 * Calcula el score total de transición entre dos tracks
 * @param {Object} track1 - Primer track con audio features
 * @param {Object} track2 - Segundo track con audio features
 * @param {string} flowType - Tipo de flujo de energía deseado
 * @returns {number} Score total (0-1)
 */
export function calculateTransitionScore(track1, track2, flowType = 'maintain') {
  const bpmScore = calculateBPMSimilarity(
    track1.audioFeatures.tempo,
    track2.audioFeatures.tempo
  );
  
  const keyScore = calculateKeyCompatibility(
    track1.audioFeatures.key,
    track2.audioFeatures.key
  );
  
  const energyScore = calculateEnergyFlow(
    track1.audioFeatures.energy,
    track2.audioFeatures.energy,
    flowType
  );
  
  // Calcular score ponderado
  const totalScore = 
    (bpmScore * AI_CONFIG.WEIGHTS.BPM_SIMILARITY) +
    (keyScore * AI_CONFIG.WEIGHTS.KEY_COMPATIBILITY) +
    (energyScore * AI_CONFIG.WEIGHTS.ENERGY_FLOW);
  
  return totalScore;
}

/**
 * Optimiza el orden de una cola de tracks usando el algoritmo de IA
 * @param {Array} tracks - Array de tracks con audio features
 * @param {string} flowType - Tipo de flujo de energía ('build_up', 'maintain', 'cool_down')
 * @returns {Array} Tracks ordenados óptimamente
 */
export function optimizeQueue(tracks, flowType = 'maintain') {
  if (!tracks || tracks.length <= 1) return tracks;
  
  // Filtrar tracks que no tienen audio features
  const validTracks = tracks.filter(track => track.audioFeatures);
  
  if (validTracks.length <= 1) return tracks;
  
  // Algoritmo greedy: comenzar con el primer track y encontrar el mejor siguiente
  const optimized = [validTracks[0]];
  const remaining = validTracks.slice(1);
  
  while (remaining.length > 0) {
    const currentTrack = optimized[optimized.length - 1];
    let bestIndex = 0;
    let bestScore = -1;
    
    // Encontrar el track con mejor score de transición
    remaining.forEach((track, index) => {
      const score = calculateTransitionScore(currentTrack, track, flowType);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    
    // Añadir el mejor track y removerlo de remaining
    optimized.push(remaining[bestIndex]);
    remaining.splice(bestIndex, 1);
  }
  
  return optimized;
}

/**
 * Agrupa tracks por rangos de BPM similares
 * @param {Array} tracks - Array de tracks con audio features
 * @returns {Object} Objeto con grupos de tracks por rango de BPM
 */
export function groupByBPM(tracks) {
  const groups = {};
  
  tracks.forEach(track => {
    if (!track.audioFeatures) return;
    
    const bpm = Math.round(track.audioFeatures.tempo);
    const rangeStart = Math.floor(bpm / 10) * 10;
    const rangeKey = `${rangeStart}-${rangeStart + 9}`;
    
    if (!groups[rangeKey]) {
      groups[rangeKey] = [];
    }
    
    groups[rangeKey].push(track);
  });
  
  return groups;
}

/**
 * Agrupa tracks por key musical
 * @param {Array} tracks - Array de tracks con audio features
 * @returns {Object} Objeto con grupos de tracks por key
 */
export function groupByKey(tracks) {
  const groups = {};
  
  tracks.forEach(track => {
    if (!track.audioFeatures) return;
    
    const key = track.audioFeatures.key;
    const keyName = KEY_NAMES[key];
    
    if (!groups[keyName]) {
      groups[keyName] = [];
    }
    
    groups[keyName].push(track);
  });
  
  return groups;
}

/**
 * Analiza la cola y proporciona estadísticas
 * @param {Array} tracks - Array de tracks con audio features
 * @returns {Object} Estadísticas de la cola
 */
export function analyzeQueue(tracks) {
  if (!tracks || tracks.length === 0) {
    return {
      avgBPM: 0,
      avgEnergy: 0,
      avgDanceability: 0,
      bpmRange: { min: 0, max: 0 },
      energyRange: { min: 0, max: 0 },
      dominantKey: null,
      totalDuration: 0,
    };
  }
  
  const validTracks = tracks.filter(track => track.audioFeatures);
  
  if (validTracks.length === 0) {
    return {
      avgBPM: 0,
      avgEnergy: 0,
      avgDanceability: 0,
      bpmRange: { min: 0, max: 0 },
      energyRange: { min: 0, max: 0 },
      dominantKey: null,
      totalDuration: 0,
    };
  }
  
  // Calcular promedios
  const avgBPM = validTracks.reduce((sum, t) => sum + t.audioFeatures.tempo, 0) / validTracks.length;
  const avgEnergy = validTracks.reduce((sum, t) => sum + t.audioFeatures.energy, 0) / validTracks.length;
  const avgDanceability = validTracks.reduce((sum, t) => sum + t.audioFeatures.danceability, 0) / validTracks.length;
  
  // Calcular rangos
  const bpms = validTracks.map(t => t.audioFeatures.tempo);
  const energies = validTracks.map(t => t.audioFeatures.energy);
  
  const bpmRange = {
    min: Math.min(...bpms),
    max: Math.max(...bpms),
  };
  
  const energyRange = {
    min: Math.min(...energies),
    max: Math.max(...energies),
  };
  
  // Encontrar key dominante
  const keyCount = {};
  validTracks.forEach(track => {
    const key = track.audioFeatures.key;
    keyCount[key] = (keyCount[key] || 0) + 1;
  });
  
  const dominantKeyNum = Object.keys(keyCount).reduce((a, b) => 
    keyCount[a] > keyCount[b] ? a : b
  );
  const dominantKey = KEY_NAMES[dominantKeyNum];
  
  // Calcular duración total
  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
  
  return {
    avgBPM: Math.round(avgBPM),
    avgEnergy: Math.round(avgEnergy * 100) / 100,
    avgDanceability: Math.round(avgDanceability * 100) / 100,
    bpmRange,
    energyRange,
    dominantKey,
    totalDuration,
  };
}

/**
 * Sugiere el mejor próximo track basado en el track actual
 * @param {Object} currentTrack - Track actual con audio features
 * @param {Array} availableTracks - Array de tracks disponibles
 * @param {string} flowType - Tipo de flujo de energía
 * @returns {Object|null} Mejor track sugerido o null
 */
export function suggestNextTrack(currentTrack, availableTracks, flowType = 'maintain') {
  if (!currentTrack || !currentTrack.audioFeatures || !availableTracks || availableTracks.length === 0) {
    return null;
  }
  
  let bestTrack = null;
  let bestScore = -1;
  
  availableTracks.forEach(track => {
    if (!track.audioFeatures) return;
    
    const score = calculateTransitionScore(currentTrack, track, flowType);
    
    if (score > bestScore) {
      bestScore = score;
      bestTrack = track;
    }
  });
  
  return bestTrack;
}
