# cloudflare-otp-for-sites

A tiny Bun OpenID Connect provider for Cloudflare Access. It lets a user reach a protected site by entering a site-specific shared password, then emits OIDC claims Cloudflare can use in Access policies.

This is intentionally boring HTML. There is no CSS yet.

See [configuration.md](./configuration.md) for the plain-language guide to editing passwords and volume-backed config.

## Run locally

```bash
bun install
cp data-examples/config.example.json config.json
CONFIG_PATH=./config.json bun run start
```

For local-only testing, set `issuer` to `http://localhost:3000` and `keyPath` to `./data/oidc-private-key.pem` in `config.json`.

The first production run creates `/data/oidc-private-key.pem` on the Fly volume. Keep that file persistent. If it changes, Cloudflare may reject tokens until it refreshes the JWKS.

## Config

`CONFIG_PATH` defaults to `./config.json`. On Fly.io, `fly.toml` sets `CONFIG_PATH=/data/config.json` so the runtime config lives on the mounted volume.

```json
{
  "issuer": "https://your-provider.fly.dev",
  "keyPath": "/data/oidc-private-key.pem",
  "clients": [
    {
      "id": "cloudflare-access-shared-passwords",
      "secret": "replace-me-client-secret",
      "redirectUris": [
        "https://your-team-name.cloudflareaccess.com/cdn-cgi/access/callback"
      ]
    }
  ],
  "sites": [
    {
      "id": "photos",
      "name": "Photos",
      "passwords": ["replace-me-photos-password"],
      "grants": ["photos"]
    }
  ]
}
```

For site detection, configure Cloudflare's OIDC Auth URL with `?site=photos`.

The login page displays the detected site name and asks only for the password.

## Cloudflare setup

Create a Generic OIDC identity provider in Cloudflare Access:

- Client ID: the `clients[].id` value
- Client secret: the `clients[].secret` value
- Auth URL: `https://your-provider.fly.dev/authorize`
- Token URL: `https://your-provider.fly.dev/token`
- Certificate URL: `https://your-provider.fly.dev/jwks.json`
- Redirect URI to allow here: `https://your-team-name.cloudflareaccess.com/cdn-cgi/access/callback`

Add the custom OIDC claim `grants` in the Cloudflare identity provider settings. Then create each Access app policy using the OIDC Claim selector, for example:

- claim name: `grants`
- claim value: `photos`

Set the Cloudflare Access application session duration to one month. This provider issues short-lived OIDC tokens; Cloudflare owns the user-facing Access session lifetime.

## Fly.io

The included Dockerfile matches Fly's Bun scaffold and runs:

```bash
bun index.ts
```

For the current deployment, Fly sets `CONFIG_PATH=/data/config.json`. The app does not create or copy that file. Create it manually from `data-examples/config.example.json`, then edit it on the volume.

The Docker image ignores `.env`. Put production client secrets and site passwords directly in `/data/config.json` so you can change them without rebuilding.

Current deployment:

- app: `cloudflare-otp-for-sites`
- public URL: `https://cloudflare-otp-for-sites.fly.dev`
- region: `sjc`
- volume: `oidc_data`
- mount path: `/data`
- config path: `/data/config.json`
- signing key path: `/data/oidc-private-key.pem`

To launch the same shape from scratch:

```bash
flyctl launch \
  --name cloudflare-otp-for-sites \
  --region sjc \
  --primary-region sjc \
  --internal-port 3000 \
  --no-db \
  --no-object-storage \
  --no-redis \
  --no-github-workflow \
  --ha=false \
  --no-deploy

flyctl volumes create oidc_data \
  --app cloudflare-otp-for-sites \
  --region sjc \
  --size 1 \
  --yes
```

Then make sure `fly.toml` contains:

```toml
[env]
  CONFIG_PATH = '/data/config.json'

[mounts]
  source = 'oidc_data'
  destination = '/data'
```

Deploy updates:

```bash
flyctl deploy --app cloudflare-otp-for-sites
```

## Password setup

Passwords live directly in `/data/config.json`.

Example site in `config.json`:

```json
{
  "id": "photos",
  "name": "Photos",
  "passwords": ["shared-password-for-photos"],
  "grants": ["photos"]
}
```

To edit config on the Fly volume:

```bash
flyctl ssh console --app cloudflare-otp-for-sites
cd /data
cp config.json config.json.bak
vi config.json
exit
flyctl machine restart 148e0e32fe2908 --app cloudflare-otp-for-sites
```

The app reads config on startup, so restart the machine after editing `/data/config.json`.

To add a new protected site without rebuilding:

1. SSH into the Fly machine.
2. Edit `/data/config.json`.
3. Add a new site entry with a plaintext password, for example `passwords: ["new-password"]`, and `grants: ["calendar"]`.
4. Add or update the Cloudflare OIDC Auth URL so it uses `?site=calendar`.
5. Restart the Fly machine.

To rotate a password without rebuilding, change the value in `/data/config.json` and restart the Fly machine. Existing Cloudflare Access sessions can remain valid until their Access session expires unless you revoke them in Cloudflare.

## Volume notes

Fly volumes are sized in whole GB through `flyctl`; `--size` is an integer number of gigabytes and defaults to `1`. The current volume is already at the practical minimum size exposed by the CLI.

The Fly volume stores:

- `/data/config.json`: editable runtime config
- `/data/oidc-private-key.pem`: OIDC signing key

The signing key signs ID tokens and backs `/jwks.json`.

Useful commands:

```bash
flyctl volumes list --app cloudflare-otp-for-sites
flyctl ssh console --app cloudflare-otp-for-sites
ls -la /data
```

## Endpoints

- `GET /.well-known/openid-configuration`
- `GET /jwks.json`
- `GET /authorize`
- `POST /login`
- `POST /token`
- `GET /health`
