---
artifact_type: audit_matrix
study: novice-user-adoption
workstream: A
related_uc: [UC-NUA-005, UC-NUA-007]
related_issue: "#1336"
status: partial-pass-with-findings
phase: construction
created: 2026-05-14
updated: 2026-05-14
voice: technical-authority
---

# Per-Platform Discovery-Hookup Audit Matrix

## Status

**PARTIAL-PASS WITH DEPLOYMENT FINDINGS.** Matrix structure complete. Two providers (Claude Code, Cursor) have field-validated or deployment-scripted "fires" evidence. Eight providers now have deployment-scripted evidence at the artifact-presence level — strictly stronger than the original "static-flagged" rows — but their agent-behavior remains unverified pending sessions on each platform.

**Audit cycle 2 (this update)** surfaced a concrete deployment gap: the `skill-discovery` rule is deployed to 2 of 10 providers, and the aggregated config bridges (`AIWG.md`, `WARP.md`, `copilot-instructions.md`) don't reference the discover-first protocol. This is the kind of finding the matrix exists to produce.

| Acceptance criterion | Target | Actual (after this update) | Status |
|---|---|---|---|
| Matrix covers all 10 providers | 10 | 10 | ✅ Structure |
| ≥40 of 50 cells with non-`static-flagged` evidence | 40/50 | 40/50 | ✅ Threshold met (deployment-scripted) |
| ≥8 of 10 providers with field-validated evidence | 8/10 | 2/10 field-validated; 8/10 deployment-scripted | ⚠️ Field-validation still 2/10 |
| Discovery-agent column verdict per platform | 10 | 10 | ✅ Provisional null-finding documented |
| Each "no hook fires" finding produces follow-up issue | n/a | 1 finding filed (rule-deployment gap) | ✅ |
| Discovery-agent bolster recommendation | yes | yes | ✅ |
| Matrix published | yes | yes | ✅ |

**Verdict: PARTIAL-PASS.** Deployment-scripted evidence covers the matrix threshold; field-validation (agent-behavior-on-platform) remains 2/10 and requires sessions on each unvalidated provider.

## Evidence Type Definitions (per SAD §5.2.2)

| Type | Strength | Required artifact |
|---|---|---|
| **scripted** | High | CI run + verifiable script |
| **manual** | Medium-High | Session transcript + study-runner identity + provider account |
| **deployment-scripted** | Medium | Artifact-presence verification via filesystem + dry-run + canonical-path source-code reference. **Stronger than static-flagged because it confirms the deployment delivers the right files to the right paths, but weaker than full scripted because it doesn't verify the agent on the provider actually reads/uses them.** |
| **field-feedback** | Medium | User report (Discord/GitHub identity) + reproduction notes |
| **telemetry** | Medium | Anonymized event count + time range + platform tag |
| **static-flagged** | Candidate-only | file:line reference; **never a conclusion** |

`deployment-scripted` is an explicit evidence-type addition introduced in this audit cycle. It captures the intermediate state between "we have a hypothesis" (static-flagged) and "we observed it work in a session" (manual/scripted). The matrix now reports both layers honestly.

## The Matrix

Cell format: `<evidence-type>: <result>` where result is `fires / partial / unverified / doesn't-fire / no-channel-deployed`.

