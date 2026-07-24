# Standalone Plugin Repository

Use this workflow when a team or community repository owns an AIWG marketplace
wrapper independently of the AIWG source tree.

## Scaffold

```bash
aiwg new-bundle team-tools --type plugin
```

The wrapper lives at `.aiwg/plugins/team-tools/`. Its `manifest.json` declares
`type: plugin` and points to a byte-preserved addon, extension, or framework
under `pluginConfig.payloadPath`. Complete the payload manifest before
packaging.

## Validate and package

```bash
aiwg package-plugin team-tools --dry-run
aiwg package-plugin team-tools --provider all --output dist/plugins
```

An explicit source is also supported, but it must resolve inside the current
repository:

```bash
aiwg package-plugin team-tools \
  --source wrappers/team-tools \
  --provider codex \
  --output dist/plugins
```

The packager validates wrapper identity, payload type/path/manifest agreement,
symlink containment, provider selection, and output collisions. It emits
deterministic `.tar.gz` archives with provider-native metadata. Payload bytes
are not rewritten.

## Install smoke

Extract each archive into a disposable repository before publication:

```bash
fixture="$(mktemp -d)"
tar -xzf dist/plugins/team-tools-1.0.0-claude.tar.gz -C "$fixture"
test -f "$fixture/team-tools/.claude-plugin/plugin.json"

tar -xzf dist/plugins/team-tools-1.0.0-codex.tar.gz -C "$fixture"
test -f "$fixture/team-tools/.codex-plugin/plugin.json"
test -f "$fixture/team-tools/marketplace.json"
```

Then use the provider's local plugin installation surface from that fixture.
The integration suite performs the same disposable extraction and byte
comparison for both formats.

## Repository and release policy

- Keep wrapper and payload manifests at the same intentional release version.
- Record the original payload repository and commit in release notes.
- Include a license selected by the repository owner; AIWG does not choose one.
- Tag releases with the repository's declared version and attach both provider
  archives plus checksums.
- Configure GitHub/Gitea or other remotes explicitly; the packager never pushes
  or publishes.
- Provider marketplace submission and review remain provider-owned steps.

Use `aiwg discover "standalone plugin repository"` or steward when returning to
this workflow.
