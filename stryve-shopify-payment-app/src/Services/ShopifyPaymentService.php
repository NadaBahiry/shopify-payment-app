<?php

namespace Src\Services;

use Src\Config;

class ShopifyPaymentService
{
    /**
     * Tell Shopify the payment session is resolved (success).
     * Call this when Stryve webhook confirms payment success.
     */
    public function resolve(string $sessionId): void
    {
        $url = "https://api.shopify.com/payments/payment_sessions/{$sessionId}/resolve";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . Config::get('SHOPIFY_PAYMENT_TOKEN'),
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => '{}',
            CURLOPT_TIMEOUT => 30,
        ]);

        curl_exec($ch);
        curl_close($ch);
    }

    /**
     * Reject a payment session (e.g. payment failed or expired).
     */
    public function reject(string $sessionId, string $reason = 'Payment failed'): void
    {
        $url = "https://api.shopify.com/payments/payment_sessions/{$sessionId}/reject";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . Config::get('SHOPIFY_PAYMENT_TOKEN'),
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode(['reason' => $reason]),
            CURLOPT_TIMEOUT => 30,
        ]);

        curl_exec($ch);
        curl_close($ch);
    }
}
