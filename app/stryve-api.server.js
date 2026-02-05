/**
 * Stryve SME Checkout API Client
 *
 * Handles all HTTP communication with the Stryve API:
 * - POST /payment-gateway/authenticate  (api_key as form-data -> returns single-use token)
 * - POST /payment-gateway/create-order  (token + order data as form-data -> returns payment_url)
 * - GET  /payment-gateway/get-order     (api_key + order_id or mechant_reference as query params)
 *
 * IMPORTANT:
 * - All POST requests use multipart/form-data (NOT JSON)
 * - All requests include Accept: application/json header
 * - All requests have a 30-second timeout
 * - Tokens are single-use (one per order, 30-minute expiry) — never cache tokens
 * - Nested data uses bracket notation: items[0][name], customer_details[first_name]
 * - The get-order endpoint has a known typo: "mechant_reference" (missing 'r')
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds, matching WooCommerce spec

/** Production Stryve API base URL (per Stryve Payment Gateway documentation). */
const PRODUCTION_BASE_URL = "https://app.stryve.me/api/v1";
/** Sandbox/local default (per WooCommerce plugin documentation). */
const SANDBOX_BASE_URL = "http://127.0.0.1:8000/api/v1";

/**
 * Resolve the API base URL based on settings.
 *
 * Priority order (matches WooCommerce plugin / Stryve documentation):
 * 1. Custom URL: If base_url is provided, use it (trailing slash stripped)
 * 2. Sandbox default: http://127.0.0.1:8000/api/v1
 * 3. Production default: https://app.stryve.me/api/v1
 *
 * @param {string} customUrl - Custom base URL override (may be empty)
 * @param {boolean} sandbox - Whether sandbox mode is enabled
 * @returns {string} Resolved base URL
 */
export function resolveBaseUrl(customUrl, sandbox) {
  if (customUrl && customUrl.trim() !== "") {
    return customUrl.replace(/\/+$/, "");
  }
  return sandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
}

/**
 * Authenticate with Stryve API and get a single-use token.
 *
 * POST /payment-gateway/authenticate
 * Content-Type: multipart/form-data
 *
 * Request body (form-data):
 *   api_key: string (required) — Your Stryve API key
 *
 * Response: { "success": true, "token": "eyJ0eXAiOiJKV1Q..." }
 *
 * Tokens are single-use. Each token can only be used for one create-order call.
 * Tokens expire after 30 minutes. Never cache tokens.
 *
 * @param {string} apiKey - Stryve API key
 * @param {string} baseUrl - API base URL (already resolved)
 * @returns {Promise<string>} Single-use JWT token
 */
export async function authenticate(apiKey, baseUrl) {
  const url = `${baseUrl}/payment-gateway/authenticate`;
  const formData = new FormData();
  formData.append("api_key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(
      `Stryve authentication failed: ${data.message || `HTTP ${response.status}`}`
    );
  }

  if (!data.token) {
    throw new Error(
      `Stryve authentication failed: ${data.message || "No token received"}`
    );
  }

  return data.token;
}

/**
 * Create an order on Stryve. Authenticates first (fresh token per call).
 *
 * POST /payment-gateway/create-order
 * Content-Type: multipart/form-data
 *
 * Request body (form-data):
 *   token:                          string  (required) - Single-use token from authenticate
 *   merchant_reference:             string  (required) - Unique reference (Shopify payment session ID)
 *   callback_url:                   url     (required) - URL to redirect customer after payment
 *   items[0][name]:                 string  (required) - Item name
 *   items[0][quantity]:             integer (required) - Item quantity (must be integer)
 *   items[0][price]:                numeric (required) - Item unit price (sent as string)
 *   items[0][description]:          string  (optional) - Item description (nullable)
 *   customer_details[first_name]:   string  (required) - Customer first name
 *   customer_details[last_name]:    string  (required) - Customer last name
 *   customer_details[phone]:        string  (required) - Customer phone number
 *   customer_details[email]:        email   (optional) - Customer email (nullable)
 *   customer_details[address_line]: string  (required) - Customer street address
 *   customer_details[address_city]: string  (required) - Customer city
 *   customer_details[address_country]: string (required) - Customer country
 *
 * Response: {
 *   "success": true,
 *   "order": {
 *     "id": "uuid-string",
 *     "merchant_reference": "123",
 *     "egp_amount": 150.00,  // auto-calculated: SUM(quantity * price)
 *     "status": "pending",
 *     "payment_url": "https://stryve.me/pay/abc123",
 *     "callback_url": "...",
 *     "items": [...],
 *     "customer_details": {...},
 *     "created_at": "2025-01-01T00:00:00Z"
 *   }
 * }
 *
 * Notes:
 * - merchant_reference must be unique per user/API key
 * - egp_amount is auto-calculated server-side
 * - Response wraps order data inside an "order" key
 *
 * @param {object} params
 * @param {string} params.apiKey - Stryve API key
 * @param {string} params.baseUrl - API base URL (already resolved)
 * @param {string} params.merchantReference - Unique reference (cast to string)
 * @param {string} params.callbackUrl - URL to redirect customer after payment
 * @param {Array<{name: string, quantity: number, price: string|number, description?: string}>} params.items
 * @param {object} params.customerDetails - Customer info with keys: first_name, last_name, phone, email, address_line, address_city, address_country
 * @returns {Promise<{id: string, payment_url: string, status: string, egp_amount: number}>}
 */
