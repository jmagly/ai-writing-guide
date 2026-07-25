# Web Resource Distribution Acquisition Status

Issue: #1855

This note records the induction status for sources requested by the
web-backed AIWG resource distribution epic.

## Inducted in Public AIWG References

| Public REF | Source | GRADE | Acquisition status |
| ------------ | -------- | ------- | -------------------- |
| REF-067 | Semantic Versioning 2.0.0 | A | Official web specification reviewed |
| REF-068 | npm dist-tags and package lockfile integrity | A- | Official npm/registry documentation reviewed |
| REF-069 | OCI Distribution Specification | A | Official OCI repository and rendered spec reviewed |
| REF-070 | OCI Image Specification | A | Official OCI repository and descriptor spec reviewed |
| REF-071 | W3C Subresource Integrity | A | W3C SRI specification reviewed |
| REF-072 | The Update Framework Specification | A | Official TUF specification and publication list reviewed |
| REF-073 | Cryptographic Registry Provenance | B | Local research REF-1814 full text/PDF archived |
| REF-074 | Signing Is Not Enough | B | Local research REF-742 web snapshot archived |
| REF-075 | Supply-Chain Poisoning Against Agent Skills | A- | Local research REF-936 full text/PDF archived |

## Pending Acquisition

These are named by the TUF publication list but were not already available as
public AIWG REF entries or as local source files in this checkout:

- *Survivable Key Compromise in Software Update Systems*
- *Diplomat: Using Delegations to Protect Community Repositories*
- *Mercury: Bandwidth-Effective Prevention of Rollback Attacks Against
  Community Repositories*
- *A Look In the Mirror: Attacks on Package Managers*

They should be acquired through the research corpus workflow before AIWG adds
paper-specific claims beyond the high-level TUF summary in REF-072.

## ADR Cross-Link Status

The issue body names `.aiwg/architecture/` ADR files, but this checkout's
public `.aiwg` artifact tree does not include that architecture directory. The
available public operator contract,
`docs/install/web-backed-resources.md`, now links the final public REF entries
under its **Research Basis** section.
