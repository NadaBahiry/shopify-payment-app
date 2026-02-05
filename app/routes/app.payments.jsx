/**
 * Payments Dashboard Page
 *
 * Displays recent Stryve payment history for the merchant.
 * Uses the StryvePayment model (App Proxy / Checkout UI Extension flow).
 */

import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const payments = await prisma.stryvePayment.findMany({
    where: { shop: session.shop },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return {
    payments: payments.map((p) => ({
      id: p.id,
      merchantReference: p.merchantReference,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      test: p.test,
      stryveOrderId: p.stryveOrderId,
      createdAt: p.createdAt.toISOString(),
    })),
  };
};

export default function Payments() {
  return (
    <s-page title="Payment History">
      <s-layout>
        <s-section>
          <s-card>
            <s-block-stack gap="400">
              <s-text variant="headingMd">Recent Payments</s-text>
              <s-text variant="bodyMd" tone="subdued">
                Payments will appear here once customers start using Stryve at checkout.
              </s-text>
            </s-block-stack>
          </s-card>
        </s-section>
      </s-layout>
    </s-page>
  );
}
