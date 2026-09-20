/* ---------------------------------------------------------------------------
 * The shared top bar. One definition so the three dashboards cannot drift.
 *
 * The nav is filtered by role, which is presentation only — hiding the finance
 * link does not protect the finance data. See the header comment in auth.js.
 * ------------------------------------------------------------------------- */

import { currentRole, currentEmail, signOut } from './auth.js';

const LINKS = [
  { href: '/owner/',   label: 'My grounds', min: 'owner' },
  { href: '/admin/',   label: 'Admin',      min: 'admin' },
  { href: '/finance/', label: 'Finance',    min: 'superadmin' },
];

const RANK = { player: 0, owner: 1, admin: 2, superadmin: 3 };

export function mountTopbar(target = document.querySelector('[data-topbar]')) {
  if (!target) return;
  const role = currentRole();
  const rank = RANK[role] ?? 0;

  const nav = LINKS.filter((l) => rank >= RANK[l.min])
    .map((l) => {
      const current = location.pathname.startsWith(l.href) ? ' aria-current="page"' : '';
      return `<a href="${l.href}"${current}>${l.label}</a>`;
    })
    .join('');

  target.innerHTML = `
    <div class="container">
      <a class="topbar__brand" href="/">GroundsNearMe</a>
      <nav class="topbar__nav" aria-label="Staff sections">${nav}</nav>
      <span class="topbar__role">${role || ''}</span>
      <button class="btn-ghost" data-signout style="color:var(--white);border-color:rgba(255,255,255,0.3)">
        Sign out
      </button>
    </div>`;

  target.querySelector('[data-signout]').addEventListener('click', async () => {
    await signOut();
    location.replace('/');
  });

  const email = currentEmail();
  if (email) target.querySelector('.topbar__role').title = email;
}
