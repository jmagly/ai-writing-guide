# Memory Log Event Schema

## Overview

Every kernel operation appends a single JSON object (one line) to the consumer's `.log.jsonl` file. This schema defines the required and operation-specific fields.

**Storage**: `.aiwg/<namespace>/.log.jsonl` (append-only JSON Lines)
**Rendered view**: `.aiwg/<namespace>/log.md` (generated on demand by `memory-log-render`)

## Required Fields (all events)

| Field | Type | Description |
|-------|------|-------------|
| `ts` | string (ISO 8601) | Timestamp of the operation |
| `op` | string (enum) | Operation type — see below |
| `consumer` | string | Consumer ID (e.g., `research-complete`, `sdlc-complete`) |
| `actor` | string | Model or agent that performed the operation |

## Operation Types

### `ingest`

Source material processed into semantic memory.

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Path or URI of ingested source |
| `pages_touched` | string[] | Derived pages created or updated |
| `contradictions` | number | Count of contradictions flagged |
| `provenance_id` | string? | W3C PROV record ID (if `ingestRequires` includes provenance) |
| `duration_ms` | number | Processing time in milliseconds |

```jsonl
{"ts":"2026-04-14T14:32:17Z","op":"ingest","consumer":"research-complete","source":"papers/anthropic-2024-constitutional.pdf","pages_touched":["knowledge/entities/anthropic.md","knowledge/concepts/constitutional-ai.md","summaries/2024-constitutional-ai.md"],"contradictions":0,"actor":"claude-opus-4-6","duration_ms":14203}
```

### `lint`

Health check performed on semantic memory.

| Field | Type | Description |
|-------|------|-------------|
| `findings` | object | Counts grouped by severity: `{ error, warning, suggestion }` |
| `auto_fixed` | number? | Count of findings auto-fixed (when `--fix` used) |
| `duration_ms` | number | Processing time in milliseconds |

```jsonl
{"ts":"2026-04-14T14:45:02Z","op":"lint","consumer":"research-complete","findings":{"error":0,"warning":2,"suggestion":5},"actor":"claude-opus-4-6","duration_ms":3401}
```

### `query-capture`

Query synthesis captured as a durable page.

| Field | Type | Description |
|-------|------|-------------|
| `query_summary` | string | Brief description of the captured query |
| `page_created` | string | Path of the newly created page |
| `page_type` | string | Type of page (synthesis, comparison, analysis, gap) |
| `refs_added` | string[] | Cross-references added to the new page |

```jsonl
{"ts":"2026-04-14T15:10:33Z","op":"query-capture","consumer":"research-complete","query_summary":"Comparison of constitutional AI approaches","page_created":"synthesis/constitutional-ai-comparison.md","page_type":"comparison","refs_added":["entities/anthropic.md","concepts/constitutional-ai.md"],"actor":"claude-opus-4-6"}
```

### `log-render`

Rendered view regenerated from JSON Lines source.

| Field | Type | Description |
|-------|------|-------------|
| `entries_rendered` | number | Total log entries processed |
| `output` | string | Path to rendered markdown file |

```jsonl
{"ts":"2026-04-14T16:00:00Z","op":"log-render","consumer":"research-complete","entries_rendered":47,"output":".aiwg/research/log.md","actor":"claude-opus-4-6"}
```

### `index-rebuild`

Master index file regenerated.

| Field | Type | Description |
|-------|------|-------------|
| `pages_indexed` | number | Total pages in rebuilt index |
| `output` | string | Path to index file |

```jsonl
{"ts":"2026-04-14T16:01:00Z","op":"index-rebuild","consumer":"research-complete","pages_indexed":142,"output":".aiwg/research/index.md","actor":"claude-opus-4-6"}
```

### `format-convert`

Training example records converted from canonical form to a target format (Alpaca, ShareGPT, ChatML, JSONL, Parquet). Written by `training-complete` format adapters.

| Field | Type | Description |
|-------|------|-------------|
| `source_format` | string | Canonical or the format being converted from |
| `target_format` | string | `alpaca` \| `sharegpt` \| `chatml` \| `jsonl` \| `parquet` |
| `records_converted` | number | Count of records in the output |
| `round_trip_validated` | boolean | Whether round-trip test passed for this conversion |
| `output` | string | Path to output file |

```jsonl
{"ts":"2026-04-15T14:00:00Z","op":"format-convert","consumer":"training-complete","source_format":"canonical","target_format":"alpaca","records_converted":10000,"round_trip_validated":true,"output":".aiwg/training/exports/alpaca/v2026.4.0.jsonl","actor":"format-converter-agent"}
```

### `decontamination-check`

Training dataset candidate checked against benchmark eval sets for overlap. Written by `training-complete` decontamination-check skill.

