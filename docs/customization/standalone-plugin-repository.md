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

The packager applies the canonical bundle schema recursively to the wrapper and
payload, then validates wrapper identity, payload type/path agreement, symlink
containment, provider selection, and output collisions. It emits deterministic
`.tar.gz` archives with provider-native metadata. Payload bytes are not
rewritten.

## Install smoke

Extract each archive into a disposable repository before publication:

```bash
fixture="$(mktemp -d)"
mkdir -p "$fixture/claude/.git" "$fixture/claude/.claude/plugins"
tar -xzf dist/plugins/team-tools-1.0.0-claude.tar.gz -C "$fixture/claude/.claude/plugins"
test -f "$fixture/claude/.claude/plugins/team-tools/.claude-plugin/plugin.json"

mkdir -p "$fixture/codex/.git" "$fixture/codex/.codex/plugins"
tar -xzf dist/plugins/team-tools-1.0.0-codex.tar.gz -C "$fixture/codex/.codex/plugins"
test -f "$fixture/codex/.codex/plugins/team-tools/.codex-plugin/plugin.json"
test -f "$fixture/codex/.codex/plugins/team-tools/marketplace.json"
```

Then use the provider's local plugin installation surface from that fixture.
The integration suite installs into these provider-native repository paths,
validates both manifests with the canonical loader, and compares payload bytes.

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
