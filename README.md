# cloudflare-password-oidc-integration

A tiny Bun OpenID Connect provider for Cloudflare Access. A user enters a shared password, and that password maps to one or more grants Cloudflare can use in Access policies.

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

See `data-examples/config.example.json` for examples.

The login page asks only for the password. The password determines the emitted `grants` claim.

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

The Docker image ignores `.env`. Put production client secrets and shared passwords directly in `/data/config.json` so you can change them without rebuilding.

Current deployment:

- app: `cloudflare-password-oidc-integration`
- public URL: `https://cloudflare-password-oidc-integration.fly.dev`
- region: `sjc`
- volume: `oidc_data`
- mount path: `/data`
- config path: `/data/config.json`
- signing key path: `/data/oidc-private-key.pem`

To launch the same shape from scratch:

```bash
flyctl launch \
  --name cloudflare-password-oidc-integration \
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
  --app cloudflare-password-oidc-integration \
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
flyctl deploy --app cloudflare-password-oidc-integration
```

## Password setup

Passwords live directly in `/data/config.json`.

Example password grants in `config.json`:

```json
"passwords": {
  "shared-password-for-photos": ["photos"],
  "shared-password-for-admin": ["photos", "files", "admin"]
}
```

To edit config on the Fly volume:

```bash
flyctl ssh console --app cloudflare-password-oidc-integration
cd /data
cp config.json config.json.bak
vi config.json
exit
flyctl machine restart 148e0e32fe2908 --app cloudflare-password-oidc-integration
```

The app reads config on startup, so restart the machine after editing `/data/config.json`.

To add or change password grants without rebuilding:

1. SSH into the Fly machine.
2. Edit `/data/config.json`.
3. Add or edit an entry under `passwords`, for example `"new-password": ["calendar"]`.
4. Restart the Fly machine.

To rotate a password without rebuilding, change the value in `/data/config.json` and restart the Fly machine. Existing Cloudflare Access sessions can remain valid until their Access session expires unless you revoke them in Cloudflare.

## Volume notes

Fly volumes are sized in whole GB through `flyctl`; `--size` is an integer number of gigabytes and defaults to `1`. The current volume is already at the practical minimum size exposed by the CLI.

The Fly volume stores:

- `/data/config.json`: editable runtime config
- `/data/oidc-private-key.pem`: OIDC signing key

The signing key signs ID tokens and backs `/jwks.json`.

Useful commands:

```bash
flyctl volumes list --app cloudflare-password-oidc-integration
flyctl ssh console --app cloudflare-password-oidc-integration
ls -la /data
```

## Endpoints

- `GET /.well-known/openid-configuration`
- `GET /jwks.json`
- `GET /authorize`
- `POST /login`
- `POST /token`
- `GET /health`
