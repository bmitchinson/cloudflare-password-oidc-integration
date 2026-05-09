# AGENTS.md

## Application

This repository contains a small Bun-based OpenID Connect provider intended for Cloudflare Access. Cloudflare redirects users here during Generic OIDC login. The app shows a plain HTML password form and issues signed RS256 OIDC tokens with the grants mapped to the submitted shared password.

The goal is not full user identity management. The goal is a lightweight "shared password grants access" flow so casual users can reach Cloudflare Tunnel-backed services without entering an email address for Cloudflare OTP.

## Intended Ask

Build and maintain a minimal OIDC implementation that:

- runs with Bun,
- deploys cleanly using the Fly.io-generated Bun Dockerfile,
- reads runtime client config, client secrets, and password-to-grants mappings from `/data/config.json`,
- supports one deployment for development and production,
- keeps HTML intentionally plain until a later design pass,
- emits a `grants` claim Cloudflare Access can use in OIDC Claim policies,
- logs token issuance at info level,
- logs unexpected or rejected protocol flow events at warn level.

## Important Files

- `index.ts`: process entry point and server boot.
- `src/config.ts`: JSON config loading and validation.
- `src/oidc.ts`: OIDC route and flow handling.
- `src/signing.ts`: RS256 signing key loading/generation and JWT signing.
- `src/pages.ts`: plain HTML views.
- `src/responses.ts`: HTTP response helpers.
- `src/logger.ts`: JSON stdout/stderr logger.
- `/data/config.json`: production runtime config on the Fly volume.
- `data-examples/config.example.json`: example config to copy into `/data/config.json` manually.
- `data-examples/oidc-private-key.example.pem`: placeholder documenting the signing key path; do not use as a real key.

## Operational Notes

The runtime config must exist at `/data/config.json` in production. The app does not seed or overwrite it. The generated private signing key lives at `/data/oidc-private-key.pem` in production and must persist across restarts. If the signing key changes, Cloudflare can reject tokens until it refreshes the JWKS.

Cloudflare should be configured as a Generic OIDC identity provider. Add `grants` as a custom OIDC claim in Cloudflare, then use Access policies that require the appropriate grant value for each protected site.

For month-long browser access, configure the Cloudflare Access application or policy session duration. This app intentionally issues short-lived OIDC tokens and leaves the user-facing session lifetime to Cloudflare.

## Documentation Maintenance

When changing behavior that affects runtime config, Fly volume layout, password setup, signing key handling, or app startup requirements, update `configuration.md` in the same change.

When changing behavior that affects Cloudflare Access setup, OIDC endpoints, claims, auth URL shape, redirect URI handling, or policy guidance, update `cloudflare.md` in the same change.
