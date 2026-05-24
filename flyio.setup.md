# Fly.io Deployment Runbook

This is the manual, one-command-at-a-time flow for recreating the Fly app.

App name:

```text
cloudflare-password-oidc-integration
```

Region:

```text
sjc
```

Runtime volume path:

```text
/data
```

Required runtime files:

```text
/data/config.json
/data/oidc-private-key.pem
```

`/data/config.json` must be created by you. If it is missing or invalid, the app now stays running in setup mode so you can SSH in and fix the volume.

`/data/oidc-private-key.pem` is optional on first deploy. If it is missing after config is valid, the app creates it automatically.

## 1. Confirm Auth

```bash
flyctl auth whoami
```

## 2. Create The App

```bash
flyctl apps create cloudflare-password-oidc-integration --yes
```

If it already exists, continue.

## 3. Create The Volume

```bash
flyctl volumes create oidc_data --app cloudflare-password-oidc-integration --region sjc --size 1 --yes
```

Fly volumes are whole-GB allocations. The smallest practical volume here is `1GB`.

## 4. Deploy The App

```bash
flyctl deploy --app cloudflare-password-oidc-integration
```

If `/data/config.json` is missing, the app should still start in setup mode.

## 5. Find The Machine

```bash
flyctl machines list --app cloudflare-password-oidc-integration
```

Record the machine ID. It will look like:

```text
18545d2a423ed8
```

## 6. Prepare Config Locally

```bash
cp data-examples/config.example.json /tmp/cloudflare-password-config.json
```

Edit it:

```bash
vi /tmp/cloudflare-password-config.json
```

Make sure `issuer` is:

```text
https://cloudflare-password-oidc-integration.fly.dev
```

## 7. Copy Config Into The Volume

Replace `<MACHINE_ID>` with the machine ID.

```bash
flyctl ssh console --app cloudflare-password-oidc-integration --machine <MACHINE_ID> -C 'sh -lc "mkdir -p /data && cat > /data/config.json"' < data/config.json
```

## 8. Copy Existing Signing Key, If Any

If you have a previous signing key backup, copy it:

```bash
flyctl ssh console --app cloudflare-password-oidc-integration --machine <MACHINE_ID> -C 'sh -lc "cat > /data/oidc-private-key.pem && chmod 600 /data/oidc-private-key.pem"' < data/oidc-private-key.pem
```

If you do not have one, skip this. The app creates a new signing key after config loads.

## 9. Verify Volume Contents

```bash
flyctl ssh console --app cloudflare-password-oidc-integration --machine <MACHINE_ID> -C 'sh -lc "ls -la /data && grep issuer /data/config.json"'
```

## 10. Restart The Machine

```bash
flyctl machine restart <MACHINE_ID> --app cloudflare-password-oidc-integration
```

## 11. Verify The App

```bash
curl -sS https://cloudflare-password-oidc-integration.fly.dev/health
```

```bash
curl -sS https://cloudflare-password-oidc-integration.fly.dev/.well-known/openid-configuration
```

If the app is still in setup mode, check:

```bash
flyctl logs --app cloudflare-password-oidc-integration
```

Then SSH in and inspect `/data/config.json`.
