# 🎵 NeonFlow AI DJ

Una aplicación web moderna de DJ impulsada por IA que analiza metadatos musicales de Spotify para crear transiciones perfectas entre canciones.

![NeonFlow AI DJ](https://img.shields.io/badge/React-19.2.0-blue) ![Vite](https://img.shields.io/badge/Vite-7.2.4-purple) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.17-cyan)

## ✨ Características

### 🎧 Reproductor Web Inteligente
- **Integración completa con Spotify Web Playback SDK**
- Controles de reproducción (Play, Pause, Next, Previous)
- Control de volumen y búsqueda de posición
- Visualización de carátula con animación de vinilo

### 🤖 IA DJ (Algoritmo de Mezcla)
- **Análisis de Audio Features**: BPM, energía, danceability, key musical
- **Optimización automática de cola**: Ordena canciones por compatibilidad
- **Compatibilidad de tonalidades**: Usa el círculo de quintas para transiciones armónicas
- **Flujo de energía**: Crea curvas de energía para sets perfectos

### 🎚️ AI Auto-Mix
- **Transiciones automáticas** entre canciones
- Detección de final de track
- Crossfade configurable (5 segundos por defecto)

### 🎨 Diseño Cyberpunk/Neon
- Dark Mode con efectos glassmorphism
- Gradientes neón (violeta, cyan, rosa)
- Animaciones fluidas y efectos de brillo
- Totalmente responsive

### 🔐 Autenticación Segura
- **OAuth 2.0 con PKCE** (sin exponer Client Secret)
- Manejo automático de refresh tokens
- Sin backend pesado necesario

## 🚀 Tecnologías

### Frontend
- **React 19.2** - Framework UI
- **Vite 7.2** - Build tool
- **Tailwind CSS 4.1** - Styling
- **React Router 7** - Routing
- **Lucide React** - Iconos
- **Axios** - HTTP client

### APIs
- **Spotify Web API** - Búsqueda, metadatos, playlists
- **Spotify Web Playback SDK** - Reproductor
- **Audio Features API** - Análisis de BPM, energía, key

### Base de Datos (Opcional)
- **Supabase** - Para guardar preferencias y historial

## 📋 Requisitos Previos

1. **Cuenta de Spotify Premium** (requerido para Web Playback SDK)
2. **Node.js 18+** y **pnpm**
3. **Aplicación de Spotify** registrada en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Maximus17a/DJweb.git
cd DJweb
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar Spotify Developer App

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. En **Settings**, añade las siguientes Redirect URIs:
   - `http://localhost:5173/callback` (desarrollo)
   - `https://tu-dominio.vercel.app/callback` (producción)
4. Copia el **Client ID**

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Spotify OAuth
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
VITE_REDIRECT_URI=http://localhost:5173/callback

# Supabase (Opcional - para guardar preferencias)
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 5. Ejecutar en desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🌐 Deployment

### Deploy en Vercel (Frontend)

1. **Conectar repositorio a Vercel**:
   ```bash
   # Instalar Vercel CLI
   pnpm add -g vercel
   
   # Login y deploy
   vercel login
   vercel
   ```

2. **Configurar variables de entorno en Vercel**:
   - Ve a tu proyecto en Vercel Dashboard
   - Settings → Environment Variables
   - Añade:
     - `VITE_SPOTIFY_CLIENT_ID`
     - `VITE_REDIRECT_URI` (con tu dominio de Vercel)
     - `VITE_SUPABASE_URL` (opcional)
     - `VITE_SUPABASE_ANON_KEY` (opcional)

3. **Actualizar Redirect URI en Spotify**:
   - Ve a Spotify Developer Dashboard
   - Añade `https://tu-app.vercel.app/callback`

### Configurar Supabase (Opcional)

Si quieres guardar preferencias de usuario y historial de mezclas:

1. **Crear proyecto en Supabase**:
   - Ve a [Supabase](https://supabase.com)
   - Crea un nuevo proyecto (plan gratuito)

2. **Crear tablas** (SQL Editor):

```sql
-- Tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de mezclas
CREATE TABLE mix_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  tracks JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de preferencias
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  auto_mix_enabled BOOLEAN DEFAULT false,
  fade_duration INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. **Obtener credenciales**:
   - Project Settings → API
   - Copia `URL` y `anon/public key`
   - Añádelos a tus variables de entorno

## 📖 Uso

### 1. Iniciar Sesión
- Haz clic en "Conectar con Spotify"
- Autoriza la aplicación
- Serás redirigido al dashboard

### 2. Buscar Música
- Usa la barra de búsqueda para encontrar canciones
- Haz clic en una canción para añadirla a la cola

### 3. Optimizar Cola con IA
- Añade varias canciones a la cola
- Haz clic en "Optimizar con IA"
- La IA reordenará las canciones para transiciones perfectas

### 4. Activar AI Auto-Mix
- Haz clic en el botón "Activar AI Auto-Mix"
- Las canciones se reproducirán automáticamente con transiciones

### 5. Controlar Reproducción
- Usa los controles del reproductor
- Ajusta el volumen
- Navega por la cola

## 🎯 Algoritmo de IA

El algoritmo de mezcla inteligente analiza tres factores principales:

### 1. Similitud de BPM (40%)
- Agrupa canciones con BPM similar (±5 BPM)
- Evita cambios bruscos de tempo

### 2. Compatibilidad de Tonalidad (30%)
- Usa el círculo de quintas
- Prioriza transiciones armónicas
- Detecta keys compatibles (C → G, D → A, etc.)

### 3. Flujo de Energía (30%)
- Analiza niveles de energía (0-1)
- Crea curvas: build-up, maintain, cool-down
- Evita saltos bruscos de energía

**Fórmula del Score de Transición**:
```
score = (bpmSimilarity × 0.4) + (keyCompatibility × 0.3) + (energyFlow × 0.3)
```

## 🔧 Estructura del Proyecto

```
/DJweb
├── src/
│   ├── assets/              # Recursos estáticos
│   ├── components/
│   │   ├── Auth/            # LoginButton
│   │   ├── Layout/          # Navbar, BackgroundEffect
│   │   ├── Player/          # WebPlayback
│   │   ├── Library/         # SearchBar, TrackList
│   │   └── AI/              # AIStatusBadge, QueueManager
│   ├── context/
│   │   ├── AuthContext.jsx  # Estado de autenticación
│   │   └── PlayerContext.jsx # Estado del reproductor
│   ├── hooks/
│   │   └── useSpotifyAuth.js # Hook de OAuth PKCE
│   ├── services/
│   │   └── spotifyApi.js    # Cliente de Spotify API
│   ├── styles/
│   │   └── globals.css      # Estilos Tailwind + custom
│   ├── utils/
│   │   ├── bpmMatcher.js    # Algoritmo de IA
│   │   ├── constants.js     # Constantes
│   │   └── pkce.js          # Utilidades PKCE
│   ├── pages/
│   │   ├── Dashboard.jsx    # Página principal
│   │   └── Callback.jsx     # OAuth callback
│   ├── App.jsx              # Componente raíz
│   └── main.jsx             # Entry point
├── .env.example             # Ejemplo de variables
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🐛 Solución de Problemas

### "Se requiere Spotify Premium"
- El Web Playback SDK solo funciona con cuentas Premium
- Actualiza tu cuenta en [Spotify](https://www.spotify.com/premium/)

### "No se encontraron dispositivos"
- Abre Spotify en otro dispositivo
- Actualiza la página
- Verifica que el token sea válido

### Error de autenticación
- Verifica que el Client ID sea correcto
- Verifica que la Redirect URI esté configurada en Spotify Dashboard
- Limpia localStorage y vuelve a iniciar sesión

## 📝 Licencia

MIT License

## 👨‍💻 Autor

**Maximus17a**
- GitHub: [@Maximus17a](https://github.com/Maximus17a)

---

**⚡ Hecho con React, IA y mucho ❤️ por la música**
