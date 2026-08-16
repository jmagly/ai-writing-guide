---
namespace: aiwg
name: long-context-bench
platforms: [all]
description: Benchmark compressed context against summary, direct retrieval, and provider-context baselines without enabling product integration
---

# Long-Context Compression Benchmark

Run `aiwg context-bench run <fixture.json>` on real AIWG task families. Record
quality, exact-recovery failures, latency, memory, and provider-realizable
constraints for all four required strategies.

Product integration remains blocked unless compressed skim plus exact recovery
beats the strongest quality baseline without increasing exact-recovery failures.
Preserve weak and failed results in the report.

@implements #2046
