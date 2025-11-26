// Spotify OAuth Configuration
export const SPOTIFY_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  REDIRECT_URI: (typeof window !== 'undefined') ? `${window.location.origin}/callback` : (import.meta.env.VITE_REDIRECT_URI || 'http://localhost:3000/callback'),
  AUTH_ENDPOINT: 'https://accounts.spotify.com/authorize',
  TOKEN_ENDPOINT: 'https://accounts.spotify.com/api/token',
  SCOPES: [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-playback-position',
  ].join(' '),
};

// Spotify API Configuration
export const SPOTIFY_API = {
  BASE_URL: 'https://api.spotify.com/v1',
  ENDPOINTS: {
    ME: '/me',
    SEARCH: '/search',
    TRACKS: '/tracks',
    AUDIO_FEATURES: '/audio-features',
    RECOMMENDATIONS: '/recommendations', // <--- NUEVO
    PLAYLISTS: '/me/playlists',
    PLAYER: '/me/player',
    DEVICES: '/me/player/devices',
  },
};

// AI Configuration
export const AI_CONFIG = {
  BPM_TOLERANCE: 5,
  
  KEY_COMPATIBILITY: {
    0: [0, 7, 5],   1: [1, 8, 6],   2: [2, 9, 7],
    3: [3, 10, 8],  4: [4, 11, 9],  5: [5, 0, 10],
    6: [6, 1, 11],  7: [7, 2, 0],   8: [8, 3, 1],
    9: [9, 4, 2],   10: [10, 5, 3], 11: [11, 6, 4],
  },
  
  WEIGHTS: {
    BPM_SIMILARITY: 0.4,
    KEY_COMPATIBILITY: 0.3,
    ENERGY_FLOW: 0.3,
  },
  
  ENERGY_FLOW: {
    BUILD_UP: 0.1,
    MAINTAIN: 0.05,
    COOL_DOWN: -0.1,
  },
  
  CROSSFADE_DURATION: 5000,
};

export const PLAYER_CONFIG = {
  NAME: 'NeonFlow AI DJ',
  VOLUME: 0.5, 
  UPDATE_INTERVAL: 1000,
};

export const UI_CONFIG = {
  SEARCH_DEBOUNCE: 500,
  TOAST_DURATION: 3000,
  MAX_QUEUE_DISPLAY: 50,
  ANIMATION_DURATION: 300,
};

export const KEY_NAMES = [
  'C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F',
  'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'
];

export const MODE_NAMES = {
  0: 'Minor',
  1: 'Major',
};

export const ERROR_MESSAGES = {
  NO_SPOTIFY_PREMIUM: 'Se requiere Spotify Premium.',
  AUTH_FAILED: 'Error de autenticación.',
  PLAYBACK_FAILED: 'Error al reproducir.',
  SEARCH_FAILED: 'Error al buscar canciones.',
  FEATURES_FAILED: 'Error al obtener audio features.',
  NO_DEVICES: 'No se encontraron dispositivos.',
};

export const SUCCESS_MESSAGES = {
  TRACK_ADDED: 'Canción añadida a la cola',
  QUEUE_OPTIMIZED: 'Cola optimizada por IA',
  PLAYLIST_LOADED: 'Playlist cargada',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  TOKEN_EXPIRY: 'spotify_token_expiry',
  CODE_VERIFIER: 'spotify_code_verifier',
  USER_PREFERENCES: 'user_preferences',
  QUEUE_STATE: 'queue_state',
};