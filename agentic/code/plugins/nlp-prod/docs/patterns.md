# Pipeline Patterns

Six canonical patterns for LLM inference pipelines. Start with the simplest one that meets your requirements.

---

## Decision Guide

Apply in order — stop at the first match:

```
Tool use + dynamic branching?
  → Embedded Agent

Explicit states + error recovery + compliance auditability?
  → State Machine

External document retrieval required?
  → RAG Pipeline

Runtime prompt assembly (multi-tenant, feature flags)?
  → Dynamic Prompt

Quality gate on output only (no multi-step pipeline)?
  → Eval Loop (standalone)

Everything else:
  → Simple Chain ← DEFAULT
```

**Bias toward Simple Chain.** It handles ≥70% of standard use cases. Complexity is a cost — in code, in ops, in debugging.

---

## Pattern 1: Simple Chain

**When to use**: Single-responsibility tasks, high-volume inference, latency-sensitive paths, cost-constrained deployments.

**Structure**:
```
Input → [Prompt A] → LLM → Parse → [Prompt B] → LLM → Output
```

**Generated artifacts**:
- `prompts/step-a.prompt.md`, `prompts/step-b.prompt.md`
- `pipeline.config.yaml`
- `src/pipeline.py` or `src/pipeline.ts`
- `eval/cases.jsonl`, `eval/eval.py`
- `cost-estimate.md`

**Anti-patterns to avoid**:
- Adding agent loop "just in case"
- Using sonnet when haiku passes eval at >85%
- Adding framework dependencies not needed for the task

---

## Pattern 2: Embedded Agent

**When to use**: Routing decisions, structured extraction with ambiguity, tool-gated tasks needing retry logic but not full autonomy.

**The embedded agent is a component in a flow — not the flow itself.** Key constraints:
- ≤5 tools
- Bounded iterations (max_iterations required — no infinite loops)
- Deterministic exit conditions
- Falls back to `escalate` if exit condition not met

**Structure**:
```
Flow → [Agent: classify + route] → Flow
Flow → [Agent: extract structured data] → Flow
```

**Generated artifacts**:
- `prompts/system.prompt.md` (scoped system prompt)
- `tools/` (typed tool definitions)
- `pipeline.config.yaml` (with `agent_config`)
- `src/agent.py` or `src/agent.ts`

**When NOT to use**:
- More than 5 tools needed → redesign as State Machine or pipeline steps
- Unbounded iteration required → use Ralph loop (development) or State Machine (production)
- Full autonomy needed → use AIWG-style agents, not embedded agent

---

## Pattern 3: State Machine

**When to use**: Document processing pipelines, multi-stage classification, workflows with explicit retry/escalation logic, compliance-critical flows where state must be auditable.

**Structure**:
```
INIT → EXTRACT → VALIDATE → [PASS → ENRICH → OUTPUT] | [FAIL → RETRY(n) → ESCALATE]
```

**Generated artifacts**:
- `fsm.config.yaml` (states, transitions, guards)
- `prompts/` (one prompt file per LLM state)
- `src/pipeline.py` or `src/pipeline.ts` (FSM runtime)
- `audit/transitions.jsonl` (append-only audit log)

**Key principles**:
- Every state has a defined type (`llm`, `transform`, `decision`, `terminal`, `escalate`)
- Every transition has a guard condition
- Terminal states have explicit outcomes: `accept`, `reject`, `escalate`
- Max retries defined — no infinite loops
- Audit log captures all transitions

**When NOT to use**:
- Simple sequential steps with no branching → Simple Chain
- Need for unbounded tool use → Embedded Agent or full agent system

---

## Pattern 4: RAG Pipeline

**When to use**: Knowledge base Q&A, document-grounded generation, any case where the LLM needs external context it cannot have in the system prompt.

**Structure**:
```
Query → Embed → Retrieve(k) → Rerank(optional) → [Context + Query → Prompt] → LLM → Response
```

**Generated artifacts**:
- `retrieval.config.yaml` (chunk size, overlap, k, embedding model)
- `prompts/rag.prompt.md` (with `{{context}}` injection)
- `src/retrieval.py`, `src/pipeline.py`
- `eval/rag-eval.py` (RAGAS-compatible eval harness)

**Key parameters**:
- `k` = number of chunks to retrieve (default: 5; increase if recall is low)
- `chunk_size` = 512 words (default; decrease for precise retrieval)
- `chunk_overlap` = 64 words (prevents context boundary splits)
- `rerank` = false by default (enable if recall is important; adds latency)

**When NOT to use**:
- "The context might be long" → use prompt caching on simple chain instead
- Context fits in system prompt → use simple chain with direct injection
- Knowledge changes per-request → dynamic prompt may be more appropriate

---

## Pattern 5: Eval Loop

**When to use**: Quality gate over generated output where a single-pass generation isn't reliable enough. Standalone or composed with any other pattern.

**Structure**:
```
GENERATE(prompt, input)
  → output
  → EVAL(eval_prompt, input, output)   ← isolated call
    → {score, pass, feedback}
    → if pass: ACCEPT
    → if fail and attempts < max: REFINE(feedback) → GENERATE again
    → if fail and attempts >= max: ESCALATE
```

**The most important property: strict isolation.** The evaluator has NO knowledge of the generator's internals, chain-of-thought, or intermediate steps.

**Generated artifacts**:
- `prompts/generator.prompt.md`
- `prompts/evaluator.prompt.md` (separate file — never mixed with generator)
- `eval/loop.py` or `eval/loop.ts` (configurable: max_attempts, pass_threshold)

**Configuration**:
- `pass_threshold`: 0.85 (default)
- `max_attempts`: 3 (default)
- `eval_model`: haiku (cheaper than generator; sufficient for scoring)

**Anti-patterns**:
- Evaluator and generator in the same prompt file → isolation violation
- Evaluator receiving chain-of-thought or intermediate steps → isolation violation
- Using the same model as generator for evaluation → increases cost with no benefit

---

## Pattern 6: Dynamic Prompt

**When to use**: Personalized generation, multi-tenant prompts, feature-flagged prompt variants, systematic prompt iteration.

**Structure**:
```
Config + Context → PromptBuilder → Rendered Prompt → [Eval Loop] → Accepted Prompt
```

**Generated artifacts**:
- `prompts/builder.config.yaml` (template blocks, variable schema)
- `prompts/template.prompt.md.j2` (Jinja2 or Handlebars template)
- `src/prompt_builder.py` or `src/prompt_builder.ts`
- `eval/prompt-eval.py`

**Key principle**: The template is code. Version it, test it, review it. A/B testing prompt variants is an explicit use case — not a side effect.

---

## Anti-Pattern Reference

| Anti-Pattern | Signal | Recommended Pattern |
|-------------|--------|---------------------|
| Agentic overkill | "I need an agent that..." for single-step extraction | Simple Chain |
| Tool proliferation | >5 tools in embedded agent | State Machine or split pipeline |
| Framework cargo-cult | "We're using LangChain, so..." | Evaluate if load-bearing; default to clean stub |
| Missing eval | No mention of quality measurement | Add eval loop to any pattern |
| Eval contamination | Evaluator knows generator's reasoning | Strict isolation protocol |
| Infinite loop risk | No exit condition or max_iterations | Embedded Agent with bounds or State Machine |
| RAG for everything | "Context might be large" | Check if prompt caching handles it first |
