import type { AppConfig } from "./types";

export function homePage(config: AppConfig) {
  return htmlDocument(`
    <h1>OIDC password provider</h1>
    <p>This service is meant to be called by Cloudflare Access as a Generic OIDC identity provider.</p>
    <p>Discovery URL: <code>${escapeHtml(config.issuer)}/.well-known/openid-configuration</code></p>
  `);
}

export function loginPage(requestId: string, error?: string) {
  return htmlDocument(`
    <h1>Password required</h1>
    <p>Enter the shared access password.</p>
    ${error ? `<p>${escapeHtml(error)}</p>` : ""}
    <form method="post" action="/login">
      <input type="hidden" name="request_id" value="${escapeHtml(requestId)}">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
      <button type="submit">Continue</button>
    </form>
  `);
}

function htmlDocument(body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OIDC password provider</title>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
