import { data, redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return data({ showForm: Boolean(login) });
};

export default function Index() {
  const { showForm } = useLoaderData();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "500px", textAlign: "center", padding: "2rem" }}>
        <h1>Stryve Payment Gateway</h1>
        <p>Accept payments through Stryve on your Shopify store.</p>
        {showForm && (
          <Form method="post" action="/auth/login">
            <label>
              <span>Shop domain</span>
              <br />
              <input
                type="text"
                name="shop"
                placeholder="my-shop.myshopify.com"
                style={{ width: "100%", padding: "8px", marginTop: "4px", boxSizing: "border-box" }}
              />
            </label>
            <br />
            <button
              type="submit"
              style={{ marginTop: "1rem", padding: "8px 24px", cursor: "pointer" }}
            >
              Log in
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}
