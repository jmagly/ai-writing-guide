# Ops Runbook — {{pipeline_name}}

**Pattern**: {{pattern}}
**Language**: {{language}}
**Generated**: {{date}}

---

## Overview

{{pipeline_description}}

**Input**: {{input_description}}
**Output**: {{output_description}}
**Eval pass rate**: {{eval_pass_rate}} (threshold: {{pass_threshold}})
**Monthly cost at {{monthly_volume}} calls**: ~${{monthly_cost}}

---

## Start

```bash
# Python
python src/pipeline.py '<input>'

# Docker
docker run --env-file .env {{pipeline_name}}:latest
```

Environment variables required:
- `ANTHROPIC_API_KEY` — Anthropic API key

---

## Stop

```bash
# Docker
docker stop $(docker ps -q --filter name={{pipeline_name}})
```

---

## Health Check

```bash
# Smoke test with known-good input
python src/pipeline.py '{{smoke_test_input}}'
# Expected: {{smoke_test_expected}}

# Run full eval suite
python eval/eval.py --threshold {{pass_threshold}}
```

**Alert threshold**: Pass rate below {{pass_threshold}} should trigger review.

---

## Rollback

```bash
# Revert to previous prompt version (prompts are versioned in headers)
git log -- prompts/generator.prompt.md
git checkout <commit> -- prompts/generator.prompt.md
```

---

## Monitoring

Watch for:
| Signal | Meaning | Action |
|--------|---------|--------|
| Eval pass rate drops >5% | Prompt drift or model change | Re-run eval, compare failure cases |
| Cost per call spikes | Token count increase | Check prompt for verbose output |
| Timeout rate increases | LLM latency degradation | Check Anthropic status, increase timeout |
| 429 rate increases | Rate limit hit | Implement request queuing or reduce volume |

---

## Re-running Eval

```bash
python eval/eval.py --threshold {{pass_threshold}} --cases eval/cases.jsonl
```

Results written to `eval/results.jsonl` (append-only).

---

## Deployment Notes

{{deployment_notes}}
