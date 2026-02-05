# Stryve Payment Gateway — Shopify Integration

This document maps the **Stryve Payment Gateway for WooCommerce** technical documentation to the **Shopify** app implementation, so the same integration (API flow, settings, callback handling) is followed on Shopify.

---

## 1. Overview (Doc §1)

| WooCommerce | Shopify equivalent |
|-------------|--------------------|
| WooCommerce Payment Gateway plugin | Shopify app with **Checkout UI Extension** + **App Proxy** |
| Off-site redirect (customer pays on Stryve, returns via callback) | Same: checkout → Stryve payment page → callback → store |
| REST API with `multipart/form-data`, API key + single-use tokens | Same: `stryve-api.server.js` uses form-data and fresh token per order |
| Classic + Block checkout | Checkout UI Extension renders “Stryve” in payment method list |

---

## 2. Architecture (Doc §2)

| WooCommerce | Shopify |
|-------------|---------|
| `Stryve_API_Client` | `app/stryve-api.server.js` (authenticate, createOrder, getOrder, resolveBaseUrl) |
| `Stryve_Payment_Gateway` | App settings page (`app/routes/app._index.jsx`) + Checkout UI Extension |
| `Stryve_Callback_Handler` | `app/routes/payments.callback.jsx` |
| `Stryve_Blocks_Payment` | `extensions/stryve-checkout-ui` (Checkout.jsx) |

Design principles are the same: API client isolated, no token caching, server-side verification on callback.

---

## 3. Configuration (Doc §4)

Settings match the WooCommerce plugin:

| Setting | Type | Default | Shopify location |
|---------|------|---------|------------------|
| API Key | Password | (empty) | App Settings → API Key |
| Sandbox Mode | Checkbox | Yes | App Settings → Sandbox / Test Mode |
| API Base URL | Text | (empty) | App Settings → API Base URL |
| Debug Log | Checkbox | No | App Settings → Debug Logging |

**Base URL resolution** (same as doc):

1. **Custom URL**: If “API Base URL” is set, use it (trailing slash stripped).
2. **Sandbox default**: If sandbox is enabled and no custom URL → `http://127.0.0.1:8000/api/v1`.
3. **Production default**: If sandbox is disabled and no custom URL → `https://app.stryve.me/api/v1`.

Implemented in `resolveBaseUrl()` in `app/stryve-api.server.js`.

---

## 4. Payment Flow (Doc §5)

Same sequence as the documentation:

1. Customer selects Stryve at checkout and completes the payment step.
2. **Authenticate**: `POST /payment-gateway/authenticate` with `api_key` (form-data) → single-use token.
3. **Create order**: `POST /payment-gateway/create-order` with token, items, customer_details, callback_url, merchant_reference (form-data) → `payment_url`.
4. Redirect customer to `payment_url` (Stryve hosted page).
5. Customer pays on Stryve.
6. Stryve redirects to our callback with `?status=...&order_id=...&merchant_reference=...`.
7. **Verification**: `GET /payment-gateway/get-order` (api_key + order_id or merchant_reference) — do not trust GET params; use verified status.
8. Update payment record; redirect customer (success → store, failure → cart).

Shopify implementation:

- Create order: `app/routes/api.create-stryve-order.jsx` (App Proxy) → `createOrder()` in `stryve-api.server.js`.
- Callback: `app/routes/payments.callback.jsx` → `getOrder()` for verification, then redirect.

---

## 5. Stryve API Integration (Doc §6)

- **Authenticate**: `POST /payment-gateway/authenticate`, form-data `api_key`, response `{ "success", "token" }`. Single-use, 30-minute expiry; no caching. Implemented in `authenticate()` in `stryve-api.server.js`.
- **Create order**: `POST /payment-gateway/create-order`, form-data: `token`, `merchant_reference`, `callback_url`, `items[n][name|quantity|price|description]`, `customer_details[first_name|last_name|phone|email|address_line|address_city|address_country]`. Response: `{ "order": { "id", "payment_url", "status", ... } }`. Implemented in `createOrder()`.
- **Get order**: `GET /payment-gateway/get-order?api_key=...&order_id=...` or `&mechant_reference=...` (API typo). Used in callback for verification. Implemented in `getOrder()`.

All use 30s timeout, `Accept: application/json`, and form-data (no JSON body for POST). Known quirk: `mechant_reference` in get-order is supported in code.

---

## 6. Callback and Order Status (Doc §8)

- Callback URL is built when creating the order and includes `shop` and `ref` (merchant reference).
- On callback: parse GET params, find payment by merchant reference, **verify status with get-order**, update DB, then redirect:
  - `paid` / `processing` / `pending` → store home (success).
  - `failed` or other → cart (failure).

Matches the doc’s “don’t trust GET parameters; verify with API”.

---

## 7. Debug Logging (Doc §12)

When “Debug Logging” is enabled in app settings, the app logs (to server console):

- Create-order: shop, baseUrl, sandbox; and on success: merchant_reference, stryve_order_id.
- Callback: received params; verified status from API; payment record update.

No sensitive data (no API key or full tokens) is logged.

---

## 8. Security (Doc §13)

- Callback status is always verified with `GET /payment-gateway/get-order` before updating payment or redirecting.
- App Proxy is authenticated via Shopify (`authenticate.public.appProxy`).
- Stryve API key is stored per shop and used only server-side.

---

## File Reference

| Purpose | File |
|--------|------|
| Stryve API client | `app/stryve-api.server.js` |
| Create order (App Proxy) | `app/routes/api.create-stryve-order.jsx` |
| Callback handler | `app/routes/payments.callback.jsx` |
| Merchant settings UI | `app/routes/app._index.jsx` |
| Checkout payment option | `extensions/stryve-checkout-ui/src/Checkout.jsx` |
| Settings persistence | `app/payments.repository.js` |

This integration is aligned with the Stryve Payment Gateway for WooCommerce technical documentation so that API usage, settings, and payment flow behave the same on Shopify.
