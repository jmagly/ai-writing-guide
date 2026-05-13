# Adopting AIWG's Supply-Chain Hardening Pattern

A walkthrough for npm package authors who want to apply the same controls AIWG ships with: OIDC trusted publishing, signed tags, cosign keyless tarball signatures, CycloneDX SBOMs, and CI hardening.

This is the long-form companion to the [`supply-chain-overview.md`](supply-chain-overview.md). If you want the controls but not the explanation, run the `supply-chain-hardening-quickstart` skill instead — it dispatches to the four task-specific skills and asks you only the questions that vary per project.

## Who this is for

You're publishing an npm package. You want to:
- Ship cryptographic provenance so consumers can verify your tarball wasn't tampered with
- Sign your git tags so a compromised CI account can't push a malicious release
- Generate an SBOM so consumers know what's in your tarball
- Block known supply-chain attack vectors (recent malicious deps, git+http sources, etc.)

You're willing to:
- Bump your dev environment to Node 22.14+ or 24+ (npm 11.5+ requirement)
- Set up a GitHub or Gitea Actions workflow if you don't have one
- Generate a maintainer signing key (gpg or ssh, your choice)

Time budget: ~2-3 hours for the first time, mostly waiting on CI runs.

## What you'll end up with

A `npm publish` workflow that:
1. Verifies the release tag is signed by a key you control, **before** publishing
2. Publishes to npmjs.org with a Sigstore-anchored provenance attestation, using OIDC instead of a long-lived token
3. Signs the tarball with cosign keyless (registry-independent — works whether consumers pull from npmjs.org or a mirror)
4. Generates a CycloneDX SBOM and signs it the same way
5. Uploads the 6 signed assets to your GitHub release
6. Runs `npm audit signatures` on your dep tree at publish time
7. Lints your tarball top-level entries and dep sources before letting the publish proceed

Plus dev-side:
- `min-release-age=7` in `.npmrc` so freshly-pushed malicious deps can't enter your lockfile
- A `lint:dep-sources` script that blocks `git+`, `github:`, tarball-URL, `file:`, and `link:` deps

## Prerequisites

| Need | Why |
|---|---|
| Node 22.14+ or 24+ on your CI runner | npmjs.org trusted publishing requires npm 11.5+, which requires Node 22.14+. AIWG runs Node 24.x in CI. |
| npm 11.5+ on your dev machine | The `min-release-age=7` gate fires on every `npm install`. Without npm 11.5+, the gate is silent. `npm install -g npm@^11.5` once. |
| GitHub Actions or Gitea Actions | OIDC trusted publishing requires a supported provider. **Gitea Actions is NOT yet on the npm trusted-publishers provider list** as of 2026-05. If you use Gitea, you'll publish to npmjs.org from GitHub Actions and use Gitea for everything else. |
| gpg or ssh key for tag signing | Your choice. gpg is more common; ssh works with hardware tokens (YubiKey, Nitrokey). |
| `cosign` v2+ and `syft` v1+ available in CI | Both installed via pinned actions/install scripts in the workflow. |

## Step 1 — Bump npm and configure dev-side controls

```bash
# Update to npm 11.5+ on every dev machine + CI
npm install -g npm@^11.5
npm --version  # should report 11.5.0 or higher
```

Create or update `.npmrc` at your repo root:

```ini
# Block dep versions younger than 7 days from entering the lockfile.
# Defends against newly-published malicious versions (the primary
# Mini Shai-Hulud attack vector).
min-release-age=7
```

Commit `.npmrc` to your repo. Every contributor and every CI run will now enforce the 7-day gate.

Add a dep-source lint script. Create `tools/ci/lint-dep-sources.sh`:

