# REF-075: Supply-Chain Poisoning Attacks Against LLM Coding Agent Skill Ecosystems

## Citation

Qu, Y., Liu, Y., Geng, T., Deng, G., Li, Y., Zhang, L., Zhang, Y., & Ma, L.
(2026). *Supply-Chain Poisoning Attacks Against LLM Coding Agent Skill
Ecosystems*. arXiv:2604.03081v1. <https://arxiv.org/abs/2604.03081>

Local source corpus: `/home/roctinam/dev/research/research-papers` REF-936.

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2026 |
| Type | arXiv preprint |
| Source status | Full PDF/text archived in local research corpus |
| AIWG Relevance | Critical - Direct threat model for AIWG skills and addons |

## Executive Summary

Qu et al. evaluate supply-chain poisoning against LLM coding-agent skill
ecosystems. Their attack class embeds malicious behavior in documentation
examples and configuration templates rather than obvious executable payloads.
Agents that trust and reuse those examples can perform harmful actions during
ordinary tasks.

This matters for AIWG because its frameworks, addons, commands, and skills are
documentation-heavy operational resources. Web-backed resource integrity proves
that bytes came from the signed AIWG release, but it does not by itself prove
that the resource content is safe. Skill/resource review therefore needs both
distribution integrity and content-level safety analysis.

## AIWG Implementation Mapping

| Paper Finding | AIWG Resource Implication |
| --------------- | --------------------------- |
| Skill documentation can carry payloads | Treat resource docs and examples as reviewable security surface |
| Static code-only scanning is incomplete | Scan docs, templates, examples, and shell snippets |
| Marketplace trust is not enough | Signed first-party releases still need source review and CI checks |
| Agent reuse is the trigger path | Example execution should remain permissioned and inspectable |

## Design Implications

- Resource release gates should include documentation/example review, not only
  TypeScript tests and manifest signing.
- First-party logical IDs reduce source ambiguity but do not eliminate malicious
  or unsafe content risk.
- Web-backed cache verification should be paired with policy that says which
  resources are allowed to influence command execution.

## Cross-References

- REF-073: Registry provenance authenticates distribution authority.
- REF-074: Provenance graphs explain artifact lineage but do not replace content
  review.
- `SECURITY.md`: project security reporting and response policy.
