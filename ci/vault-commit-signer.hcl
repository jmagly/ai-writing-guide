# The concrete secret-store locator is injected at provisioning time. This policy
# grants one logical resource only and deliberately excludes the release key.
path "${COMMIT_SIGNING_KEY_VAULT_PATH}" {
  capabilities = ["read"]
}