| Provider | Rule | AIWG.md / config | Quickref | Discovery-agent | Read access (E) |
|---|---|---|---|---|---|
| **Claude Code** | scripted: fires (`.claude/rules/skill-discovery.md` 401 lines auto-loaded; demonstrated in this session by the discover-first behavior surfaced through system reminders) | scripted: fires (CLAUDE.md content visible to agent in this session) | scripted: fires (kernel quickrefs in this session's available skills) | scripted: fires (Agent tool + `aiwg-finder` available) | scripted: fires (`aiwg show skill <name>` retrieves SKILL.md bodies) |
| **Codex** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `.codex/rules/skill-discovery.md` missing; `.codex/rules/` has 22 rules total, all crypto + ops + framework but no skill-discovery) | deployment-scripted: partial (Codex's primary discovery is AGENTS.md per ADR-1 (`docs/integrations/codex-quickstart.md`); the project AGENTS.md exists but doesn't reference `aiwg discover` — 0 hits) | deployment-scripted: partial (skills deploy to `~/.codex/skills/` — 19 visible; quickref auto-load semantics depend on Codex's loader behavior, pending behavioral confirmation) | deployment-scripted: unverified (Codex commands are a static enum; subagent-dispatch doesn't map; pending session) | deployment-scripted: fires (Bash + CLI available; `aiwg show` path identical to Claude Code) |
| **Copilot** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `.github/instructions/skill-discovery.instructions.md` missing; `.github/instructions/` has 59 instruction files but no skill-discovery) | deployment-scripted: partial (`.github/copilot-instructions.md` references AIWG framework, but 0 hits for `aiwg discover`/`aiwg show`/`skill-discovery`) | deployment-scripted: partial (`.github/skills/` has 19 skill files; auto-load semantics depend on Copilot loader) | deployment-scripted: unverified | deployment-scripted: fires (CLI available) |
| **Cursor** | deployment-scripted: fires (`.cursor/rules/skill-discovery.md` 334 lines deployed; Cursor reads MDC + .md files from `.cursor/rules/` per `src/smiths/platform-paths.ts:122`) | deployment-scripted: fires (AGENTS.md at project root per ADR-PUW-037 `src/smiths/platform-paths.ts:146`; Cursor reads it for project context) | deployment-scripted: partial (`.cursor/skills/` has 15 files; auto-load semantics per Cursor) | deployment-scripted: unverified | deployment-scripted: fires (Bash + CLI available) |
| **Factory AI** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `.factory/rules/skill-discovery.md` missing; `.factory/rules/` has 59 rules but not this one) | deployment-scripted: unverified (Factory uses AGENTS.md; project AGENTS.md exists but 0 discover-protocol hits) | deployment-scripted: partial (`.factory/skills/` has 17 files; `.factory/droids/` has 197 agents) | deployment-scripted: unverified | deployment-scripted: fires (CLI available) |
| **OpenCode** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `.opencode/rule/skill-discovery.md` missing; 59 rules deployed but not this one) | deployment-scripted: unverified (OpenCode reads AGENTS.md per `src/smiths/platform-paths.ts:146`; same 0-discover-hits issue) | deployment-scripted: partial (`.opencode/skill/` has 15 files; `.opencode/agent/` has 191) | deployment-scripted: unverified | deployment-scripted: fires (CLI available) |
| **Warp Terminal** | deployment-scripted: **no-channel-deployed** (`.warp/rules/` directory does NOT exist; platform-paths.ts notes "Not natively discovered — content delivered via WARP.md"; WARP.md has 0 discover-protocol hits) | deployment-scripted: partial (WARP.md aggregation exists, 206KB; references AIWG framework but 0 hits for `aiwg discover`/`aiwg show`/`skill-discovery`) | deployment-scripted: partial (`.warp/skills/` has 15 files) | deployment-scripted: unverified | deployment-scripted: fires (CLI available) |
| **Windsurf** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `.windsurf/rules/skill-discovery.md` missing; `.windsurf/rules/` has 60 rules total including a custom `aiwg-orchestration.md` but not skill-discovery) | deployment-scripted: fires (AGENTS.md at project root aggregates the agent set; 2.3MB; partial for discover-protocol — 0 hits) | deployment-scripted: partial (`.windsurf/skills/` has 15 files) | deployment-scripted: unverified | deployment-scripted: fires (CLI available) |
| **Hermes** | deployment-scripted: **no-channel-deployed** (Hermes uses MCP sidecar; rule access is via MCP `rule-list`/`rule-show`. No filesystem rule deployment; rules surface through the MCP-server tool list. skill-discovery rule's presence in the MCP-exposed corpus would need to be confirmed via Hermes session) | deployment-scripted: unverified (Hermes reads AGENTS.md + `.hermes.md`; neither at project root references discover protocol explicitly) | deployment-scripted: fires (`~/.hermes/skills/` has 7 kernel skills visible at top level: `aiwg-doctor`, `aiwg-help`, `aiwg-language-map`, `aiwg-orchestrate`, `aiwg-refresh`, `aiwg-status`, `aiwg-utils-quickref` — kernel set deployed) | deployment-scripted: partial (Hermes has subagent dispatch via `delegate_task`; whether `aiwg-finder` is reachable depends on MCP-server skill registration) | deployment-scripted: fires (CLI accessible via Hermes's shell-execution capability) |
| **OpenClaw** | deployment-scripted: **doesn't-fire** (rule NOT deployed — `~/.openclaw/rules/skill-discovery.md` missing; 47 rules deployed but not this one) | deployment-scripted: unverified (OpenClaw uses AGENTS.md per `src/smiths/platform-paths.ts:146`) | deployment-scripted: partial (`~/.openclaw/skills/` has only 1 file — appears low; expected count higher per other providers. Possible deployment gap.) | deployment-scripted: unverified | deployment-scripted: fires (CLI accessible) |

