---
namespace: aiwg
platforms: [all]
version: 2.0.0
name: test-platform-research
description: Locate testing research and platform tools, qualify evidence adapters, and develop target-specific testing normalization templates.
---

# Test platform research

Read the target manifests, installed runner versions, CI commands and current conformance protocol. Run `aiwg
test-conformance research` against configured local roots and the selected platform. Missing roots or unavailable web
access become explicit gaps. User-specific home paths are configuration, not shipped defaults.

Use [tool recommendation](../../templates/tool-recommendation.md) for decisions and [adapter
qualification](../../templates/adapter-qualification.md) before claiming a platform works. Distinguish a researched
platform recipe, a fixture-tested result parser, and a live end-to-end verified target; evidence at one level does not
prove the next.

Search user-authorized research roots read-only. Prefer the user's archived paper/reference material when relevant, then
verify current tool behavior using official documentation and primary publications. Record exact local paths or source
URLs, retrieval date, version applicability, claims, transfer limitations and unresolved contradictions. A paper's
result on one language or dataset is not a universal quality target.

Evaluate additions only against a concrete gap: mutation for weak oracles, property testing for broad input spaces,
browser testing for browser boundaries, contract testing for a real service interface, linting for syntactic misuse, or
repeat-run analysis for suspected flakes. Include cost, runtime, prerequisites, CI integration and what the tool cannot
prove. Research recommendations do not install dependencies or run network services.

Use `templates --action list`, `templates --action develop` and `templates --action deploy` to adapt a platform bundle.
Supply actual source/test globs, runner argv, result/discovery mappings, coverage scope and fixture conventions;
identify any required external adapter as unimplemented until it is built and qualified. Use the canonical result format
for custom runners and validate it before assessment. Keep original raw results alongside normalized evidence.

For optional deeper mutation, flaky or factory work, discover the existing testing-quality capability and use it rather
than duplicating its implementation. Return a reviewable template/protocol, dated research references, tool choices and
qualification evidence with remaining gaps.
