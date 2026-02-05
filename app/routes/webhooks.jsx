/**
 * Webhook Handler
 *
 * Handles Shopify webhooks:
 * - APP_UNINSTALLED: Clean up sessions and settings when the app is uninstalled
 * - CUSTOMERS_DATA_REQUEST / CUSTOMERS_REDACT / SHOP_REDACT: GDPR compliance
 */

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        // Clean up all data for this shop
        await db.session.deleteMany({ where: { shop } });
        await db.stryveSettings.deleteMany({ where: { shop } });
        await db.stryvePayment.deleteMany({ where: { shop } });
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      // GDPR compliance - acknowledge but no personal data stored beyond sessions
      break;

    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