| Field | Type | Description |
|-------|------|-------------|
| `targets` | string[] | Eval set names checked (e.g., MMLU, GSM8K, HumanEval) |
| `overlap_counts` | object | Per-target overlap count `{mmlu: 0, gsm8k: 2, ...}` |
| `threshold` | number | Max acceptable overlap count (default 0) |
| `passed` | boolean | Whether overlap was within threshold for all targets |
| `detection_mode` | string | `exact_ngram` \| `fuzzy` \| `semantic` |
| `report_id` | string | Path or UUID of the generated decontamination report |

```jsonl
{"ts":"2026-04-15T14:30:00Z","op":"decontamination-check","consumer":"training-complete","targets":["mmlu","gsm8k","humaneval","mt-bench"],"overlap_counts":{"mmlu":0,"gsm8k":0,"humaneval":0,"mt-bench":0},"threshold":0,"passed":true,"detection_mode":"exact_ngram","report_id":"decon-2026-04-15-abc","actor":"decontamination-agent"}
```

### `preference-generate`

Preference pairs generated for DPO/KTO/ORPO training. Written by `training-complete` preference-generator skill.

| Field | Type | Description |
|-------|------|-------------|
| `pair_count` | number | Total preference pairs generated |
| `source_examples` | string[] | Example IDs used as candidates |
| `generator_agent` | string | Agent identifier (or "llm-judge", "rule-based", "human-annotation") |
| `confidence_distribution` | object | Histogram of pair confidence scores |
| `output` | string | Path to DPO JSONL output |

```jsonl
{"ts":"2026-04-15T15:00:00Z","op":"preference-generate","consumer":"training-complete","pair_count":500,"source_examples":["ex-001","ex-002","ex-003"],"generator_agent":"llm-judge","confidence_distribution":{"0.9-1.0":350,"0.7-0.9":120,"0.5-0.7":30},"output":".aiwg/training/preferences/dpo-v2026.4.0.jsonl","actor":"preference-generator-agent"}
```

### `synthetic-generate`

Synthetic training examples generated via LLM synthesis. Written by `training-complete` synthetic-data-generator skill. Model Collapse guard is enforced here.

| Field | Type | Description |
|-------|------|-------------|
| `seed_examples` | string[] | Example IDs used as seeds |
| `generator_agent` | string | Which agent/pattern generated (e.g., self-instruct, orca-distillation, personahub) |
| `recursion_depth` | number | 0 = human-seeded, 1 = first synthetic generation, >1 requires override |
| `quality_grade` | string | Aggregate GRADE for the batch |
| `examples_generated` | number | Total examples produced |
| `override_flag` | boolean | True if `--allow-recursive-synthetic` was used |

```jsonl
{"ts":"2026-04-15T15:30:00Z","op":"synthetic-generate","consumer":"training-complete","seed_examples":["ex-001","ex-002"],"generator_agent":"self-instruct","recursion_depth":1,"quality_grade":"MODERATE","examples_generated":200,"override_flag":false,"actor":"example-synthesizer-agent"}
```

### `dataset-version`

Dataset version created with manifest, fixity, and archive snapshot. Written by `training-complete` dataset-version skill.

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Dataset version identifier (CalVer / SemVer) |
| `split_counts` | object | `{train, validation, test}` |
| `storage_ref` | string | Fortemi archive ID or aiwg index snapshot ID |
| `manifest_path` | string | Path to dataset-manifest YAML |
| `fixity_manifest` | string | Path to SHA-256 manifest |
| `synthetic_ratio` | object | Per-split synthetic ratio |

```jsonl
{"ts":"2026-04-15T16:00:00Z","op":"dataset-version","consumer":"training-complete","version":"2026.4.0","split_counts":{"train":8000,"validation":1000,"test":1000},"storage_ref":"archive-2026-04-15-code-review-v1","manifest_path":".aiwg/training/datasets/v2026.4.0.yaml","fixity_manifest":".aiwg/training/datasets/v2026.4.0-CHECKSUMS.sha256","synthetic_ratio":{"train":0.2,"validation":0.0,"test":0.0},"actor":"dataset-publication-agent"}
```

## Rendered View Convention

The `memory-log-render` skill converts `.log.jsonl` into `log.md` with this line prefix:

```markdown
## [YYYY-MM-DD] <op> | <subject>
```

This convention makes the rendered log greppable with unix tools:

```bash
grep "^## \[" log.md | tail -5          # Last 5 operations
grep "ingest" .log.jsonl | jq .source   # All ingested sources
```

## Compatibility

This format is compatible with the existing `activity-log` rule in `aiwg-utils`. The kernel's `memory-log-append` skill also appends an entry to `.aiwg/activity.log` per that rule, ensuring the unified cross-framework timeline remains intact.
