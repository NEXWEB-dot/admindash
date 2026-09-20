/* ---------------------------------------------------------------------------
 * Owner dashboard — grounds and upcoming bookings.
 *
 * Scaffold: the two reads are wired to the real routes, the remaining screens
 * (weekly hours grid, closures, subscriptions) are not built yet. There is no
 * analytics panel here and there is not going to be one for launch — that is a
 * scope decision, not an omission.
 * ------------------------------------------------------------------------- */

import { requireRole } from './auth.js';
import { OwnerApi, money } from './api.js';
import { mountTopbar } from './topbar.js';
import { initReveal } from './reveal.js';

if (!requireRole('owner')) throw new Error('redirecting');

mountTopbar();
initReveal();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Render either rows, an honest empty state, or the error — never a blank box. */
async function section(target, load, render) {
  const box = document.querySelector(target);
  try {
    const data = await load();
    const rows = Array.isArray(data) ? data : data?.items || [];
    box.innerHTML = rows.length ? render(rows) : '<p class="empty">Nothing here yet.</p>';
  } catch (err) {
    box.innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
}

const STATUS_CLASS = {
  confirmed: 'badge-positive', paid: 'badge-positive', collected: 'badge-positive',
  pending: 'badge-waiting', unpaid: 'badge-waiting', accrued: 'badge-waiting',
  cancelled: 'badge-dead', expired: 'badge-dead', no_show: 'badge-dead',
  completed: 'badge-done',
};
const badge = (status) =>
  `<span class="badge ${STATUS_CLASS[status] || 'badge-dead'}">${esc(status)}</span>`;

section('[data-grounds]', () => OwnerApi.grounds(), (grounds) => `
  <table>
    <thead><tr><th scope="col">Ground</th><th scope="col">Area</th><th scope="col">Status</th><th scope="col">Tier</th><th scope="col" class="num">Hourly</th></tr></thead>
    <tbody>${grounds.map((g) => `
      <tr>
        <td><strong>${esc(g.name)}</strong></td>
        <td>${esc(g.area || '—')}</td>
        <td>${badge(g.status)}</td>
        <td>${esc(g.tier || 'free')}</td>
        <td class="num">${esc(money(g.price_per_hour) || '—')}</td>
      </tr>`).join('')}</tbody>
  </table>`);

section('[data-bookings]', () => OwnerApi.bookings('?upcoming=true'), (bookings) => `
  <table>
    <thead><tr><th scope="col">When</th><th scope="col">Ground</th><th scope="col">Player</th><th scope="col">Status</th><th scope="col" class="num">Amount</th></tr></thead>
    <tbody>${bookings.map((b) => `
      <tr>
        <td>${esc(b.date)} · ${esc(b.start_time)}–${esc(b.end_time)}</td>
        <td>${esc(b.ground_name)}</td>
        <td>${esc(b.player_name || b.player_phone || '—')}</td>
        <td>${badge(b.status)}</td>
        <td class="num">${esc(money(b.total_amount) || '—')}</td>
      </tr>`).join('')}</tbody>
  </table>`);
