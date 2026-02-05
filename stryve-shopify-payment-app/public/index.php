<?php

require __DIR__ . '/../vendor/autoload.php';

\Src\Config::load();

use Src\Controllers\PaymentSessionController;
use Src\Controllers\WebhookController;
use Src\Controllers\RefundController;
use Src\Controllers\ComplianceWebhookController;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

// Shopify loads the app in admin by requesting the root URL (embedded iframe)
// We respond with a simple page for ANY method so it never 404s here.
if ($path === '/' || $path === '') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stryve Payments</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:1rem;"><h1>Stryve Payments</h1><p>This is the Stryve Shopify Payment App backend.</p><p>Merchants configure the payment method in <strong>Settings → Payments</strong> inside Shopify. This admin view is only a placeholder.</p></body></html>';
    exit;
}

if ($path === '/payments/session' && $method === 'POST') {
    (new PaymentSessionController())->create();
    exit;
}

if ($path === '/webhooks/stryve' && $method === 'POST') {
    (new WebhookController())->handle();
    exit;
}

if ($path === '/payments/refund' && $method === 'POST') {
    (new RefundController())->create();
    exit;
}

// Mandatory for App Store: GDPR compliance webhooks (customers/data_request, customers/redact, shop/redact)
if ($path === '/webhooks/compliance' && $method === 'POST') {
    (new ComplianceWebhookController())->handle();
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
