/**
 * App Settings Page
 *
 * Merchant-facing configuration page where store owners can:
 * 1. Configure their Stryve API key (obtained from Stryve mobile app: More > API Key)
 * 2. Set the API base URL (custom URL override — leave empty for defaults)
 * 3. Toggle sandbox/test mode
 * 4. Toggle debug logging
 *
 * Settings match the WooCommerce plugin configuration:
 *   | Setting       | Type     | Default                              |
 *   |---------------|----------|--------------------------------------|
 *   | API Key       | Password | (empty)                              |
 *   | Sandbox Mode  | Checkbox | Yes                                  |
 *   | API Base URL  | Text     | (empty) — defaults to http://127.0.0.1:8000/api/v1 |
 *   | Debug Log     | Checkbox | No                                   |
 *
 * Base URL Resolution (same priority as WooCommerce):
 *   1. Custom URL: if set, use it (trailing slash stripped)
 *   2. Sandbox default: http://127.0.0.1:8000/api/v1
 *   3. Production default: http://127.0.0.1:8000/api/v1
 *   Note: Both sandbox and production currently default to the same local URL.
 *   For production, set https://app.stryve.me/api/v1 in the API Base URL field.
 */

import { authenticate } from "~/shopify.server";
import { getStryveSettings, upsertStryveSettings } from "~/payments.repository";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const stryveSettings = await getStryveSettings(session.shop);

  return {
    shop: session.shop,
    stryveSettings: stryveSettings
      ? {
          apiKey: stryveSettings.apiKey ? "***" + stryveSettings.apiKey.slice(-6) : "",
          baseUrl: stryveSettings.baseUrl,
          sandbox: stryveSettings.sandbox,
          debug: stryveSettings.debug,
          hasApiKey: !!stryveSettings.apiKey,
        }
      : null,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const apiKey = formData.get("apiKey");
  const baseUrl = formData.get("baseUrl") || "";
  const sandbox = formData.get("sandbox") === "true";
  const debug = formData.get("debug") === "true";

  if (!apiKey) {
    return { error: "API Key is required." };
  }

  await upsertStryveSettings(session.shop, { apiKey, baseUrl, sandbox, debug });
  return { success: true, message: "Stryve settings saved successfully." };
};

export default function Settings() {
  return (
    <s-page title="Stryve Payment Gateway">
      <s-layout>
        <s-section>
          <s-card>
            <s-block-stack gap="400">
              <s-text variant="headingMd">Stryve API Configuration</s-text>
              <s-text variant="bodyMd" tone="subdued">
                Enter your Stryve SME Checkout API key. You can find it in the
                Stryve mobile app under More &gt; API Key.
              </s-text>

              <s-form method="post">
                <s-form-layout>
                  <s-text-field
                    label="API Key"
                    name="apiKey"
                    type="password"
                    autoComplete="off"
                    helpText="Your 64-character Stryve API key"
                  ></s-text-field>

                  <s-text-field
                    label="API Base URL"
                    name="baseUrl"
                    autoComplete="off"
                    placeholder="Leave empty for default"
                    helpText="Leave empty for defaults: sandbox = http://127.0.0.1:8000/api/v1, production = https://app.stryve.me/api/v1"
                  ></s-text-field>

                  <s-checkbox
                    label="Sandbox / Test Mode"
                    name="sandbox"
                    value="true"
                    checked
                  ></s-checkbox>

                  <s-checkbox
                    label="Debug Logging"
                    name="debug"
                    value="true"
                  ></s-checkbox>

                  <s-button variant="primary" type="submit">
                    Save Stryve Settings
                  </s-button>
                </s-form-layout>
              </s-form>
            </s-block-stack>
          </s-card>
        </s-section>

        <s-section variant="oneThird">
          <s-card>
            <s-block-stack gap="300">
              <s-text variant="headingMd">Setup Checklist</s-text>
              <s-divider></s-divider>
              <s-text>1. Configure your Stryve API key</s-text>
              <s-text>2. Save settings</s-text>
              <s-text>3. Add the Stryve payment block to your checkout</s-text>
              <s-text>4. Process a test payment</s-text>
            </s-block-stack>
          </s-card>

          <s-box padding-block-start="400">
            <s-card>
              <s-block-stack gap="300">
                <s-text variant="headingMd">How It Works</s-text>
                <s-divider></s-divider>
                <s-text variant="bodyMd" tone="subdued">
                  1. Customer clicks "Pay with Stryve" at checkout
                </s-text>
                <s-text variant="bodyMd" tone="subdued">
                  2. Customer is redirected to Stryve's secure payment page
                </s-text>
                <s-text variant="bodyMd" tone="subdued">
                  3. After payment, customer returns to your store
                </s-text>
              </s-block-stack>
            </s-card>
          </s-box>
        </s-section>
      </s-layout>
    </s-page>
  );
}
