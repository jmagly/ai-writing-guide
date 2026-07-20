---
namespace: aiwg
platforms: [all]
name: integrity-scan
description: Triage research-corpus artifacts for LLM residue, placeholder/template markers, unresolved citation markers, non-final experiment language, and submission risks. Per-REF scoring → pass / review / quarantine. Conservative — flags for human review, does not decide misconduct. Runs via `aiwg corpus integrity-scan`.
commandHint:
  argumentHint: "[--ref REF-XXX] [--quarantine] [--fail-on review|quarantine] [--out PATH]"
  allowedTools: Read, Bash, Write
  model: haiku
  category: research-validation
  modelRole: efficiency
  modelTier: economy
---

# Integrity / Submission-Risk Scan

Scan corpus text artifacts for signals that an item needs human review before
induction, scoring, or synthesis: visible assistant meta-comments, placeholder
or template residue, unresolved `[citation needed]` markers, "results are
simulated/illustrative" language, and submission-readiness flags.

This is a **conservative triage** tool. It does not decide misconduct — it
raises a per-REF recommendation (`pass` / `review` / `quarantine`) so a human
can confirm whether a flagged line is source-authored text, OCR noise, or
generated-note residue.

## How to run

```bash
# Scan the corpus (documentation/references + citations + radar), report only
aiwg corpus integrity-scan

# Limit to one REF
aiwg corpus integrity-scan --ref REF-888

# Write per-REF quarantine reports for quarantine-recommended REFs
aiwg corpus integrity-scan --quarantine    # → .aiwg/research/quarantine/REF-*-llm-artifact-scan.md

# CI gate: exit non-zero if any REF reaches the threshold
aiwg corpus integrity-scan --fail-on quarantine
aiwg corpus integrity-scan --fail-on review     # stricter (review OR quarantine fails)

# Save the summary table
aiwg corpus integrity-scan --out reports/integrity-scan.txt
```

`--quarantine` writes reports; it never moves or edits source files.

## Scoring

| Category | Severity | Weight |
|----------|----------|--------|
| `placeholder-data` ("replace with actual …") | critical | 40 |
| `llm-meta-comment` ("as an AI language model", "would you like me to") | critical | 35 |
| `placeholder-data` ("placeholder", "sample data", "illustrative only") | high | 25 |
| `template-residue` (`[todo]`, `tbd`, `xxx`) | high | 25 |
| `citation-risk` (`[citation needed]`) | high | 25 |
| `experiment-risk` ("results are simulated/mock/not final") | high | 25 |
| `submission-risk` ("position paper", "literature review") | low | 5 |
| `ai-disclosure` ("ChatGPT", "Claude", "LLM-generated") | low | 2 |

Per-REF score is summed (capped at 100). Recommendation:

- **quarantine** — any critical finding, OR score ≥ 50 with a high-severity hit.
- **review** — score ≥ 20, OR any high-severity finding.
- **pass** — otherwise.

## Customizing the pattern catalog

The catalog is data-driven (epic #1496 principle #3). Override the built-in
defaults per-corpus with `documentation/integrity-patterns.yaml`:

```yaml
- category: lab-internal-marker
  severity: high
  weight: 25
  regex: "\\bINTERNAL DRAFT\\b"
  description: Internal-draft marker that must not ship
```

When the file is present it **replaces** the default catalog (so include the
defaults you still want). `regex` is compiled case-insensitive.

## Reconciliation with the quality skills

- **`integrity-scan`** is a *pre-induction residue/risk triage* — "is this
  artifact safe to ingest?"
- **`research-quality-audit`** / **`research-quality`** assess *GRADE evidence
  quality* — "how strong is this source?"

They answer different questions and compose: run `integrity-scan` first to
quarantine residue-laden artifacts, then run the quality skills on what passes.

## Triggers

- "scan the corpus for LLM residue"
- "find placeholder / fabricated data"
- "submission-risk scan"
- "quarantine suspect papers"
- "integrity scan"

## Notes

- TS-native (`src/artifacts/corpus-tools/integrity-scan.ts`) — port of section9
  `llm_artifact_scan.py`. Scans text artifacts (`.md/.txt/.tex/.bib/.yaml/.html`).
- `ai-disclosure` is intentionally low-severity (weight 2): research notes
  legitimately discuss Claude/Gemini/LLMs as *subjects*, so it informs rather
  than quarantines on its own.
