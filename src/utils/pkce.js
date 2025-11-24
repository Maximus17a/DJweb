// PKCE utilities are deprecated in this project in favor of Supabase OAuth provider.
// The functions below throw if called to help catch any lingering references.

function deprecated() {
  throw new Error('PKCE utilities are deprecated: use Supabase OAuth sign-in instead.');
}

export function generateCodeVerifier() { deprecated(); }
export async function generateCodeChallenge() { deprecated(); }
export function saveCodeVerifier() { deprecated(); }
export function getCodeVerifier() { deprecated(); }
export function clearCodeVerifier() { deprecated(); }
