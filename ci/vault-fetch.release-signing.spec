# Release-signing key material, sourced from vault at tag-cut time.
#
# Consumed by tools/release/cut-tag.sh when AIWG_RELEASE_SIGN_FROM_VAULT=1
# (the default). Both fields are written to mode-600 keyfiles; the exported
# env vars receive the file paths, never the values. Run the fetch helper's
# --cleanup in an always step (cut-tag.sh does this on exit).
#
# Requires VAULT_CI_ROLE_ID and VAULT_CI_SECRET_ID in the environment.
keyfile GPG_SIGNING_KEY_FILE ${RELEASE_SIGNING_KEY_VAULT_PATH} ${RELEASE_SIGNING_KEY_VAULT_FIELD}
keyfile GPG_PASSPHRASE_FILE ${RELEASE_SIGNING_PASSPHRASE_VAULT_PATH} ${RELEASE_SIGNING_PASSPHRASE_VAULT_FIELD}
