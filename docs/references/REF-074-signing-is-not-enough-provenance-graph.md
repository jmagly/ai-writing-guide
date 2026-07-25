# REF-074: Signing Is Not Enough

## Citation

Ercan, G. (2026, April 16). *Signing Is Not Enough: Why AI Artifact Provenance
Needs to Be a Graph*. Jozu Blog.
<https://jozu.com/blog/signing-is-not-enough-why-ai-artifact-provenance-needs-to-be-a-graph/>

Local source corpus: `/home/roctinam/dev/research/research-papers` REF-742.

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2026 |
| Type | Engineering blog / vendor position piece |
| Source status | Web snapshot archived in local research corpus |
| AIWG Relevance | Medium - Clear lineage model for signed artifacts with multiple inputs |

## Executive Summary

Ercan argues that artifact signatures prove identity and integrity for one
object but do not explain what produced it. For AI/ML artifacts, the useful
provenance shape is a graph: a model output can depend on a base model, data,
scanner results, build pipeline, and other artifacts, each with its own
attestation chain.

AIWG web-resource releases are simpler than model builds, but the warning still
applies. A signed release manifest is necessary, while the broader release
story should also connect source commits, generated prebuilt indices, release
host publication, lockfile state, and test evidence.

## AIWG Implementation Mapping

| Provenance-Graph Concept | AIWG Resource Implication |
| -------------------------- | --------------------------- |
| Multiple input artifacts | Bundle source, generated Fortemi export, raw resources, trust root |
| Digest-pinned dependencies | Manifest and lockfile digests for every consumed resource |
| Recursive verification | Future release evidence can trace source commit to published bundle |
| Attestation types | Build, test, signing, and publication evidence should be distinct |

## Design Implications

- Do not describe release signing as complete supply-chain assurance.
- Preserve enough manifest and lockfile metadata to connect resource bytes back
  to generation evidence.
- Keep docs clear that provenance is layered: signatures, descriptors, lockfile,
  CI evidence, and publication records each answer different questions.

## Cross-References

- REF-062: W3C PROV gives the general entity/activity/agent vocabulary.
- REF-069: OCI registries are a common substrate for artifact and attestation
  graphs.
- REF-073: Registry provenance adds distribution authority to graph evidence.
