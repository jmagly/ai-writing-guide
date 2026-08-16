# Long-Context Compression Benchmark

This addon is deliberately benchmark-only. It compares
`compressed-skim-exact-recovery` with three required baselines:

- `summary-compaction`
- `direct-retrieval`
- `provider-context`

```bash
aiwg use long-context-bench
aiwg context-bench run agentic/code/addons/long-context-bench/fixtures/aiwg-retrieval-benchmark.json
```

Reports preserve task quality, exact-recovery failures, latency, memory use,
and provider-realizable constraints for every strategy. Product integration is
blocked unless the compressed candidate beats the strongest current baseline
without increasing exact-recovery failures. Weak and failed outcomes remain in
the evidence report. The default fixture result is preserved in
`evidence/aiwg-retrieval-report.json`; it is blocked because direct retrieval
has higher quality and fewer exact-recovery failures.
