<?php

namespace Src\Controllers;

use Src\Services\StryveApiService;
use Src\Services\ShopifyPaymentService;

class RefundController
{
    /**
     * Handle refund request from Shopify.
     * Expects JSON: payment_id (Stryve), amount, currency, session_id (Shopify payment session for idempotency).
     */
    public function create(): void
    {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);

        if (!is_array($payload) || empty($payload['payment_id'] ?? null)) {
            $this->jsonResponse(['error' => 'Invalid refund payload'], 400);
            return;
        }

        $paymentId = $payload['payment_id'];
        $amount = (float) ($payload['amount'] ?? 0);
        $currency = (string) ($payload['currency'] ?? 'USD');

        if ($amount <= 0) {
            $this->jsonResponse(['error' => 'Invalid amount'], 400);
            return;
        }

        $stryve = new StryveApiService();
        $result = $stryve->createRefund($paymentId, $amount, $currency);

        $httpCode = $result['_http_code'] ?? 500;
        unset($result['_http_code']);

        if ($httpCode >= 200 && $httpCode < 300) {
            $this->jsonResponse(['success' => true, 'refund' => $result]);
            return;
        }

        $this->jsonResponse([
            'error' => $result['message'] ?? 'Refund failed',
        ], $httpCode >= 400 ? $httpCode : 502);
    }

    private function jsonResponse(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
