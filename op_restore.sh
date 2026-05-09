# op document create data/config.json --title "cloudflare-password-oidc-integration data/config.json" --vault Developer
# op document edit "cloudflare-password-oidc-integration data/config.json" data/config.json --vault Developer
op document get "cloudflare-password-oidc-integration data/config.json" -o data/config.json

# op document create data/oidc-private-key.pem --title "cloudflare-password-oidc-integration data/oidc-private-key.pem" --vault Developer
# op document edit data/oidc-private-key.pem --title "cloudflare-password-oidc-integration data/oidc-private-key.pem" --vault Developer
op document get "cloudflare-password-oidc-integration data/oidc-private-key.pem" -o data/oidc-private-key.pem