```bash
#!/usr/bin/env bash
# Block dangerous dep source specifiers in package.json and package-lock.json.
# Refuses git+/github:/tarball-URL/file:/link: sources — these bypass
# registry signature verification.
set -euo pipefail

# Patterns we refuse to allow as dep sources
BAD_PATTERNS=(
  '"git+'
  '"github:'
  '"http://'
  '"https://.*\.tgz"'
  '"file:'
  '"link:'
)

VIOLATIONS=0
for pattern in "${BAD_PATTERNS[@]}"; do
  if grep -E "$pattern" package.json package-lock.json 2>/dev/null; then
    echo "✗ Found banned dep-source pattern: $pattern"
    VIOLATIONS=$((VIOLATIONS+1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "Dep-source lint failed. Use only registry-published versions."
  exit 1
fi

echo "✓ All dep sources are registry-published"
```

Add to `package.json`:

```json
{
  "scripts": {
    "lint:dep-sources": "bash tools/ci/lint-dep-sources.sh"
  }
}
```

Wire `npm run lint:dep-sources` into your CI before any publish step.

## Step 2 — Generate a maintainer signing key

Pick one. ed25519 is recommended for both.

### Option A — gpg (most common)

```bash
gpg --quick-generate-key 'My Release Signing <release@example.org>' ed25519 sign 5y

# Get the fingerprint
gpg --list-secret-keys --keyid-format=long
# Note the line: sec   ed25519/XXXXXXXXXXXXXXXX YYYY-MM-DD [SC]

# Export the public key
gpg --armor --export <fingerprint> > .gitea/keys/maintainers.asc
# Or .github/keys/maintainers.asc if you're GitHub-only

# Configure git to use it
git config --global user.signingkey <fingerprint>
git config --global commit.gpgsign false   # don't sign commits, only tags
git config --global tag.gpgsign true
```

### Option B — ssh (works with hardware tokens)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/release-signing
# Use a passphrase or a YubiKey-backed key

# Get the public key
cat ~/.ssh/release-signing.pub

# Configure git
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/release-signing.pub
git config --global tag.gpgsign true

# Publish to .gitea/allowed_signers (or .github/allowed_signers)
echo "release@example.org $(cat ~/.ssh/release-signing.pub)" > .gitea/allowed_signers
```

### Publish the public key

Commit the public key to your repo and document the fingerprint in `SECURITY.md`:

```markdown
## Maintainer Signing Key

Active key for release tag signatures:

- **Principal**: `My Release Signing <release@example.org>`
- **Fingerprint**: `<full-40-char-fingerprint>`
- **Algorithm**: ed25519
- **Created**: YYYY-MM-DD
- **Expires**: YYYY-MM-DD
- **Public key**: [`.gitea/keys/maintainers.asc`](.gitea/keys/maintainers.asc)
```

### Add the CI verify gate

Create `tools/ci/verify-signed-tag.sh`:

```bash
#!/usr/bin/env bash
# CI hard gate: every release tag must verify against a maintainer
# public key published in this repo. Runs before any publish step.
set -euo pipefail

TAG="${GITHUB_REF#refs/tags/}"
if [ -z "$TAG" ] || [ "$TAG" = "$GITHUB_REF" ]; then
  echo "Not a tag push — skipping signed-tag verification"
  exit 0
fi

# Import the published key(s)
if [ -f .gitea/keys/maintainers.asc ]; then
  gpg --import .gitea/keys/maintainers.asc
fi
if [ -f .gitea/allowed_signers ]; then
  git config --local gpg.ssh.allowedSignersFile .gitea/allowed_signers
fi

# Verify
if git tag -v "$TAG" 2>&1 | tee /tmp/tag-verify.log | grep -qE "^gpg: Good signature|^Good \"git\" signature"; then
  echo "✓ Tag $TAG verified"
else
  echo "✗ Tag $TAG signature did not verify"
  cat /tmp/tag-verify.log
  exit 1
fi
```

Make it executable: `chmod +x tools/ci/verify-signed-tag.sh`.

## Step 3 — Configure npmjs.org trusted publisher

1. Visit `https://www.npmjs.com/package/<your-package>/access` (or the publish settings page if you haven't created the package yet).
2. Scroll to **Publishing access** → **Trusted publishers** → **Add trusted publisher**.
3. Configure:
   - **Publisher**: GitHub Actions
   - **Organization**: your GitHub username/org
   - **Repository**: your repo name (just the name, not `owner/name`)
   - **Workflow filename**: `npm-publish.yml` (basename only — NOT a path like `.github/workflows/npm-publish.yml`)
   - **Environment**: blank (or match the `environment:` keyword in your workflow if you use one)
