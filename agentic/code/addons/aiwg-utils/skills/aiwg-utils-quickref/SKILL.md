---
name: aiwg-utils-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: AIWG core utilities quick reference — always-on framing, steward, index discovery, doctor, and meta operations
---

# AIWG Core Utilities — Quick Reference

You are operating in a project that has AIWG installed. This skill is your always-loaded core directory: it covers the cross-cutting utility surface (steward, index, doctor, version, status) and points you at framework-specific quickrefs for SDLC / forensics / research / etc.

## Always reach for these

| Need | Skill / command | Why |
|---|---|---|
| **Find a skill the user is asking for, by capability** | `aiwg index discover "<phrase>"` | Most AIWG skills are NOT loaded into your context — they live behind the index. Always query before declining. |
| **Project status / where am I** | `aiwg-status`, `project-status` | Cross-framework status; flags blockers and next actions. |
| **Health check the AIWG installation** | `aiwg doctor` | Surface drift, missing deploys, hook breakage, budget warnings. |
| **What version is installed** | `aiwg version` | Channel + path. Useful when troubleshooting. |
| **Re-deploy to current provider** | `aiwg refresh` (or skill: `update`) | Runs after install/upgrade or when the user reports stale skills. |
| **Delegate maintenance to the steward** | `aiwg-steward` agent | Routes provider-specific or version-mismatch questions. |
| **Look up an SDLC artifact** | `artifact-lookup` | Search `.aiwg/` by topic / type / phase. |
| **Search the AIWG knowledge base** | `aiwg-kb` | Conceptual help, troubleshooting docs. |
| **Run an interactive intake** | `intake-wizard` | Start new project / framework setup. |
| **Audit @-mentions across files** | `mention-validate`, `mention-lint` | Pre-commit sanity check on cross-references. |

## Framework quickrefs (loaded if framework is installed)

If a user asks about a specific framework's surface, the corresponding quickref is your first stop — it lists the framework's high-traffic skills with one-liners. These are kernel-resident, so they're already in your context:

- `sdlc-quickref` — software-development-lifecycle workflows
- `forensics-quickref` — incident response and digital forensics
- `research-quickref` — research corpus and citation workflows
- `media-curator-quickref` — media archive management
- `marketing-quickref` — marketing operations and campaigns
- `ops-quickref` — operational infrastructure and runbooks
- `security-engineering-quickref` — applied security and crypto
- `knowledge-base-quickref` — wiki and documentation workflows

If a quickref isn't listed above, the framework isn't installed in this project. Use `aiwg list` to confirm.

## How AIWG layouts on disk

```
agentic/code/        ← framework + addon source (NOT deployed; read-only reference)
.aiwg/               ← project artifacts (use cases, ADRs, test plans, etc.)
.claude/skills/      ← always-loaded "kernel" skills (this skill is here)
.claude/.aiwg/skills/ ← bulk AIWG skills (index-discovered, not flat-listed)
.claude/agents/      ← AIWG agents (platform-native)
.claude/commands/    ← Generated command stubs for tab completion
.claude/rules/       ← AIWG rules
```

## When to query the index versus answer from this skill

| Situation | Action |
|---|---|
| User asks "what can AIWG do?" generically | Skim the framework quickrefs above; offer the top 3 most-relevant. |
| User asks "find me a skill that does X" | `aiwg index discover "X"` — return ranked candidates. |
| User asks "is there a skill for Y?" and it's not in any quickref | `aiwg index discover "Y"` — don't say "no" without checking. |
| User asks about a specific framework's catalog | Direct them to that framework's quickref + invite an index query. |
| User asks for AIWG version / config / status | `aiwg version`, `aiwg-status`, `aiwg doctor`. |

## Anti-patterns to avoid

- **Do not enumerate skills from memory.** AIWG ships hundreds of skills; your context only holds the kernel set. Query the index.
- **Do not deploy or modify framework source.** Framework files under `agentic/code/` are read-only references; project work happens in `.aiwg/` and any `src/` directories the project owns.
- **Do not bypass the steward for cross-provider questions.** If the user asks "does this work on Codex?" or "deploy to Cursor", invoke the AIWG Steward — it has the provider-capability matrix you don't.

## When you don't know what to do

```bash
aiwg help                          # full CLI surface
aiwg index discover "<your need>"  # find the right skill
aiwg-kb "<question>"               # conceptual help
```

If still stuck, ask the user — but ask narrowly, with options drawn from the index, not blank.