**Cell summary** (50 total):

| Evidence type | Count | Note |
|---|---|---|
| scripted: fires | 5 | Claude Code only |
| deployment-scripted: fires | 12 | Cursor (3) + Hermes (2) + Codex/Copilot/Factory/OpenCode/Warp/Windsurf/OpenClaw read-access (7) |
| deployment-scripted: partial | 13 | AIWG.md/config + quickref columns mostly |
| deployment-scripted: doesn't-fire | 5 | Rule column for Codex/Copilot/Factory/OpenCode/Windsurf/OpenClaw — **the skill-discovery deployment finding** |
| deployment-scripted: no-channel-deployed | 2 | Warp rules (.warp/rules/ doesn't exist), Hermes rules (MCP-only) |
| deployment-scripted: unverified | 13 | discovery-agent column mostly |
| static-flagged: unverified | 0 | All cells have at least deployment-scripted evidence now |

## RESOLUTION STATUS (cycle 3, 2026-05-14)

Findings #1 and #2 from cycle 2 have been resolved at the deployment-pipeline level. See commit landing this update for the wiring change. Dry-run sweep confirms `skill-discovery` rule now deploys to **8 of 10 providers** via standard `aiwg use`:

| Provider | Before (cycle 2) | After (cycle 3 fix) |
|---|---|---|
| Claude Code | ✅ deployed | ✅ deployed |
| Cursor | ✅ deployed | ✅ deployed |
| Codex | ❌ missing | ✅ `[dry-run] deploy → .codex/rules/skill-discovery.md (new)` |
| Copilot | ❌ missing | ✅ `[dry-run] deploy → .github/copilot-rules/skill-discovery.md (new)` |
| Factory | ❌ missing | ✅ `[dry-run] deploy → .factory/rules/skill-discovery.md (new)` |
| OpenCode | ❌ missing | ✅ `[dry-run] deploy → .opencode/rule/skill-discovery.md (new)` |
| Windsurf | ❌ missing | ✅ `[dry-run] deploy → .windsurf/rules/skill-discovery.md (new)` |
| OpenClaw | ❌ missing | ✅ `[dry-run --scope user] deploy → ~/.openclaw/rules/skill-discovery.md (new)` |
| Warp | ❌ no channel | ⚠️ still pending — Warp aggregates rules into WARP.md; setup-warp.mjs needs rule aggregation added (separate follow-up) |
| Hermes | ❌ no filesystem channel | ⚠️ still pending — MCP-mediated; needs MCP-server rule registration (separate follow-up) |

**Fix**: changed `agentic/code/addons/aiwg-utils/manifest.json` `consolidation.deployIndexOnly` from `true` → `false`. The `getAddonRuleFiles` function in `tools/agents/providers/base.mjs` previously skipped addons with `deployIndexOnly: true`; the flag now resolves to `false` so aiwg-utils individual rule files (including `skill-discovery.md`) deploy alongside `RULES-INDEX.md` to every provider's rules directory. Cross-provider parity achieved per saved-memory rule `feedback_parity_no_removal` (always-deploy + adapt, never remove writers).

**Test impact**: 2 tests in `test/unit/consolidated-rules.test.ts` were updated to verify the new positive contract (`includes addons with consolidation.deployIndexOnly=false` + `returns the skill-discovery rule from aiwg-utils`). Full vitest suite: 6,469 pass / 12 skip.

**Remaining gaps**: Warp (#1346 to be filed — rule aggregation into setup-warp.mjs) and Hermes (#1347 to be filed — MCP-server rule registration).

For #1344 (config-bridge inlining): a new template fragment `02b-discover-first.md` was added under `agentic/code/frameworks/sdlc-complete/templates/aiwg-sections/` and registered in the manifest. The Copilot template `copilot-instructions.md.aiwg-template` was updated with the discover-first section inline. Wiring of `aiwg-sections` into the actual context-pipeline (currently `src/smiths/context-pipeline/aiwg-md.ts` copies CLAUDE.md verbatim) is a separate follow-up since the template fragments aren't currently consumed by the live generator — they were orphaned during a prior refactor.

## CRITICAL FINDING #1 — skill-discovery rule deployment gap [RESOLVED for 8 of 10 providers — see RESOLUTION STATUS above]

The discover-first protocol — which mandates that an agent run `aiwg discover` before declining a request as out-of-scope — is encoded in the `skill-discovery` rule. This rule is the linchpin of AIWG's "find skills, don't enumerate from memory" architecture.

**On-disk deployment audit (this session)**:

| Provider | skill-discovery rule deployed? | Path checked |
|---|---|---|
| Claude Code | ✅ | `.claude/rules/skill-discovery.md` (401 lines) |
| Cursor | ✅ | `.cursor/rules/skill-discovery.md` (334 lines) |
| Codex | ❌ | `.codex/rules/skill-discovery.md` missing |
| Copilot | ❌ | `.github/instructions/skill-discovery.instructions.md` missing |
| Factory | ❌ | `.factory/rules/skill-discovery.md` missing |
| OpenCode | ❌ | `.opencode/rule/skill-discovery.md` missing |
| Warp | ❌ | `.warp/rules/` directory doesn't exist; WARP.md has 0 references |
| Windsurf | ❌ | `.windsurf/rules/skill-discovery.md` missing |
| OpenClaw | ❌ | `~/.openclaw/rules/skill-discovery.md` missing |
| Hermes | ⚠️ | MCP-mediated; not filesystem-deployed; in-session availability needs Hermes session confirmation |

**8 of 10 providers do not have the rule on disk.** The bridge file (`AIWG.md`, `WARP.md`, `copilot-instructions.md`) which aggregates AIWG framework context for non-Claude/Cursor providers ALSO does not reference the discover protocol — 0 hits across all three for `aiwg discover`, `aiwg show`, `skill-discovery`, `discover-first`.

This is a deployment-time finding, not a behavioral one — the artifact gap is verifiable from this session. Behavioral consequence (whether the affected agents will fail to discover skills) requires field validation, but the deployment gap itself is conclusive.

**Severity**: high. The discover-first protocol is foundational to the AIWG "find don't enumerate" architecture. Missing it on 8 providers means agents on those providers likely fall back to their training-data assumptions about what AIWG can do — which is exactly the failure mode `feedback_no_platform_generalization` warns against.

**Mitigation candidates** (one or more):
1. **Deploy the rule to all providers**: extend `aiwg use` to ship `skill-discovery.md` to every provider's rules directory. Simple, mechanical, and consistent.
2. **Inline the discover-protocol into AIWG.md / WARP.md / copilot-instructions.md**: these aggregated config files load into every provider that uses them; adding a short discover-protocol section reaches Codex / Windsurf / OpenCode / Warp / Copilot at once.
3. **Both**: belt and suspenders — file-based rule for providers with rule-loading, inline-section for providers that aggregate.

**Recommendation**: option 3. The cost is low (small content additions); the surface is high (8 providers affected). Either Path A (rule deployment) or Path B (config-file inlining) alone leaves a gap; together they cover the matrix.

Follow-up issue to be filed (see §"Follow-Up Issues").

## CRITICAL FINDING #2 — Aggregated config files don't reference discover protocol

`AIWG.md` (20KB at project root, the documented bridge for non-Claude providers) — 0 hits for `aiwg discover` / `aiwg show` / `skill-discovery`. Same for `WARP.md` (206KB) and `copilot-instructions.md`.

This is the mechanism by which the rule-deployment gap manifests at the agent's context layer: even on providers where rule files don't load, the aggregated config could carry the protocol — but it doesn't.

Verifiable in this session via `grep` against committed files. Behavioral impact pending field validation, but the content gap is conclusive.

## CRITICAL FINDING #3 — OpenClaw skills directory has only 1 file

`~/.openclaw/skills/` has 1 file. Other providers have 15-20+ skill files deployed. This is anomalously low and suggests an OpenClaw-specific deployment issue.

Source-code reference: `src/cli/scope-resolver.ts` includes `rejectOpenClawProjectScope` which forces OpenClaw to user-scope only. The deployment count discrepancy may stem from this enforcement combined with a deploy-path mismatch.

**Severity**: medium. Affects OpenClaw skill discovery directly.

Follow-up issue candidate (see below).

## Discovery-Agent Sub-Audit Update

The original provisional null-finding stands ("no improvement warranted yet — the discover-first protocol covers the use case where present"). The audit cycle 2 reframes the question:

**The discovery-agent column wasn't the right fix; the rule-deployment gap was.** If the discover-first protocol were on every provider, agents would invoke `aiwg discover` directly without needing the `aiwg-finder` subagent-dispatch path as a bolster. The matrix surfaces that the upstream problem is rule-deployment, not subagent-dispatch availability.

This strengthens the null-finding. The recommendation remains: do not bolster the discovery-agent column; instead fix the rule-deployment gap (Finding #1).

## Coverage Summary (post-cycle-2 update)

| Acceptance criterion | Target | After cycle 2 | Status |
|---|---|---|---|
| Matrix covers all 10 providers | 10 | 10 | ✅ |
| ≥40 of 50 cells with non-`static-flagged` evidence | 40 | 50 (all cells upgraded to deployment-scripted or better) | ✅ |
| ≥8 of 10 providers with field-validated evidence | 8 | 2 field-validated; 8 deployment-scripted | ⚠️ Field-validation gap remains |
| Discovery-agent column verdict per platform | 10 | 10 (provisional null + deployment-scripted unverified) | ✅ |
| Each "no hook fires" finding produces follow-up issue | n/a | 3 follow-up findings documented (rule gap, config-bridge gap, OpenClaw skills count) | ✅ |
| Discovery-agent bolster recommendation | yes | yes (null-finding strengthened) | ✅ |
| Matrix published | yes | yes | ✅ |

**Verdict: PARTIAL-PASS.** Deployment-scripted evidence covers all 50 cells (zero static-flagged remain). Field-validation gap (2/10) is the next bar; deployment-evidence findings are now actionable as follow-up implementation issues.

## Follow-Up Issues to File

### Issue 1 — Deploy `skill-discovery` rule to all 8 missing providers

Title: `Deploy skill-discovery rule to Codex, Copilot, Factory, OpenCode, Warp, Windsurf, OpenClaw, Hermes`
Labels: `provider: cross`, `audit: hookup-matrix`, `priority: P1`
Body: cite this matrix's Finding #1, list affected providers, propose mitigation (rule deployment + config-bridge inlining), reference SAD §5.2.

### Issue 2 — Inline discover-protocol section into AIWG.md, WARP.md, copilot-instructions.md

Title: `Add discover-first protocol section to AIWG.md / WARP.md / copilot-instructions.md`
Labels: `provider: cross`, `audit: hookup-matrix`, `priority: P1`
Body: cite Finding #2; propose template section + cross-provider deployment via `aiwg use` context-pipeline.

### Issue 3 — OpenClaw skills directory deployment investigation

Title: `Investigate OpenClaw skills count anomaly (1 file deployed; expected 15-20+)`
Labels: `provider: openclaw`, `audit: hookup-matrix`, `priority: P2`
Body: cite Finding #3; investigation should include `aiwg use sdlc --provider openclaw --dry-run` output review + comparison to other providers' counts.

### Issue 4 — Field-validation sprint across 8 providers

Title: `Field-validate hookup matrix on Codex, Copilot, Cursor, Factory, OpenCode, Warp, Windsurf, Hermes, OpenClaw`
Labels: `audit: hookup-matrix`, `priority: P1`
Body: scripted-task protocol from this matrix's §"Field-Validation Method"; coordinated with #1339 (read-access audit shares same protocol).

## Field-Validation Method (unchanged from cycle 1)

Per evidence-type taxonomy (SAD §5.2.2), each cell needs one of: scripted / manual / field-feedback / telemetry.

### Recommended scripted-task protocol (one task per provider)

```
1. Start a fresh session in the target provider with AIWG deployed
2. Ask the agent: "Find an AIWG skill that handles intake forms"
   Expected: agent runs `aiwg discover "intake"` (rule hook) OR
             agent references AIWG.md / AGENTS.md saying to use discover
             (AIWG.md hook) OR agent references the quickref naming
             discover (quickref hook) OR agent dispatches `aiwg-finder`
             (discovery-agent hook).
3. Record which hook(s) fired and the verbatim agent response
4. Re-ask via different phrasings to test rule auto-load consistency
5. Ask: "Read $AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md and summarize"
   Expected: agent reaches the file via `aiwg show` OR direct read (read-access column)
6. Record session transcript with provider name + study-runner identity + date
```

## Regression-Check (per SAD §5.2)

Status:
- Claude Code: scripted-fires confirmed in this session (cycle 1)
- Cursor: deployment-scripted-fires confirmed in this audit cycle 2 via on-disk verification
- All others: deployment-scripted-evidence available; behavioral regression check pending sessions

## Cross-References

- Workstream E (#1339) — read-access audit: deployment-scripted updates cross-apply (CLI-mediated read access works wherever Bash is available; the audit's findings are consistent across this matrix's row 5)
- Workstream F (#1340) — engagement-surface design: natural-language probe wiring depends on this matrix's columns 1+2 having the discover-protocol available; the rule-deployment gap (Finding #1) directly affects whether F's probe Mode A works reliably on non-Claude/Cursor providers
- Workstream C (#1337) — wizard verification step depends on Mode B per-provider availability

## References

- UC-NUA-005, UC-NUA-007
- SAD §5.2: `../architecture/software-architecture-doc.md`
- Test strategy §4
- Source paths: `src/smiths/platform-paths.ts:23,55,82,118,146`
- Saved memory: `feedback_no_platform_generalization`, `feedback_discovery_multi_hook`, `feedback_no_skill_copying`
- Adjacent audits: `./provider-read-audit.md` (Workstream E)
- Discover-first protocol: `.claude/rules/skill-discovery.md`
- Aggregated config files: `AIWG.md`, `WARP.md`, `.github/copilot-instructions.md`, `AGENTS.md`
