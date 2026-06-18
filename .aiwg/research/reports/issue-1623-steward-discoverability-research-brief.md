---
title: "Research Spike — Steward & User Discoverability of Feature Domains (expansion/persona/project)"
issue: "#1623"
type: research_brief
created: 2026-06-18
author: technical-researcher (spike)
status: complete
grade: MIXED
grade-note: >
  HCI classics (Norman, Pirolli & Card) — HIGH/established. Agentic tool-retrieval
  papers (SkillRouter, ToolRet, Tool-to-Agent, Dynamic ReAct) — LOW–MODERATE (recent
  preprints / venue papers, mixed peer-review). Practitioner UX/CLI sources — VERY LOW.
  AIWG-internal findings — verified against live code/`aiwg discover` runs (HIGH for the
  internal claims). Hedge accordingly.
sources:
  local_corpus: /home/roctinam/dev/research/research-papers
  aiwg_findings: .aiwg/research/findings/
---

# Research Spike — #1623 Steward & Feature-Domain Discoverability

## TL;DR (the load-bearing finding)

**This is a *surfacing/curation* problem, not an *indexing* problem.** All three blind-spot
domains already return correct results from `aiwg discover` — verified live: `scaffold-extension`
**0.66**, `new-project` **0.58–0.66**, `soul-create` **0.26**, `aiwg-writer` (persona agent)
**0.27**. The capability machinery works. What's missing is a **kernel-resident routing surface
that *names these as capability domains*** plus the trigger-phrase engineering that makes them
*rank* and makes the affordance *perceptible* to both the user and the steward.

The fix direction in #1623 (steward quickref + curated indices) is sound — but the spike sharpens
it: build a **curated steward quickref + feature→capability map + trigger engineering**, NOT a new
embedding index. A literal heavyweight "special index" would over-engineer against settled AIWG
research (FTS5/hybrid is already near-optimal at this corpus size).

---

## 1. Problem restated against current design

The corpus survey + live verification (Job 2 agent) established the precise mechanics:

| Layer | State | Consequence for #1623 |
|---|---|---|
| Index | persona/soul, `scaffold-*`, `new-project` **are indexed** (`src/artifacts/types.ts:439`; framework graph covers frameworks/addons/extensions/agents/behaviors) | Not an indexing gap |
| `aiwg discover` ranking | Returns all three, but persona ranks **low** (0.26) because persona agents have **`triggers: []`** | Weak *information scent* → low rank → feels "missing" |
| Kernel quickrefs | `aiwg-utils-quickref` + `aiwg-language-map` have curated domain tables for ~20 areas — but **zero persona/soul domain, no `scaffold-*` skill names, project *creation* only buried in the steward agent body** | An agent walking the quickref-first hierarchy (`cli-secondary` Priority 1) **never sees these** and has no curated phrase to fire the discover query that *would* find them |
| Steward data source | `capability-matrix.yaml` is **provider-feature-only** (9 providers × native/emulated) with **no authoring-surface rows**; the steward **owns no quickref** | The designated routing fallback structurally *cannot* answer "how do I author a persona/expansion/project?" |
| `aiwg show` fallback | `findCorpusArtifact` (`src/artifacts/query-engine.ts:786-790`) excludes `agentic/code/agents` | Persona `show` resolves only while indexed → **latent break in un-indexed workspaces** |

**Precise gap statement:** the three domains fall through *not* because they're undiscoverable, but
because there is no kernel-resident surface that names them, no trigger metadata to rank them, and
the steward has no domain reference of its own.

---

## 2. What external & academic patterns say (and how each maps to the fix)

### 2a. It's a *signifier* failure (HCI, established)
- **Norman, *Design of Everyday Things*** (`…/REF-945-norman-2013-…md`): affordance vs **signifier**;
  the Gulf of Execution. The corpus note itself states novices "cannot bridge 'I want X' → 'the
  correct AIWG action is `discover X`'." → The cure is **making the affordance perceptible** (a
  one-line "you can also author expansions / personas / scaffold projects" cue), not adding capability.