4. Save.

**Critical**: the workflow filename field is the **basename only**. Putting the path will cause a 404 PUT on publish with no useful error.

## Step 4 — Create the publish workflow

Create `.github/workflows/npm-publish.yml`. This is the AIWG-pattern minimum; adjust paths and version-extraction logic for your project structure.

```yaml
name: Publish to npmjs.org (OIDC + provenance)

on:
  push:
    tags:
      - 'v*'

# id-token: write is required for OIDC trusted publishing.
# contents: write is required for `gh release create` / `gh release upload`.
permissions:
  contents: write
  id-token: write

jobs:
  publish:
    name: Publish with provenance
    runs-on: ubuntu-latest
    # Pin the container by digest. Resolve via: docker pull node:24 ; docker inspect | jq '.[0].RepoDigests'
    container: node:24@sha256:050bf2bbe33c1d6754e060bec89378a79ed831f04a7bb1a53fe45e997df7b3bb
    timeout-minutes: 15

    steps:
      - name: Checkout code
        # Pin actions by 40-char commit SHA, not floating tags. Resolve via: git ls-remote https://github.com/actions/checkout refs/tags/v5.0.1
        uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd  # v5.0.1

      - name: Fetch tag object for signature verification
        # actions/checkout on tag-push writes refs/tags/<tag> as a commit ref
        # by default. git tag -v then fails with "cannot verify a non-tag object."
        # Force-fetch the tag object explicitly.
        run: |
          set -o pipefail
          git config --global --add safe.directory "$GITHUB_WORKSPACE"
          TAG="${GITHUB_REF#refs/tags/}"
          git fetch origin "+refs/tags/${TAG}:refs/tags/${TAG}" --depth=1

      - name: Verify signed tag (hard gate)
        run: bash tools/ci/verify-signed-tag.sh

      - name: Setup Node.js with npmjs.org registry
        uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444  # v5.0.0
        with:
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build (if applicable)
        run: npm run build --if-present

      - name: Run tests
        run: npm test

      - name: Lint dep sources
        run: npm run lint:dep-sources

      - name: Audit dep-graph signatures
        run: npm audit signatures

      - name: Publish to npmjs.org (OIDC + provenance)
        # Trusted-publishing mode: no NODE_AUTH_TOKEN env, no .npmrc auth block.
        # npm 11.5+ on Node 22.14+ negotiates OIDC against npmjs.org.
        run: npm publish --provenance --access public

      - name: Install jq (node:24 image does not ship it)
        run: |
          if ! command -v jq >/dev/null 2>&1; then
            apt-get update && apt-get install -y --no-install-recommends jq
          fi

      - name: Verify provenance attestation landed
        run: |
          set -o pipefail
          VERSION='${{ steps.version.outputs.version || env.PACKAGE_VERSION }}'
          # Or read from package.json: VERSION=$(node -p "require('./package.json').version")
          VERSION=$(node -p "require('./package.json').version")
          echo "Waiting 10s for npmjs.org propagation..."
          sleep 10
          ATTESTATIONS=$(npm view "<your-package>@${VERSION}" --json 2>/dev/null | jq -r '.dist.attestations // empty')
          if [ -z "$ATTESTATIONS" ]; then
            echo "✗ No provenance attestation found for <your-package>@${VERSION}"
            exit 1
          fi
          echo "✓ Provenance attestation present"

      - name: Install cosign
        uses: sigstore/cosign-installer@7e8b541eb2e61bf99390e1afd4be13a184e9ebc5  # v3.10.1
        with:
          cosign-release: v2.6.1

      - name: Generate + sign tarball
        id: sign
        run: |
          set -euo pipefail
          VERSION=$(node -p "require('./package.json').version")
          npm pack
          TARBALL="<your-package>-${VERSION}.tgz"
          cosign sign-blob --yes --bundle "${TARBALL}.sigstore" "$TARBALL"
          echo "tarball=$TARBALL" >> $GITHUB_OUTPUT
          echo "tarball_sigstore=${TARBALL}.sigstore" >> $GITHUB_OUTPUT

      - name: Install syft
        run: |
          curl -fsSL "https://raw.githubusercontent.com/anchore/syft/v1.18.0/install.sh" \
            | sh -s -- -b /usr/local/bin v1.18.0
          syft --version

      - name: Generate + sign CycloneDX SBOM
        run: |
          set -euo pipefail
          VERSION=$(node -p "require('./package.json').version")
          syft scan dir:. --output cyclonedx-json --file "<your-package>-${VERSION}.cdx.json"
          cosign sign-blob --yes \
            --bundle "<your-package>-${VERSION}.cdx.json.sigstore" \
            "<your-package>-${VERSION}.cdx.json"

      - name: Install GitHub CLI
        run: |
          set -euo pipefail
          GH_VERSION=2.81.0
          curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" \
            | tar -xz -C /tmp
          mv "/tmp/gh_${GH_VERSION}_linux_amd64/bin/gh" /usr/local/bin/gh

      - name: Upload signed release assets
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          VERSION=$(node -p "require('./package.json').version")
          TAG="v${VERSION}"
          if ! gh release view "$TAG" >/dev/null 2>&1; then
            gh release create "$TAG" --title "$TAG" --generate-notes
          fi
          gh release upload "$TAG" \
            "<your-package>-${VERSION}.tgz" \
            "<your-package>-${VERSION}.tgz.sigstore" \
            "<your-package>-${VERSION}.cdx.json" \
            "<your-package>-${VERSION}.cdx.json.sigstore" \
            --clobber
```

