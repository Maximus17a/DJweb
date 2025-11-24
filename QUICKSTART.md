# ⚡ Quick Start - NeonFlow AI DJ

Guía rápida para poner en marcha la aplicación en **5 minutos**.

---

## 🚀 Inicio Rápido (Local)

### 1. Clonar e instalar

```bash
git clone https://github.com/Maximus17a/DJweb.git
cd DJweb
pnpm install
```

### 2. Configurar Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una app
3. Añade Redirect URI: `http://localhost:5173/callback`
4. Copia el **Client ID**

### 3. Configurar variables de entorno

```bash
# Copia el ejemplo
cp .env.example .env.local

# Edita .env.local y añade tu Client ID
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
VITE_REDIRECT_URI=http://localhost:5173/callback
```

### 4. Ejecutar

```bash
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## ☁️ Deploy en Vercel (Producción)

### 1. Deploy

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### 2. Configurar variables

En Vercel Dashboard → Settings → Environment Variables:

```
VITE_SPOTIFY_CLIENT_ID=tu_client_id
VITE_REDIRECT_URI=https://tu-dominio.vercel.app/callback
```

### 3. Actualizar Spotify

Añade en Spotify Dashboard → Redirect URIs:
```
https://tu-dominio.vercel.app/callback
```

### 4. Redeploy

```bash
vercel --prod
```

---

## 📋 Variables de Entorno Mínimas

### Desarrollo Local

```env
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
VITE_REDIRECT_URI=http://localhost:5173/callback
```

### Producción (Vercel)

```env
VITE_SPOTIFY_CLIENT_ID=tu_client_id_aqui
VITE_REDIRECT_URI=https://tu-dominio.vercel.app/callback
```

---

## ⚠️ Requisitos

- ✅ Node.js 18+
- ✅ pnpm
- ✅ Cuenta de Spotify **Premium** (para el reproductor)
- ✅ Aplicación registrada en Spotify Developer

---

## 🐛 Problemas Comunes

### "Redirect URI mismatch"
→ Verifica que la URI en `.env.local` coincida con Spotify Dashboard

### "No devices found"
→ Necesitas Spotify Premium y abrir Spotify en otro dispositivo

### "Variables not defined"
→ Reinicia el servidor después de cambiar `.env.local`

---

## 📚 Documentación Completa

- [README.md](./README.md) - Documentación completa
- [ENV_GUIDE.md](./ENV_GUIDE.md) - Guía detallada de variables
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de deployment paso a paso

---

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando. Disfruta de las mezclas con IA 🎵
