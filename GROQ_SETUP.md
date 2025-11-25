# 🚀 Configuración de Groq API (Alternativa Gratuita a OpenAI)

## ¿Por qué Groq?

**Groq** es una alternativa completamente gratuita a OpenAI que ofrece ventajas significativas para tu aplicación DJ:

### Ventajas de Groq

| Característica | Groq | OpenAI (GPT-3.5) |
|----------------|------|------------------|
| **Costo** | ✅ Completamente gratis | ❌ Requiere pago |
| **Límites diarios** | ✅ 14,400 requests/día | ⚠️ Según plan |
| **Velocidad** | ⚡ Extremadamente rápido (LPU) | ⚡ Rápido |
| **Registro** | ✅ Solo email | ⚠️ Requiere tarjeta |
| **Calidad** | ✅ Llama 3.3 70B (excelente) | ✅ GPT-3.5 Turbo |
| **Compatibilidad** | ✅ API compatible con OpenAI | ✅ Nativo |

## 📋 Pasos de Configuración

### 1. Obtener tu API Key de Groq (5 minutos)

#### Paso 1: Crear cuenta en Groq

1. Ve a **https://console.groq.com/**
2. Haz clic en **"Sign Up"** o **"Log In"**
3. Regístrate con tu email (Gmail, GitHub, etc.)
4. **NO se requiere tarjeta de crédito** ✅

#### Paso 2: Crear API Key

1. Una vez dentro, ve a **"API Keys"** en el menú lateral
2. Haz clic en **"Create API Key"**
3. Dale un nombre descriptivo: `DJweb-Production`
4. Copia la API key generada (empieza con `gsk_...`)
5. **⚠️ IMPORTANTE**: Guárdala en un lugar seguro, no se mostrará de nuevo

### 2. Configurar en Vercel

#### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. Ve a tu proyecto en **https://vercel.com/dashboard**
2. Selecciona tu proyecto **DJweb**
3. Ve a **Settings** → **Environment Variables**
4. Añade una nueva variable:
   - **Name**: `GROQ_API_KEY`
   - **Value**: Tu API key de Groq (la que copiaste)
   - **Environments**: Selecciona **Production**, **Preview** y **Development**
5. Haz clic en **"Save"**
6. **Redeploy** tu aplicación:
   - Ve a **Deployments**
   - Haz clic en los tres puntos del último deployment
   - Selecciona **"Redeploy"**
   - Desmarca **"Use existing Build Cache"**
   - Haz clic en **"Redeploy"**

#### Opción B: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI si no la tienes
npm i -g vercel

# Login
vercel login

# Añadir variable de entorno
vercel env add GROQ_API_KEY

# Cuando te pregunte, pega tu API key
# Selecciona todos los entornos (Production, Preview, Development)

# Redeploy
vercel --prod
```

### 3. Verificar la Configuración

#### Verificación Local (Opcional)

Si quieres probar localmente antes de deployar:

1. Crea un archivo `.env.local` en la raíz del proyecto:

```env
GROQ_API_KEY=gsk_tu_api_key_aqui
```

2. Ejecuta el proyecto:

```bash
pnpm dev
```

3. Prueba el chat de IA en la aplicación

#### Verificación en Producción

1. Abre tu aplicación en Vercel: `https://tu-app.vercel.app`
2. Inicia sesión con Spotify
3. Añade algunas canciones a la cola
4. Abre el **Chat IA** en el dashboard
5. Escribe un mensaje: `"Hola, ¿qué puedes hacer?"`
6. Si recibes una respuesta del modelo, ¡está funcionando! ✅

## 🔧 Solución de Problemas

### Error: "Groq API key not configured on server"

**Causa**: La variable de entorno `GROQ_API_KEY` no está configurada en Vercel.

**Solución**:
1. Verifica que añadiste la variable en Vercel Dashboard
2. Asegúrate de haber hecho **Redeploy** después de añadirla
3. Verifica que la API key sea correcta (empieza con `gsk_`)

### Error: "Rate limit exceeded"

**Causa**: Has excedido los límites del plan gratuito (14,400 requests/día).

**Solución**:
1. Espera hasta el día siguiente (los límites se resetean cada 24 horas)
2. Si necesitas más, considera usar múltiples cuentas de Groq (no recomendado)
3. Implementa un sistema de caché para reducir llamadas

### El chat no responde

**Causa**: Puede ser un problema de red o configuración.

**Solución**:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Envía un mensaje en el chat
4. Busca la petición a `/api/ai_groq`
5. Revisa el error en la respuesta
6. Si ves `500` o `502`, verifica los logs de Vercel

### Verificar logs en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Haz clic en **"Functions"** en el menú lateral
3. Busca `/api/ai_groq`
4. Revisa los logs de ejecución

## 📊 Límites del Plan Gratuito de Groq

| Modelo | Requests/Día | Tokens/Minuto | Requests/Minuto |
|--------|--------------|---------------|-----------------|
| **Llama 3.3 70B** | 14,400 | 64,000 | 30 |
| Llama 3.1 8B | 14,400 | 60,000 | 30 |
| Qwen 3 32B | 1,000 | 6,000 | 30 |

**Para tu aplicación DJ**: Con 14,400 requests/día, puedes hacer aproximadamente **600 requests por hora** o **10 requests por minuto**, lo cual es más que suficiente para uso normal.

## 🔄 Migración desde OpenAI

Si anteriormente usabas OpenAI, los cambios ya están aplicados:

### Cambios Realizados

1. ✅ Creado nuevo endpoint `/api/ai_groq.js`
2. ✅ Actualizado `AIChat.jsx` para usar el nuevo endpoint
3. ✅ Mantenida compatibilidad con la API de OpenAI

### Archivo Original

El archivo original `/api/ai.js` se mantiene intacto por si quieres volver a usar OpenAI en el futuro.

## 🎯 Modelos Disponibles en Groq

Groq ofrece varios modelos gratuitos. El configurado actualmente es:

- **`llama-3.3-70b-versatile`**: Modelo principal (recomendado)
  - 70 mil millones de parámetros
  - Excelente para conversación y razonamiento
  - Respuestas en español de alta calidad

### Otros modelos disponibles (puedes cambiarlos en `api/ai_groq.js`):

- `llama-3.1-8b-instant`: Más rápido, menos potente
- `mixtral-8x7b-32768`: Bueno para contextos largos
- `gemma-7b-it`: Modelo de Google, eficiente

## 📚 Recursos Adicionales

- **Documentación de Groq**: https://console.groq.com/docs
- **Playground de Groq**: https://console.groq.com/playground
- **Modelos soportados**: https://console.groq.com/docs/models
- **Rate limits**: https://console.groq.com/docs/rate-limits

## 🆘 Soporte

Si tienes problemas con la configuración:

1. Revisa esta guía completa
2. Verifica los logs en Vercel Dashboard
3. Comprueba que la API key sea válida en https://console.groq.com/keys
4. Asegúrate de haber hecho redeploy después de añadir la variable

---

**✅ ¡Listo!** Tu aplicación DJ ahora usa Groq en lugar de OpenAI, completamente gratis y con límites generosos.
