#!/usr/bin/env bash
set -euo pipefail

APP="cloudflare-password-oidc-integration"
KEY_PATH="data/oidc-private-key.pem"

if ! command -v jq >/dev/null 2>&1; then
  echo "Missing dependency: jq" >&2
  exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
  echo "Missing key file: $KEY_PATH" >&2
  exit 1
fi

machine_id="$(
  flyctl machines list \
    --app "$APP" \
    --json \
  | jq -r '.[0].id // empty'
)"

if [[ -z "$machine_id" ]]; then
  echo "No machine found for app: $APP" >&2
  exit 1
fi

echo "Using machine: $machine_id"

flyctl ssh console \
  --app "$APP" \
  --machine "$machine_id" \
  -C 'sh -lc "mkdir -p /data && ls -la /data && grep issuer /data/config.json || true"'

flyctl ssh console \
  --app "$APP" \
  --machine "$machine_id" \
  -C 'sh -lc "mkdir -p /data && cat > /data/oidc-private-key.pem && chmod 600 /data/oidc-private-key.pem"' \
  < "$KEY_PATH"

flyctl machine restart "$machine_id" \
  --app "$APP"

echo "Done."
