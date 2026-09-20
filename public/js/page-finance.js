/* ---------------------------------------------------------------------------
 * Private finance dashboard. Superadmin only.
 *
 * Clarity over decoration, per the brief: tabular figures, honest zeros, no
 * sparkline where a number will do. `finance_overview()` gap-fills its trends,
 * so a quiet month arrives as a zero rather than a hole a chart would
 * interpolate across — render it as a zero.
 *
 * One request returns all five views. Subscription revenue is kept separate
 * from commission throughout; they are different businesses and summing them
 * hides which one is working.
 * ------------------------------------------------------------------------- */

import { requireRole } from './auth.js';
import { FinanceApi, money } from './api.js';
import { mountTopbar } from './topbar.js';
import { initReveal } from './reveal.js';

if (!requireRole('superadmin')) throw new Error('redirecting');

mountTopbar();
initReveal();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* A zero is a fact and gets rendered as one. Only a genuinely absent figure
 * becomes an em dash. */
const fig = (n) => (n === null || n === undefined ? '—' : money(n));
const count = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-PK'));

function fail(message) {
  for (const sel of ['[data-trend]', '[data-grounds]']) {
    document.querySelector(sel).innerHTML = `<p class="error">${esc(message)}</p>`;
  }
  document.querySelector('[data-tiles]').innerHTML = `<p class="error">${esc(message)}</p>`;
}

function tiles(d) {
  const cells = [
    ['Commission this month', fig(d.commission_this_month)],
    ['Subscriptions this month', fig(d.subscription_revenue_this_month)],
    ['Bookings this month', count(d.bookings_this_month)],
    ['Active grounds', count(d.active_grounds)],
  ];
  document.querySelector('[data-tiles]').innerHTML = cells.map(([label, value]) => `
    <div class="card-outer">
      <div class="card-inner">
        <span class="stat__value">${esc(value)}</span>
        <span class="field-label stat__label">${esc(label)}</span>
      </div>
    </div>`).join('');
}

function trend(rows) {
  const box = document.querySelector('[data-trend]');
  if (!rows?.length) { box.innerHTML = '<p class="empty">No months recorded yet.</p>'; return; }
  box.innerHTML = `
    <table>
      <thead><tr>
        <th scope="col">Month</th>
        <th scope="col" class="num">Bookings</th>
        <th scope="col" class="num">Gross</th>
        <th scope="col" class="num">Commission</th>
        <th scope="col" class="num">Subscriptions</th>
      </tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${esc(r.month)}</td>
          <td class="num${Number(r.bookings) ? '' : ' zero'}">${esc(count(r.bookings))}</td>
          <td class="num">${esc(fig(r.gross_amount))}</td>
          <td class="num">${esc(fig(r.commission_amount))}</td>
          <td class="num">${esc(fig(r.subscription_amount))}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function byGround(rows) {
  const box = document.querySelector('[data-grounds]');
  if (!rows?.length) { box.innerHTML = '<p class="empty">No bookings to attribute yet.</p>'; return; }
  box.innerHTML = `
    <table>
      <caption class="meta">Top 20 grounds by commission.</caption>
      <thead><tr>
        <th scope="col">Ground</th>
        <th scope="col" class="num">Bookings</th>
        <th scope="col" class="num">Gross</th>
        <th scope="col" class="num">Commission</th>
      </tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td><strong>${esc(r.ground_name)}</strong></td>
          <td class="num${Number(r.bookings) ? '' : ' zero'}">${esc(count(r.bookings))}</td>
          <td class="num">${esc(fig(r.gross_amount))}</td>
          <td class="num">${esc(fig(r.commission_amount))}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

try {
  const data = await FinanceApi.overview();
  tiles(data.summary || data);
  trend(data.monthly_trend);
  byGround(data.by_ground);
} catch (err) {
  /* A 403 here means the role gate is working and this account is not
   * superadmin — say that, rather than showing a generic failure. */
  fail(err.code === 'FORBIDDEN'
    ? 'This account is not a superadmin. The finance figures are restricted.'
    : err.message);
}