export async function createOrder({
  apiKey,
  baseUrl,
  merchantReference,
  callbackUrl,
  items,
  customerDetails,
}) {
  // Get a fresh single-use token (never cached)
  const token = await authenticate(apiKey, baseUrl);

  const url = `${baseUrl}/payment-gateway/create-order`;
  const formData = new FormData();
  formData.append("token", token);
  formData.append("merchant_reference", String(merchantReference));
  formData.append("callback_url", callbackUrl);

  // Add items in items[index][field] bracket notation format
  // Matches WooCommerce: items[0][name], items[0][quantity], items[0][price], items[0][description]
  if (items && Array.isArray(items)) {
    items.forEach((item, i) => {
      formData.append(`items[${i}][name]`, String(item.name || ""));
      formData.append(`items[${i}][quantity]`, String(parseInt(item.quantity, 10) || 1));
      formData.append(`items[${i}][price]`, String(parseFloat(item.price) || 0));
      if (item.description != null && item.description !== "") {
        formData.append(`items[${i}][description]`, String(item.description));
      }
    });
  }

  // Add customer details in customer_details[field] bracket notation format
  // Required fields: first_name, last_name, phone, address_line, address_city, address_country
  // Optional fields: email
  if (customerDetails) {
    const fields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "address_line",
      "address_city",
      "address_country",
    ];
    for (const field of fields) {
      const value = customerDetails[field];
      if (value != null && value !== "") {
        formData.append(`customer_details[${field}]`, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(
      `Stryve order creation failed: ${data.message || `HTTP ${response.status}`}`
    );
  }

  // Response wraps order data inside an "order" key
  const order = data.order || data;

  if (!order.payment_url) {
    throw new Error(
      `Stryve order creation failed: ${data.message || "No payment URL received"}`
    );
  }

  return order;
}

/**
 * Get order status from Stryve (used for server-side verification).
 *
 * GET /payment-gateway/get-order?api_key=...&order_id=...
 * GET /payment-gateway/get-order?api_key=...&mechant_reference=...
 *
 * Query parameters:
 *   api_key:            string (required)  - Your Stryve API key
 *   order_id:           string (required without mechant_reference) - Stryve order UUID
 *   mechant_reference:  string (required without order_id) - Your merchant reference
 *
 * IMPORTANT: The Stryve API has a typo — it uses "mechant_reference" (missing the 'r'
 * in "merchant"). This is intentional in the API and this client accounts for it.
 *
 * Response: { "success": true, "order": { "id": "uuid", "status": "paid", "merchant_reference": "123", ... } }
 *
 * @param {object} params
 * @param {string} params.apiKey - Stryve API key
 * @param {string} params.baseUrl - API base URL (already resolved)
 * @param {string} [params.orderId] - Stryve order UUID
 * @param {string} [params.merchantReference] - Merchant reference
 * @returns {Promise<object>} Order data including status field
 */
export async function getOrder({ apiKey, baseUrl, orderId, merchantReference }) {
  const query = new URLSearchParams({ api_key: apiKey });

  if (orderId) {
    query.set("order_id", orderId);
  } else if (merchantReference) {
    // Note: Stryve API has a typo — "mechant_reference" (missing 'r' in "merchant")
    // This is a known quirk in the Stryve backend code
    query.set("mechant_reference", merchantReference);
  } else {
    throw new Error("Either orderId or merchantReference is required.");
  }

  const url = `${baseUrl}/payment-gateway/get-order?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(
      `Stryve get order failed: ${data.message || `HTTP ${response.status}`}`
    );
  }

  return data.order || data;
}
