# Best-Practices Brief: Web-Backed AIWG Resource Distribution

**Generated**: 2026-07-21
**Scope**: Versioned web distribution of first-party AIWG resource bundles
**Method**: Targeted review of standards/vendor documentation plus existing local research corpus candidates

## Executive Summary

The closest production patterns are npm's version/tag model, OCI's digest-addressed artifact distribution, W3C Subresource Integrity's fetched-resource verification model, and TUF's signed metadata roles for update systems. For AIWG, the practical design is: keep the web mode opt-in, resolve mutable selectors to immutable versions, verify every fetched bundle by digest, write resolved state to a lockfile, and block any default-web flip until rollback/freeze/mix-and-match protections are in place.

## Findings

### 1. Use SemVer plus tags, but record the immutable resolution

npm's public model supports semantic versions and human-readable dist-tags. npm documentation explicitly frames dist-tags as labels for versions and notes that `latest` is the default tag for normal installs. SemVer provides precedence rules and treats pre-release versions as lower precedence than normal releases.

**AIWG implication**: expose exact versions, SemVer ranges, and tags such as `stable`, `latest`, `canary`, and `main`, but record the resolved immutable version/digest for every mutating command.

### 2. Treat tags as mutable names and digests as reproducible identity

OCI distribution separates references from content digests, and OCI image descriptors carry digests, sizes, and media types. That distinction is useful for AIWG even if the first backend is static `aiwg.io` resources rather than an OCI registry.

**AIWG implication**: channel manifests can move; release manifests and bundle digests must not. Cache entries are valid only when their bytes match signed metadata or lockfile digests.

### 3. Verify web-fetched content before use

W3C Subresource Integrity defines a browser mechanism for verifying that fetched resources were delivered without unexpected manipulation.

**AIWG implication**: do not treat HTTPS as sufficient. Every manifest and bundle must be digest-checked before use; signature checks should be required once release trust roots are configured.

### 4. Default web mode needs secure-update metadata, not only hashes

TUF metadata separates root, targets, snapshot, and timestamp roles. Its documented threat model includes rollback, freeze, mix-and-match, arbitrary-installation, and wrong-software attacks.

**AIWG implication**: an opt-in MVP can use signed release manifests plus digest locks. Making web mode the default requires TUF-style snapshot/timestamp protections or an equivalent monotonic signed-channel design.

### 5. AI-specific resource ecosystems have additional risk

The local research corpus already contains relevant candidates:

- `REF-1814` argues for cryptographic registry provenance and namespace binding in AI package ecosystems.
- `REF-742` argues that artifact provenance should be graph-shaped, not just per-artifact signatures.
- `REF-936` documents supply-chain poisoning against LLM coding-agent skill ecosystems, including malicious behavior hidden in skill documentation/examples.

**AIWG implication**: source authenticity and digest verification are necessary but not sufficient. Installed skill/resource content also needs security review, quarantine, and content-level validation.

## Recommended Architecture Defaults

- Start with opt-in `--resource-source web`.
- Keep local resources as default and fallback.
- Publish immutable release directories and mutable signed channel manifests.
- Resolve mutable selectors to exact versions and digests.
- Write `.aiwg/resources.lock.json` on mutating commands.
- Fail closed on digest/signature/schema mismatch.
- Add TUF-style metadata before considering default web mode.

## Candidate Sources for Induction

| Source | Type | Priority | Reason |
|---|---|---|---|
| Semantic Versioning 2.0.0 | Spec | High | Version precedence and immutability semantics |
| npm dist-tags / publish docs | Vendor docs | High | Familiar version/tag UX and integrity metadata precedent |
| OCI Distribution and Image specs | Spec | High | Digest-addressed artifact metadata |
| W3C Subresource Integrity | Standard | Medium | Web-fetched content integrity model |
| TUF specification and metadata docs | Spec | High | Secure update roles and rollback/freeze protections |
| Survivable Key Compromise in Software Update Systems | Paper | High | Foundational TUF design |
| Diplomat: Using Delegations to Protect Community Repositories | Paper | Medium | Delegation patterns for community repositories |
| Mercury: Bandwidth-Effective Prevention of Rollback Attacks Against Community Repositories | Paper | Medium | Efficient rollback protection |
| Local REF-1814 cryptographic registry provenance | Local REF | High | Registry identity and namespace binding for AI packages |
| Local REF-742 provenance graph | Local REF | Medium | Graph verification for composed artifacts |
| Local REF-936 skill ecosystem poisoning | Local REF | High | AIWG skill/addon marketplace threat model |

## Source URLs

- `https://semver.org/`
- `https://docs.npmjs.com/adding-dist-tags-to-packages/`
- `https://docs.npmjs.com/cli/v8/commands/npm-dist-tag/`
- `https://docs.npmjs.com/cli/v7/commands/npm-publish/`
- `https://specs.opencontainers.org/distribution-spec/`
- `https://specs.opencontainers.org/image-spec/`
- `https://www.w3.org/TR/sri-2/`
- `https://theupdateframework.io/docs/metadata/`
- `https://github.com/theupdateframework/specification/blob/master/tuf-spec.md`
- `https://dl.acm.org/doi/10.1145/1866307.1866315`
- `https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/kuppusamy`
- `https://www.usenix.org/system/files/conference/atc17/atc17-kuppusamy.pdf`
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-1814-mccann-2026-cryptographic-registry-provenance.md`
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-742-ercan-2026-signing-provenance-graph.md`
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-936-qu-2026-supply-chain-poisoning-agent-skills.md`
