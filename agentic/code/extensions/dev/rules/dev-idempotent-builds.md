---
enforcement: medium
---

# Idempotent Builds and Pinned Builder Images

**Enforcement Level**: MEDIUM
**Scope**: Build steps and builder images
**Issue**: #775

## Principle

A build step that produces different output when run twice with the same input is a liability. Unreproducible builds make it impossible to verify what artifact was deployed to production, to diagnose regressions, or to rebuild a specific release after the fact. Idempotency — the property that running a step multiple times produces the same result — is the foundation of trustworthy CI/CD.

## Mandatory Rules

1. **Build steps must be idempotent**: Any build step that modifies the filesystem (installs packages, generates code, copies artifacts) must produce the same result on repeated execution. Steps that fail if run twice (e.g., `mkdir` without `-p`, `git init` without a check) must be hardened. Test idempotency by running the step twice in CI and asserting identical output.

2. **Builder images versioned and pinned — no `:latest` in production**: CI workflows must reference builder images by an immutable tag (SHA digest or semantic version). Using `:latest` means the builder can silently change between runs, making two builds of the same commit non-identical. The only acceptable use of `:latest` is for local developer convenience, never in CI.

3. **Artifact digests (SHA256) recorded after every push**: After pushing an image or binary artifact, record the SHA256 digest to an artifact manifest (e.g., `{artifact-manifest-path}`). This creates an auditable chain from source commit to deployed artifact and enables digest verification before promotion.

4. **Deterministic builds preferred — lock files committed**: Language package lock files (`package-lock.json`, `Cargo.lock`, `poetry.lock`, `go.sum`, `Gemfile.lock`) must be committed to the repository and used in CI builds. Never run `npm install` without a lock file present, and never run `npm update` in a build step without a subsequent lock file commit.

5. **Timestamps and random values must not appear in build artifacts**: Build artifacts that embed the current timestamp or random values at build time are non-reproducible. If a version or build ID must be embedded, use the commit SHA or a monotonic build number from the CI system.

## Validation

When reviewing build configurations and Dockerfiles:

- [ ] No `:latest` tag references in CI workflow `container:` or `image:` fields
- [ ] Builder image update is a separate tracked commit, not a side effect of a feature change
- [ ] Package lock files exist and are committed for all language ecosystems in use
- [ ] Artifact digest is recorded after every image push step
- [ ] Build steps are tested for idempotency in at least one CI run per quarter
- [ ] No build step embeds `$(date)` or `$RANDOM` in artifact content

## Rationale

Pinned builder images and idempotent build steps are two sides of the same coin. A pinned builder ensures the build environment does not change unexpectedly. Idempotent steps ensure that running the same build twice produces the same artifact. Together they make it possible to reproduce any historical build from source, which is required for security audits, incident investigation, and regulatory compliance in many environments. Unpinned builds are also a supply chain attack vector: if an attacker can push a malicious update to a builder image tag you reference, they can inject code into your artifacts without touching your source repository.
