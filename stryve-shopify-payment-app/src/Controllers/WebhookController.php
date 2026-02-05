<?php

namespace Src\Controllers;

use Src\Services\ShopifyPaymentService;

class WebhookController
{
    /**
     * Handle Stryve callback when payment succeeds or fails.
     * Stryve should send merchant_reference (Shopify payment session id) in the payload.
     */
    public function handle(): void
    {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);

        if (!is_array($payload)) {
            http_response_code(400);
            return;
        }

        // Session id we sent when creating the payment (merchant_reference)
        $sessionId = $payload['shopify_session_id'] ?? $payload['merchant_reference'] ?? null;

        if (empty($sessionId)) {
            http_response_code(400);
            return;
        }

        $shopify = new ShopifyPaymentService();

        if (($payload['status'] ?? '') === 'success') {
            $shopify->resolve($sessionId);
        } else {
            $reason = $payload['message'] ?? $payload['reason'] ?? 'Payment failed';
            $shopify->reject($sessionId, $reason);
        }

        http_response_code(200);
    }
}
