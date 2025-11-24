**Despliegue en Vercel — Pasos y variables de entorno**

- **Resumen:** el proyecto usa funciones serverless en `api/spotify/*` para intercambiar tokens y refrescarlos (endpoints: `/api/spotify/exchange` y `/api/spotify/token`). Estas funciones usan la `SUPABASE_SERVICE_ROLE` y las credenciales de Spotify — no deben exponerse en el cliente.

- **Variables de entorno (Project → Settings → Environment Variables)**
  - `VITE_SUPABASE_URL` — URL pública de Supabase (ej: `https://aprqjjivvecfqpeyzdtc.supabase.co`).
  - `VITE_SUPABASE_ANON_KEY` — public anon key (frontend).
  - `SUPABASE_SERVICE_ROLE` — service_role key (SECRETO, SOLO en Vercel server environment).
  - `SPOTIFY_CLIENT_ID` — client id de Spotify (SECRETO en server env).
  - `SPOTIFY_CLIENT_SECRET` — client secret de Spotify (SECRETO en server env).
  - `SPOTIFY_REDIRECT_URI` — URI de callback pública (ej: `https://neonflow-ai-dj.vercel.app/callback`).
  - `OPENAI_API_KEY` — (opcional) clave para OpenAI si quieres que la API proxye peticiones.

- **Valores públicos vs secretos:** cualquier variable que empiece con `VITE_` será expuesta al bundle del cliente; pon únicamente `VITE_SUPABASE_*` y `VITE_SPOTIFY_CLIENT_ID` como `Environment Variable` en la sección `Production` o `Preview` según corresponda. Las otras (service role, secrets) deben marcarse como `Encrypted`/`Secret` en Vercel.

- **Deploy rápido:**
  1. Conecta el repo en Vercel (Import Project → GitHub → selecciona repo `DJweb`).
  2. Añade las variables de entorno indicadas arriba (en Production y Preview si lo deseas).
  3. Despliega (Deploy). Vercel detectará la carpeta `api/` y expondrá las serverless functions.

- **Comprobación post-deploy:**
  - Accede a `https://<tu-deployment>.vercel.app/api/spotify/token` con una sesión de Supabase (p.ej. desde el navegador con la cookie de sesión) y confirma respuesta JSON con `{ access_token }`.
  - Reproduce el flujo de login: la app hará POST a `/api/spotify/exchange` durante el callback.

- **Notas de seguridad:**
  - Nunca pongas `SUPABASE_SERVICE_ROLE` o `SPOTIFY_CLIENT_SECRET` en el `.env` del frontend ni en el repo.
  - Si usas roles, asegúrate de que la columna `auth_uid` o el mapeo `spotify_id` en `users` coincidan con `auth.uid()`.
