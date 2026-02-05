<?php

namespace Src\Services;

use Src\Config;

/**
 * Stryve API client for creating payments and refunds.
 *
 * APP_URL (used for callback_url): Your app's public URL. In local development
 * use your ngrok URL (e.g. https://abc123.ngrok.io). Get it from https://ngrok.com
 * → sign up → download ngrok → run: ngrok http 8000 → copy the "Forwarding" https URL.
 */
class StryveApiService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(Config::get('STRYVE_API_BASE', 'https://api.stryvepay.com'), '/');
    }

    public function createPayment(float $amount, string $currency, string $reference): array
    {
        $appUrl = rtrim(Config::get('APP_URL'), '/');
        return $this->post('/payments', [
            'amount' => $amount,
            'currency' => $currency,
            'merchant_reference' => $reference,
            'callback_url' => $appUrl . '/webhooks/stryve',
        ]);
    }

    /**
     * Create a refund with Stryve.
     *
     * @param string $paymentId Stryve payment/order id
     * @param float  $amount    Amount to refund
     * @param string $currency  Currency code
     * @return array Stryve API response
     */
    public function createRefund(string $paymentId, float $amount, string $currency): array
    {
        return $this->post('/refunds', [
            'payment_id' => $paymentId,
            'amount' => $amount,
            'currency' => $currency,
        ]);
    }

    private function post(string $endpoint, array $data): array
    {
        $ch = curl_init($this->baseUrl . $endpoint);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . Config::get('STRYVE_API_KEY'),
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response ?: '{}', true) ?? [];
        $decoded['_http_code'] = $httpCode;

        return $decoded;
    }
}
