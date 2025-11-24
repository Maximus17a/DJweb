# 🚀 Guía de Deployment - NeonFlow AI DJ

Esta guía te ayudará a desplegar tu aplicación en **Vercel** (frontend) y configurar **Supabase** (base de datos opcional).

## 📦 Prerequisitos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com) (opcional)
- Cuenta en [Spotify Developer](https://developer.spotify.com/dashboard)
- Repositorio de GitHub con el código

---

## 🎵 Paso 1: Configurar Spotify Developer App

### 1.1 Crear aplicación en Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Haz clic en **"Create app"**
3. Completa el formulario:
   - **App name**: NeonFlow AI DJ
   - **App description**: AI-powered DJ web application
   - **Redirect URIs**: 
     - `http://localhost:5173/callback` (para desarrollo)
     - `https://tu-dominio.vercel.app/callback` (añadir después del deploy)
   - **APIs used**: Web API, Web Playback SDK
4. Acepta los términos y haz clic en **"Save"**

### 1.2 Obtener credenciales

1. En tu aplicación, ve a **Settings**
2. Copia el **Client ID** (lo necesitarás para las variables de entorno)
3. **NO necesitas el Client Secret** (usamos PKCE para seguridad)

---

## ☁️ Paso 2: Deploy en Vercel

### 2.1 Conectar repositorio

#### Opción A: Desde Vercel Dashboard (Recomendado)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub: `Maximus17a/DJweb`
4. Vercel detectará automáticamente que es un proyecto Vite

#### Opción B: Desde CLI

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy desde la raíz del proyecto
cd /path/to/DJweb
vercel
```

### 2.2 Configurar variables de entorno en Vercel

1. En tu proyecto de Vercel, ve a **Settings** → **Environment Variables**
2. Añade las siguientes variables:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `VITE_SPOTIFY_CLIENT_ID` | Tu Client ID de Spotify | Production, Preview, Development |
| `VITE_REDIRECT_URI` | `https://tu-dominio.vercel.app/callback` | Production |
| `VITE_REDIRECT_URI` | `http://localhost:5173/callback` | Development |
| `VITE_SUPABASE_URL` | Tu URL de Supabase (opcional) | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Tu Anon Key de Supabase (opcional) | Production, Preview, Development |

**Importante**: Después de añadir las variables, haz **Redeploy** del proyecto.

### 2.3 Actualizar Redirect URI en Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Selecciona tu aplicación
3. Ve a **Settings** → **Redirect URIs**
4. Añade tu dominio de Vercel: `https://tu-dominio.vercel.app/callback`
5. Haz clic en **"Save"**

### 2.4 Verificar deployment

1. Visita tu URL de Vercel: `https://tu-dominio.vercel.app`
2. Haz clic en **"Conectar con Spotify"**
3. Autoriza la aplicación
4. Deberías ser redirigido al dashboard

---

## 🗄️ Paso 3: Configurar Supabase (Opcional)

Supabase se usa para guardar preferencias de usuario y historial de mezclas.

### 3.1 Crear proyecto en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Haz clic en **"New project"**
3. Completa el formulario:
   - **Name**: neonflow-ai-dj
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana a tus usuarios
   - **Pricing Plan**: Free (suficiente para empezar)
4. Espera a que el proyecto se cree (~2 minutos)

### 3.2 Crear tablas de base de datos

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Haz clic en **"New query"**
3. Copia y pega el siguiente SQL:

```sql
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  profile_image TEXT,
  country TEXT,
  product TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de mezclas
CREATE TABLE mix_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tracks JSONB NOT NULL,
  queue_stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de preferencias de usuario
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  auto_mix_enabled BOOLEAN DEFAULT false,
  fade_duration INTEGER DEFAULT 5000,
  default_flow_type TEXT DEFAULT 'maintain',
  theme TEXT DEFAULT 'cyberpunk',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_users_spotify_id ON users(spotify_id);
CREATE INDEX idx_mix_history_user_id ON mix_history(user_id);
CREATE INDEX idx_mix_history_created_at ON mix_history(created_at DESC);
CREATE INDEX idx_preferences_user_id ON preferences(user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver y modificar sus propios datos
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = spotify_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = spotify_id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = spotify_id);

CREATE POLICY "Users can view own mix history" ON mix_history
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

CREATE POLICY "Users can insert own mix history" ON mix_history
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

CREATE POLICY "Users can view own preferences" ON preferences
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

CREATE POLICY "Users can update own preferences" ON preferences
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

CREATE POLICY "Users can insert own preferences" ON preferences
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));
```

4. Haz clic en **"Run"** para ejecutar el SQL

### 3.3 Obtener credenciales de Supabase

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (es una clave larga)
3. Añade estos valores a las variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_ANON_KEY`: anon/public key

### 3.4 Configurar autenticación (opcional)

Si quieres usar la autenticación de Supabase además de Spotify:

1. Ve a **Authentication** → **Providers**
2. Habilita **Spotify** como proveedor
3. Añade tu Client ID y Client Secret de Spotify
4. Configura la Redirect URL

---

## 🔧 Paso 4: Configurar dominio personalizado (Opcional)

### 4.1 Añadir dominio en Vercel

1. En tu proyecto de Vercel, ve a **Settings** → **Domains**
2. Haz clic en **"Add"**
3. Ingresa tu dominio (ej: `neonflow-dj.com`)
4. Sigue las instrucciones para configurar los DNS

### 4.2 Actualizar Redirect URI

1. Ve a Spotify Developer Dashboard
2. Añade tu dominio personalizado: `https://neonflow-dj.com/callback`
3. Actualiza `VITE_REDIRECT_URI` en Vercel con tu nuevo dominio

---

## 🧪 Paso 5: Testing

### 5.1 Verificar funcionalidades

- [ ] Login con Spotify funciona
- [ ] Búsqueda de canciones funciona
- [ ] Añadir canciones a la cola funciona
- [ ] Reproductor funciona (requiere Spotify Premium)
- [ ] Optimización con IA funciona
- [ ] AI Auto-Mix funciona
- [ ] Responsive design funciona en móvil

### 5.2 Verificar en diferentes navegadores

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Móvil (iOS/Android)

---

## 📊 Paso 6: Monitoreo y Analytics

### 6.1 Vercel Analytics

1. En tu proyecto de Vercel, ve a **Analytics**
2. Habilita **Web Analytics** (gratis)
3. Monitorea:
   - Visitas
   - Performance
   - Errores

### 6.2 Supabase Dashboard

1. Ve a **Database** → **Tables** para ver los datos
2. Ve a **API** → **Logs** para ver las queries
3. Monitorea el uso de recursos en **Settings** → **Usage**

---

## 🐛 Troubleshooting

### Error: "Redirect URI mismatch"

**Solución**: Verifica que la Redirect URI en Spotify Dashboard coincida exactamente con la configurada en Vercel.

```
Spotify Dashboard: https://tu-dominio.vercel.app/callback
Vercel ENV: VITE_REDIRECT_URI=https://tu-dominio.vercel.app/callback
```

### Error: "Failed to fetch"

**Solución**: Verifica que las variables de entorno estén correctamente configuradas en Vercel y que hayas hecho redeploy.

### Error: "No devices found"

**Solución**: 
1. Abre Spotify en otro dispositivo
2. Actualiza la página
3. Verifica que tengas Spotify Premium

### Base de datos no guarda datos

**Solución**:
1. Verifica que las políticas de RLS estén correctamente configuradas
2. Verifica que las credenciales de Supabase sean correctas
3. Revisa los logs en Supabase Dashboard

---

## 📈 Límites del Plan Gratuito

### Vercel Free Tier
- ✅ 100 GB bandwidth/mes
- ✅ Serverless Functions: 100 GB-hours/mes
- ✅ 100 deployments/día
- ✅ Dominios personalizados ilimitados
- ⚠️ Sin Edge Functions

### Supabase Free Tier
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth/mes
- ✅ 50,000 monthly active users
- ⚠️ Proyecto se pausa después de 1 semana de inactividad

### Spotify API
- ✅ Rate limit: 180 requests/minuto
- ✅ Sin límite de usuarios
- ⚠️ Web Playback SDK requiere Premium

---

## 🎉 ¡Listo!

Tu aplicación NeonFlow AI DJ está ahora desplegada y lista para usar. Comparte tu URL con amigos y disfruta de las mezclas con IA.

**URL de producción**: `https://tu-dominio.vercel.app`

---

## 📞 Soporte

Si tienes problemas, revisa:
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Spotify API](https://developer.spotify.com/documentation/web-api)
- Issues en GitHub: [github.com/Maximus17a/DJweb/issues](https://github.com/Maximus17a/DJweb/issues)
