/**
 * Utilidades para implementar PKCE (Proof Key for Code Exchange)
 * Necesario para autenticación segura de Spotify sin exponer el Client Secret
 */

/**
 * Genera un string aleatorio para el code verifier
 * @param {number} length - Longitud del string (43-128 caracteres)
 * @returns {string} Code verifier
 */
export function generateCodeVerifier(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * Genera el code challenge a partir del code verifier usando SHA-256
 * @param {string} codeVerifier - Code verifier generado
 * @returns {Promise<string>} Code challenge en base64url
 */
export async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return base64URLEncode(digest);
}

/**
 * Convierte un ArrayBuffer a base64url
 * @param {ArrayBuffer} buffer - Buffer a convertir
 * @returns {string} String en formato base64url
 */
function base64URLEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Guarda el code verifier en localStorage
 * @param {string} codeVerifier - Code verifier a guardar
 */
export function saveCodeVerifier(codeVerifier) {
  localStorage.setItem('spotify_code_verifier', codeVerifier);
}

/**
 * Obtiene el code verifier de localStorage
 * @returns {string|null} Code verifier guardado o null
 */
export function getCodeVerifier() {
  return localStorage.getItem('spotify_code_verifier');
}

/**
 * Elimina el code verifier de localStorage
 */
export function clearCodeVerifier() {
  localStorage.removeItem('spotify_code_verifier');
}
