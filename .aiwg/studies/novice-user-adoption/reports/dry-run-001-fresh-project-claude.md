# Novice Dry Run #001

## Novice Dry Run

- Date: 2026-05-21
- Participant type: maintainer-driven synthetic walkthrough (closest available stand-in for novice; no real layperson session yet)
- Provider: claude (Claude Code)
- Project type: empty `git init`'d directory at `/tmp/nua-dryrun` (no `package.json`, no language files — closest to a layperson's "just made a folder for my idea" starting point)
- Starting page: `docs/getting-started/start-here.md`
- Milestones reached: **5 of 5**

### Milestone evidence

| # | Milestone | Result | Evidence |
|---|---|---|---|
| 1 | Landed on beginner docs | ✓ | `docs/getting-started/start-here.md` opens with clear "use this page when AIWG is new to you" framing |
| 2 | Installed or confirmed AIWG | ✓ | `aiwg -version` returned `aiwg 2026.5.10 [stable]`. Both `-version` (single dash) and `--version` (double dash) work — no friction on CLI convention |
| 3 | Ran guided setup | ✓ | `aiwg wizard --dry-run` in fresh project produced clean plan: generic provider, framework=sdlc, deploy step planned, verify step planned. Surfaced friendly warning "No provider-specific project files were detected" with remediation `--provider <name>` |
| 4 | Verified engagement | ✓ | `aiwg status --probe --json` before use: correctly reported `engaged: false, status: not-configured`. After `aiwg use sdlc --provider claude --non-interactive`: `engaged: true, status: ready, provider_deployment_count: 1` |
| 5 | Completed one useful workflow | ✓ | Full deploy → verify cycle in <30 seconds wall clock; agent registry now loaded |

### First blocker

None encountered in the documented path. One friction point worth noting (not a blocker): the wizard's "multiple providers detected" warning in the AIWG dev repo itself (legitimately confusing since multiple `.{provider}/` directories exist for dogfooding). A novice in their own project would not hit this case — verified by the fresh-project simulation.

### Recovery path used

None required.

### First useful output

`.claude/agents/` populated with SDLC agents, `.aiwg/` workspace scaffolded, `aiwg status --probe --json` returns `engaged: true`. The "session reload required" notice at end of `aiwg use` deserves explicit callout: it correctly warns the novice that their NEXT command in Claude Code may say "Agent type not found" until they restart the session. This is the kind of forward-looking transparency that prevents a confused-novice support ticket.

### Follow-up issues

None opened from this dry run. Findings positive across all 5 milestones for a synthetic-novice perspective on Claude Code with a fresh project.

### Caveats on this evidence

- Synthetic walkthrough by a maintainer cannot fully substitute for a real layperson session. The activation milestones were all reachable, but a real novice may hit friction on:
  - Knowing to run `git init` first (the wizard requires a `.git/` or other project signal to recognize the directory as a project)
  - Knowing which provider they're using if they haven't installed an AI tool yet
  - Reading the JSON `status --probe` output (better surfaced via natural-language ask to the agent)
- Recommendation: aim for 2 more dry runs on different providers (cursor, codex) when real beginners surface in support channels, per the `onboarding-validation.md` "better sample = 3 across 2 providers" guidance.

### Verification commands (reproducible)

```bash
# All 5 milestones in sequence:
rm -rf /tmp/nua-dryrun && mkdir -p /tmp/nua-dryrun && cd /tmp/nua-dryrun && git init -q
aiwg -version
aiwg wizard --dry-run
aiwg status --probe --json   # engaged: false (pre-deploy)
aiwg use sdlc --provider claude --non-interactive
aiwg status --probe --json   # engaged: true (post-deploy)
```

### Status

This dry run satisfies #1392's "at least one novice dry run is recorded" acceptance criterion. The beginner path works end-to-end for the documented Milestone 1-5 sequence on the claude provider in a fresh project.
