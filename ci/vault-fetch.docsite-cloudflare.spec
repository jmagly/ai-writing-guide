# Shared Cloudflare zone token used by the docsite purge and zone-policy workflows.
env CLOUDFLARE_API_TOKEN ${CLOUDFLARE_API_TOKEN_VAULT_PATH} ${CLOUDFLARE_API_TOKEN_VAULT_FIELD}
