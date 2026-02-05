/**
 * Stryve Payment Callback Handler
 *
 * After the customer completes (or cancels) payment on Stryve's hosted page,
 * Stryve redirects back to this URL with GET parameters:
 *
 * From Stryve (appended by Stryve):
 *   ?status=pending|processing|paid|failed    — Payment status
 *   &message=...                              — Human-readable status description
 *   &order_id=uuid                            — Stryve's order UUID
 *   &merchant_reference=123                   — The merchant reference we sent
 *
 * From us (appended when building the callback_url):
 *   &shop=merchant.myshopify.com              — Shop domain
 *   &ref=SHOP-xxx                             — Our merchant reference
 *
 * Flow (matches WooCommerce Stryve plugin):
 *   1. Parse callback GET parameters
 *   2. Find payment record by merchant reference
 *   3. Server-side verification: GET /payment-gateway/get-order (don't trust GET params)
 *   4. Update payment status in database
 *   5. Redirect customer back to store (home on success, cart on failure)
 */

import { getOrder, resolveBaseUrl } from "../stryve-api.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // Parameters from Stryve redirect
  const callbackStatus = url.searchParams.get("status") || "";
  const message = url.searchParams.get("message") || "";
  const stryveOrderId = url.searchParams.get("order_id") || "";
  const merchantReference = url.searchParams.get("merchant_reference") || "";

  // Our parameters (appended when building callback_url)
  const shop = url.searchParams.get("shop") || "";
  const ref = url.searchParams.get("ref") || merchantReference;

  if (!shop || !ref) {
    return new Response(
      `<html><body><h1>Invalid Callback</h1><p>Missing parameters.</p><p><a href="https://${shop || "shopify.com"}">Return to store</a></p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    // 1. Find payment record
    const payment = await prisma.stryvePayment.findFirst({
      where: { merchantReference: ref, shop },
    });

    if (!payment) {
      console.error(`[Callback] Payment not found: ref=${ref}, shop=${shop}`);
      return new Response(
        `<html><body><h1>Payment Not Found</h1><p>Could not find payment record.</p><p><a href="https://${shop}">Return to store</a></p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // 2. Get Stryve settings for server-side verification and optional debug logging
    const settings = await prisma.stryveSettings.findUnique({
      where: { shop },
    });

    if (settings?.debug) {
      console.log(
        "[Stryve] callback received: status=%s order_id=%s merchant_reference=%s shop=%s ref=%s",
        callbackStatus, stryveOrderId, merchantReference, shop, ref
      );
    }

    // 3. Server-side verification — don't blindly trust GET parameters (per Stryve doc)
    // Matches WooCommerce: $client->get_order(array('order_id' => $stryve_order_id))
    // $verified_status = $response['status']; // Overrides the GET parameter
    let verifiedStatus = callbackStatus;

    if (settings && settings.apiKey) {
      const baseUrl = resolveBaseUrl(settings.baseUrl, settings.sandbox);
      try {
        const orderData = await getOrder({
          apiKey: settings.apiKey,
          baseUrl,
          orderId: stryveOrderId || payment.stryveOrderId,
          merchantReference: ref,
        });

        if (orderData.status) {
          verifiedStatus = orderData.status;
          if (settings.debug) {
            console.log("[Stryve] callback verified order status from API: %s", verifiedStatus);
          }
        }
      } catch (verifyError) {
        if (settings?.debug) {
          console.error("[Stryve] callback order verification failed, using callback status: %s", verifyError.message);
        }
      }
    }

    // 4. Update payment record
    await prisma.stryvePayment.update({
      where: { id: payment.id },
      data: {
        status: verifiedStatus,
        stryveOrderId: stryveOrderId || payment.stryveOrderId,
      },
    });

    if (settings?.debug) {
      console.log("[Stryve] callback payment %s updated to status: %s", payment.id, verifiedStatus);
    }

    // 5. Redirect customer back to store
    // Status mapping (matches WooCommerce):
    //   paid       -> Store home (success)
    //   processing -> Store home (success)
    //   pending    -> Store home (success)
    //   failed     -> Cart page (failure)
    //   (unknown)  -> Cart page (failure)
    const shopDomain = shop.includes(".") ? shop : `${shop}.myshopify.com`;

    if (verifiedStatus === "paid" || verifiedStatus === "processing" || verifiedStatus === "pending") {
      return Response.redirect(`https://${shopDomain}`, 302);
    } else {
      return Response.redirect(`https://${shopDomain}/cart`, 302);
    }
  } catch (error) {
    console.error(`[Callback] Unexpected error: ${error.message}`);
    const shopDomain = shop.includes(".") ? shop : `${shop}.myshopify.com`;
    return new Response(
      `<html><body><h1>Payment Error</h1><p>An error occurred.</p><p><a href="https://${shopDomain}">Return to store</a></p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
};
