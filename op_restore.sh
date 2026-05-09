# op document create data/config.json --title "cloudflare-otp-for-sites data/config.json" --vault Developer
op document get "cloudflare-otp-for-sites data/config.json" -o data/config.json
op document get "cloudflare-otp-for-sites data/oidc-private-key.pem" -o data/oidc-private-key.pem