- **Information foraging / information scent** (Pirolli & Card; [NN/G](https://www.nngroup.com/articles/information-foraging/),
  [IxDF findability](https://ixdf.org/literature/topics/findability)): users follow **trigger words**;
  weak scent → they abandon the path. → The domain's keywords must appear *in the surface the
  user/steward scans first* (the quickref), not only in the index.

### 2b. Command-palette discoverability — and the stable-sort lesson
- **Command Palette pattern** ([UX Patterns for Developers](https://uxpatterns.dev/patterns/advanced/command-palette);
  [Medium/Bootcamp](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)):
  a searchable command list "helps users discover features they didn't know existed — especially
  new/infrequent users." That's exactly the #1623 user.
- **VS Code's deliberate choice** ([microsoft/vscode#1964](https://github.com/microsoft/vscode/issues/1964)):
  VS Code **sorts by name, not fuzzy relevance**, to keep the list "stable and memorable." →
  Argues for **curated, learnable quickref domain tables** over pure semantic-rank churn. The
  quickref is AIWG's "stable, memorable" layer; `discover` is the fuzzy layer beneath it.

### 2c. Description/trigger engineering is the highest-leverage lever (agentic tool retrieval)
- **Claude-CLI skills audit** ([Porter, Medium](https://medium.com/@porter.nicholas/i-ran-a-claude-cli-skills-audit-and-this-is-what-i-learned-ba04ec958fe2)):
  "Description quality is most critical for discovery: front-load keywords, include 'Use when
  working with…' trigger phrases, list synonyms, keep <50 words." → **Empty `triggers` on persona
  agents is exactly this anti-pattern.**
- **Tool Preferences are Unreliable** (Faghih 2025, INDEX REF-1041): semantically-equivalent
  rewordings swing selection rate **>10×**. → Trigger-phrase wording is load-bearing; engineer it
  deliberately for the three domains.
- **ToolRet — "Retrieval Models Aren't Tool-Savvy"** (Shi et al., ACL 2025, REF-1032): strong
  general IR models underperform on *tool* selection. → Don't assume the generic embedder "just
  works" for these domains; curated triggers compensate.
- **SkillRouter** (Alibaba 2026, `…/REF-877-skillrouter.txt`): indexing only `name+description`
  (hiding the body) drops Hit@1 **31–44pp**. → If `discover` ranks on thin metadata, richer
  descriptions/body indexing for the three domains pays off.

### 2d. The architecturally-correct shape: feature→capability map + re-query loop
- **Tool-to-Agent Retrieval** (PwC 2025, `…/REF-878-tool-to-agent-retrieval.txt`): embed
  tools **and** owning agents in one space linked by ownership; over-fetch then **walk to the
  parent**. ~39% of useful hits came from the *agent* corpus. → The documented fix for "feature
  areas no one discovers": **index the feature intent, link it to the owning capability.** This is
  precisely a steward "feature → owning skill/agent" map.
- **Dynamic ReAct / search-and-load meta-tool** (Gaurav 2025, REF-1033): the corpus note calls its
  best architecture **"architecturally identical to `aiwg discover` + `aiwg show`"** — but the
  agent must **re-query mid-reasoning**. → The steward should **re-query / consult its quickref when
  a first discover pass is low-confidence**, instead of dead-ending (the exact #1623 failure).

### 2e. Don't build a heavy index (settled internally)
- **`zero-server-index-tech-2026-05.md:363`** — FTS5 BM25, zero new deps, is the recommended layer;
  hybrid+HNSW optional. **Fortemi/REF-249 + Rao REF-068**: for **<100K docs, BM25+dense+RRF +
  small reranker is near-optimal**; ColBERT/heavy stacks aren't worth it at ~400 items.
- **Aider PageRank "personalization"** (`agent-codebase-navigation-research.md:373`): the curated
  quickref is AIWG's analog of a relevance *personalization boost* for areas the raw index ranks
  low (persona 0.26). → Curate, don't re-rank-from-scratch.

---

## 3. Recommended design (for the #1623 fix, ordered by leverage)

1. **Trigger-phrase engineering (cheapest, highest leverage).** Add front-loaded keyword +
   "Use when…" `triggers` to the persona agents (`agentic/code/agents/personas/*`) and ensure
   `scaffold-extension/-addon/-framework`, `soul-*`, and `new-project`/`new-bundle` carry rich,
   synonym-bearing descriptions. *Directly attacks the 0.26 rank and the Faghih/ToolRet/SkillRouter
   failure modes.*
2. **Steward quickref (kernel-resident).** A small `steward-quickref` (or extend
   `aiwg-utils-quickref`/`aiwg-language-map`) with **three new domain tables** — Expansion authoring,
   Persona/SOUL, Project creation — each with curated `aiwg discover "…"` phrases. *This is the
   "stable, memorable" command-palette layer + the perceptible signifier (Norman) + the information
   scent the steward currently lacks.*
3. **Feature→capability map.** A curated index mapping the three feature *intents* → owning
   skills/agents (Tool-to-Agent pattern), so "I want a persona" walks to `soul-create` + the persona
   agents. Small static artifact, not an embedding store.
4. **Steward re-query behavior.** When a first `discover` pass is low-confidence, the steward
   consults its quickref / re-queries (Dynamic ReAct arch-5) rather than reporting "not found."
5. **Fix the latent `show` gap.** Add `agentic/code/agents` to `findCorpusArtifact`
   (`query-engine.ts:786`) so persona `show` survives un-indexed workspaces.
6. **Keep ranking as-is.** Existing hybrid/FTS + optional small reranker is already the right stack
   for ~400 items — do **not** add a heavyweight "special index."

---

## 4. Open questions for design phase

- Does `discover` index skill **bodies** or only frontmatter? (SkillRouter says bodies matter; if
  frontmatter-only, persona/expansion descriptions must carry the weight.)
- Should the steward quickref be a **new kernel skill** (counts against the OpenClaw 150 cap,
  Copilot 15K-char budget — `skill-budget-landscape-2026-05.md:351,372`) or a **section added to the
  two existing kernel quickrefs**? Budget pressure argues for the latter.
- Persona *selection* UX (choosing an identity from a catalog) is **uncovered** by both corpora —
  the research base addresses persona *encoding* (Constitutional AI, soul-enforcement) but not
  *selection*. If the persona feature includes interactive selection, that UX needs its own
  small spike.

---

## Sources

**AIWG internal (verified live):** `searchable-index-patterns.md`, `skill-budget-landscape-2026-05.md`,
`zero-server-index-tech-2026-05.md`, `agent-codebase-navigation-research.md`, `soul-system-comparison.md`,
`project-local-customization-pattern.md`, `code-graph-indexing-tools.md`,
`agentic/code/addons/aiwg-utils/agents/aiwg-steward.md`,
`agentic/code/addons/aiwg-utils/skills/aiwg-language-map/SKILL.md`,
`src/artifacts/query-engine.ts:786`, `src/artifacts/types.ts:439`.

**Local research-papers corpus:** REF-877 SkillRouter, REF-878 Tool-to-Agent Retrieval, REF-879
Semantic Tool Discovery for MCP, REF-1032 ToolRet, REF-1033 Dynamic ReAct, REF-1041 Tool Preferences
Unreliable, REF-1042 ToolGen, REF-019 Toolformer, REF-249 Fortemi/ColBERT, REF-068 Hybrid Retrieval,
REF-945 Norman, REF-1014 Constitutional AI.

**Web:** [NN/G Information Foraging](https://www.nngroup.com/articles/information-foraging/) ·
[IxDF Findability](https://ixdf.org/literature/topics/findability) ·
[Command Palette pattern](https://uxpatterns.dev/patterns/advanced/command-palette) ·
[VS Code #1964 (stable sort)](https://github.com/microsoft/vscode/issues/1964) ·
[Claude CLI skills audit](https://medium.com/@porter.nicholas/i-ran-a-claude-cli-skills-audit-and-this-is-what-i-learned-ba04ec958fe2) ·
[IxDF Progressive Disclosure](https://ixdf.org/literature/topics/progressive-disclosure) ·
[UXPin Affordances](https://www.uxpin.com/studio/blog/affordances-user-interaction/)