## Step 5 — Cut a release

```bash
# Bump version
npm version patch  # or minor/major

# Sign and push the tag
git push origin main
git push origin v$(node -p "require('./package.json').version")
```

Watch the workflow run. If it goes green, your release is now signed end-to-end. Verify:

```bash
# Replace with your package + version
npm view <your-package>@<version> --json | jq .dist.attestations
```

Should return a non-empty attestation object or array. Current npm
metadata commonly includes `.provenance.predicateType =
"https://slsa.dev/provenance/v1"`, but consumers should treat the
presence of a non-empty `.dist.attestations` value as the compatibility
check and use `npm audit signatures --include-attestations` for deeper
verification.

## Common failure modes — the AIWG 9-retry post-mortem

We hit nine distinct failures while landing this for AIWG. Documenting them here so you can short-circuit your own debugging.

### Failure 1 — Dual-publisher race

**Symptom**: Package published to npmjs.org, but `dist.attestations` is `null`. Provenance never lands.

**Cause**: Two CI workflows both publishing to npmjs.org — one via OIDC, one via a long-lived `NPMJS_TOKEN`. The token-based publish wins the race and lands without provenance.

**Fix**: Make OIDC the sole publisher. Disable any other publish-to-npmjs.org workflow (gate with `if: false` or remove). If you publish to a second registry (e.g., a self-hosted Gitea bundled npm), keep that — only npmjs.org needs to be OIDC-only.

### Failure 2 — Tag-push refspec collision

**Symptom**: `actions/checkout@v4` with `fetch-tags: true` fails with refspec collision on tag-push events.

**Cause**: Tag-push checkout already writes `refs/tags/<tag>`; `fetch-tags: true` tries to write the same ref again.

**Fix**: Remove `fetch-tags: true`. Add an explicit fetch step:

```yaml
- name: Fetch tag object for signature verification
  run: git fetch origin "+refs/tags/${TAG}:refs/tags/${TAG}" --depth=1
```

### Failure 3 — "cannot verify a non-tag object of type commit"

**Symptom**: `git tag -v` fails with `cannot verify a non-tag object of type commit` even though the tag is signed.

**Cause**: `actions/checkout@v4` on tag-push events writes `refs/tags/<tag>` as a **commit ref**, not the tag object. The annotated tag (which carries the signature) isn't fetched.

