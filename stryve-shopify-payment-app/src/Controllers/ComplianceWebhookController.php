<?php

namespace Src\Controllers;

/**
 * Handles Shopify mandatory compliance webhooks (GDPR).
 * Required for App Store distribution: https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 *
 * Topics: customers/data_request, customers/redact, shop/redact
 * This app does not store customer or shop PII; we acknowledge receipt with 200.
 */
class ComplianceWebhookController
{
    public function handle(): void
    {
        // Optional: verify X-Shopify-Hmac-Sha256 if you have SHOPIFY_API_SECRET in .env
        $secret = \Src\Config::get('SHOPIFY_API_SECRET');
        if ($secret !== '') {
            $hmac = $_SERVER['HTTP_X_SHOPIFY_HMAC_SHA256'] ?? '';
            $body = file_get_contents('php://input');
            $calculated = base64_encode(hash_hmac('sha256', $body, $secret, true));
            if (!hash_equals($calculated, $hmac)) {
                http_response_code(401);
                return;
            }
        }

        http_response_code(200);
    }
}
