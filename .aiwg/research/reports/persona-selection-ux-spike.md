---
title: "Research Spike — Persona/SOUL Selection UX (runtime catalog-pick)"
issue: "#1625"
type: research_brief
created: 2026-06-18
author: technical-researcher (spike)
status: complete
grade: MIXED
grade-note: >
  AIWG-internal SOUL-surface inventory — verified live against skill/agent
  source (HIGH). External patterns — practitioner blogs, vendor docs, and
  preprints (LOW–VERY LOW; recent, mixed peer-review). Anthropic PSM is a
  research note from an established lab (MODERATE, forward-looking). Hedge
  accordingly; this is a direction-setting spike, not an implementation spec.
sources:
  aiwg_findings: .aiwg/research/findings/soul-system-comparison.md
  related: .aiwg/research/reports/issue-1623-steward-discoverability-research-brief.md
---

# Research Spike — #1625 Persona/SOUL Selection UX

## TL;DR (recommendation)

**Defer the build; fold the design into the SOUL framework as a thin runtime
overlay — do not invent a parallel system.** The load-bearing finding: AIWG
already has rich persona *authoring* (`soul-create` and friends) and *deploy-
time activation* (`soul-enable` wires one project `@SOUL.md` + per-agent
`.soul.md` into the context file). What it lacks is a **session-scoped runtime
selection overlay** — the ability to pick an identity from a catalog and
activate it for *this* session without re-wiring the project. The external
state of practice has converged on exactly this shape: a **baseline SOUL.md +
a `/personality`-style session overlay backed by a thin persona registry**
([Hermes Agent docs](https://hermes-agent.nousresearch.com/docs/reference/faq);
[asdlc.io — Agent Personas: Session-Scoped Roles](https://asdlc.io/practices/agent-personas/)).
AIWG can adopt that model with near-zero new architecture because #1623 already
shipped the registry substrate (the persona-identity facet + persona triggers).

Recommended next step: a **small follow-up feature issue** (not an ADR-heavy
epic) to add a `soul-activate`/`persona-use` runtime overlay skill + an active-
selection marker, reusing the #1623 persona facet as the catalog. Build only
after #1623's discoverability has soaked.

---

## 1. Current AIWG SOUL/persona surface (verified live)

There are **two distinct selection axes** today, and the issue's "author AND
select" conflation hides that they are wired differently:

| Axis | What it is | Author | Activate / select |
|---|---|---|---|
| **SOUL profile** | `SOUL.md` identity (worldview, voice, standards) — community `aaronjmars/soul.md` format (`soul-system-comparison.md`) | `soul-create`, `soul-enhance`, `soul-blend`, `soul-validate`, `soul-to-voice` | `soul-enable` (deploy-time: wires `@SOUL.md` into the context file + deploys the `soul-enforcement` rule; `--agents` wires per-agent `.soul.md`); `soul-disable`; `soul-status` | 
| **Persona agent** | A specialized agent persona under `agentic/code/agents/personas/*` (writer, reviewer, security, orchestrator, finder, steward, mc-conductor) | the agent definition itself | dispatched via the platform's agent/subagent mechanism (Task tool, `--agent`, etc.), or — post-#1623 — found via `aiwg discover "select a persona"` |

**Activation model today = deploy-time, single baseline.** `soul-enable` is a
wiring operation: it edits the platform context file so `@SOUL.md` loads at
*every* session start, and the `soul-enforcement` rule gives per-agent
`.soul.md` precedence over the project soul. There is exactly one active
project soul + optional per-agent souls. There is **no runtime "switch to a
different identity for this session"** — changing identity means re-running
`soul-enable` against a different `SOUL.md`, which mutates project config.

**The gap, precisely:** selection at runtime from a *catalog* of available
identities, scoped to the session, without re-wiring the project. #1623 made
the catalog *discoverable* (persona facet, triggers, steward routing); #1625
asks how a user *picks and activates* from it.

---

## 2. External patterns (how the field solves this)

### 2a. Baseline soul + session overlay — the dominant model
[Hermes Agent](https://hermes-agent.nousresearch.com/docs/reference/faq) ships
the exact split AIWG is missing: **"`SOUL.md` is the baseline voice, while
`/personality` is a session-level overlay. Keep a pragmatic default `SOUL.md`,
then use `/personality teacher` for a tutoring conversation or
`/personality creative` for brainstorming."** This is the cleanest mapping:
AIWG's `soul-enable` *is* the baseline; the missing piece is a `/personality`-
equivalent **runtime overlay** that layers on top without un-wiring the base.

### 2b. Session-scoped, registry-backed (not full-def injection)
[asdlc.io — Agent Personas: Session-Scoped Roles](https://asdlc.io/practices/agent-personas/)
argues personas should be **session-scoped, not project-scoped**, backed by a
**persona registry of names + invocation patterns** rather than injecting full
definitions until the persona is actually needed. This is *architecturally
identical to what #1623 shipped*: a thin index of persona names/triggers
(the registry) + `aiwg show` to fetch the full body on demand (lazy injection).
AIWG already has the registry; it needs the "make this one active" verb.

### 2c. Active-selection persistence
[Hermes profiles](https://hermes-agent.nousresearch.com/docs/reference/faq)
track the **active profile in `~/.hermes/active_profile`** plus generated shell
aliases. A concrete persistence pattern: a small marker file records "which
identity is active," scoped per-user or per-project, readable at session start.

### 2d. Mode systems unify persona + tool scope
Hermes feature discussions ([#476](https://github.com/NousResearch/hermes-agent/issues/476),
[#482](https://github.com/NousResearch/hermes-agent/issues/482), inspired by
Roo Code / Kilocode) push a **mode system** where "one switch changes the
agent's persona, what tools it can use, what files it can touch, and what
instructions it follows." Relevant because AIWG persona *agents* already carry
`tools:` scoping — a persona switch could compose persona + tool restrictions,
but that broadens scope considerably and should be a later phase.

### 2e. Interactive pickers
Model/persona switching in the field increasingly uses **interactive pickers
with inline buttons** (Telegram/Discord) and `/model`-style CLI verbs
([XTrace](https://xtrace.ai/blog/ai-persona-agents) live model switching).
Maps directly onto AIWG's `native-ux-tools` rule (use `AskUserQuestion`-style
native pickers; markdown fallback otherwise).

### 2f. Caveats from practice
- **Role drift**: "if you keep switching roles mid-conversation without
  consistency, the model's behavior may drift"
  ([WaterCrawl — Role Prompting](https://watercrawl.dev/blog/Role-Prompting)).
  Argues for an *explicit, visible* active-persona marker and a single active
  overlay rather than silent per-turn swaps.
- **The assistant persona is itself runtime-conditioned**
  ([Anthropic — The Persona Selection Model](https://alignment.anthropic.com/2026/psm/)):
  treat a selected persona as conditioning context layered over the base
  assistant, not a wholesale identity replacement.
- **On-demand generation** ([arXiv 2604.27882](https://arxiv.org/html/2604.27882))
  exists but is over-engineered for AIWG's need — AIWG has a curated catalog;
  it does not need to synthesize personas at runtime.

---

## 3. Recommended interaction model

A **thin runtime overlay over the existing deploy-time baseline**, in three
parts, reusing #1623's substrate:

1. **Catalog = the #1623 persona facet.** `aiwg discover "select a persona"`
   already returns the persona agents + `soul-*`. No new index. The catalog of
   selectable SOUL profiles is the set of `SOUL.md` files the project/user
   knows about (project `SOUL.md`, `~/.config/aiwg/souls/*`, and any per-agent
   `.soul.md`).

2. **A runtime "make active" verb** — a new `soul-activate` (or `persona-use`)
   skill that records a **session-scoped active selection** (overlay), distinct
   from `soul-enable`'s project-mutating wiring. Precedence:
   `per-agent .soul.md  >  session overlay (soul-activate)  >  project SOUL.md (soul-enable baseline)  >  base assistant`.
   This extends the existing `soul-enforcement` precedence chain by exactly one
   layer (the session overlay), matching Hermes's baseline-+-overlay split (§2a).

3. **A perceptible signifier + native picker.** Per `native-ux-tools`, offer an
   `AskUserQuestion`-style picker of available identities when the user asks to
   "switch persona," and surface the **active persona** visibly (the role-drift
   guard from §2f). Ties back to #1623's Norman/information-scent framing: the
   affordance "you can switch persona" must be perceptible, not hidden.

### Persistence & scope
- **Single active overlay** (not layered stacks) to avoid drift (§2f). The base
  + one session overlay + per-agent souls is the full precedence chain.
- **Session-scoped marker**, e.g. `.aiwg/working/active-persona` (ephemeral,
  per-session) — mirrors Hermes `active_profile` (§2c) but scoped to AIWG's
  working dir so it never mutates committed project config. Deploy-time
  `soul-enable` remains the way to set a *durable* project baseline.

### Multi-provider portability (10 providers)
The overlay must degrade like every other AIWG capability:
- Providers with native session-context injection (Claude Code `@`-directives,
  Hermes `/personality`): wire the overlay into the session context surface.
- Providers without a runtime overlay hook: the `soul-activate` skill instructs
  the agent to *adopt* the selected SOUL body for the session (prompt-level
  overlay), reading it via `aiwg show`. No provider-native feature required —
  consistent with AIWG's skill-as-instruction model and the steward's
  native-vs-emulated routing.

---

## 4. Recommendation: defer, then fold into the SOUL framework

| Option | Verdict |
|---|---|
| **Build now** | No — #1623 just shipped; let discoverability soak. Building selection UX before the catalog is exercised risks designing for an unvalidated workflow. |
| **Defer + fold into SOUL framework** | **Yes** — the overlay is one new layer on the existing `soul-enforcement` precedence chain + one thin skill. It belongs in the SOUL lifecycle (`soul-*`), not a parallel system. |
| **Separate ADR/epic** | Not warranted (`sdlc-right-sizing`). A single follow-up feature issue + (optionally) a short ADR for the precedence-chain extension is the right size. |

**Concrete follow-up to file:** *"feat(soul): runtime persona overlay —
`soul-activate` session-scoped selection over the deploy-time baseline"*,
depending on #1623 (catalog) and referencing this spike. Scope: the overlay
skill, the precedence-chain extension in `soul-enforcement`, the active-persona
marker, and a native picker. Tool-scoping composition (§2d) is explicitly out
of scope for the first cut.

---

## 5. Open questions for the design phase

- **Overlay vs. replacement semantics.** Does an active persona *layer over* the
  project SOUL (additive worldview) or *replace* it for the session? §2e argues
  layered; needs a product call.
- **SOUL-profile catalog source.** Persona *agents* are indexed (#1623); SOUL
  *profile* files (`SOUL.md`, `~/.config/aiwg/souls/*`) are not yet a first-class
  discover facet. Selection UX needs both in one catalog — a small extension to
  the persona facet.
- **Per-agent vs. session interaction.** When a per-agent `.soul.md` exists and a
  session overlay is active, the precedence is defined above, but the *UX* of
  surfacing "agent X is using its own soul, overriding your session pick" needs
  design.
- **Cross-session durability.** Should an activation persist across sessions
  (like Hermes `active_profile`) or always reset? Recommend ephemeral by default
  with an explicit `--persist` to write a durable marker.

## Sources

**AIWG internal (verified live):** `.aiwg/research/findings/soul-system-comparison.md`;
`soul-create/-apply/-enable/-disable/-status/-blend/-to-voice/-validate/-enhance` skill
frontmatter; `agentic/code/agents/personas/*`; `soul-enforcement` rule;
`.aiwg/research/reports/issue-1623-steward-discoverability-research-brief.md`.

**Web:**
[Hermes Agent — FAQ (SOUL.md baseline + /personality overlay, active_profile)](https://hermes-agent.nousresearch.com/docs/reference/faq) ·
[asdlc.io — Agent Personas: Session-Scoped Roles](https://asdlc.io/practices/agent-personas/) ·
[Hermes Agent #476 — Agent Mode System](https://github.com/NousResearch/hermes-agent/issues/476) ·
[Hermes Agent #482 — Switchable Agent Modes](https://github.com/NousResearch/hermes-agent/issues/482) ·
[Anthropic — The Persona Selection Model](https://alignment.anthropic.com/2026/psm/) ·
[XTrace — AI Persona Agents](https://xtrace.ai/blog/ai-persona-agents) ·
[WaterCrawl — Role Prompting (drift caveat)](https://watercrawl.dev/blog/Role-Prompting) ·
[arXiv 2604.27882 — Building Persona-Based Agents On Demand](https://arxiv.org/html/2604.27882) ·
[Towards AI — The Persona Pattern](https://towardsai.net/p/artificial-intelligence/the-persona-pattern-unlocking-modular-intelligence-in-ai-agents)
