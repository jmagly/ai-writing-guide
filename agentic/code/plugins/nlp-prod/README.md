# nlp-prod — NLP Production Pipeline Toolkit

An AIWG addon for designing and productionizing LLM inference pipelines. Pattern-guided, slim by default, eval-first.

**Guiding philosophy**: manageable, maintainable, cost-effective — good TCO and real use.

---

## Problem

Building LLM inference pipelines for production is underserved by current tooling. The gap is not in training — it's in the last mile: taking a working prompt or agent prototype and turning it into something that reliably runs in production with acceptable latency, predictable cost, observable failure modes, and minimal operational complexity.

Teams consistently overbuild. They reach for full agentic frameworks when a two-step chain would do. They write elaborate prompt management systems instead of a well-structured template file. They skip eval and discover quality problems in prod.

`nlp-prod` addresses this by:
1. **Pattern-first guidance** — five canonical patterns, help you pick the right one
2. **Slim output** — production-sized artifacts, not demo-sized
3. **Eval as a first-class concern** — every pipeline has an eval loop
4. **Productionize command** — explicit step to strip prototype scaffolding
5. **Cost visibility** — cost estimates at design time

---

## Install

```bash
aiwg use nlp-prod
```

---

## Supported Pipeline Patterns

| # | Pattern | When to use |
|---|---------|-------------|
| 1 | **Simple Chain** | Default. Sequential prompt calls, no loop, no tool use. |
| 2 | **Embedded Agent** | Scoped tool use, bounded iterations, deterministic exit. |
| 3 | **State Machine** | Explicit states/transitions, error recovery, auditable flows. |
| 4 | **RAG Pipeline** | Retrieval-augmented generation over external knowledge. |
| 5 | **Eval Loop** | Isolated generate→review quality gate. |
| 6 | **Dynamic Prompt** | Runtime prompt assembly from config, context, or feature flags. |

---

## CLI Commands

```bash
aiwg nlp new                          # Interactive wizard — scaffold new pipeline
aiwg nlp add-step <dir> <step-name>   # Add a step to existing pipeline
aiwg nlp eval <dir>                   # Run eval loop against test cases
aiwg nlp optimize <dir>               # Cost/latency optimization analysis
aiwg nlp productionize <dir>          # Production readiness review + generation
aiwg nlp estimate-cost <dir> [--volume N]  # Cost estimate at target volume
aiwg nlp status                       # All pipelines in current project
```

---

## Output Artifacts (per pipeline)

| Artifact | Default | Optional flag |
|----------|---------|---------------|
| Prompt files (`.prompt.md`) | ✓ | — |
| Pipeline config YAML | ✓ | — |
| Typed code stub (Python or TS) | ✓ | — |
| Eval harness + test cases | ✓ | — |
| Cost estimate | ✓ | — |
| LangChain integration | ✗ | `--framework langchain` |
| LangGraph state graph | ✗ | `--framework langgraph` |
| Vector store integration | ✗ | `--vector-store <type>` |
| Observability hooks | ✗ | `--with-observability` |

---

## Agents

| Agent | Role |
|-------|------|
| `Pipeline Architect` | Pattern selection, pipeline design, cost estimation |
| `Prompt Engineer` | Production prompt creation with eval loop |
| `Eval Reviewer` | Isolated evaluator — Read-only tools, no generator context |
| `Cost Analyst` | TCO analysis, model selection, caching strategy |

---

## Skills

| Skill | Trigger |
|-------|---------|
| `pipeline-design` | "design a pipeline", "I need a pipeline for..." |
| `prompt-engineer` | "improve this prompt", "write a prompt for..." |
| `eval-loop` | "evaluate this pipeline", "set up evals for..." |
| `cost-optimizer` | "optimize cost", "reduce inference spend" |
| `pattern-selector` | "which pattern should I use", "help me choose" |
| `productionize` | "productionize this", "make this production ready" |
| `pipeline-status` | "how are my pipelines", "pipeline health" |

---

## Eval Loop: The Production Quality Gate

The eval loop is `nlp-prod`'s equivalent of the Ralph loop — but designed for production quality gates, not development iteration.

**Key principle**: The evaluator is a **separate prompt file** from the generator. Strict isolation — the evaluator has no generator context. The tool warns if cross-contamination is detected.

```
GENERATE(prompt, input)
  → output
  → EVAL(eval_prompt, input, output)   ← isolated call
    → {score, pass, feedback}
    → if pass:                ACCEPT
    → if fail, attempts < max: REFINE(feedback) → GENERATE again
    → if fail, attempts >= max: ESCALATE
```

---

## References

- `docs/patterns.md` — when to use each pattern
- `docs/eval-loop.md` — isolation protocol, anti-patterns
- `docs/productionization.md` — productionize checklist and rationale
- `templates/` — one directory per pattern (generator + evaluator prompts, config, code stubs)
- `schemas/` — JSON Schemas for pipeline-config, eval-result, cost-model, fsm-config
- `agents/` — agent definitions
- `skills/` — skill definitions

---

## Related Addons

| Addon | Relationship |
|-------|-------------|
| `aiwg-evals` | Evaluation methodology foundation; nlp-prod eval loop extends this |
| `ralph` | Ralph loop concept; nlp-prod eval loop is a production-adapted variant |
| `rlm` | Useful for RAG pipelines with large document corpora |

---

## Non-Goals (v1)

- Fine-tuning or training pipelines (inference only)
- Streaming output pipelines (v2)
- Multimodal pipelines (v2)
- LLM-as-judge leaderboard integration (v2)
- Real-time observability dashboard (v2)
