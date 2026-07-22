# Research Induction Queue: Web-Backed AIWG Resource Distribution

**Date**: 2026-07-21
**Destination**: `docs/references` for public REF summaries; `.aiwg/research` for working notes and quality assessments
**Origin**: Web-backed AIWG resource distribution planning
**Related**: #1847, #1855

## Induction Tasks

### 1. Semantic Versioning 2.0.0

**Source**: `https://semver.org/`
**Type**: specification
**Priority**: high
**Tags**: versioning, semver, resource-resolution

Create a public REF summarizing SemVer precedence, pre-release handling, public API requirements, and immutability expectations. Link from the resource version ADR.

### 2. npm dist-tags and publish integrity

**Sources**:
- `https://docs.npmjs.com/adding-dist-tags-to-packages/`
- `https://docs.npmjs.com/cli/v8/commands/npm-dist-tag/`
- `https://docs.npmjs.com/cli/v7/commands/npm-publish/`

**Type**: vendor documentation
**Priority**: high
**Tags**: npm, dist-tags, package-integrity, resource-resolution

Create a public REF or paired docs note covering tags as mutable labels, `latest` defaults, tag namespace caveats, immutable package version tuples, and registry integrity metadata.

### 3. OCI distribution and image descriptors

**Sources**:
- `https://specs.opencontainers.org/distribution-spec/`
- `https://specs.opencontainers.org/image-spec/`

**Type**: specification
**Priority**: high
**Tags**: oci, digest, artifact-distribution, content-addressing

Create a public REF summarizing digest-addressed artifact distribution and descriptor metadata that can inform AIWG bundle manifests.

### 4. W3C Subresource Integrity

**Source**: `https://www.w3.org/TR/sri-2/`
**Type**: web standard
**Priority**: medium
**Tags**: sri, web-integrity, resource-fetching

Create a public REF summarizing fetched-resource integrity verification and limits. Apply to AIWG manifest/bundle verification language.

### 5. TUF metadata and secure update model

**Sources**:
- `https://theupdateframework.io/docs/metadata/`
- `https://github.com/theupdateframework/specification/blob/master/tuf-spec.md`

**Type**: specification
**Priority**: high
**Tags**: tuf, secure-update, rollback-protection, signed-metadata

Create a public REF summarizing TUF roles, signed metadata, expiration, targets hashes/sizes, snapshot consistency, timestamp freshness, and rollback/freeze/mix-and-match threat coverage.

### 6. Survivable Key Compromise in Software Update Systems

**Sources**:
- `https://dl.acm.org/doi/10.1145/1866307.1866315`
- `https://freehaven.net/~arma/tuf-ccs2010.pdf`

**Type**: paper
**Priority**: high
**Tags**: tuf, key-compromise, secure-update, package-security

Acquire the full paper before writing analysis. Create a public REF focused on what AIWG needs from the foundational TUF design.

### 7. Diplomat: Using Delegations to Protect Community Repositories

**Sources**:
- `https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/kuppusamy`
- `https://theupdateframework.io/papers/protect-community-repositories-nsdi2016.pdf`

**Type**: paper
**Priority**: medium
**Tags**: tuf, delegations, community-repositories, package-security

Acquire the full paper before analysis. Focus on delegation patterns and security/usability tradeoffs for resource publishers.

### 8. Mercury: Bandwidth-Effective Prevention of Rollback Attacks Against Community Repositories

**Source**: `https://www.usenix.org/system/files/conference/atc17/atc17-kuppusamy.pdf`
**Type**: paper
**Priority**: medium
**Tags**: rollback, secure-update, metadata-efficiency, package-security

Acquire the full paper before analysis. Focus on efficient rollback protection for rapidly updated repositories and CDNs.

### 9. Import local corpus candidates

**Sources**:
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-1814-mccann-2026-cryptographic-registry-provenance.md`
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-742-ercan-2026-signing-provenance-graph.md`
- `/home/roctinam/dev/research/research-papers/documentation/references/REF-936-qu-2026-supply-chain-poisoning-agent-skills.md`

**Type**: existing local REF notes
**Priority**: high
**Tags**: ai-package-security, provenance, skill-supply-chain

Review license/provenance, then import or summarize into AIWG's public `docs/references` corpus with cross-links to the web-backed resource ADRs.

## Induction Checklist

- [ ] Acquire full papers/PDFs before analysis.
- [ ] Assign new `REF-XXX` identifiers in `docs/references`.
- [ ] Add GRADE assessment for each source.
- [ ] Update `docs/references/README.md` and `_manifest.json`.
- [ ] Cross-link relevant ADRs and security docs.
