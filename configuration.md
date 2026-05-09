# Configuration

This app has one runtime configuration file:

```text
/data/config.json
```

On Fly.io, `/data` is the mounted persistent volume. That means changes to `/data/config.json` survive deploys, machine restarts, and image rebuilds. Put client secrets and shared passwords directly in `/data/config.json`.

The app does not copy a config file into the volume. Create `/data/config.json` yourself from the example file before relying on the deployment.

## What The Volume Stores

The Fly volume is mounted at:

```text
/data
```

It stores:

```text
/data/config.json
/data/oidc-private-key.pem
```

`config.json` is the editable app config. `oidc-private-key.pem` is the private signing key used to sign OIDC tokens. Do not delete the signing key unless you intentionally want to rotate the OIDC signing key.

## Example Files

Example volume contents live in:

```text
data-examples/config.example.json
data-examples/oidc-private-key.example.pem
```

`config.example.json` is the file to copy from when creating `/data/config.json`.

`oidc-private-key.example.pem` is only a placeholder. Do not copy it as your real signing key. If `/data/oidc-private-key.pem` is missing, the app creates a real key automatically and keeps it on the volume.

## How To Edit Volume Config

Edit what is inside the volume by SSHing into the Fly app.

```bash
flyctl ssh console --app cloudflare-password-oidc-integration
cd /data
cp config.json config.json.bak
vi config.json
exit
flyctl machine restart 148e0e32fe2908 --app cloudflare-password-oidc-integration
```

The app reads config at startup, so restart the machine after editing.

To create the first config file from your local example:

```bash
flyctl ssh console --app cloudflare-password-oidc-integration -C 'sh -lc "mkdir -p /data && cat > /data/config.json"' < data-examples/config.example.json
flyctl ssh console --app cloudflare-password-oidc-integration
vi /data/config.json
exit
flyctl machine restart 148e0e32fe2908 --app cloudflare-password-oidc-integration
```

To see the current machine ID:

```bash
flyctl status --app cloudflare-password-oidc-integration
```

## Config Shape

Example: data-examples/config.example.json

## Password Grants

Passwords are configured as a map. Each password maps to the grants it should receive:

```json
"passwords": {
  "shared-password-for-calendar": ["calendar"],
  "shared-password-for-admin": ["calendar", "photos", "admin"]
}
```

When a user enters a password, the app finds that password in the map and emits those grants in the OIDC token.

After changing grants or passwords, restart:

```bash
flyctl machine restart 148e0e32fe2908 --app cloudflare-password-oidc-integration
```

In Cloudflare Access, make the protected app require the OIDC claim:

```text
grants contains calendar
```

## Rotating A Password

Edit `/data/config.json`, change the password string, and restart the Fly machine.

Existing Cloudflare Access sessions may continue until their Access session expires. If the password leaked, also revoke sessions in Cloudflare Access for the affected app.
