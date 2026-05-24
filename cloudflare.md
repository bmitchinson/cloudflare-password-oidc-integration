# Cloudflare Setup

This app is a Generic OIDC identity provider for Cloudflare Access.

Provider URL:

```text
https://cloudflare-password-oidc-integration.fly.dev
```

Use one Cloudflare OIDC provider for all protected sites. Passwords decide which grants a user receives.

```text
https://cloudflare-password-oidc-integration.fly.dev/authorize
```

## 1. Configure `/data/config.json`

Use one shared OIDC client:

```json
{
  "id": "cloudflare-access-shared-passwords",
  "secret": "make-a-random-client-secret",
  "redirectUris": [
    "https://YOUR-TEAM-NAME.cloudflareaccess.com/cdn-cgi/access/callback"
  ]
}
```

## 2. Add The OIDC Provider

In Cloudflare Zero Trust:

```text
Settings / Integrations -> Authentication -> Login methods -> Add new -> OpenID Connect
```

Use these values:

```text
Name:
Shared Site Passwords

Client ID:
cloudflare-access-shared-passwords

Client Secret:
make-a-random-client-secret

Auth URL:
https://cloudflare-password-oidc-integration.fly.dev/authorize

Token URL:
https://cloudflare-password-oidc-integration.fly.dev/token

Certificate URL / JWKS URL:
https://cloudflare-password-oidc-integration.fly.dev/jwks.json
```

If Cloudflare shows a PKCE option, leave it disabled. This app does not implement PKCE.

If Cloudflare lets you list custom OIDC claims, add:

```text
grants
```

Save the provider and use Cloudflare's test button.

## 3. Redirect URI

Cloudflare will use a callback like:

```text
https://YOUR-TEAM-NAME.cloudflareaccess.com/cdn-cgi/access/callback
```

That exact URL must appear in the client entry:

```json
"redirectUris": [
  "https://YOUR-TEAM-NAME.cloudflareaccess.com/cdn-cgi/access/callback"
]
```

If it does not match exactly, login fails.

## 4. Enable For An Existing Access App

In Cloudflare Zero Trust:

```text
Access -> Applications -> your existing app -> Configure
```

Find the app's login methods / identity providers section and enable:

```text
Shared Site Passwords
```

You can leave One-time PIN enabled while testing. Remove it later if you only want password access.

## 5. Add The Access Policy

For the protected app, add or update an Allow policy requiring a grant claim:

```text
Claim name:
grants

Claim value:
photos
```

The claim value must be included in the grants for at least one password in `/data/config.json`.

## 6. Session Duration

Set the Access application or policy session duration to one month.

This app issues short-lived OIDC tokens. Cloudflare controls how long the user stays logged in to the protected site.
