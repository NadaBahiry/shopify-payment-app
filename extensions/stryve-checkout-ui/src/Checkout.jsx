/**
 * Stryve Payment Gateway — Checkout UI Extension
 *
 * Appears as a payment option in checkout. When selected and user clicks
 * "Pay Now", redirects to Stryve payment page.
 *
 * Flow Overview:
 *   1. Customer selects "Stryve" as payment method
 *   2. Customer clicks "Pay Now" (Shopify's native button)
 *   3. useBuyerJourneyIntercept triggers Stryve payment flow
 *   4. Extension calls POST /apps/stryve/create-stryve-order (App Proxy)
 *   5. App Proxy authenticates with Stryve (POST /payment-gateway/authenticate)
 *   6. App Proxy creates order on Stryve (POST /payment-gateway/create-order)
 *   7. Stryve returns { order: { id, payment_url } }
 *   8. Extension redirects customer to payment_url
 *   9. Customer pays on Stryve's hosted page
 *   10. Stryve redirects to callback URL with ?status=paid&order_id=...&merchant_reference=...
 *   11. Callback verifies with Stryve (GET /payment-gateway/get-order)
 *   12. Customer redirected back to store
 */

import {
  reactExtension,
  BlockStack,
  InlineStack,
  Banner,
  Text,
  View,
  Icon,
  Pressable,
  useApi,
  useTotalAmount,
  useShippingAddress,
  useBuyerJourneyIntercept,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useCallback } from "react";

export default reactExtension(
  "purchase.checkout.payment-method-list.render-after",
  () => <StryvePaymentOption />
);

function StryvePaymentOption() {
  const [selected, setSelected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const { sessionToken, shop } = useApi();
  const totalAmount = useTotalAmount();
  const shippingAddress = useShippingAddress();

  // Handle payment when user clicks native "Pay Now" button
  const initiateStryvePayment = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      const token = await sessionToken.get();

      const payload = {
        amount: totalAmount.amount,
        currencyCode: totalAmount.currencyCode,
      };

      if (shippingAddress) {
        payload.shippingAddress = {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address1: shippingAddress.address1,
          city: shippingAddress.city,
          provinceCode: shippingAddress.provinceCode,
          countryCode: shippingAddress.countryCode,
          zip: shippingAddress.zip,
          phone: shippingAddress.phone,
        };
      }

      // Call App Proxy endpoint: https://{shop}/apps/stryve/create-stryve-order
      const response = await fetch(
        `https://${shop.myshopifyDomain}/apps/stryve/create-stryve-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      if (data.payment_url) {
        // Redirect to Stryve payment page
        open(data.payment_url, "_top");
      } else {
        throw new Error("No payment URL received from Stryve");
      }
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  }, [sessionToken, shop, totalAmount, shippingAddress]);

  // Intercept buyer journey when Stryve is selected
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && selected && !processing) {
      // Start Stryve payment flow
      initiateStryvePayment();

      // Block while we redirect
      return {
        behavior: "block",
        reason: "Processing Stryve payment",
        perform: () => {
          // This runs when blocked - payment is being processed
        },
      };
    }
    return { behavior: "allow" };
  });

  const handleSelect = useCallback(() => {
    setSelected(true);
    setError(null);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelected(false);
    setError(null);
  }, []);

  return (
    <BlockStack spacing="tight">
      {/* Payment method card - styled like native payment options */}
      <Pressable
        onPress={selected ? handleDeselect : handleSelect}
        border="base"
        borderWidth="base"
        borderRadius="base"
        padding="base"
        background={selected ? "subdued" : "transparent"}
      >
        <InlineStack spacing="base" blockAlignment="center">
          {/* Radio indicator */}
          <View
            border="base"
            borderWidth="base"
            borderRadius="fullyRounded"
            minInlineSize={20}
            minBlockSize={20}
            maxInlineSize={20}
            maxBlockSize={20}
          >
            {selected && (
              <InlineStack inlineAlignment="center" blockAlignment="center">
                <View
                  background="interactive"
                  borderRadius="fullyRounded"
                  minInlineSize={12}
                  minBlockSize={12}
                  maxInlineSize={12}
                  maxBlockSize={12}
                />
              </InlineStack>
            )}
          </View>

          {/* Payment method label */}
          <InlineStack spacing="tight" blockAlignment="center">
            <Icon source="wallet" size="base" />
            <Text size="base" emphasis="bold">
              Stryve
            </Text>
          </InlineStack>
        </InlineStack>
      </Pressable>

      {/* Show description when selected */}
      {selected && (
        <View padding={["none", "none", "none", "loose"]}>
          <BlockStack spacing="tight">
            <Text size="small" appearance="subdued">
              Pay securely with your Stryve account. You will be redirected to complete payment.
            </Text>

            {processing && (
              <Banner status="info">
                <Text>Redirecting to Stryve...</Text>
              </Banner>
            )}

            {error && (
              <Banner status="critical">
                <Text>{error}</Text>
              </Banner>
            )}
          </BlockStack>
        </View>
      )}

      {/* Instructions when not selected */}
      {!selected && (
        <Text size="small" appearance="subdued">
          Select Stryve above, then click "Pay now" to complete payment
        </Text>
      )}
    </BlockStack>
  );
}
