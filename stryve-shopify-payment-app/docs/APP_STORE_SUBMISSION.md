# Submit your app for review

Checklist based on [Submit your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review). Complete these in **Partner Dashboard** and on the **Shopify App Store review page**.

---

## 1. Contact throughout the review process

- [ ] **Contact email** in your app listing (Partner Dashboard → App → **Listing** → Contact information) is correct and monitored.
- [ ] Add **app-submissions@shopify.com** and **noreply@shopify.com** to your email provider’s allowed senders so review emails are not filtered.
- [ ] If you don’t control the Partner account email, ensure someone who does can respond to review requests.

---

## 2. Shopify App Store review page

- [ ] Open the [Shopify App Store review](https://partners.shopify.com/) flow: **Apps** → your app → submit for review / App Store review.
- [ ] Complete all **mandatory fields**; progress is auto-saved.
- [ ] Run **automated checks** and fix any failures before submitting.

---

## 3. Configuration setup

- [ ] **URLs**
  - App URL, redirect URLs, and any other domains do **not** contain the words “Shopify” or “Example”, or misspellings/abbreviations of “Shopify”.
- [ ] **Compliance webhooks** (required for App Store distribution)
  - Subscribe to mandatory compliance webhooks.
  - Use this app’s **compliance endpoint** for all three topics:
    - **Customer data request:** `https://YOUR_APP_URL/webhooks/compliance`
    - **Customer redact:** `https://YOUR_APP_URL/webhooks/compliance`
    - **Shop redact:** `https://YOUR_APP_URL/webhooks/compliance`
  - Replace `YOUR_APP_URL` with your production (or ngrok) base URL.
- [ ] **App icon**
  - **1200 × 1200 px**, JPEG or PNG.
- [ ] **App settings / API contact**
  - API contact email does **not** contain “Shopify” or misspellings/abbreviations.
- [ ] **Emergency contact**
  - Add an **emergency developer contact** (email + phone) for critical technical issues.

---

## 4. Create a listing

- [ ] Choose a **primary language** and create at least **one App Store listing**.
- [ ] Listing meets [app listing requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) (title, description, screenshots, etc.).

---

## 5. Protected customer data

- [ ] If the app uses **protected customer data**, complete the request form from the review page.
- [ ] If the app does **not** use protected customer data, **opt out** as indicated on the page.
- [ ] Do **not** apply for protected customer data while the app is already under review.

---

## 6. Automated checks

- [ ] Run **automated checks** on the App Store review page.
- [ ] Resolve every reported issue, then **re-run** the checks until they pass.
- [ ] Only submit after checks pass to avoid delays or rejection.

---

## 7. Before you submit

- [ ] No **beta** or incomplete features in the submitted version.
- [ ] App meets all [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements).
- [ ] Submission is **complete** (no placeholders or “coming soon” for required items).

---

## 8. After submission

- [ ] Respond promptly to any email from **app-submissions@shopify.com** or the review team.
- [ ] Address reviewer feedback clearly; repeated failures or no response can lead to [temporary suspensions](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review#temporary-suspensions).

---

## Quick reference

| Item | Where |
|------|--------|
| Submit / review flow | Partner Dashboard → Apps → [your app] → App Store review |
| Compliance webhooks | Partner Dashboard → App → Configuration (or webhooks section) |
| Listing & contact | Partner Dashboard → App → Listing |
| Requirements | [App Store requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements) |

Source: [Submit your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
