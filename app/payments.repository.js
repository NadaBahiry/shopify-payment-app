/**
 * Payments Repository
 *
 * Database operations for Stryve settings.
 * The old PaymentSession / RefundSession / CaptureSession / VoidSession models
 * are no longer used (they were for the payments_extension approach).
 * Now we use StryvePayment for the App Proxy / Checkout UI Extension flow.
 */

import prisma from "~/db.server";

// --- Stryve Settings ---

export const getStryveSettings = async (shop) => {
  return await prisma.stryveSettings.findUnique({ where: { shop } });
};

export const upsertStryveSettings = async (shop, settings) => {
  return await prisma.stryveSettings.upsert({
    where: { shop },
    update: {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      sandbox: settings.sandbox,
      debug: settings.debug,
    },
    create: {
      shop,
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl || "",
      sandbox: settings.sandbox ?? true,
      debug: settings.debug ?? false,
    },
  });
};
