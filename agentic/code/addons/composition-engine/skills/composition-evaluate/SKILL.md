---
namespace: aiwg
name: composition-evaluate
platforms: [all]
description: Compare FlowGraph composition policies with fixed tasks, requested-versus-realized resources, failure injection, and an evidence claim gate
triggers:
  - benchmark composition policies
  - compare strict lcm and adaptive cost quality
  - evaluate graph flow against loop dag and durable code
  - test composition failure modes and claim gate
---

# Composition evaluation

Use this skill when a composition policy needs reproducible comparison against
a single-pass baseline.

1. Start from `benchmarks/composition-policy-benchmark.v1.json` and preserve
   fixed tasks, settings, budgets, seeds, metrics, and thresholds.
2. Run `aiwg composition benchmark <manifest.json>`; use `--raw-out` and
   `--summary-out` to retain both evidence layers.
3. Compare success-conditioned cost and latency, not unconditioned cheap
   failures. Review speed-of-accuracy and strict-LCM-versus-adaptive deltas.
4. Require an independent or human evaluation path and inspect self-judge bias.
5. Review every failure-injection outcome and recovery receipt.
6. Keep synthetic conformance distinct from provider evidence. Do not open the
   claim gate without repeated trusted runs, independent evaluation, confidence
   intervals, and task-family replication.

Composition graphs remain `flow.aiwg.io/v1alpha1` `FlowGraph`; do not introduce
a fourth-level DNS API group. Do not request or persist private chain-of-thought.

@implements #2118