**Fix**: The explicit fetch step from Failure 2 above. The `+` prefix force-overwrites the commit-typed ref with the tag object.

### Failure 4 — "dubious ownership in repository"

**Symptom**: `git tag -v` (or any git command) fails with `fatal: detected dubious ownership in repository at /__w/<repo>/<repo>`.

**Cause**: Containerized GitHub Actions runners use a different uid than the workspace directory owner. Git refuses to operate on a directory it doesn't trust.

**Fix**: Add `git config --global --add safe.directory "$GITHUB_WORKSPACE"` before any git command.

### Failure 5 — `npm install -g npm@^11.5` fails with MODULE_NOT_FOUND

**Symptom**: An in-workflow `npm install -g npm@^11.5` step blows up with `MODULE_NOT_FOUND: promise-retry` inside the arborist tarball.

**Cause**: npm's self-upgrade has fragile interactions with `npm ci` against a locked tree. The upgrade isn't strictly necessary in CI anyway.

**Fix**: Don't upgrade npm in the job. Use a container that ships npm 11.5+ natively. `node:22` ships npm 10.9.x (too old); `node:24` ships npm 11.12+. Use `node:24`.

### Failure 6 — 404 PUT on publish despite trusted-publisher config being correct

**Symptom**: Provenance attestation generated (look for `Provenance statement published to transparency log` in the log), but the publish PUT to npmjs.org returns 404 with `is not in this registry`.

**Cause**: npm 10.x doesn't emit OIDC auth headers on the publish PUT. Trusted publishing requires npm **11.5+**.

**Fix**: Bump the container to `node:24` (ships npm 11.12+ natively). This was the single most painful failure mode to diagnose because the provenance side of the OIDC handshake succeeded — the publish-side header simply wasn't sent.

### Failure 7 — `jq: command not found` in post-publish verify step

**Symptom**: Workflow step fails with exit code 127 and `jq: command not found` after the publish step succeeded.

**Cause**: `node:24` (and most `node:*` base images) don't include `jq`.

**Fix**: Add an install step before any `jq` usage:

```yaml
- name: Install jq
  run: apt-get update && apt-get install -y --no-install-recommends jq
```

### Failure 8 — `gh: command not found` in asset-upload step

**Symptom**: Same exit-127 pattern but `gh: command not found`.

**Cause**: `node:24` doesn't ship the GitHub CLI either.

**Fix**: Install `gh` from a pinned binary release. The workflow snippet in Step 4 above shows the pattern (`curl ... | tar -xz`, no apt source mutation).

### Failure 9 — `gh release create` returns HTTP 403

**Symptom**: `gh release create` fails with `HTTP 403: Resource not accessible by integration (https://api.github.com/repos/.../releases)`.

**Cause**: Workflow `permissions:` block is `contents: read` (sufficient for checkout but not for releases).

**Fix**: Bump to `contents: write`:

```yaml
permissions:
  contents: write
  id-token: write
```

## Where to go from here

- Run the `supply-chain-hardening-quickstart` skill to scaffold this for your project.
- Read [`docs/security/supply-chain-overview.md`](supply-chain-overview.md) for the chain-of-trust analysis.
- Read [`docs/releases/verifying.md`](../releases/verifying.md) for the AIWG-specific verification walkthrough — adapt the commands for your package.
- Consider mirroring assets to a second registry (e.g., GitLab packages, Gitea bundled npm) so consumers have a fallback. AIWG ships to both npmjs.org and Gitea; the cosign signatures verify identically against either source.

## References

- [npm Trusted Publishers documentation](https://docs.npmjs.com/trusted-publishers)
- [Sigstore cosign signing-with-blobs](https://docs.sigstore.dev/cosign/signing/signing_with_blobs/)
- [CycloneDX specification](https://cyclonedx.org/specification/overview/)
- [syft](https://github.com/anchore/syft)
- [SLSA provenance spec](https://slsa.dev/spec/v1.0/provenance)
- [GitHub OIDC token claims](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- AIWG's own `.github/workflows/npm-publish.yml` — the working reference
- AIWG's `ci/digests.txt` — pinned-version manifest
