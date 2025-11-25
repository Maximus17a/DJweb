// src/utils/pkce.js

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return hash;
}

function base64urlencode(a) {
  const bytes = new Uint8Array(a);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function generateCodeChallenge(v) {
  const hashed = await sha256(v);
  return base64urlencode(hashed);
}

export function generateCodeVerifier() {
  return generateRandomString(64);
}

export function saveCodeVerifier(verifier) {
  localStorage.setItem('spotify_code_verifier', verifier);
}

export function getCodeVerifier() {
  return localStorage.getItem('spotify_code_verifier');
}

export function clearCodeVerifier() {
  localStorage.removeItem('spotify_code_verifier');
}