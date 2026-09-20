/* ---------------------------------------------------------------------------
 * Public configuration, chosen by hostname.
 *
 * Everything in this file is public by design. The Supabase anon key is
 * RLS-bound and the API Worker re-verifies every caller's token, so shipping it
 * to the browser is expected. The service-role key and the JWT secret live only
 * in the Worker's secrets and must never appear here.
 * ------------------------------------------------------------------------- */

const ENVIRONMENTS = {
  'admin.groundsnearme.pk': {
    apiBaseUrl: 'https://api.groundsnearme.pk',
    supabaseUrl: 'https://REPLACE_ME.supabase.co',
    supabaseAnonKey: 'REPLACE_ME_ANON_KEY',
  },
  // Any other host — a *.pages.dev preview or localhost — gets staging.
  default: {
    apiBaseUrl: 'http://127.0.0.1:8787',
    supabaseUrl: 'https://REPLACE_ME_STAGING.supabase.co',
    supabaseAnonKey: 'REPLACE_ME_STAGING_ANON_KEY',
  },
};

export const CONFIG = ENVIRONMENTS[location.hostname] || ENVIRONMENTS.default;

/* A staff surface pointed at production Supabase from a preview URL is how test
 * bookings end up in real revenue figures. Say so loudly rather than quietly
 * working. */
if (!ENVIRONMENTS[location.hostname]) {
  console.info('[gnm] non-production host — using the staging configuration');
}
