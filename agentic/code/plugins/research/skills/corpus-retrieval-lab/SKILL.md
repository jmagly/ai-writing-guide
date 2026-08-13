---
namespace: aiwg
platforms: [all]
name: corpus-retrieval-lab
description: Benchmark current research-query and direct lexical baselines against experimental vector, BM25, typed concept-graph PPR, and RRF source selection without replacing production retrieval.
triggers:
  - benchmark corpus retrieval
  - hybrid retrieval lab
  - compare research query retrieval
commandHint:
  argumentHint: "--queries <jsonl> --concepts <json> [--expected-scheme-hash <sha256>] [--json] [--out <path>]"
  allowedTools: Read, Bash
  category: research-retrieval
---

# Corpus Retrieval Lab

Run the local experimental benchmark:

```bash
aiwg corpus retrieval-lab --queries <jsonl> --concepts <json> --json
```

Use reviewed narrow implementation questions with expected REF evidence. Preserve the current `research-query` behavior regardless of the result; the report may only recommend a later explicit adoption decision.

The lab reports baseline and hybrid Hit@k, MRR, latency, failures, confidence/dispersion, faithfulness, and concept-scheme drift. Use `--expected-scheme-hash` when comparing runs across time.

See `docs/guides/corpus-retrieval-lab.md` for fixture schemas and interpretation.
