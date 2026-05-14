---
artifact_type: comms_draft
study: novice-user-adoption
workstream: D
related_adr: ADR-NUA-001
related_issue: "#1338"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Comms Drafts — ADR-NUA-001 (Global Install First-Class)

## Status

These are **drafts** for the project owner to send. The 5-day discussion window starts when these post, not when this file lands.

Saved-memory guardrails honored:
- `feedback_aiwg_engagement_state` — frame as broadening, not catching up
- `feedback_calver_full_versions` — use `2026.5.x`, no `v5`
- `feedback_aiwg_branding_restraint` — informative, not promotional

## Discord Draft

**Channel suggestion**: `#announcements` or `#aiwg`. Pin during the discussion window.

> **ADR-NUA-001 — global install (`aiwg use --scope user`) is staying first-class**
>
> Heads-up for anyone running AIWG globally (`aiwg use sdlc --scope user`, etc.): we're formalizing this as a fully-supported deployment mode. Project-scope (`.claude/agents/` etc.) remains the recommended default — that's where the strongest UX lives — but the global path will not be deprecated and will get hardening work this CalVer cycle.
>
> The decision rationale, alternatives weighed, and the cross-project context-bleed tradeoff (REF-720) are documented in the ADR: <link to ADR-NUA-001 in the study branch>.
>
> What's changing:
> - `2026.5.x` ships the Workstream B non-blocking project-isolation warning so first-time users running `aiwg use` from `$HOME` get a heads-up before deploying there.
> - Documentation will surface both scope models side-by-side with the cross-bleed evidence as the rationale for preferring project-scope as default.
> - A rough-edge inventory has been compiled; a follow-up implementation epic will work through hardening per provider.
>
> What we want from you:
> - If you run AIWG globally, does this decision serve your use case? Reply or DM. Five-day window, then the ADR moves from PROPOSED to ACCEPTED.
> - If you've hit specific rough edges on a specific provider, post them; the inventory is at `.aiwg/studies/novice-user-adoption/working/global-install-rough-edges.md`.

Word count: ~190. Fits a single Discord message comfortably.

## Telegram Draft

**Channel**: <https://t.me/+oJg9w2lE6A5lOGFh> (per CLAUDE.md support links).

Telegram channels handle longer messages but readers skim, so this version is tighter:

> **AIWG: global install is staying.**
>
> `aiwg use --scope user` (deploys to `~/.claude/`, `~/.codex/`, etc.) will remain a fully-supported deployment mode. Project-scope is still recommended as the default, but no deprecation is planned.
>
> Tradeoff in plain words: same `~/.claude/agents/` loads into every Claude Code session regardless of which project you're working in. Research (REF-720, MSR/Salesforce 2025) shows a 39% capability drop when context bleeds across unrelated tasks. The new Workstream B warning surfaces this at deploy time so you can decide.
>
> Full ADR + rough-edge inventory in the study branch under `.aiwg/studies/novice-user-adoption/`.
>
> Five-day discussion window. If you're a global-install user and this decision affects you, reply here or open an issue at <link>. Then the ADR baselines.

Word count: ~140.

## Cross-References to Add to Both Posts Before Sending

- Direct link to the ADR file on Gitea (or GitHub once mirrored): `https://git.integrolabs.net/roctinam/aiwg/src/branch/main/.aiwg/studies/novice-user-adoption/architecture/adr-global-install.md`
- Direct link to the rough-edge inventory: `https://git.integrolabs.net/roctinam/aiwg/src/branch/main/.aiwg/studies/novice-user-adoption/working/global-install-rough-edges.md`
- Issue link: `https://git.integrolabs.net/roctinam/aiwg/issues/1338`

## What Not to Say (Anti-Pattern Guardrails)

Per saved-memory rule `feedback_aiwg_branding_restraint`:
- Do NOT frame as "AIWG officially supports!" (promotional)
- Do NOT call this a "milestone" or "major decision" (over-dramatizes a status confirmation)
- Do NOT use emoji-laden hype framing

Per `feedback_aiwg_engagement_state`:
- Do NOT apologize for the gap between releases / Discord activity / etc. — the engagement state is already healthy. This is broadening, not catching up.

Per `feedback_no_platform_generalization`:
- Do NOT claim global install "works perfectly" anywhere — it has known rough edges; the inventory is the honest version

## Post-Comms ADR Transition Checklist

After ≥5 days of discussion:

1. Review responses for:
   - Strong objection from current global-install users → consider revising decision
   - New rough edges surfaced → add to inventory before baseline
   - Provider-specific concerns → flag for Workstream A coverage
2. If no blocking objection: update `adr-global-install.md` status from `PROPOSED` to `ACCEPTED`
3. Add a **Comms Plan Execution** section to the ADR with:
   - Discord post link
   - Telegram post link
   - Discussion window dates
   - Summary of discussion (1 paragraph)
   - Decision (accepted as-proposed / accepted-with-revisions / rejected)
4. Commit the ADR baseline with `Closes #1338` (or as a follow-up commit if #1338 was closed earlier on partial completion).

## References

- ADR-NUA-001: `../architecture/adr-global-install.md`
- Rough-edge inventory: `./global-install-rough-edges.md`
- Saved memory: `feedback_aiwg_engagement_state`, `feedback_calver_full_versions`, `feedback_aiwg_branding_restraint`, `feedback_no_platform_generalization`
- AIWG Discord: <https://discord.gg/BuAusFMxdA>
- AIWG Telegram: <https://t.me/+oJg9w2lE6A5lOGFh>
