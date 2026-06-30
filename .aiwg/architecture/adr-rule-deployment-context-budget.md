# ADR: Enforcement-Tiered Rule Deployment for Context Budget

## Status

**ACCEPTED**

## Date

2026-06-29

## Decision Record

Accepted 2026-06-29 (operator sign-off via address-issues #1673 interactive gate):

1. **Always-on tier:** CRITICAL + HIGH inlined (~115K); MEDIUM + unlabelled +
   generated behaviors move to on-demand.
2. **Enforcement-level source:** migrate to a machine-readable YAML frontmatter
   field (`enforcement: critical|high|medium|low`) across all rule files, and
   triage the 20 unlabelled rules as part of the migration.
3. **Target headroom:** ≤120K AIWG-controlled startup — tiering **plus**
   compressing the largest always-on HIGH rule bodies (body + supporting files,
   as done for doc-sync in #1672).
4. **Sequencing:** bounded-first.
   - Cycle 2 — additive diagnostics: `aiwg doctor` reports the real startup load
     (reusing the #1672 `scanStartupContext` helper) and the registry-drift fix.
   - Cycle 3 — deploy-path tier selection + on-demand rule index +
     frontmatter migration.
   - Cycle 4 — body compression of the largest HIGH rules; then gate
     `lint:claude-context --strict` (incl. startup budget) in CI.

## Context

### Problem Statement

`aiwg use` deploys **every** installed component's rules full-text into the
provider's always-on rule directory (`.claude/rules/*.md` for Claude Code), and
Claude Code inlines all of them into the system context at session start. There
is no progressive disclosure for rules — unlike skills, whose bodies load only
when invoked.

On a full `aiwg use all` Claude deployment this produces a startup context that
exceeds the standard Sonnet window before any user prompt. Measured
(`npm run lint:claude-context -- --startup`, June 2026):

| Component | ~Tokens | Share |
|-----------|---------|-------|
| `.claude/rules/*.md` (95 files) | ~170K | 88% |
| memory files (`AIWG.md`, `CLAUDE.md`, `AGENTS.md`, `.aiwg/AIWG.md`) | ~24K | 12% |
| **AIWG-controlled startup total** | **~193K** | of a 200K standard window |

Once the base system prompt, tool definitions, and skill/agent listings are
added, a fresh in-repo session crosses 200K and Claude Code upgrades to the
credit-gated 1M tier (rejected without credits) — or, on standard-only accounts,
exhausts immediately (`Context limit reached`). This is the root cause
identified in #1672; the doc-sync workflow rewrite bounded per-workflow cost but
cannot touch startup cost.

### Findings

- **Breadth, not depth.** ~95 rules from ~10 components (sdlc-complete 38,
  aiwg-utils 27, security-engineering 12, ops + extensions ~20, others ~10),
  each a full-text essay averaging ~1.8K tokens. Only 4 exceed 5K — no single
  offender.
- **`aiwg refresh` does not help.** The deployed set is current (bodies
  byte-identical to source bar a managed-marker line), no orphans, no new rules
  since the deployed stamp. Refresh re-copies the same ~95 full-text rules. The
  cost is structural to the deployment model.
- **A selection signal already exists.** Every rule declares an
  `**Enforcement Level**` (CRITICAL / HIGH / MEDIUM / LOW) in its body. Current
  distribution and token weight of the deployed set:

  | Tier | Files | ~Tokens |
  |------|-------|---------|
  | CRITICAL | 8 | 15.3K |
  | HIGH | 45 | 99.4K |
  | MEDIUM | 22 | 38.8K |
  | (unlabelled) | 20 | 17.7K |
  | generated `behaviors/*` | 8 | 8.2K |

- **An on-demand path already exists.** `aiwg show rule <name>` streams any
  rule body on demand, and the `skill-discovery` / `cli-secondary` rules already
  instruct agents to reach rules that way. There is no per-rule listing/index
  yet, so agents don't know which non-deployed rules exist.

## Decision

Deploy rules in **two tiers**, selected by enforcement level:

1. **Always-on (inlined to `.claude/rules/*`):** CRITICAL + HIGH only.
   These are the behavior-shaping, safety, and policy rules that must apply
   without a lookup (no-attribution, token-security, anti-laziness,
   human-authorization, skill-discovery, delivery-policy, the crypto CRITICALs,
   etc.). Weight on the current corpus: ~115K.

2. **On-demand (not inlined; reachable via `aiwg show rule <name>`):**
   MEDIUM, unlabelled, and generated behavior rules. A compact **rule index** is
   deployed in their place — one line per rule (name + one-line summary +
   enforcement level) — so agents know they exist and can fetch the body when a
   task needs it. Weight removed from startup: ~65K.

Net startup for a full `aiwg use all` Claude deployment: **~193K → ~128K**
(CRITICAL+HIGH ~115K + memory ~24K − overlap, + a small index). Further headroom
comes from a second, independent lever (below).

### Selection mechanics

- Promote `**Enforcement Level**` to a machine-readable form. Prefer a YAML
  frontmatter field (`enforcement: critical|high|medium|low`) added by a
  one-time migration; until then, the deployer parses the existing body marker.
- **Triage the 20 unlabelled rules.** Assign each an enforcement level. Default
  unlabelled → on-demand (MEDIUM-equivalent) so an un-triaged rule never
  silently lands in the always-on budget.
- Selection is provider-agnostic; the same tiering drives every provider's
  always-on rule surface (Claude `.claude/rules/`, Cursor `.cursor/rules/`,
  Hermes/OpenHuman `### Rule:` digests, etc.).

### Second lever (independent, optional)

The largest always-on HIGH rules are essays with inline examples
(`rlm-context-management` 8.5K, `anti-laziness` 8K, `skill-discovery` 5.3K,
`subagent-scoping` 5K). Applying the same body/supporting-file split used for the
doc-sync skill in #1672 would trim the always-on set further toward the ≤120K
target without dropping any rule from always-on. This is per-rule work and can
proceed incrementally after the tiering lands.

## Alternatives Considered

1. **CRITICAL-only always-on (~15K).** Maximal headroom, but demotes
   behavior-critical HIGH rules (anti-laziness, skill-discovery, delivery-policy,
   ci-green) to a lookup agents may skip. Rejected: too aggressive; HIGH rules
   shape default agent behavior and must be unconditional.
2. **Keep full-text, rely on auto-compact.** Compaction summarizes conversation,
   not the system-prompt rule block; it cannot reclaim the standing rule cost.
   Rejected: does not address the startup ceiling.
3. **Per-workspace install narrowing only** (`aiwg remove <framework>`).
   Available today and a valid escape hatch, but manual and per-workspace; does
   not fix the default `aiwg use all` experience. Kept as a documented
   workaround, not the fix.
4. **Compress every rule body, keep all always-on.** Helps but unbounded as the
   corpus grows; tiering is the structural fix, compression is complementary.

## Consequences

### Positive
- A full `aiwg use all` Claude deployment fits the 200K standard window with
  meaningful working headroom.
- Scales: new MEDIUM/unlabelled rules add zero startup cost.
- Reuses existing machinery (`aiwg show rule`, enforcement levels, file-based
  discovery).

### Negative / risks
- MEDIUM rules become discover-then-fetch; an agent that ignores the index won't
  apply them proactively. Mitigation: the index lists them with triggers; the
  `skill-discovery`/`cli-secondary` rules (both HIGH, so always-on) already
  mandate the lookup path.
- Requires triaging 20 unlabelled rules and a migration to machine-readable
  enforcement levels.
- Per-provider always-on surfaces must each honor the tiering (one code path in
  the context pipeline, several output adapters).

### Follow-on work (tracked in #1673)
- Implement tier selection in the rule-deploy path
  (`src/smiths/context-pipeline/` discovery + finalization).
- Generate and deploy the compact rule index for the on-demand tier.
- Fix registry drift: `aiwg.config` records `claude → rules: 2` while 95 are on
  disk; `aiwg doctor` should report the real startup load and flag over-budget
  (the `scanStartupContext` helper added in #1672 is the basis).
- Gate `lint:claude-context --strict` (incl. startup budget) in CI once the
  always-on set fits and the oversized-skill backlog is triaged.

## References

- #1672 (root-cause spike), #1673 (this work)
- `docs/providers/claude-context-budget.md` — startup-budget section
- `.aiwg/research/reports/issue-1672-claude-context-exhaustion-spike.md`
- `tools/lint/claude-context-inventory.mjs` — `scanStartupContext()` / `--startup`
- `.aiwg/architecture/adr-rules-index-hierarchy.md` — two-level RULES-INDEX (the
  on-demand index builds on this)
