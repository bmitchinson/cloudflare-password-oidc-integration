import type { AppConfig } from "./types";

export function homePage(config: AppConfig) {
  return htmlDocument(
    `
      <h1>oidc password provider</h1>
      <p>generic oidc for cloudflare access.</p>
      <p><code>${escapeHtml(config.issuer)}/.well-known/openid-configuration</code></p>
    `,
    "oidc password provider",
  );
}

export function loginPage(requestId: string, error?: string) {
  return htmlDocument(
    `
      <h1>password required</h1>
      <p>using the correct password will keep you signed in for a month.</p>
      ${error ? `<p class="message error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/login">
        <input type="hidden" name="request_id" value="${escapeHtml(requestId)}">
        <input id="password" name="password" type="password" autocomplete="current-password" aria-label="password" autofocus required>
        <button type="submit">continue</button>
      </form>
    `,
    "password required",
  );
}

export function setupPage(configPath: string, error: string) {
  return htmlDocument(
    `
      <h1>setup required</h1>
      <p>config could not be loaded.</p>
      <p><code>${escapeHtml(configPath)}</code></p>
      <p class="message error"><code>${escapeHtml(error)}</code></p>
    `,
    "setup required",
  );
}

function htmlDocument(body: string, title = "oidc password provider") {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f7f5;
      color: #111111;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f7f7f5;
      color: #111111;
    }

    main {
      width: min(100%, 420px);
      display: grid;
      gap: 14px;
      text-align: center;
    }

    h1,
    p,
    label,
    button {
      margin: 0;
      text-transform: lowercase;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    p,
    label,
    button,
    input,
    code {
      font-size: 0.95rem;
    }

    p {
      color: #4a4a4a;
      line-height: 1.5;
    }

    form {
      display: grid;
      gap: 12px;
      margin-top: 6px;
    }

    input,
    button {
      width: 100%;
      border-radius: 8px;
      border: 1px solid #d5d5cf;
      padding: 12px 14px;
      background: #ffffff;
      color: #111111;
    }

    input {
      text-align: center;
    }

    input:focus,
    button:focus {
      outline: 2px solid #111111;
      outline-offset: 2px;
    }

    button {
      width: auto;
      min-width: 120px;
      justify-self: center;
      cursor: pointer;
      font-weight: 600;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
      overflow-wrap: anywhere;
    }

    .message.error {
      color: #8a1c1c;
    }
  </style>
</head>
<body>
  <main>
${body}
  </main>
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
