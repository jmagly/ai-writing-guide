# vault CI fetch spec for the optional Cloudflare purge in .gitea/workflows/docsite-deploy.yml.
env CLOUDFLARE_API_TOKEN ${CLOUDFLARE_API_TOKEN_VAULT_PATH} ${CLOUDFLARE_API_TOKEN_VAULT_FIELD}
