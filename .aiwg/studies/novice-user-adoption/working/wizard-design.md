---
artifact_type: design_doc
study: novice-user-adoption
workstream: C
related_uc: UC-NUA-003
related_adr: ADR-NUA-003
related_issue: "#1337"
status: baselined
phase: construction
created: 2026-05-14
voice: technical-authority
---

# `aiwg wizard` — Onboarding Wizard Design

## Status

**Baselined design.** Implementation is a separate downstream epic per ADR-NUA-003 and UC-NUA-003. This document is the contract that epic must implement.

## Invocation

```
aiwg wizard [--non-interactive] [--profile <preset>] [--dry-run]
```

Top-level command per ADR-NUA-003. **Never** invoked implicitly by `aiwg use` — the wizard is opt-in by design.

## Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│ aiwg wizard                                                          │
│                                                                      │
│ 1. Detect providers      → 0 / 1 / N installed                       │
│ 2. Confirm primary       → user picks if N>1                         │
│ 3. Detect project root   → uses Workstream B signal walk             │
│ 4. Choose framework      → preset list w/ one-line descriptions      │
│ 5. Deploy                → aiwg use <fwk> --provider <p>             │
│ 6. Verify                → "ask your agent X" + status probe         │
│ 7. Hand off              → summary + cli-reference + quickref link   │
└─────────────────────────────────────────────────────────────────────┘
```

Four user-facing questions (provider, framework, project root, deploy-now). Steps 1, 3, 5, 6, 7 are non-interactive when they have enough context. Verification (step 6) is mandatory; the wizard does not exit successfully until it has either confirmation or an explicit user override.

## Detailed Steps

### Step 1 — Detect installed providers

**Source of truth**: same probes `aiwg doctor` and `aiwg runtime-info` use today (Claude Code CLI on PATH, `~/.codex/`, `.cursor/` markers, etc.).

**Outcomes**:

| Detected count | Wizard behavior |
|---|---|
| 0 | Show "no provider detected" with three install pointers (Claude Code, Codex, Cursor) and exit cleanly. User installs one and re-runs. |
| 1 | Skip provider question; proceed to step 3 with that provider as `primary`. Surface "detected: <name>" so the user can override. |
| N>1 | Proceed to step 2. |

**CW notes**: this step is invisible when 1 provider is installed (which is most users). The 0-case is the one to validate — a novice without any agent installed has the right experience here.

### Step 2 — Confirm primary provider (conditional, only when N>1)

**Question** (use platform-native AskUserQuestion if available, fallback to markdown list):

> "We detected multiple agents on this system. Which one do you primarily use?"

Options drawn from detected set. The user can also pick "all of them" — that's a known multi-provider workflow per the survey.

**CW notes**: jargon risk — "agent" vs "provider" vs "AI tool". Use "agent" in user-facing text (most familiar) and translate to provider internally.

### Step 3 — Project root detection / creation

**Reuses Workstream B's `detectProjectSignal()`.** Three branches:

| Detection result | Wizard behavior |
|---|---|
| Signal found in cwd or walk | Proceed silently with `cwd` as project root. Surface the detected signal ("found `.git/`") for confidence. |
| No signal, cwd is `$HOME` / `/` / `/tmp` | Offer two paths: (a) "I'll create a new project here" → prompt for project-name → `mkdir + git init + cd`; (b) "I'll point at an existing project" → prompt for path → `cd` and recurse. |
| No signal, cwd is something else | Surface "this looks like a non-standard location" and offer the same two paths plus a "use this directory anyway" override. |

**CW notes**: this step is the highest novice-friction point in the flow because directory-tree concepts are not universal. The wording "Where does your project live?" tests better than "Confirm project root" in informal testing during the survey. The design uses the former.

**Idempotency check**: if `.aiwg/aiwg.config` already exists, surface "AIWG is already set up here — want to re-deploy, change frameworks, or exit?" and branch.

### Step 4 — Framework selection

**Question** (use AskUserQuestion):

> "What are you working on?"

**Options** (each with a one-line description):

| Preset | Framework ID | One-line description |
|---|---|---|
| Software project | `sdlc` | Full software development lifecycle: requirements, architecture, testing, deployment |
| Research project | `research` | Paper acquisition, GRADE quality, citation graphs, provenance-tracked synthesis |
| Marketing project | `marketing` | Campaign intake, brand compliance, content production, approval workflows |
| Ops / infra | `ops` | Runbooks, inventory, audit trail, fleet management |
| Forensics / IR | `forensics` | Incident response, log analysis, evidence preservation, IOC extraction |
| Knowledge base / wiki | `knowledge-base` | KB ingest, semantic-memory kernel skills, llm-wiki profiles |
| Media curation | `media-curator` | Discography analysis, source discovery, acquisition, quality filtering |
| Security engineering | `security-engineering` | Crypto primitives, chain-of-trust, degraded modes |
| Show me everything | `all` | Deploy all of the above (heavy; recommended only after the first one) |
| I'll choose manually | — | Skip the deploy step; print `aiwg list` + cli-reference link |

**CW notes**:

- "What are you working on?" tests better than "Pick a framework" — domain language vs tool language.
- The "I'll choose manually" out is critical for power users who don't want the wizard to make this decision.
- "Show me everything" is the trap door for users who genuinely don't know yet — `aiwg use all` is heavy but lets them explore.

### Step 5 — Deploy

Run `aiwg use <chosen-framework> --provider <chosen-primary>` with `--non-interactive` so the wizard isn't re-entered.

If multiple providers were detected at step 1 AND the user picked "all of them" at step 2: run `aiwg use <chosen-framework>` for each provider in series, surfacing progress between each.

**Failure handling**: if `aiwg use` exits non-zero, the wizard reports the error verbatim, points at `aiwg doctor`, and exits 1. It does NOT attempt to "fix" a deploy failure — that's outside its scope.

**Dry-run mode**: `aiwg wizard --dry-run` runs steps 1-4 + a dry-run of step 5, prints what would be deployed, exits without writing.

### Step 6 — Verification probe (MANDATORY)

The wizard does not declare success without verification. Two probe modes:

**Mode A — interactive prompt for the user**:

> "AIWG is deployed. To confirm your agent has loaded the framework, open a new session with `<provider-name>` in this directory and ask:
>
> > Can you list the AIWG skills available for this project?
>
> Then come back here and press Enter."

After Enter: ask "Did the agent name specific AIWG skills (yes / no / partial)?" Branch:

- yes → step 7
- partial → "What was missing?" capture as known issue, proceed to step 7 with a soft warning
- no → "Let's debug" → run `aiwg doctor` → present findings + remediation pointer; exit 1 if doctor flags an error

**Mode B — automated probe (when supported)**: if the provider has a scriptable probe path (e.g., MCP probe for Hermes), the wizard runs it automatically and skips Mode A. Provider matrix in Workstream A determines availability.

**CW notes**: this step is the difference between Cursor's good wizard and Codex's "we're done" wizard. The novice doesn't know AIWG worked unless someone makes them check. The cost is 30 seconds; the value is "the user actually believes the tool works."

### Step 7 — Hand off

Print a summary:

```
✓ AIWG configured at <project-root>
✓ Framework: <framework> (<N> agents, <M> skills deployed)
✓ Provider: <primary-provider>

