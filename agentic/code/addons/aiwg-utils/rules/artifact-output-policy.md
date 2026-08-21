---
name: artifact-output-policy
description: Preserve canonical AIWG artifacts and require policy-authorized opt-in for provider-native presentation destinations
enforcement: high
scope: artifact-producing-workflows
---

# Artifact Output Policy

Before producing a durable AIWG plan, review, report, or SDLC artifact, resolve `.aiwg/aiwg.config` `artifact_outputs`.

1. Write the canonical artifact to the configured AIWG artifact store first. It remains the unambiguous source of truth.
2. Treat provider-native surfaces as derived presentation/export destinations. Never substitute or relocate the canonical artifact because of a provider default.
3. The compatibility default is `canonical: aiwg` and `provider_native: explicit-only`. A user may explicitly request an enabled supported destination for the current task; user or provider defaults cannot silently select it.
4. When both outputs are selected, record the presentation reference, canonical path, authority, and timestamp in artifact-output provenance.
5. Unknown or unsupported provider-native destinations fail safe with a clear diagnostic. Report honestly when the provider operates above AIWG's controllable prompt/tool boundary.

Project policy is the ceiling. Within that ceiling, explicit per-task selection outranks user preference and provider defaults. Higher-authority safety, privacy, and project data-boundary rules always apply.
