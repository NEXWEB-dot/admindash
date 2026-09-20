/* ---------------------------------------------------------------------------
 * Sign-in page.
 *
 * On success, send the user to the highest surface their role can see. The
 * `next` query parameter is honoured only when it is a same-origin path, so a
 * crafted link cannot use this page as an open redirect.
 * ------------------------------------------------------------------------- */

import { signIn, currentRole, getSession, clearSession } from './auth.js';

const HOME_FOR = { owner: '/owner/', admin: '/admin/', superadmin: '/finance/' };

function destination() {
  const next = new URLSearchParams(location.search).get('next');
  /* Same-origin, absolute path, and not protocol-relative (`//evil.example`
   * would otherwise pass a naive startsWith('/') check). */
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return HOME_FOR[currentRole()] || '/';
}

/* Already signed in — do not make someone re-enter a password to reach a page
 * they can already see. */
if (getSession()) location.replace(destination());

const form = document.querySelector('[data-signin]');
const errorBox = document.querySelector('[data-error]');
const submit = form.querySelector('button[type=submit]');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  submit.disabled = true;
  submit.textContent = 'Signing in…';

  try {
    await signIn(form.email.value.trim(), form.password.value);

    const role = currentRole();
    if (role === 'player') {
      /* A real player account with a real password. signIn() has already stored
       * the session, so drop it — otherwise the next page load sees a session,
       * redirects, bounces back, and the form is unusable. */
      clearSession();
      /* Nothing here is for them, and the honest message is that this is the
       * wrong door — not "access denied", which reads as a fault. */
      throw new Error('That account is a player account. These dashboards are for owners and staff.');
    }
    location.replace(destination());
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Sign in';
    form.password.value = '';
  }
});
