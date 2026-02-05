import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  routerContext
) {
  addDocumentResponseHeaders(request, responseHeaders);

  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [callbackName]() {
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(body, {
              status: responseStatusCode,
              headers: responseHeaders,
            })
          );
          pipe(body);
        },
        onShellError(err) {
          reject(err);
        },
        onError(err) {
          responseStatusCode = 500;
          console.error(err);
        },
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
