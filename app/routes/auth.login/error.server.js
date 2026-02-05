export function loginErrorMessage(url) {
  const errorMessages = {
    invalid_shop: "Invalid shop domain. Please check and try again.",
  };

  const errorKey = url.searchParams.get("error");
  if (errorKey && errorMessages[errorKey]) {
    return { shop: errorMessages[errorKey] };
  }

  return {};
}
