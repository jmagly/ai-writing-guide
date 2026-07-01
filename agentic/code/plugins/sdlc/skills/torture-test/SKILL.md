---
namespace: aiwg
name: torture-test
platforms: [all]
description: Scaffold endurance, stress, and adversarial-input tests that reveal degradation rather than immediate crashes
requires:
  - target: parser, network service, allocator, CLI stdin handler, or other untrusted-input surface
ensures:
  - scenarios: endurance, stress, and adversarial-input scenario templates
  - ci-recipe: long-form nightly or scheduled test recipe distinct from PR-gating
errors:
  - no-target: no candidate surface detected and no explicit target supplied
invariants:
  - torture tests are long-form jobs, not unbounded PR blockers
  - pass/fail criteria include resource ceiling and recovery behavior
commandHint:
  argumentHint: "[--target <path-or-service>] [--type endurance|stress|adversarial|all] [--ci github|gitea|gitlab]"
  allowedTools: Read, Write, Bash, Grep
  model: sonnet
  category: testing
  orchestration: false
---

# Torture Test

Design long-form torture tests for high-load, malformed-input, timing, and resource-exhaustion scenarios. This complements `fuzzing-in-ci`: fuzzing finds inputs that crash; torture testing finds inputs that degrade, leak, starve, or recover incorrectly.

## Scenario Types

- **Endurance**: repeated valid workloads over long duration with memory/FD/latency ceilings.
- **Stress**: high concurrency, burst input, large payloads, queue pressure.
- **Adversarial input**: slow-loris timing, malformed grammar sweeps, partial reads, truncation, retry storms.

## Outputs

The skill emits scenario cards under `.aiwg/test/torture/` and scheduled CI recipes under `.aiwg/test/torture/ci/`. PR-gating remains short; torture suites run nightly, hourly, or on demand.

## Pass/Fail Criteria

Every scenario defines memory ceiling, file descriptor ceiling, latency tail, error recovery time, and acceptable error classes.

## References

- `agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/SKILL.md`
- `.aiwg/security/curl-checklist-gap-analysis.md` row 2, Practice 11
