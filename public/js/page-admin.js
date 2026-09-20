/* ---------------------------------------------------------------------------
 * Admin internal view — intake queue, all grounds, all bookings.
 *
 * Scaffold: the three reads are wired. The writes (create a ground, upload
 * images, change a booking's status, open and settle a subscription cycle) are
 * not built yet; their routes exist.
 * ------------------------------------------------------------------------- */

import { requireRole } from './auth.js';
import { AdminApi, money } from './api.js';
import { mountTopbar } from './topbar.js';
import { initReveal } from './reveal.js';

if (!requireRole('admin')) throw new Error('redirecting');

mountTopbar();
initReveal();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  confirmed: 'badge-positive', paid: 'badge-positive', collected: 'badge-positive', listed: 'badge-positive',
  pending: 'badge-waiting', unpaid: 'badge-waiting', accrued: 'badge-waiting',
  new: 'badge-waiting', contacted: 'badge-waiting', onboarding: 'badge-waiting',
  cancelled: 'badge-dead', expired: 'badge-dead', no_show: 'badge-dead', rejected: 'badge-dead',
  completed: 'badge-done',
};
const badge = (status) =>
  `<span class="badge ${STATUS_CLASS[status] || 'badge-dead'}">${esc(status)}</span>`;

/* The intake queue comes first on the page because it is the only list with
 * work waiting in it — an owner who messaged and has not been called back. */
section('[data-leads]', () => AdminApi.leads('?status=new,contacted,onboarding'), (leads) => `
  <table>
    <thead><tr><th scope="col">Owner</th><th scope="col">Ground</th><th scope="col">Area</th><th scope="col">WhatsApp</th><th scope="col">Stage</th></tr></thead>
    <tbody>${leads.map((l) => `
      <tr>
        <td><strong>${esc(l.owner_name || '—')}</strong></td>
        <td>${esc(l.ground_name || '—')}</td>
        <td>${esc(l.area || '—')}</td>
        <td><a href="https://wa.me/${esc(l.whatsapp)}">${esc(l.whatsapp || '—')}</a></td>
        <td>${badge(l.status)}</td>
      </tr>`).join('')}</tbody>
  </table>`);

section('[data-grounds]', () => AdminApi.grounds(), (grounds) => `
  <table>
    <thead><tr><th scope="col">Ground</th><th scope="col">Owner</th><th scope="col">Area</th><th scope="col">Status</th><th scope="col">Tier</th><th scope="col" class="num">Hourly</th></tr></thead>
    <tbody>${grounds.map((g) => `
      <tr>
        <td><strong>${esc(g.name)}</strong></td>
        <td>${esc(g.owner_name || '—')}</td>
        <td>${esc(g.area || '—')}</td>
        <td>${badge(g.status)}</td>
        <td>${esc(g.tier || 'free')}</td>
        <td class="num">${esc(money(g.price_per_hour) || '—')}</td>
      </tr>`).join('')}</tbody>
  </table>`);

section('[data-bookings]', () => AdminApi.bookings('?limit=25'), (bookings) => `
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
