# Cloudflare Setup

This app is a Generic OIDC identity provider for Cloudflare Access.

Provider URL:

```text
https://cloudflare-otp-for-sites.fly.dev
```

Use one Cloudflare OIDC provider for all protected sites. The site is selected by the authorization URL:

```text
https://cloudflare-otp-for-sites.fly.dev/authorize?site=photos
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

Add one site entry per protected app:

```json
{
  "id": "photos",
  "name": "Photos",
  "passwords": ["shared-password-users-enter"],
  "grants": ["photos"]
}
```

Restart after editing:

```bash
flyctl machine restart 148e0e32fe2908 --app cloudflare-otp-for-sites
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
https://cloudflare-otp-for-sites.fly.dev/authorize?site=photos

Token URL:
https://cloudflare-otp-for-sites.fly.dev/token

Certificate URL / JWKS URL:
https://cloudflare-otp-for-sites.fly.dev/jwks.json
```

If Cloudflare shows a PKCE option, leave it disabled. This app does not implement PKCE.

If Cloudflare lets you list custom OIDC claims, add:

```text
site
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

For the protected app, add or update an Allow policy requiring the site claim.

Use either:

```text
Claim name:
site

Claim value:
photos
```

Or:

```text
Claim name:
grants

Claim value:
photos
```

The claim value must match the site entry in `/data/config.json`.

## 6. Session Duration

Set the Access application or policy session duration to one month.

This app issues short-lived OIDC tokens. Cloudflare controls how long the user stays logged in to the protected site.

## 7. Troubleshooting

Check Fly logs:

```bash
flyctl logs --app cloudflare-otp-for-sites
```

Common issues:

- `unknown_site`: the Auth URL site does not match a site id in `/data/config.json`.
- `unknown_client`: Cloudflare Client ID does not match `clients[].id`.
- `invalid_client_credentials`: Cloudflare Client Secret does not match `clients[].secret`.
- `invalid_redirect_uri`: Cloudflare callback is missing from `redirectUris`.
- User reaches the wrong site page: verify the Auth URL contains the expected `?site=photos` value.
