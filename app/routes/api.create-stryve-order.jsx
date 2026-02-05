/**
 * App Proxy API Route: Create Stryve Order
 *
 * Called by the Checkout UI Extension via App Proxy:
 *   POST https://{shop}/apps/stryve/create-stryve-order
 *
 * Flow (matches WooCommerce Stryve plugin):
 *   1. Authenticate with Stryve API (POST /payment-gateway/authenticate, api_key as form-data)
 *   2. Create order on Stryve (POST /payment-gateway/create-order, token + items + customer_details as form-data)
 *   3. Store payment record in database
 *   4. Return { payment_url } for customer redirect
 *
 * Request body:
 *   { amount, currencyCode, shippingAddress: { firstName, lastName, phone, address1, city, countryCode } }
 *
 * Returns:
 *   { payment_url, stryve_order_id, merchant_reference }
 */

import { authenticate } from "../shopify.server";
import { createOrder, resolveBaseUrl } from "../stryve-api.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop;

  if (!shop) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { amount, currencyCode, shippingAddress } = body;

    // Get Stryve settings for this shop
    const settings = await prisma.stryveSettings.findUnique({
      where: { shop },
    });

    if (!settings || !settings.apiKey) {
      return new Response(
        JSON.stringify({
          error: "Stryve is not configured. Please set your API key in the app settings.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve API base URL (same priority as WooCommerce plugin / Stryve doc)
    // 1. Custom URL if set -> 2. Sandbox: 127.0.0.1:8000 -> 3. Production: https://app.stryve.me/api/v1
    const baseUrl = resolveBaseUrl(settings.baseUrl, settings.sandbox);

    if (settings.debug) {
      console.log("[Stryve] create-order: shop=%s baseUrl=%s sandbox=%s", shop, baseUrl, settings.sandbox);
    }

    // Generate unique merchant_reference (must be unique per user/API key)
    const merchantReference = `SHOP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Build callback URL — Stryve redirects here with:
    //   ?status=paid|pending|processing|failed
    //   &message=...
    //   &order_id=stryve-uuid
    //   &merchant_reference=our-ref
    const appUrl = process.env.SHOPIFY_APP_URL || "";
    const callbackUrl = `${appUrl}/payments/callback?shop=${encodeURIComponent(shop)}&ref=${encodeURIComponent(merchantReference)}`;

    // Map Shopify shipping address to Stryve customer_details
    // Required fields: first_name, last_name, phone, address_line, address_city, address_country
    // Optional: email (nullable)
    const customerDetails = shippingAddress
      ? {
          first_name: shippingAddress.firstName || "Shopify",
          last_name: shippingAddress.lastName || "Customer",
          // Phone is REQUIRED — fallback to placeholder (like WooCommerce's get_phone_for_stryve)
          phone: shippingAddress.phone || "0000000000",
          email: "",
          address_line: shippingAddress.address1 || "",
          address_city: shippingAddress.city || "",
          address_country: shippingAddress.countryCode || "",
        }
      : {
          first_name: "Shopify",
          last_name: "Customer",
          phone: "0000000000",
          email: "",
          address_line: "",
          address_city: "",
          address_country: "",
        };

    // Create order on Stryve
    // Internally: authenticate() -> create-order() using multipart/form-data
    const stryveOrder = await createOrder({
      apiKey: settings.apiKey,
      baseUrl,
      merchantReference,
      callbackUrl,
      items: [
        {
          name: "Order Payment",
          quantity: 1,
          price: String(amount),
          description: `Shopify order - ${currencyCode}`,
        },
      ],
      customerDetails,
    });

    // Store payment record in database
    await prisma.stryvePayment.create({
      data: {
        shop,
        shopifyPaymentId: merchantReference,
        stryveOrderId: stryveOrder.id || null,
        merchantReference,
        amount: String(amount),
        currency: currencyCode || "EGP",
        status: "pending",
        paymentUrl: stryveOrder.payment_url,
        callbackUrl,
        test: settings.sandbox,
      },
    });

    if (settings.debug) {
      console.log("[Stryve] create-order success: merchant_reference=%s stryve_order_id=%s", merchantReference, stryveOrder.id);
    }

    return new Response(
      JSON.stringify({
        payment_url: stryveOrder.payment_url,
        stryve_order_id: stryveOrder.id,
        merchant_reference: merchantReference,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Stryve] create-order error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create payment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
