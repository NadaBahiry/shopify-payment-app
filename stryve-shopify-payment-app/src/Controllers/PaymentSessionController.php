<?php

namespace Src\Controllers;

use Src\Services\StryveApiService;

class PaymentSessionController
{
    public function create(): void
    {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);

        if (!is_array($payload) || !isset($payload['id'], $payload['amount'], $payload['currency'])) {
            $this->jsonResponse(['error' => 'Invalid payload'], 400);
            return;
        }

        $sessionId = $payload['id'];
        $amount = (float) ($payload['amount'] ?? 0);
        $currency = (string) ($payload['currency'] ?? 'USD');

        $stryve = new StryveApiService();
        $payment = $stryve->createPayment($amount, $currency, $sessionId);

        if (empty($payment['payment_url'])) {
            $this->jsonResponse([
                'error' => $payment['message'] ?? 'Stryve payment creation failed',
            ], 502);
            return;
        }

        $this->jsonResponse([
            'redirect_url' => $payment['payment_url'],
        ]);
    }

    private function jsonResponse(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}
