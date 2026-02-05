# Stryve Shopify Payment App (PHP)

A **Shopify Payment App** with a PHP backend. One app for all your clients; it appears in **Settings → Payments** and redirects customers to Stryve hosted checkout.

## Flow

```
Customer → Shopify Checkout → Your PHP app → Stryve → Webhook → Your app → Shopify (Paid/Failed)
```

## Requirements

- PHP 7.4+
- Composer
- ngrok (for local testing)

## What is ngrok and where to get the URL?

**ngrok** exposes your local server (e.g. `localhost:8000`) to the internet with a public HTTPS URL. Shopify and Stryve need to call your app over the internet; they can’t reach `localhost` on your machine, so you use ngrok to get a URL like `https://a1b2c3d4.ngrok.io` that forwards to your PHP app.

**Where to get it:**

1. Go to **[https://ngrok.com](https://ngrok.com)** and sign up (free tier is enough).
2. Download and install ngrok: [https://ngrok.com/download](https://ngrok.com/download) (or `brew install ngrok` on macOS).
3. Start your PHP app: `php -S localhost:8000 -t public`.
4. In another terminal run: **`ngrok http 8000`**.
5. ngrok will show something like:
   ```text
   Forwarding   https://a1b2c3d4.ngrok-free.app -> http://localhost:8000
   ```
6. **Your ngrok URL** is that `https://….ngrok-free.app` (or `….ngrok.io`) — no path, no trailing slash.
7. Put it in `.env` as **`APP_URL=https://a1b2c3d4.ngrok-free.app`** and use the same base URL in the Shopify Partner Dashboard for Payment Session URL and Webhook URL (e.g. `https://a1b2c3d4.ngrok-free.app/payments/session`).

The free ngrok URL changes each time you restart ngrok unless you use a reserved domain (paid).

## Troubleshooting: ERR_NGROK_3200 "The endpoint … is offline"

This means Shopify is trying to reach your app at your ngrok URL, but the tunnel is not running. Do this:

1. **Terminal 1 – start the PHP app**
   ```bash
   cd stryve-shopify-payment-app
   php -S localhost:8000 -t public
   ```
   Leave this running.

2. **Terminal 2 – start ngrok**
   ```bash
   ngrok http 8000
   ```
   Leave this running. Copy the **Forwarding** https URL (e.g. `https://xxxx.ngrok-free.app`).

3. **If the URL changed:** update `.env` → `APP_URL=<new-ngrok-url>` and in **Shopify Partner Dashboard** → your app → **App URL** (and Payment/Webhook URLs if configured separately) with the same base URL.

4. Refresh the app in Shopify admin.

## Setup

1. **Create the app in Partner Dashboard**
   - [Partners](https://partners.shopify.com/) → Apps → **Create app** → **Payment App**
   - Name: e.g. **Stryve Payments**

2. **Install dependencies**
   ```bash
   cd stryve-shopify-payment-app
   composer install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   - `APP_URL` = your public URL (e.g. `https://xxxx.ngrok.io`)
   - `SHOPIFY_PAYMENT_TOKEN` = token from Partner Dashboard
   - `STRYVE_API_KEY` = your Stryve API key

4. **Run locally**
   ```bash
   php -S localhost:8000 -t public
   ngrok http 8000
   ```
   Set `APP_URL` to the ngrok URL.

5. **Configure in Partner Dashboard**
   - Payment Session URL: `https://your-ngrok-url.ngrok.io/payments/session`
   - Webhook URL: `https://your-ngrok-url.ngrok.io/webhooks/stryve`

## Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/payments/session` | POST | Create payment session → redirect to Stryve |
| `/webhooks/stryve` | POST | Stryve callback → resolve/reject in Shopify |
| `/payments/refund` | POST | Process refund (mandatory for approval) |
| `/webhooks/compliance` | POST | GDPR compliance (data_request, redact); required for App Store |

## Why "No results found" when adding the payment method?

In **Settings → Payments → Add payment method**, when you search for "Stryve Payments" or your app name, Shopify shows **No results found** because:

- The list of searchable payment methods is **only approved payment providers**.
- Your app is not in that list until **Shopify has approved** your Payment App (Payments extension review).
- The **installation URL** for merchants is shown in Partner Dashboard → **Apps → Distribution** only **after approval**.

So you cannot add your app as a payment method from the search box until the app is approved.

**What to do:**

1. **Submit for approval** (required for production):
   - [Get approved for payments](https://shopify.dev/docs/apps/build/payments/payments-extension-review) – apply for Payments Partner / Payments App review.
   - After approval, your app will get a **provider page URL** in Partner Dashboard → Apps → Distribution. Merchants can install via that link or (once criteria are met) find it under Settings → Payments → Add payment method.

2. **Development stores (before approval):**
   - Use **Bogus Gateway** (Settings → Payments) to test checkout and orders.
   - Your PHP app (session, webhook, refund) is ready; once the app is approved and installed as a payment method, the same backend will be used at checkout.

## Client experience (after approval)

1. Store: **Settings → Payments** → Add payment method → **Stryve Payments** (or install via your provider link).
2. Enter API key and save.
3. Stryve appears at checkout; no theme changes.

## Approval checklist

- Redirect flow
- Failure handling (reject session)
- Refund support
- No card data stored
- Secure webhooks (verify Stryve webhook signature if provided)

## Refunds

Shopify will send refund requests to your app. The RefundController expects Stryve `payment_id`, `amount`, and `currency`. Map Shopify refund payload to your Stryve refund API and confirm back to Shopify as required by the [Payments Refunds API](https://shopify.dev/docs/apps/payments/refunds).
