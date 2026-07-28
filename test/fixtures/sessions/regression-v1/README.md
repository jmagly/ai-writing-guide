# Session regression corpus v1

This corpus is structurally authored synthetic data for issues #1944-#1956.
It was assembled from provider schemas and existing committed synthetic test
patterns. It was not copied from local provider histories, prompts, credential
stores, host metadata, or personal paths.

## Safety boundary

- Keep every fixture under this directory and list it in `manifest.json`.
- Use reserved names, `/synthetic/...` paths, and `example.test` URLs only.
- Do not add real prompts, usernames, emails, host or device identifiers,
  repository remotes, credential values, or stable local paths.
- `npm run lint:session-fixtures` must report only content-free rule IDs and
  file coordinates. It must never print matched text.

## Refresh process

1. Confirm the provider format change from public schema documentation or a
   separately authorized investigation. Never paste a live transcript.
2. Author the smallest synthetic record that preserves the changed structure.
3. Add positive and malformed cases where the contract changed.
4. Update each file's schema family, provider version, regression mapping, and
   SHA-256 digest in `manifest.json`.
5. Run `npm run lint:session-fixtures`, `npm run test:sessions:sqlite`, and the
   spawned CLI regression test.
6. Review the diff for private paths, identity values, prompts, and secrets
   before commit.

Schema changes require a new corpus version when existing fixture meaning or
expected normalization would change incompatibly.
