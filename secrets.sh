#!/usr/bin/env sh
set -eu

VAULT="Developer"
APP_NAME="cloudflare-password-oidc-integration"

# Format: local_path
# Keep one entry per secret. Add more lines as new files are introduced.
SECRET_ITEMS='
data/config.json
data/oidc-private-key.pem
'

usage() {
  echo "Usage: ./secrets restore|export" >&2
  exit 2
}

confirm() {
  action="$1"

  echo "Are you sure? This will ${action} local secret files and 1Password documents."
  printf "Type 'yes' to continue: "
  read -r answer

  if [ "$answer" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
}

for_each_secret() {
  operation="$1"

  while IFS='|' read -r local_path; do
    [ -n "$local_path" ] || continue
    doc_title="$APP_NAME $local_path"

    case "$operation" in
      restore)
        mkdir -p "$(dirname "$local_path")"
        op document get "$doc_title" --vault "$VAULT" -o "$local_path"
        ;;
      export)
        [ -f "$local_path" ] || { echo "Missing $local_path" >&2; exit 1; }
        op document edit "$doc_title" "$local_path" --vault "$VAULT"
        ;;
      *)
        echo "Unknown operation: $operation" >&2
        exit 2
        ;;
    esac
  done <<EOF
$SECRET_ITEMS
EOF
}

restore() {
  confirm "overwrite"
  for_each_secret restore
}

export_secrets() {
  confirm "export"
  for_each_secret export
}

[ "$#" -eq 1 ] || usage

case "$1" in
  restore)
    restore
    ;;
  export)
    export_secrets
    ;;
  *)
    usage
    ;;
esac

echo "done ✅"
