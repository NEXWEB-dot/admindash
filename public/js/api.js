/* ---------------------------------------------------------------------------
 * The only way this project talks to anything.
 *
 * Every call goes to the groundsnearme-api Worker. There are no direct Supabase
 * queries from these pages: the Worker is where the CORS allowlist, the rate
 * limits and the role gates live, and a second client would mean a second place
 * to get authorisation wrong.
 *
 * Response envelope, from docs/API-CONTRACT.md in the API repo:
 *   success  { ok: true,  data: … }
 *   failure  { ok: false, error: { code, message, details? } }
 * ------------------------------------------------------------------------- */

import { CONFIG } from './config.js';
import { getSession, refresh, clearSession } from './auth.js';

export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function once(path, { method = 'GET', body, token } = {}) {
  const headers = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    /* A thrown fetch is the network, CORS, or the Worker being down — not a
     * failed request. The commonest cause in practice is this origin missing
     * from ALLOWED_ORIGINS, and the browser's own message never says so. */
    throw new ApiError(
      'NETWORK',
      'Could not reach the API. If this is a new deployment, check that this origin is in ALLOWED_ORIGINS.',
      0,
    );
  }

  const payload = await res.json().catch(() => null);
  if (res.ok && payload?.ok) return payload.data;

  const err = payload?.error || {};
  throw new ApiError(err.code || 'HTTP_ERROR', err.message || `Request failed (${res.status}).`, res.status, err.details);
}

/**
 * Authenticated request with one retry after a token refresh. A 401 on a staff
 * screen is almost always an expired hour-old token, not a real rejection.
 */
export async function api(path, options = {}) {
  const session = getSession();
  try {
    return await once(path, { ...options, token: session?.access_token });
  } catch (err) {
    if (err.status !== 401) throw err;
    const renewed = await refresh();
    if (!renewed) {
      clearSession();
      location.replace(`/?next=${encodeURIComponent(location.pathname)}`);
      throw err;
    }
    return once(path, { ...options, token: renewed.access_token });
  }
}

/* --- Endpoints these screens use ---------------------------------------- */
/* Kept as one flat map so the set of calls each dashboard makes is greppable,
 * and so a contract change lands in one file. Paths mirror the route table in
 * the API repo's docs/API-CONTRACT.md. */

export const OwnerApi = {
  grounds:       () => api('/v1/owner/grounds'),
  ground:        (id) => api(`/v1/owner/grounds/${id}`),
  updateGround:  (id, patch) => api(`/v1/owner/grounds/${id}`, { method: 'PATCH', body: patch }),
  bookings:      (q = '') => api(`/v1/owner/bookings${q}`),
  subscriptions: () => api('/v1/owner/subscriptions'),
};

export const AdminApi = {
  grounds:  (q = '') => api(`/v1/admin/grounds${q}`),
  ground:   (id) => api(`/v1/admin/grounds/${id}`),
  leads:    (q = '') => api(`/v1/admin/leads${q}`),
  bookings: (q = '') => api(`/v1/admin/bookings${q}`),
};

/* Superadmin only. The 403 an admin gets here is correct behaviour, produced by
 * the Worker and again by is_superadmin() inside the SQL function. */
export const FinanceApi = {
  overview: () => api('/v1/finance/overview'),
};

/** PKR, no decimals — the currency has no practical subunit here. */
export function money(paisaOrRupees) {
  if (paisaOrRupees === null || paisaOrRupees === undefined || paisaOrRupees === '') return null;
  const n = Number(paisaOrRupees);
  if (!Number.isFinite(n)) return null;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}
