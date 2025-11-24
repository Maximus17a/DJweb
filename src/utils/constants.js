// Spotify OAuth Configuration
export const SPOTIFY_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
  REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback',
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
    PLAYLISTS: '/me/playlists',
    PLAYER: '/me/player',
    DEVICES: '/me/player/devices',
  },
};

// AI Configuration
export const AI_CONFIG = {
  // BPM tolerance for matching (±5 BPM)
  BPM_TOLERANCE: 5,
  
  // Key compatibility matrix (Circle of Fifths)
  // Compatible keys for harmonic mixing
  KEY_COMPATIBILITY: {
    0: [0, 7, 5],   // C -> C, G, F
    1: [1, 8, 6],   // C# -> C#, G#, F#
    2: [2, 9, 7],   // D -> D, A, G
    3: [3, 10, 8],  // D# -> D#, A#, G#
    4: [4, 11, 9],  // E -> E, B, A
    5: [5, 0, 10],  // F -> F, C, A#
    6: [6, 1, 11],  // F# -> F#, C#, B
    7: [7, 2, 0],   // G -> G, D, C
    8: [8, 3, 1],   // G# -> G#, D#, C#
    9: [9, 4, 2],   // A -> A, E, D
    10: [10, 5, 3], // A# -> A#, F, D#
    11: [11, 6, 4], // B -> B, F#, E
  },
  
  // Weights for transition score calculation
  WEIGHTS: {
    BPM_SIMILARITY: 0.4,
    KEY_COMPATIBILITY: 0.3,
    ENERGY_FLOW: 0.3,
  },
  
  // Energy flow preferences
  ENERGY_FLOW: {
    BUILD_UP: 0.1,    // Gradual increase
    MAINTAIN: 0.05,   // Keep similar energy
    COOL_DOWN: -0.1,  // Gradual decrease
  },
  
  // Crossfade duration in milliseconds
  CROSSFADE_DURATION: 5000,
};

// Player Configuration
export const PLAYER_CONFIG = {
  NAME: 'NeonFlow AI DJ',
  VOLUME: 0.5, // Default volume (0-1)
  UPDATE_INTERVAL: 1000, // Position update interval in ms
};

// UI Configuration
export const UI_CONFIG = {
  SEARCH_DEBOUNCE: 500, // ms
  TOAST_DURATION: 3000, // ms
  MAX_QUEUE_DISPLAY: 50,
  ANIMATION_DURATION: 300, // ms
};

// Key names for display
export const KEY_NAMES = [
  'C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F',
  'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'
];

// Mode names
export const MODE_NAMES = {
  0: 'Minor',
  1: 'Major',
};

// Error messages
export const ERROR_MESSAGES = {
  NO_SPOTIFY_PREMIUM: 'Se requiere Spotify Premium para usar el reproductor web. Por favor, actualiza tu cuenta.',
  AUTH_FAILED: 'Error de autenticación. Por favor, intenta iniciar sesión nuevamente.',
  PLAYBACK_FAILED: 'Error al reproducir. Asegúrate de que tu cuenta de Spotify esté activa.',
  SEARCH_FAILED: 'Error al buscar canciones. Por favor, intenta nuevamente.',
  FEATURES_FAILED: 'Error al obtener características de audio.',
  NO_DEVICES: 'No se encontraron dispositivos de reproducción. Abre Spotify en otro dispositivo o actualiza la página.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  TRACK_ADDED: 'Canción añadida a la cola',
  QUEUE_OPTIMIZED: 'Cola optimizada por IA',
  PLAYLIST_LOADED: 'Playlist cargada exitosamente',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  TOKEN_EXPIRY: 'spotify_token_expiry',
  CODE_VERIFIER: 'spotify_code_verifier',
  USER_PREFERENCES: 'user_preferences',
  QUEUE_STATE: 'queue_state',
};
