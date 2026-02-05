import { data, Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(new URL(request.url));
  return data({ errors, polarisTranslations: {} });
};

export const action = async ({ request }) => {
  const errors = {};
  const formData = await request.formData();
  const shop = formData.get("shop");

  if (!shop) {
    errors.shop = "Please enter your shop domain";
    return data({ errors });
  }

  try {
    return await login(request);
  } catch (error) {
    errors.shop = error.message;
    return data({ errors });
  }
};

export default function Auth() {
  const { errors } = useLoaderData();
  const actionData = useActionData();
  const allErrors = { ...errors, ...actionData?.errors };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
        <h1>Stryve Payment Gateway</h1>
        <p>Log in to configure your payment gateway.</p>
        <Form method="post">
          <label>
            <span>Shop domain</span>
            <input
              type="text"
              name="shop"
              placeholder="my-shop.myshopify.com"
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
            {allErrors?.shop && (
              <p style={{ color: "red" }}>{allErrors.shop}</p>
            )}
          </label>
          <button
            type="submit"
            style={{ marginTop: "1rem", padding: "8px 16px", cursor: "pointer" }}
          >
            Log in
          </button>
        </Form>
      </div>
    </div>
  );
}
