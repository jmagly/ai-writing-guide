# Release-signing key material, sourced from OpenBao at tag-cut time.
#
# Consumed by tools/release/cut-tag.sh when AIWG_RELEASE_SIGN_FROM_VAULT=1
# (the default). Both fields are written to mode-600 keyfiles; the exported
# env vars receive the file paths, never the values. Run the fetch helper's
# --cleanup in an always step (cut-tag.sh does this on exit).
#
# Reader AppRole: ci-aiwg (policy ci-release-key-read). Requires BAO_CI_ROLE_ID
# and BAO_CI_SECRET_ID in the environment (CI secrets, or exported from the
# operator TPM credstore — see docs/contributing/versioning.md).
keyfile GPG_SIGNING_KEY_FILE kv_internal/gpg/release-signing-key armored_private_key
keyfile GPG_PASSPHRASE_FILE kv_internal/gpg/release-signing-key passphrase
