# ADR: Canonical and provider-native artifact destinations

- Status: Accepted
- Date: 2026-08-20
- Issue: #2122

## Context

Provider releases can add artifact or design surfaces whose defaults are outside AIWG's release cycle. Allowing such a default to relocate an AIWG plan or review changes persistence, review workflow, provenance, and potentially the project's data boundary.

## Decision

`.aiwg/aiwg.config` owns a provider-neutral `artifact_outputs` policy. `canonical: aiwg` identifies the durable source of truth. `provider_native` is `explicit-only` by default, may be disabled, and may become `project-default` only through an intentional project change. Destination entries use stable IDs such as `claude-code.design` and declare whether they are enabled and when they may be used.

Resolution applies this precedence and authority model:

1. Higher-authority safety, privacy, and project policy form an unbreakable ceiling.
2. An explicit per-task request may select an enabled, supported destination within that ceiling.
3. A user preference may contribute only where project policy permits a default.
4. A provider default is lowest authority and cannot select an explicit-only destination.

Unknown destinations fail safe. Legacy or absent configuration migrates behaviorally to `canonical: aiwg` and `provider_native: explicit-only`; tools preserve the absent block until an intentional config write or initialization adds the visible default.

For dual output, the canonical artifact is written first. A presentation/export records its canonical path, destination, provider reference, selection authority, and timestamp in `provenance/artifact-outputs.jsonl` under the resolved artifact root. The presentation is never a competing source of truth.

## Degraded mode

AIWG can govern its prompts, rules, tools, and workflow writes, but cannot guarantee suppression of provider behavior above those surfaces. When enforcement is unavailable, adapters state that limitation, still persist the canonical artifact, and report any unexpected provider-native output rather than claiming prevention.

## Consequences

Claude Design remains available on explicit request without bypassing canonical persistence. Provider-default changes cannot silently opt projects in. Workflows gain a small policy-resolution and provenance obligation, and provider adapters require conformance tests for their supported destination IDs.