Next steps:
  • Read the framework quickref:  aiwg show skill <framework>-quickref
  • Browse all commands:          aiwg help
  • CLI reference:                docs/cli-reference.md
  • If something looks off:       aiwg doctor

To re-run this wizard later, just run `aiwg wizard`.
```

## Power-User Opt-Out Path

The wizard is opt-in via the explicit `aiwg wizard` invocation. Power users who want zero wizard interaction:

- `aiwg use sdlc --provider claude` — the canonical power-user path, completely bypasses the wizard
- The wizard never auto-invokes from `aiwg use`, `aiwg init`, or any other command
- `aiwg wizard --non-interactive` is a tested code path (used in CI for wizard regression tests); it uses defaults and emits no prompts

**Anti-pattern explicitly avoided**: prompting the user "do you want to run the wizard?" at the start of `aiwg use`. That's a Clippy moment; the survey makes clear (Continue's "would you like to run setup?" prompt) that this annoys power users more than it helps novices.

## Multi-Provider Degradation (NFR-COMPAT-01)

| Provider | Step 1 detection | Step 5 deploy | Step 6 verify |
|---|---|---|---|
| Claude Code | CLI on PATH | full | Mode A (Mode B pending) |
| Codex | `~/.codex/` markers | full (commands→prompts, AGENTS.md bridge) | Mode A |
| Copilot | `.github/copilot-*` or extension markers | full | Mode A |
| Cursor | `.cursor/` or extension markers | full | Mode A |
| Factory | `.factory/` markers | full | Mode A |
| Warp | `WARP.md` aggregation, `.warp/` markers | full | Mode A |
| Windsurf | `AGENTS.md` + `.windsurf/` | full | Mode A |
| OpenCode | `.opencode/` markers | full | Mode A |
| Hermes | MCP probe | full (kernel + standard split) | **Mode B available** |
| OpenClaw | `~/.openclaw/` markers | full (user-scope only) | Mode A |

Graceful degradation: if a provider isn't detected at step 1, the wizard offers manual selection rather than failing. If `aiwg use` succeeds but step 6's verification can't run (no Mode B + no human present in `--non-interactive`), the wizard surfaces "verification skipped — run a session manually to confirm" and exits 0 with a warning code (`exitCode 0`, but stderr notes the gap).

## Credential Surface Declaration

**Wizard's credential surface: `none`.**

The wizard does NOT handle, prompt for, store, or transmit any provider credentials. All credential management remains with the underlying provider CLI (Claude Code sign-in, Codex API key in `~/.codex/auth.json`, etc.).

If a provider's deployment requires credentials (none currently do for `aiwg use`), the wizard surfaces the requirement and points at the provider's docs — it does not collect.

**Per `token-security` rule**: no env-var-passed credentials; no command-line tokens; if any future surface requires a credential, it must go through file-based load with mode 0600. The wizard's credential surface stays `none` unless explicitly amended by a follow-up ADR.

## Anti-Pollution Checklist (per SAD §6.2)

The wizard MUST NOT introduce AIWG attribution in any user-generated artifact:

- ❌ No "Generated by AIWG" or "AIWG configured this project" in `.gitignore`, README, or any file the wizard creates
- ❌ No AIWG identification in git commit messages emitted by the wizard (the wizard does not commit; the user does)
- ❌ No AIWG-branded prefixes in agent output by default
- ❌ No persistent UI elements that surface AIWG identity without opt-in
- ✅ The wizard MAY write to `.aiwg/aiwg.config` (this is the AIWG project's own metadata, not user content)
- ✅ The wizard MAY emit a single "AIWG configured" success line to its own stdout — that's tool output, not pollution

**Verification**: the implementation epic must include a test asserting no wizard output writes "AIWG" or equivalent into any user-content file path.

## Cognitive Walkthrough — Primary Flow

For each step, four questions answered against a novice persona:

### Step 1 — Provider detection (invisible when N=1)

| Q | Answer |
|---|---|
| Right goal? | Implicit; no user action required when N=1. ✅ |
| Notice correct action? | n/a when invisible. ✅ |
| Associate action with effect? | n/a when invisible. ✅ |
| Visible progress? | When N=1, the "detected: <name>" line is the progress signal. ✅ |

**Friction count: 0.** Acceptable.

### Step 2 — Provider confirmation (when N>1)

| Q | Answer |
|---|---|
| Right goal? | "Pick the agent you use most" maps to a goal the user has. ✅ |
| Notice correct action? | Native picker (AskUserQuestion) makes selection obvious. ✅ |
| Associate action with effect? | The user may not know which name corresponds to which provider on disk — minor. ⚠️ |
| Visible progress? | Yes — selection echoes back. ✅ |

**Friction count: 1 (uncertain).** Resolution: include a one-line description per option (e.g., "Claude Code — Anthropic's terminal CLI").

### Step 3 — Project root

| Q | Answer |
|---|---|
| Right goal? | The user wants to deploy AIWG; pointing at a project is the obvious means. ✅ |
| Notice correct action? | "Where does your project live?" is concrete. ✅ |
| Associate action with effect? | Novices may not have a concept of "project root" — moderate. ⚠️ |
| Visible progress? | Yes — detection result echoes back. ✅ |

**Friction count: 1 (moderate).** Resolution: when the user picks "create a new project here", offer to run `git init` for them — that's the universal "this is a project" signal and removes the conceptual confusion.

### Step 4 — Framework selection

| Q | Answer |
|---|---|
| Right goal? | "What are you working on?" reframes the question in user-native terms. ✅ |
| Notice correct action? | Native picker with descriptions. ✅ |
| Associate action with effect? | Domain-language presets ("Software project") are associable. ✅ |
| Visible progress? | Yes — selection echoes back; deploy step starts immediately. ✅ |

**Friction count: 0.** Acceptable.

### Step 5 — Deploy

| Q | Answer |
|---|---|
| Right goal? | No question — deploy proceeds. ✅ |
| Notice correct action? | n/a (no action required). ✅ |
| Associate action with effect? | Status output names files created. ✅ |
| Visible progress? | Yes — `aiwg use` already produces progress output. ✅ |

**Friction count: 0.** Acceptable.

### Step 6 — Verification

| Q | Answer |
|---|---|
| Right goal? | The user wants confidence AIWG works; the probe matches. ✅ |
| Notice correct action? | Explicit instruction: "open a session and ask X." ✅ |
| Associate action with effect? | "Ask agent → see AIWG skills named" is associable, but requires user to switch contexts (terminal → agent → terminal). ⚠️ |
| Visible progress? | Yes — user reports yes/no/partial. ✅ |

**Friction count: 1 (uncertain).** Resolution: include the literal prompt to paste so the user doesn't have to compose one. The design already does (the "Can you list the AIWG skills…" line is copy-paste-ready).

### Step 7 — Hand off

| Q | Answer |
|---|---|
| Right goal? | The user wants to know what to do next; the summary delivers. ✅ |
| Notice correct action? | Three next-step bullets are visible. ✅ |
| Associate action with effect? | Each bullet maps to a concrete command. ✅ |
| Visible progress? | Yes — wizard exits with success. ✅ |

**Friction count: 0.** Acceptable.

### Total friction count for primary flow: **3 across 7 steps** — within NFR-USE-02's ≤2-per-step bound.

## Cognitive Walkthrough — Power-User Opt-Out Path

### Power user runs `aiwg use sdlc --provider claude` directly

| Q | Answer |
|---|---|
| Right goal? | The user has bypassed the wizard. ✅ |
| Notice correct action? | n/a (no wizard surface to notice). ✅ |
| Associate action with effect? | `aiwg use` produces its standard output. ✅ |
| Visible progress? | Yes — `aiwg use`'s existing progress signals. ✅ |

**Friction count: 0.** The wizard is invisible to power users by design.

### Power user runs `aiwg wizard --non-interactive` for CI

| Q | Answer |
|---|---|
| Right goal? | Reproducible wizard run in CI. ✅ |
| Notice correct action? | Documented flag. ✅ |
| Associate action with effect? | Wizard uses defaults; no prompts. ✅ |
| Visible progress? | Yes — wizard's normal stdout. ✅ |

**Friction count: 0.** Power-user opt-out is intact.

## Walkthrough Friction Summary

| Step | Friction items | NFR-USE-02 budget (≤2) |
|---|---|---|
| 1 — provider detect | 0 | ✅ |
| 2 — provider confirm | 1 (jargon: provider vs agent) | ✅ |
| 3 — project root | 1 (conceptual: project root) | ✅ |
| 4 — framework | 0 | ✅ |
| 5 — deploy | 0 | ✅ |
| 6 — verify | 1 (context switch: terminal → agent → terminal) | ✅ |
| 7 — handoff | 0 | ✅ |
| Power-user direct path | 0 | ✅ |
| Power-user `--non-interactive` | 0 | ✅ |

**All steps within ≤2 friction budget. Three "uncertain" findings have concrete mitigations in the design.**

## Acceptance Summary

| Acceptance criterion | Status |
|---|---|
| Pattern survey published | ✅ `./wizard-survey.md` |
| Wizard design doc baselined | ✅ This document |
| Cognitive Walkthrough record with ≤2 friction per step | ✅ Above; max friction is 1 per step in the primary flow |
| Walkthrough covers primary AND power-user opt-out | ✅ Both walked |
| Multi-provider degradation across all 10 providers | ✅ Matrix in §"Multi-Provider Degradation" |
| Credential surface explicitly declared | ✅ `none` |
| Anti-pollution checklist included | ✅ Per SAD §6.2 |

## Dependencies for Downstream Implementation Epic

- Workstream B (#1335) — provides `detectProjectSignal()` for step 3. ✅ Already complete.
- Workstream F (#1340) — provides the verification probe specification for step 6's Mode B. The wizard design references "Mode B available where provider supports a scriptable probe"; the actual probe contract comes from F.
- Workstream A (#1336) — provides the per-provider hookup matrix that decides which providers can support Mode B verification automatically.

The wizard design ships with Mode A as the universal fallback so it doesn't block on F or A completing.

## References

- UC-NUA-003: `../requirements/UC-NUA-003-onboards-via-wizard.md`
- ADR-NUA-003: `../architecture/adr-wizard-invocation.md`
- Pattern survey: `./wizard-survey.md`
- SAD §4.1.1, §6.2, §6.5
- Test strategy §5
- Wharton et al. (1994) — Cognitive Walkthrough method
- `feedback_aiwg_branding_restraint`, `feedback_native_ux_tools` saved memories
