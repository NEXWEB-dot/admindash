# GroundsNearMe — staff surfaces

The owner dashboard, the admin internal view, and the private finance dashboard.
A Cloudflare Pages project of static vanilla HTML/CSS/JS — no build step, no
framework, no bundler.

## The three repositories

| Repository | What it is | Deploys as |
| --- | --- | --- |
| `groundsnearme-frontend` | the player-facing site, built by two other developers | Cloudflare Pages |
| `groundsnearme-api` | Supabase migrations, the Worker, every `/v1` route, R2 uploads | Cloudflare Worker |
| **`groundsnearme-admin`** (this one) | owner dashboard, admin view, finance dashboard | Cloudflare Pages |

## Layout

```
public/                 everything served; Pages output directory
  index.html            staff sign-in
  owner/                owner dashboard      — role: owner and above
  admin/                admin internal view  — role: admin and above
  finance/              private P&L          — role: superadmin only
  css/tokens.css        the public site's tokens, copied verbatim
  css/app.css           components built only from those tokens
  js/config.js          public config, chosen by hostname
  js/auth.js            sign in, refresh, sign out, nav gating
  js/api.js             the only thing that talks to the API Worker
  js/page-*.js          one module per page (no inline script — see _headers)
  _headers              CSP, noindex, frame denial
  _redirects            unknown paths land on sign-in
docs/DESIGN-TOKENS.md   what to copy from the public site, and the three additions
```

## How authorisation actually works

Client-side role checks in `js/auth.js` decide **which links to show and where to
redirect**. They are not a security boundary, and nothing here should ever be the
only thing standing between a caller and data:

1. The API Worker verifies the JWT signature and re-checks the role on every request.
2. Supabase RLS runs each query as the caller, so a browser-edited role claim
   changes nothing about which rows come back.
3. `finance_overview()` calls `is_superadmin()` *inside* the SQL function, so the
   private P&L stays gated even if a route guard is wired wrong.

So an `admin` who types `/finance/` in the address bar reaches the page and sees an
error, not the numbers. That is the intended outcome. Do not move a check out of the
Worker because this repo appears to already do it.

There are no secrets in this repository and no Pages Functions. The only credential
shipped to the browser is the Supabase anon key, which is RLS-bound and public by
design.

## Quick start

```bash
npm install && npm run dev
```

Serves `public/` on `http://127.0.0.1:5174`. Point it at a local API by running the
Worker from the `groundsnearme-api` repo on port 8787 — `js/config.js` already falls
back to that for any non-production hostname.

Two things must be in place before a page shows real data:

- the Supabase project URL and anon key in `public/js/config.js`
- this origin in the Worker's `ALLOWED_ORIGINS` — otherwise every fetch fails with a
  browser message that never mentions CORS

## Status

Scaffolded, not built. Sign-in works, the top bar and role gating work, and each
dashboard's primary reads are wired to real routes. Not yet built: the weekly hours
grid, closures, the create-ground form with image upload, booking status changes, and
the subscription cycle screen. Every one of those has a route waiting for it — see
`docs/ROADMAP.md` in the API repo, steps 5 to 8.

Deliberately absent, as scope decisions rather than gaps: **no owner-facing
analytics**, and **no public pro-tier upgrade flow**.
