# 🔐 Guía Completa de Variables de Entorno - NeonFlow AI DJ

Esta guía detalla todas las variables de entorno necesarias para ejecutar la aplicación en diferentes entornos.

---

## 📝 Tabla de Contenidos

1. [Variables Requeridas](#variables-requeridas)
2. [Variables Opcionales](#variables-opcionales)
3. [Configuración por Entorno](#configuración-por-entorno)
4. [Cómo Obtener las Credenciales](#cómo-obtener-las-credenciales)
5. [Ejemplos de Configuración](#ejemplos-de-configuración)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Variables Requeridas

Estas variables son **obligatorias** para que la aplicación funcione correctamente.

### `VITE_SPOTIFY_CLIENT_ID`

- **Descripción**: Client ID de tu aplicación de Spotify
- **Tipo**: String (32 caracteres alfanuméricos)
- **Ejemplo**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Dónde obtenerlo**: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- **Uso**: Autenticación OAuth 2.0 con Spotify

```env
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
```

### `VITE_REDIRECT_URI`

- **Descripción**: URL de callback después de la autenticación de Spotify
- **Tipo**: String (URL completa)
- **Ejemplos**:
  - Desarrollo: `http://localhost:5173/callback`
  - Producción: `https://tu-dominio.vercel.app/callback`
- **Importante**: Debe coincidir exactamente con la configurada en Spotify Dashboard

```env
# Desarrollo
VITE_REDIRECT_URI=http://localhost:5173/callback

# Producción
VITE_REDIRECT_URI=https://neonflow-dj.vercel.app/callback
```

---

## 🔧 Variables Opcionales

Estas variables son **opcionales** pero añaden funcionalidades adicionales.

### `VITE_SUPABASE_URL`

- **Descripción**: URL de tu proyecto de Supabase
- **Tipo**: String (URL)
- **Ejemplo**: `https://abcdefghijklmnop.supabase.co`
- **Dónde obtenerlo**: Supabase Dashboard → Settings → API → Project URL
- **Uso**: Guardar preferencias de usuario y historial de mezclas

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
```

### `VITE_SUPABASE_ANON_KEY`

- **Descripción**: Clave pública (anon/public) de Supabase
- **Tipo**: String (JWT largo)
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Dónde obtenerlo**: Supabase Dashboard → Settings → API → anon/public key
- **Uso**: Autenticación con Supabase desde el cliente

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg1NjAwMCwiZXhwIjoxOTM5NDMyMDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🌍 Configuración por Entorno

### 🖥️ Desarrollo Local

**Archivo**: `.env.local` (en la raíz del proyecto)

```env
# Spotify OAuth
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
VITE_REDIRECT_URI=http://localhost:5173/callback

# Supabase (Opcional)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Pasos**:
1. Copia `.env.example` a `.env.local`
2. Completa con tus credenciales
3. Ejecuta `pnpm dev`

---

### ☁️ Producción (Vercel)

**Configuración**: Vercel Dashboard → Settings → Environment Variables

| Variable | Valor | Environment |
|----------|-------|-------------|
| `VITE_SPOTIFY_CLIENT_ID` | Tu Client ID | Production, Preview, Development |
| `VITE_REDIRECT_URI` | `https://tu-dominio.vercel.app/callback` | Production |
| `VITE_REDIRECT_URI` | `https://preview-url.vercel.app/callback` | Preview |
| `VITE_REDIRECT_URI` | `http://localhost:5173/callback` | Development |
| `VITE_SUPABASE_URL` | Tu URL de Supabase | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Tu Anon Key | Production, Preview, Development |

**Pasos**:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade cada variable
4. Selecciona los entornos apropiados
5. Haz **Redeploy** del proyecto

**Importante**: Después de añadir o modificar variables, siempre haz redeploy.

---

### 🧪 Preview/Staging (Vercel)

Vercel crea automáticamente URLs de preview para cada pull request.

**Configuración**: Usa las mismas variables que producción, pero ajusta `VITE_REDIRECT_URI`:

```
VITE_REDIRECT_URI=https://djweb-git-feature-branch-username.vercel.app/callback
```

**Tip**: Puedes usar un wildcard en Spotify Dashboard:
```
https://*.vercel.app/callback
```

---

## 🔑 Cómo Obtener las Credenciales

### 1. Spotify Developer Credentials

#### Paso 1: Crear aplicación

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Inicia sesión con tu cuenta de Spotify
3. Haz clic en **"Create app"**
4. Completa el formulario:
   - **App name**: NeonFlow AI DJ
   - **App description**: AI-powered DJ web application
   - **Redirect URIs**: 
     ```
     http://localhost:5173/callback
     https://tu-dominio.vercel.app/callback
     ```
   - **APIs used**: Marca "Web API" y "Web Playback SDK"
5. Acepta los términos y haz clic en **"Save"**

#### Paso 2: Obtener Client ID y Client Secret

1. En tu aplicación, haz clic en **"Settings"**
2. Copia el **Client ID** (32 caracteres)
3. Copia el **Client Secret** y guárdalo en tu proyecto Supabase (o en Vercel env vars si usas el servidor manual)
   - Si usas la integración de proveedores de Supabase, pega el Client ID y Client Secret en Supabase Dashboard → Authentication → Providers → Spotify.

#### Paso 3: Configurar Redirect URIs

Añade todas las URLs donde tu app estará disponible:

```
http://localhost:5173/callback          # Desarrollo local
http://localhost:5174/callback          # Desarrollo alternativo
https://neonflow-dj.vercel.app/callback # Producción
https://*.vercel.app/callback           # Previews (wildcard)
```

---

### 2. Supabase Credentials (Opcional)

#### Paso 1: Crear proyecto

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Inicia sesión o crea una cuenta
3. Haz clic en **"New project"**
4. Completa el formulario:
   - **Organization**: Selecciona o crea una
   - **Name**: `neonflow-ai-dj`
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana (ej: South America - São Paulo)
   - **Pricing Plan**: Free
5. Haz clic en **"Create new project"**
6. Espera ~2 minutos mientras se crea

#### Paso 2: Obtener credenciales

1. En tu proyecto, ve a **Settings** (⚙️) → **API**
2. Copia los siguientes valores:

   **Project URL**:
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **anon/public key**:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg1NjAwMCwiZXhwIjoxOTM5NDMyMDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### Paso 3: Crear tablas

1. Ve a **SQL Editor**
2. Copia el SQL de `DEPLOYMENT.md` (sección 3.2)
3. Ejecuta el script para crear las tablas

---

## 📋 Ejemplos de Configuración

### Ejemplo 1: Desarrollo Local Mínimo

Solo con Spotify (sin Supabase):

```env
# .env.local
VITE_SPOTIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
VITE_REDIRECT_URI=http://localhost:5173/callback
```

### Ejemplo 2: Desarrollo Local Completo

Con Spotify y Supabase:

```env
# .env.local
VITE_SPOTIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
VITE_REDIRECT_URI=http://localhost:5173/callback
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg1NjAwMCwiZXhwIjoxOTM5NDMyMDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Ejemplo 3: Producción en Vercel

Variables en Vercel Dashboard:

```
VITE_SPOTIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
VITE_REDIRECT_URI=https://neonflow-dj.vercel.app/callback
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🐛 Troubleshooting

### Error: "VITE_SPOTIFY_CLIENT_ID is not defined"

**Causa**: La variable no está configurada o el archivo `.env.local` no existe.

**Solución**:
1. Verifica que el archivo `.env.local` existe en la raíz del proyecto
2. Verifica que la variable está escrita correctamente (con `VITE_` al inicio)
3. Reinicia el servidor de desarrollo (`pnpm dev`)

### Error: "Redirect URI mismatch"

**Causa**: La URL de callback no coincide con la configurada en Spotify Dashboard.

**Solución**:
1. Verifica que `VITE_REDIRECT_URI` coincida exactamente con Spotify Dashboard
2. Incluye el protocolo (`http://` o `https://`)
3. Incluye `/callback` al final
4. No uses trailing slash: ❌ `/callback/` ✅ `/callback`

**Ejemplo correcto**:
```
Spotify Dashboard: http://localhost:5173/callback
.env.local:        VITE_REDIRECT_URI=http://localhost:5173/callback
```

### Error: "Failed to fetch user data"

**Causa**: Token de Spotify inválido o expirado.

**Solución**:
1. Limpia el localStorage del navegador
2. Vuelve a iniciar sesión
3. Verifica que el Client ID sea correcto

### Error: "Supabase client is not initialized"

**Causa**: Las credenciales de Supabase no están configuradas.

**Solución**:
1. Si no usas Supabase, ignora este error (es opcional)
2. Si quieres usar Supabase, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

### Variables no se actualizan en Vercel

**Causa**: Vercel cachea las variables de entorno.

**Solución**:
1. Después de cambiar variables en Vercel Dashboard
2. Ve a **Deployments**
3. Haz clic en los tres puntos del último deployment
4. Selecciona **"Redeploy"**
5. Marca **"Use existing Build Cache"** = OFF
6. Haz clic en **"Redeploy"**

---

## 🔒 Seguridad

### ✅ Buenas Prácticas

1. **Nunca** commits el archivo `.env.local` al repositorio
2. **Nunca** expongas el Client Secret de Spotify en el frontend. Si usas Supabase OAuth, añade el Client Secret en Supabase Dashboard (no en el cliente).
3. Usa diferentes Client IDs para desarrollo y producción (opcional pero recomendado)
4. Rota las credenciales periódicamente
5. Limita los Redirect URIs solo a los dominios que uses

### ⚠️ Qué NO hacer

- ❌ No subas `.env.local` a GitHub
- ❌ No compartas tus credenciales públicamente
- ❌ No uses el mismo Client ID en múltiples proyectos
- ❌ No uses credenciales de producción en desarrollo

### 🛡️ Verificación de Seguridad

```bash
# Verifica que .env.local está en .gitignore
cat .gitignore | grep .env

# Verifica que no hay credenciales en el código
git log --all --full-history --source -- '*.env*'
```

---

## 📞 Soporte

Si tienes problemas con las variables de entorno:

1. Revisa esta guía completa
2. Verifica que las credenciales sean correctas
3. Consulta la documentación oficial:
   - [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
   - [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
   - [Spotify OAuth](https://developer.spotify.com/documentation/web-api/concepts/authorization)
   - [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)

---

## ✅ Checklist Final

Antes de desplegar, verifica que tienes:

- [ ] `VITE_SPOTIFY_CLIENT_ID` configurado
- [ ] `VITE_REDIRECT_URI` configurado correctamente
- [ ] Redirect URI añadida en Spotify Dashboard
- [ ] Cuenta de Spotify Premium (para usar el reproductor)
- [ ] Variables configuradas en Vercel (para producción)
- [ ] `.env.local` en `.gitignore`
- [ ] Supabase configurado (opcional)
- [ ] Tablas creadas en Supabase (opcional)

---

**🎉 ¡Todo listo! Tu aplicación debería funcionar correctamente con estas configuraciones.**
