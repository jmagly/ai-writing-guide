# AIWG.md
<!-- aiwg-managed -->
<!-- Normalized project-local AIWG context. Operator notes may live outside AIWG-managed blocks. -->

This file is the stable `.aiwg/AIWG.md` entry point for AIWG skills, rules, and generated provider context.

<!-- aiwg-context-finalization:START -->
## Context Finalization

This section is synthesized after template emission from the current workspace state. Preserve operator-authored content outside AIWG-managed blocks; rerun `aiwg regenerate` to refresh this section after provider, framework, or MCP wiring changes.

### Workspace Snapshot

- Configured providers: claude, codex
- Installed frameworks/addons: sdlc, media-marketing, all, security-engineering
- Recorded deployments: claude, codex, copilot, cursor, factory, hermes, openclaw, opencode, warp, windsurf
- Normalized project context: `.aiwg/AIWG.md`

### Discover-First Protocol

Before declining an AIWG request as out of scope or inventing a workflow from memory, run `aiwg discover "<the user need>"`. The CLI ranks AIWG capabilities across the installed corpus. Fetch the selected item with `aiwg show <type> <name>`. This prevents decline-without-search failures and hallucinated skill or agent names. Full rule: `agentic/code/addons/aiwg-utils/rules/skill-discovery.md`.

### Engagement Verification

When a user asks whether AIWG is active or engaged in this project, run or read `aiwg status --probe --json` and report the result plainly: engaged state, project root, deployed provider files, installed frameworks/addons, and the next action from the probe. Do not add AIWG attribution, signatures, generated-by text, or passive footers to user files, commits, PRs, comments, code headers, or docs.

### Source Model

- `.aiwg/AIWG.md` is the normalized project-local context entry point.
- Root `AIWG.md` is the generated cross-provider companion loaded through `AGENTS.md` and provider twins.
- `AGENTS.md`, `WARP.md`, `.hermes.md`, and `.github/copilot-instructions.md` are provider-facing bridges, not replacements for `.aiwg/AIWG.md`.
<!-- aiwg-context-finalization:END -->
