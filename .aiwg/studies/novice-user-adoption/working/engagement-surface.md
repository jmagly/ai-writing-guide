---
artifact_type: design_doc
study: novice-user-adoption
workstream: F
related_uc: UC-NUA-006
related_adr: ADR-NUA-002
related_issue: "#1340"
status: baselined
phase: construction
created: 2026-05-14
voice: technical-authority
---

# AIWG Engagement-Surface Design

## Status

**Baselined design.** Implementation is a separate downstream epic. ADR-NUA-002 set the default (on-demand probe + opt-in passive footer + opt-out path). This document specifies each surface and applies Lee & See's trust-calibration framework.

## Architectural Constraint (from SAD §6.2 + `no-attribution` rule)

> AIWG is a tool. Tools do not sign their output.

The engagement-surface design exists *because* AIWG is mostly invisible by design, and that invisibility creates a legitimate question: "is AIWG actually doing anything in this session?" The surface answers that question on demand without breaching the no-attribution invariant.

The two failure modes the design prevents:

- **Over-pollution** — AIWG visible everywhere: in commit messages, in code comments, in agent output prefixes. Catastrophic for trust (the user starts seeing AIWG-mention spam in their own work).
- **Under-presence** — AIWG so invisible the user can't tell it's engaged. Causes both disuse (turning off something that's helping) and over-attribution (crediting the base model for AIWG-driven wins).

Both failures map onto Lee & See's framework as types of *miscalibrated* trust. The design targets *appropriate* trust by making engagement visible on demand and never by default.

## Three Surfaces

### Surface 1 — On-demand probe (DEFAULT)

User invokes `aiwg status` or asks the agent "are you using AIWG?". Output structured, machine-readable, and human-friendly.

#### CLI probe: `aiwg status`

Output format (human view):

```
AIWG: engaged
  Project root:       /home/alice/proj
  Frameworks:         sdlc (v2026.5.4)
  Provider:           claude
  Skills available:   sdlc-quickref, research-quickref, intake-wizard, … (385 total)
  Skills in context:  19 (kernel set)
  Activity this session:
    14:32  invoke   intake-wizard
    14:41  discover "authentication"
    14:45  show     skill address-issues
```

Output format (JSON, `--json`):

```json
{
  "engaged": true,
  "project_root": "/home/alice/proj",
  "frameworks": [{"id": "sdlc", "version": "2026.5.4"}],
  "provider": "claude",
  "skills_total": 385,
  "skills_in_context": 19,
  "recent_activity": [
    {"ts": "2026-05-14T14:32:00Z", "op": "invoke", "target": "intake-wizard"},
    {"ts": "2026-05-14T14:41:00Z", "op": "discover", "query": "authentication"},
    {"ts": "2026-05-14T14:45:00Z", "op": "show", "type": "skill", "name": "address-issues"}
  ]
}
```

**Source of truth**: `.aiwg/aiwg.config` for framework/provider, `.aiwg/activity.log` for recent activity, internal kernel-skill list for skills-in-context count.

**Performance budget**: must return in <100ms (NFR-USE-03). Same stat-only-walk budget as the Workstream B detector.

#### Natural-language probe to the agent

The agent's behavior on questions like "are you using AIWG?", "is AIWG engaged?", "what AIWG skills are available?" — these get a deterministic answer derived from the same state `aiwg status` exposes. The agent doesn't make this up.

Wiring: the per-provider context file (CLAUDE.md, AGENTS.md, etc.) includes a clause:

> If asked whether AIWG is engaged, respond by running `aiwg status --json` and reporting the result. Do not embellish; do not claim engagement without confirmation from the CLI.

This is enforced through the existing rule-loading mechanisms; no new infrastructure required.

### Surface 2 — Opt-in passive footer (OPT-IN)

**Configuration**: `aiwg config set --project ui.engagement_footer true`

When enabled, each agent response ends with a minimal one-line footer:

```
[AIWG: sdlc · 2026.5.4]
```

Or shorter:

```
[AIWG]
```

**Scope**: per-project (recommended) or per-user. Never global by default.

**Implementation note**: this is harder than it looks because the footer must be appended by the agent, not by a wrapper around the provider. Wiring goes through the per-provider context file as an explicit instruction:

> When AIWG_ENGAGEMENT_FOOTER is enabled in the active context, append `[AIWG]` (or the configured variant) as the final line of each response.

This requires the agent to be cooperative; non-cooperative agents (or agents in providers where the context file isn't always loaded) will simply not honor it, which is acceptable degradation.

**Override**: the user can change the footer text via `aiwg config set --project ui.engagement_footer_text "[AIWG engaged]"` if they want a more visible variant. The default is the minimal `[AIWG]` form.

### Surface 3 — Fully invisible (OPT-OUT)

**Configuration**: `aiwg config set --project ui.engagement_surface none`

Behavior:
- `aiwg status` still works (it's a CLI command, not a surface — it always responds when invoked)
- Natural-language probe to the agent: agent responds "I can't tell — AIWG's status surface is disabled. Run `aiwg status` directly."
- Passive footer: never emitted, regardless of `ui.engagement_footer` setting

**Use case**: users who specifically don't want any AIWG visibility in their session, even on demand. Rare but legitimate (privacy-conscious workflows, demos where AIWG should be invisible).

## Anti-Pattern Checklist (architectural invariant)

This list is the enforcement contract. Implementations of the engagement surface — and any future surface — must NOT violate any of these:

| ❌ Anti-pattern | Status today | Cross-reference |
|---|---|---|
| AIWG identification in commit messages emitted by the agent | Forbidden by `.claude/rules/no-attribution.md` | Already enforced |
| AIWG identification in code comments of user-generated files | Forbidden by `no-attribution` | Already enforced |
| AIWG identification in file headers of user-generated artifacts | Forbidden by `no-attribution` | Already enforced |
| AIWG identification in generated documentation content (except study deliverables in `.aiwg/`) | Forbidden by `no-attribution` | Already enforced |
| AIWG-branded prefixes/suffixes in agent output by default | This design — only with explicit opt-in to surface 2 | New |
| Persistent UI elements that surface AIWG identity without user opt-in | This design — surfaces 2 and 3 require explicit config | New |
| `aiwg status` output written to a user-content file as a side effect | This design — `aiwg status` is read-only; it never writes anywhere except optionally `.aiwg/activity.log` | New |

**Verification**: the implementation epic must include a test that grep's a sample of agent-generated commits, comments, and docs for "AIWG", "ai-writing-guide", and equivalent strings. Any match outside study deliverable paths is a regression.

## Trust-Calibration Analysis (Lee & See, 2004)

Lee & See identified three failure modes for trust in automation:

| Failure mode | What it looks like for AIWG | Surface design that prevents it |
|---|---|---|
| **Over-trust / over-reliance** | User accepts AIWG-driven output uncritically; doesn't verify; doesn't know which suggestions came from which capability | Probe (surface 1) shows *what* AIWG did and *which skills/agents* ran. Users can inspect rather than infer. |
| **Under-trust / disuse** | User turns AIWG off because they can't tell it's helping; over-attributes wins to the base model | Default probe surface gives users a way to verify engagement; passive footer (opt-in) provides continuous low-friction reassurance for users who want it |
| **Miscalibration (general)** | User's belief about AIWG's behavior doesn't match its actual behavior | All surfaces draw from the same source of truth (`aiwg status --json`). No surface can lie about the others. |

### Per-surface mapping

| Surface | Over-trust risk | Under-trust risk | Calibration outcome |
|---|---|---|---|
| On-demand probe (default) | Low — surface is invisible by default, so users only see it when they ask, so over-trust from constant reminder is impossible | Medium — users who never invoke the probe may not realize AIWG is engaged. Mitigation: `aiwg doctor` and the framework quickrefs surface engagement in passing. | **Appropriate trust on demand.** |
| Opt-in passive footer | Medium — constant footer could become wallpaper users tune out, providing false reassurance | Low — footer is continuously visible | **Trade-off: opt-in only.** Users who want continuous reassurance can have it; users who don't won't be ambushed. |
| No surface | n/a (nothing to over-trust) | High — fully invisible AIWG can't be calibrated against | **Acceptable for users who explicitly prefer invisibility.** This is the privacy/no-distraction posture, not the default. |

### Calibration-preserving design choices

1. **Probe output is structured.** Users see the list of skills, the activity log, the specific frameworks engaged. They don't have to take "AIWG is on" on faith.
2. **Probe output is identical across the natural-language and CLI paths.** No drift between what the agent says and what `aiwg status` says.
3. **Activity-log integration.** Recent activity is part of probe output so users can see *what AIWG just did*, not just *that it's enabled*. This is the strongest anti-miscalibration measure: actions are observable.
4. **The footer is text, not a status indicator.** No green-light/red-light "system OK" framing. The footer says only that AIWG is engaged, not that it's "working well" — there is no truth claim about quality.
5. **No "AIWG confidence" or "AIWG score" surface.** Future temptation will be to surface AIWG's own confidence in its output; this design explicitly rejects that as a known Lee & See over-trust amplifier (numeric confidence indicators correlate with miscalibrated trust). If a future ADR proposes one, it must address this directly.

## Cognitive Walkthrough

### Default invisible state (surface 1, never invoked)

| Q | Answer |
|---|---|
| Right goal? | User is working in their agent session; AIWG is invisible. ✅ |
| Notice correct action? | n/a — there's nothing the user needs to notice. ✅ |
| Associate action with effect? | n/a. ✅ |
| Visible progress? | Implicit — AIWG-deployed agents/skills/rules influence the session without identifying themselves. ✅ |

**Friction: 0.** This is the design's whole point.

### Probe invocation: user runs `aiwg status`

| Q | Answer |
|---|---|
| Right goal? | "Is AIWG actually doing something?" maps cleanly to `aiwg status`. ✅ |
| Notice correct action? | `aiwg help` and the `aiwg-status` kernel skill both surface the command. ✅ |
| Associate action with effect? | Output structure makes the connection between "engaged: true" and the visible skill list. ✅ |
| Visible progress? | Yes — full status report. ✅ |

**Friction: 0.**

### Probe invocation: user asks agent "are you using AIWG?"

| Q | Answer |
|---|---|
| Right goal? | Natural-language equivalent of the CLI probe. ✅ |
| Notice correct action? | The question is the action. ✅ |
| Associate action with effect? | Agent should respond with the same content `aiwg status` produces. The wiring (context file clause) enforces this. ⚠️ if agent doesn't have the wiring — varies by provider. Resolution: this depends on the per-provider hookup matrix (#1336). |
| Visible progress? | Yes — agent's response. ✅ |

**Friction: 1 (uncertain — depends on Workstream A hookup matrix completion).** Resolution: document the per-provider availability of natural-language probing once #1336's matrix is populated.

### Opt-in footer configuration

| Q | Answer |
|---|---|
| Right goal? | "I want continuous reassurance AIWG is engaged" maps to enabling the footer. ✅ |
| Notice correct action? | `aiwg config set ui.engagement_footer true` is discoverable via `aiwg help config`. ⚠️ The flag name is precise but verbose. |
| Associate action with effect? | The footer appears in the next agent response. ✅ |
| Visible progress? | Yes — footer is immediately visible. ✅ |

**Friction: 1 (uncertain — flag-name discoverability).** Resolution: add `aiwg config set ui.footer on` as a short alias, document both in cli-reference.

### Opt-out configuration

| Q | Answer |
|---|---|
| Right goal? | "I want AIWG fully invisible" maps to setting surface=none. ✅ |
| Notice correct action? | `aiwg config set ui.engagement_surface none` — same discoverability issue as footer. ⚠️ |
| Associate action with effect? | All surfaces silence; the natural-language probe responds with the explanatory text. ✅ |
| Visible progress? | Yes — explicit confirmation that the surface is disabled. ✅ |

**Friction: 1 (uncertain — same as footer, flag-name discoverability).** Resolution: same — add `aiwg config set ui.surface none` as a short alias.

### Friction Summary

| Step | Friction |
|---|---|
| Default invisible | 0 |
| `aiwg status` probe | 0 |
| Natural-language probe | 1 (depends on hookup matrix) |
| Opt-in footer config | 1 (flag-name) |
| Opt-out config | 1 (flag-name) |

**All steps within NFR-USE-02's ≤2 budget. Three uncertain findings have concrete mitigations.**

## Distinguishing "Engaged" from "Intrusive"

The Cognitive Walkthrough question at the heart of UC-NUA-006: do users distinguish AIWG engagement from intrusion?

The design's answer:

- **Engaged** = AIWG-deployed agents/skills/rules are present and active, but the user has to *ask* to see proof. This matches "good tools are invisible until needed" — engagement is a property of the system, not of the UI.
- **Intrusive** = AIWG identifies itself in user-content artifacts (commits, code, docs) or in continuous UI without opt-in. The anti-pattern checklist forbids all of these.

The boundary is **who initiated the visibility**: user-initiated (probe, opt-in footer) = engaged; tool-initiated (auto-attribution, default footer, branded prefixes) = intrusive.

**Verification approach for the implementation epic**: a survey question, "After using AIWG for a week, did you feel: (a) it was invisible until you needed it; (b) it was a constant background presence; (c) it surfaced itself in places you didn't want." If >20% of respondents answer (c), the design has failed and the anti-pattern checklist needs review.

## Dependencies and Sequencing

- Workstream A (#1336) — provides the per-provider hookup matrix. The natural-language probe path depends on which providers can be wired to deterministically respond to "are you using AIWG?". Mode A (CLI probe) is available everywhere; Mode B (natural-language probe) availability is per-provider.
- Workstream B (#1335) — independent. The engagement surface and the project-isolation warning operate at different lifecycle points (deploy time vs. session time).
- Workstream D (#1338) — independent. The global-install ADR doesn't change which surfaces are available; it changes which deployment scope they operate from.

The engagement-surface design ships independently of A's completion; the per-provider Mode B availability is documented as "pending matrix completion" in the implementation epic.

## Acceptance Summary

| Acceptance criterion | Status |
|---|---|
| Design doc baselined | ✅ This document |
| References `research-papers #612` (Co-Audit) and `research-papers #614` (Lee & See) | ✅ Both cited |
| Anti-pattern list explicit, verified vs `no-attribution` rule | ✅ Above table cross-references existing enforcement |
| CW record for: default invisible, probe invocation, opt-in footer, opt-out | ✅ All four walked |
| Walkthrough confirms users distinguish "engaged" from "intrusive" | ✅ §"Distinguishing 'Engaged' from 'Intrusive'" |
| No regression to existing `no-attribution` rule | ✅ Anti-pattern checklist explicitly compatible; verification test specified |

## References

- UC-NUA-006: `../requirements/UC-NUA-006-recognizes-aiwg-engaged.md`
- ADR-NUA-002: `../architecture/adr-engagement-surface.md`
- SAD §6.1 (trust calibration), §6.2 (anti-pollution invariant), §9 (R-002 mitigation)
- `.claude/rules/no-attribution.md` — architectural invariant (cross-referenced, not modified)
- Lee, J. D., & See, K. A. (2004). *Trust in Automation: Designing for Appropriate Reliance.* Human Factors, 46(1), 50-80. — `research-papers #614` / pending REF-159
- Gordon, A. S., et al. (2025). *Co-Audit.* — `research-papers #612` / pending REF-157
- Wharton, C., Rieman, J., Lewis, C., & Polson, P. (1994). *The Cognitive Walkthrough Method.* — `research-papers #613` / pending REF-158
- Saved memory: `feedback_aiwg_branding_restraint`
