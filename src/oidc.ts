import { randomId } from "./encoding";
import type { Logger } from "./logger";
import { homePage, loginPage } from "./pages";
import { htmlResponse, jsonResponse, oauthError, redirectResponse, textResponse } from "./responses";
import { signJwt } from "./signing";
import type { AppConfig, AuthCode, ClientConfig, FormFields, PendingLogin, SigningMaterial } from "./types";

const authRequestTtlMs = 10 * 60 * 1000;
const authCodeTtlMs = 2 * 60 * 1000;
const idTokenTtlSeconds = 5 * 60;

type OidcServerOptions = {
  config: AppConfig;
  signing: SigningMaterial;
  logger: Logger;
};

export function createOidcServer({ config, signing, logger }: OidcServerOptions) {
  const pendingLogins = new Map<string, PendingLogin>();
  const authCodes = new Map<string, AuthCode>();

  async function fetch(request: Request): Promise<Response> {
    try {
      return await route(request);
    } catch (error) {
      logger.warn("unhandled_request_error", {
        method: request.method,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return textResponse("Internal server error", 500);
    }
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    pruneExpired();

    if (request.method === "GET" && url.pathname === "/") {
      return htmlResponse(homePage(config));
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/.well-known/openid-configuration") {
      return jsonResponse(discoveryDocument());
    }

    if (request.method === "GET" && url.pathname === "/jwks.json") {
      return jsonResponse({ keys: [signing.publicJwk] });
    }

    if (request.method === "GET" && url.pathname === "/authorize") {
      return authorize(url);
    }

    if (request.method === "POST" && url.pathname === "/login") {
      return login(request);
    }

    if (request.method === "POST" && url.pathname === "/token") {
      return token(request);
    }

    logger.warn("unexpected_route", { method: request.method, path: url.pathname });
    return textResponse("Not found", 404);
  }

  function discoveryDocument() {
    return {
      issuer: config.issuer,
      authorization_endpoint: `${config.issuer}/authorize`,
      token_endpoint: `${config.issuer}/token`,
      jwks_uri: `${config.issuer}/jwks.json`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
      scopes_supported: ["openid", "email", "profile"],
      claims_supported: ["sub", "iss", "aud", "exp", "iat", "email", "grants"],
    };
  }

  function authorize(url: URL): Response {
    const params = url.searchParams;
    const clientId = params.get("client_id") ?? "";
    const client = findClient(clientId);
    if (!client) {
      logger.warn("unknown_client", { clientId });
      return textResponse("Unknown client_id", 400);
    }

    const redirectUri = params.get("redirect_uri") ?? "";
    if (!client.redirectUris.includes(redirectUri)) {
      logger.warn("invalid_redirect_uri", { clientId, redirectUri });
      return textResponse("Invalid redirect_uri", 400);
    }

    const responseType = params.get("response_type") ?? "";
    if (responseType !== "code") {
      logger.warn("unsupported_response_type", { clientId, responseType });
      return redirectWithError(redirectUri, params.get("state"), "unsupported_response_type");
    }

    const scope = params.get("scope") ?? "";
    if (!scope.split(/\s+/).includes("openid")) {
      logger.warn("invalid_scope", { clientId, scope });
      return redirectWithError(redirectUri, params.get("state"), "invalid_scope");
    }

    const requestId = randomId();
    pendingLogins.set(requestId, {
      expiresAt: Date.now() + authRequestTtlMs,
      request: {
        clientId,
        redirectUri,
        responseType,
        scope,
        state: params.get("state"),
        nonce: params.get("nonce"),
      },
    });

    return htmlResponse(loginPage(requestId));
  }

  async function login(request: Request): Promise<Response> {
    const formData = await request.formData();
    const requestId = String(formData.get("request_id") ?? "");
    const password = String(formData.get("password") ?? "");
    const pending = pendingLogins.get(requestId);

    if (!pending || pending.expiresAt <= Date.now()) {
      pendingLogins.delete(requestId);
      logger.warn("expired_or_unknown_login_request", { requestId });
      return textResponse("Login request expired", 400);
    }

    const credential = findCredential(password);
    if (!credential) {
      logger.warn("incorrect_password");
      return htmlResponse(loginPage(requestId, "Incorrect password"), 401);
    }

    pendingLogins.delete(requestId);
    const code = randomId();
    authCodes.set(code, {
      request: pending.request,
      subject: `password:${credential.id}`,
      email: `${credential.id}@password.local`,
      grants: credential.grants,
      credentialId: credential.id,
      issuedAt: Date.now(),
      expiresAt: Date.now() + authCodeTtlMs,
    });

    const redirectUrl = new URL(pending.request.redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (pending.request.state) {
      redirectUrl.searchParams.set("state", pending.request.state);
    }

    return redirectResponse(redirectUrl.toString());
  }

  async function token(request: Request): Promise<Response> {
    const formData = await request.formData();
    const grantType = String(formData.get("grant_type") ?? "");
    if (grantType !== "authorization_code") {
      logger.warn("unsupported_grant_type", { grantType });
      return oauthError("unsupported_grant_type", 400);
    }

    const client = await authenticateClient(request, formData);
    if (!client) {
      logger.warn("invalid_client_credentials");
      return oauthError("invalid_client", 401);
    }

    const code = String(formData.get("code") ?? "");
    const authCode = authCodes.get(code);
    authCodes.delete(code);

    if (!authCode || authCode.expiresAt <= Date.now()) {
      logger.warn("invalid_or_expired_auth_code", { clientId: client.id });
      return oauthError("invalid_grant", 400);
    }

    if (authCode.request.clientId !== client.id) {
      logger.warn("auth_code_client_mismatch", { expectedClientId: authCode.request.clientId, actualClientId: client.id });
      return oauthError("invalid_grant", 400);
    }

    const redirectUri = String(formData.get("redirect_uri") ?? "");
    if (redirectUri && redirectUri !== authCode.request.redirectUri) {
      logger.warn("token_redirect_uri_mismatch", { clientId: client.id, redirectUri });
      return oauthError("invalid_grant", 400);
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const idToken = await signJwt(
      {
        iss: config.issuer,
        sub: authCode.subject,
        aud: client.id,
        exp: nowSeconds + idTokenTtlSeconds,
        iat: nowSeconds,
        auth_time: Math.floor(authCode.issuedAt / 1000),
        nonce: authCode.request.nonce ?? undefined,
        email: authCode.email,
        email_verified: true,
        name: authCode.credentialId,
        grants: authCode.grants,
      },
      signing,
    );

    const accessToken = await signJwt(
      {
        iss: config.issuer,
        sub: authCode.subject,
        aud: client.id,
        exp: nowSeconds + idTokenTtlSeconds,
        iat: nowSeconds,
        scope: authCode.request.scope,
        grants: authCode.grants,
      },
      signing,
    );

    logger.info("token_issued", {
      clientId: client.id,
      subject: authCode.subject,
      credentialId: authCode.credentialId,
      grants: authCode.grants,
    });

    return jsonResponse({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: idTokenTtlSeconds,
      id_token: idToken,
    });
  }

  async function authenticateClient(request: Request, formData: FormFields): Promise<ClientConfig | null> {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Basic ")) {
      const decoded = atob(authHeader.slice("Basic ".length));
      const delimiterIndex = decoded.indexOf(":");
      const id = delimiterIndex >= 0 ? decoded.slice(0, delimiterIndex) : decoded;
      const secret = delimiterIndex >= 0 ? decoded.slice(delimiterIndex + 1) : "";
      return validateClientSecret(id, secret);
    }

    const id = String(formData.get("client_id") ?? "");
    const secret = String(formData.get("client_secret") ?? "");
    return validateClientSecret(id, secret);
  }

  function validateClientSecret(id: string, secret: string): ClientConfig | null {
    const client = findClient(id);
    if (!client) {
      return null;
    }

    if (client.secret && client.secret !== secret) {
      return null;
    }

    return client;
  }

  function findClient(id: string) {
    return config.clients.find((client) => client.id === id);
  }

  function findCredential(password: string) {
    let index = 0;
    for (const [candidate, grants] of Object.entries(config.passwords)) {
      if (candidate === password) {
        return {
          id: `credential-${index + 1}`,
          grants,
        };
      }
      index += 1;
    }

    return null;
  }

  function redirectWithError(redirectUri: string, state: string | null, error: string) {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    if (state) {
      url.searchParams.set("state", state);
    }
    return redirectResponse(url.toString());
  }

  function pruneExpired() {
    const now = Date.now();
    for (const [id, pending] of pendingLogins.entries()) {
      if (pending.expiresAt <= now) {
        pendingLogins.delete(id);
      }
    }

    for (const [code, authCode] of authCodes.entries()) {
      if (authCode.expiresAt <= now) {
        authCodes.delete(code);
      }
    }
  }

  return { fetch };
}
