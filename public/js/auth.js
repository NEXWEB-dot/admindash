/* ---------------------------------------------------------------------------
 * Session handling for the staff surfaces.
 *
 * IMPORTANT — this file is user experience, not a security boundary.
 *
 * `requireRole()` decides which nav links to show and which page to redirect to.
 * It reads the role out of the JWT the browser is holding, which the browser
 * could edit. The real gates are elsewhere and are not bypassable from here:
 *
 *   1. The API Worker verifies the token's signature and re-checks the role.
 *   2. Supabase RLS runs every query as the caller, so a forged role changes
 *      nothing about what rows come back.
 *   3. `finance_overview()` calls `is_superadmin()` inside the SQL function, so
 *      the finance numbers are gated even if a route guard is wired wrong.
 *
 * So: never move a check *out* of the Worker on the grounds that this file
 * already does it.
 * ------------------------------------------------------------------------- */

import { CONFIG } from './config.js';

const STORE_KEY = 'gnm.session';

/* sessionStorage, not localStorage: a staff token dies with the tab. These
 * surfaces include the private finance dashboard, and a shared or unlocked
 * machine is a likelier threat here than the inconvenience of signing in again. */
const store = window.sessionStorage;

export function getSession() {
  try {
    const raw = store.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(session) {
  store.setItem(STORE_KEY, JSON.stringify(session));
}

export function clearSession() {
  store.removeItem(STORE_KEY);
}

/** Decode a JWT payload. Reads claims only — it does not and cannot verify. */
function claims(accessToken) {
  try {
    const part = accessToken.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

/** The role the Worker will see: `app_metadata.gnm_role`, else the profiles row. */
export function currentRole() {
  const session = getSession();
  if (!session) return null;
  const c = claims(session.access_token);
  return c.app_metadata?.gnm_role || c.user_metadata?.gnm_role || 'player';
}

export function currentEmail() {
  const session = getSession();
  return session ? claims(session.access_token).email || null : null;
}

export async function signIn(email, password) {
  const res = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: CONFIG.supabaseAnonKey },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    /* Do not distinguish "no such account" from "wrong password" — that turns a
     * login form into an account enumerator. */
    throw new Error(body.error_description || 'That email and password did not match.');
  }
  setSession(body);
  return body;
}

export async function refresh() {
  const session = getSession();
  if (!session?.refresh_token) return null;
  const res = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: CONFIG.supabaseAnonKey },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const body = await res.json();
  setSession(body);
  return body;
}

export async function signOut() {
  const session = getSession();
  clearSession();
  if (!session) return;
  /* Best effort: revoke server-side too, but a failed revoke must not leave the
   * browser still holding a token. */
  await fetch(`${CONFIG.supabaseUrl}/auth/v1/logout`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabaseAnonKey, authorization: `Bearer ${session.access_token}` },
  }).catch(() => {});
}

const RANK = { player: 0, owner: 1, admin: 2, superadmin: 3 };

/**
 * Redirect to sign-in or to the highest page this role can see. Call it at the
 * top of every page's module script.
 */
export function requireRole(minimum) {
  const role = currentRole();
  if (!role) {
    location.replace(`/?next=${encodeURIComponent(location.pathname)}`);
    return null;
  }
  if ((RANK[role] ?? 0) < RANK[minimum]) {
    location.replace(role === 'owner' ? '/owner/' : '/');
    return null;
  }
  return role;
}
