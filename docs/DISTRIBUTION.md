# Distributing Stryve Payments Gateway as a Shopify App

This guide explains how to make your app installable by **clients** (Shopify merchants) so they can use Stryve Payments Gateway on their stores.

---

## Overview

Your app is already built as a **multi-tenant** Shopify app: each merchant who installs it gets their own settings (Stryve API key, sandbox mode, etc.) stored per shop. To let clients install it you need to:

1. **Deploy** the app to a public HTTPS URL (not localhost).
2. **Configure** the app in the Shopify Partner Dashboard with that URL.
3. **Distribute** the app so merchants can install it (custom install link **or** Shopify App Store).

---

## 1. Deploy the app

The app must be reachable at a **stable HTTPS URL** (e.g. `https://stryve-payments.yourdomain.com`). Merchants’ browsers and Shopify will call this URL.

### Option A: Deploy with Docker

You already have a `Dockerfile`. Example with a generic host:

```bash
# Build and run locally to test
docker build -t stryve-payments .
docker run -p 3000:3000 --env-file .env stryve-payments
```

Then point your server (or a reverse proxy) at port **3000**. The app uses `react-router-serve` and listens on the port set by the host (e.g. `PORT=3000`).

### Option B: Use a hosting platform

Deploy the same Node app (e.g. via Docker or `npm run build` + `npm run start`) on:

- **Fly.io** – `fly launch` and set env vars in the dashboard.
- **Railway** – Connect repo, set env vars, deploy.
- **Heroku** – Add a Procfile: `web: npm run setup && npm run start`, set `PORT` and env vars.
- **Shopify Oxygen** (or other Node-compatible host) – Build, then run `npm run start` with the right `PORT` and env.

Ensure:

- **HTTPS** is enabled (most platforms do this automatically).
- **Environment variables** (see below) are set in the host’s config, not only in `.env` files.

### Production environment variables

Set these in your deployment (and optionally in `.env` for local runs):

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | From Partner Dashboard → Your app → **Client ID** |
| `SHOPIFY_API_SECRET` | From Partner Dashboard → **Client secret** |
| `SHOPIFY_APP_URL` | Your app’s public URL, e.g. `https://stryve-payments.yourdomain.com` |
| `SCOPES` | Comma-separated; must match TOML, e.g. `read_orders,write_orders,write_products` |
| `DATABASE_URL` | For production, use a real DB (e.g. PostgreSQL). See Prisma section below. |

**Important:** `SHOPIFY_APP_URL` must be exactly the URL where the app is served (including `https://`, no trailing slash). It is used for OAuth redirects and embedded app loading.

### Database for production

The default Prisma setup uses SQLite (`file:dev.sqlite`), which is fine for development. For production with multiple merchants:

1. Use a **PostgreSQL** (or MySQL) database and set `DATABASE_URL` in the deployment.
2. In `prisma/schema.prisma`, either:
   - Use a separate `schema.prisma` for production with `provider = "postgresql"` and `url = env("DATABASE_URL")`, or
   - Switch the datasource to `provider = "postgresql"` and `url = env("DATABASE_URL")` when deploying.
3. Run migrations on deploy: `prisma migrate deploy` (your `setup` script already runs `prisma generate` and `prisma migrate deploy`).

---

## 2. Configure the app in Shopify Partner Dashboard

After the app is live at a URL:

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com) → **Apps** → **Stryve Payments Gateway Ver2**.
2. Open **App setup** (or **Configuration**).
3. Set:
   - **App URL** = `SHOPIFY_APP_URL` (e.g. `https://stryve-payments.yourdomain.com`).
   - **Allowed redirection URL(s)** = `https://<your-app-url>/auth/callback` (e.g. `https://stryve-payments.yourdomain.com/auth/callback`).
4. Under **App proxy** (if you use it), set the proxy URL to your app (e.g. same base URL with path `/api` as in your TOML).

You can also push config from the repo using the Shopify CLI so the TOML and dashboard stay in sync:

```bash
# From project root, after setting production URL in TOML (see below)
npm run config:use shopify.app.stryve-payments-gateway-ver2.toml
shopify app deploy
```

**Production TOML:** For deploy, use a TOML that has the production URL (or rely on the dashboard and env vars). Example for a production config file:

```toml
application_url = "https://stryve-payments.yourdomain.com"
[auth]
redirect_urls = ["https://stryve-payments.yourdomain.com/auth/callback"]
[app_proxy]
url = "/api"
# subpath/prefix unchanged
```

---

## 3. How clients install the app

You can distribute the app in two ways.

### Option A: Custom install (no App Store listing)

Any merchant with the install link can install your app without it being listed publicly.

1. In Partner Dashboard → **Apps** → **Stryve Payments Gateway Ver2**.
2. Open **Distribution** (or **Get install link**).
3. Copy the **install link** (e.g. `https://partners.shopify.com/<partner-id>/apps/<app-id>/install` or the “Test on development store” / “Install” link).
4. Share this link with your clients (e.g. by email, your website, or a “Install on Shopify” button that points to this URL).

When a merchant opens the link, they choose their store (or create a development store), approve the requested permissions, and the app is installed. After that they use your app from their Shopify admin.

### Option B: Publish on the Shopify App Store

This allows any Shopify merchant to find and install your app from the store.

1. In Partner Dashboard → your app → **Distribution** → **Shopify App Store**.
2. Complete the **listing** (description, screenshots, icon, support email, privacy policy URL, etc.).
3. Ensure the app meets [Shopify’s app store requirements](https://shopify.dev/docs/apps/store/requirements) (e.g. support flow, data handling, performance).
4. Submit for **review**. Once approved, the app becomes publicly listable and installable.

Your app is already set to `AppDistribution.AppStore` in `app/shopify.server.js`, which is correct for App Store distribution.

---

## 4. Checklist before going live

- [ ] App is deployed and reachable at a **stable HTTPS** URL.
- [ ] `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `SCOPES` are set in production.
- [ ] **App URL** and **Redirect URL(s)** in the Partner Dashboard match the deployed app.
- [ ] Production database is configured (e.g. PostgreSQL + `DATABASE_URL`) and migrations are applied.
- [ ] You’ve tested a full install flow: open install link → install on a dev store → open app → save Stryve settings → (optional) run a test payment.
- [ ] If using App Store: listing is complete and submitted for review.

---

## 5. After clients install

- Merchants open your app from **Shopify Admin** → **Apps** → **Stryve Payments Gateway Ver2**.
- They configure their **Stryve API key** (and optional base URL, sandbox, debug) on the app’s settings page and save.
- They add the Stryve payment option to checkout (e.g. via your checkout UI extension and store theme/checkout settings).
- Each store’s data (sessions, Stryve settings, payments) is isolated by `shop` in your database.

For support, use the **Support email** (and optional **Support URL**) you set in the Partner Dashboard so merchants know how to contact you.
