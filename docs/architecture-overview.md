# AIWG Architecture Overview

> **Version**: 2026.5.0+
> **Audience**: Developers, technical leads, CISOs, anyone wanting a visual mental model of AIWG before reading the deeper guides
> **Status**: Mermaid versions inline; polished Gemini-rendered images in `architecture-overview/images/` (placeholders below — see [#1248](https://git.integrolabs.net/roctinam/aiwg/issues/1248) for the prompt set)

This document is the visual entry point for understanding what AIWG is, what it does at deploy time, what it does at runtime, and what's optional. Each section pairs a MermaidJS diagram (renders inline in markdown) with a placeholder for a polished Gemini-generated illustration (drop in `./architecture-overview/images/NN-name.png` and the markdown picks it up).

Deeper guides:

- [`docs/how-it-works.md`](how-it-works.md) — prose walkthrough of the same concepts
- [`docs/discovery-and-kernel-skills.md`](discovery-and-kernel-skills.md) — kernel-vs-standard skill model in depth
- [`docs/integrations/hermes-quickstart.md`](integrations/hermes-quickstart.md) — Hermes-specific integration

---

## 1. AIWG is a deploy-time tool — runtime-invisible

`aiwg use` runs once, copies plain-text files into the directories your AI platform reads, builds an artifact index, and exits. Nothing AIWG produces is a daemon, a service, or a network listener. Once the files land, your platform's native loader handles everything — AIWG can step out of the way.

```mermaid
flowchart LR
  subgraph Source["AIWG framework source"]
    direction TB
    KERN[16 kernel skills<br/>~15-25k tokens]
    STD[~385 standard skills<br/>read from $AIWG_ROOT]
    AGENT[200+ agents]
    RULES[60+ rules]
    TPL[100+ templates]
  end

  CLI([aiwg use sdlc<br/>--provider X]) --> DEPLOY

  subgraph DEPLOY["Deploy step (one-shot)"]
    direction TB
    COPY[Copy kernel skills, agents,<br/>rules to provider-native dirs]
    INDEX[Build artifact index<br/>~/.local/share/aiwg/index/]
    CTX[Emit AIWG.md + AGENTS.md<br/>at project root]
  end

  Source --> CLI
  DEPLOY --> Project

  subgraph Project["Your project (after deploy)"]
    direction TB
    PLAT[.claude/skills/<br/>.codex/agents/<br/>.warp/agents/ ...]
    AIWGMD[AIWG.md / .hermes.md /<br/>WARP.md / AGENTS.md]
    ART[.aiwg/<br/>requirements/<br/>architecture/<br/>...]
  end

  Project --> SESS

  subgraph SESS["AI session (Claude / Codex / Hermes / etc.)"]
    direction TB
    NATIVE[Platform-native loader<br/>reads provider dir]
    DISC([Optional: aiwg discover<br/>+ aiwg show])
  end

  classDef optional stroke-dasharray: 5 5,fill:#fef9e7
  class DISC optional
  class INDEX optional
```

<!-- Polished version: drop ./architecture-overview/images/01-deploy-tool.png to render below -->
<!-- Gemini prompts (v4 illustrated, v3 monospace, v2 editorial): see https://git.integrolabs.net/roctinam/aiwg/issues/1248 -->

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/01-deploy-tool.png)

---

## 2. The two-tier skill model — kernel vs standard

AIWG ships **400+ skills**. Platform context windows can't fit them all. So AIWG splits them: **16 kernel skills** are always loaded into the platform's flat skill listing; the remaining **~385 standard skills** stay at `$AIWG_ROOT` and reach the agent only when queried via the artifact index.

```mermaid
flowchart TB
  subgraph KERNEL["Kernel tier — 16 skills, always loaded"]
    direction LR
    K1[9 framework quickrefs<br/>sdlc / research / forensics /<br/>marketing / media-curator /<br/>security-eng / knowledge-base /<br/>ops / aiwg-utils-quickref]
    K2[7 self-maintenance ops<br/>steward / aiwg-doctor /<br/>aiwg-refresh / aiwg-status /<br/>aiwg-help / use /<br/>aiwg-regenerate]
  end

  subgraph STANDARD["Standard tier — ~385 skills, read from $AIWG_ROOT"]
    direction LR
    S1[SDLC workflows<br/>intake-wizard, sdlc-accelerate,<br/>flow-deploy-to-production,<br/>address-issues, ...]
    S2[Domain skills<br/>media-curator, research-,<br/>forensics-, marketing-, ...]
    S3[Specialized<br/>aiwg-orchestrate hermes-only,<br/>per-provider regenerators, ...]
  end

  AGENT([AI session<br/>natural-language request])

  AGENT -->|Always sees| KERNEL
  AGENT -.->|Optionally queries| INDEX[(aiwg index<br/>artifact index)]
  INDEX -.->|aiwg discover phrase| STANDARD
  STANDARD -.->|aiwg show name| AGENT

  classDef optional stroke-dasharray: 5 5,fill:#fef9e7
  class INDEX optional
  class STANDARD optional
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/02-two-tier.png)

See [`docs/discovery-and-kernel-skills.md`](discovery-and-kernel-skills.md) for the full kernel inventory, why no-copy is the default for standard skills, and the per-provider deployment paths.

---

## 3. The discover → show flow (the optional layer)

When the kernel skills don't directly answer a user request, the agent reaches into the standard tier via two RPC-style commands: `aiwg discover "<intent>"` ranks all 400+ artifacts by capability, then `aiwg show <type> <name>` fetches the body. This flow is optional — agents can work entirely from the kernel surface for many requests — but when it's needed, the cost is bounded and the answer comes from the indexed ranking, not from a literal-string grep.

```mermaid
sequenceDiagram
  participant User
  participant Agent as AI session
  participant CLI as aiwg CLI
  participant Index as artifact index<br/>(~/.local/share/aiwg/)
  participant FS as $AIWG_ROOT<br/>(framework source)

  User->>Agent: "deploy this to production"
  Note over Agent: Kernel skill aiwg-utils-quickref<br/>doesn't match. Run discover.
  Agent->>CLI: aiwg discover "deploy production"
  CLI->>Index: rank artifacts by capability + triggers
  Index-->>CLI: top 3 results with paths + scores
  CLI-->>Agent: flow-deploy-to-production [0.51]<br/>+ 2 alternatives
  Agent->>CLI: aiwg show skill flow-deploy-to-production
  CLI->>FS: read SKILL.md
  FS-->>CLI: full skill body
  CLI-->>Agent: SKILL.md content (instructions)
  Agent->>User: Apply the skill's protocol
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/03-discover-show.png)

The **discover-first protocol** (Rule 1.5 in [`skill-discovery.md`](../agentic/code/addons/aiwg-utils/rules/skill-discovery.md)) makes this the mandatory first move for any query mentioning AIWG, a framework name, or a capability keyword — `Grep`/`Glob`/`Read` against provider artifact directories is forbidden until discover has been consulted in the session. See [issue #1249](https://git.integrolabs.net/roctinam/aiwg/issues/1249) for the rationale.

---

## 4. What's optional — Minimal vs Standard vs Full

Most AIWG users live happily in one of the first two tiers. The Full tier exists; it doesn't punish you for ignoring it.

```mermaid
flowchart TB
  START{What do you want?}

  START -->|"Just AI personas<br/>and basic prompts"| MIN
  START -->|"Plus structured<br/>artifacts (SDLC, etc.)"| MID
  START -->|"Plus self-maintaining<br/>discovery + orchestration"| FULL

  subgraph MIN["Minimal — agents only"]
    direction TB
    M1["aiwg use sdlc"]
    M2[Deploys agents/rules/templates<br/>to your provider dir]
    M3[Use natural language<br/>in the platform as normal]
    M4[Index built but ignorable]
  end

  subgraph MID["Standard — agents + artifacts"]
    direction TB
    D1["aiwg use sdlc + create .aiwg/"]
    D2[Use SDLC slash commands<br/>or natural-language requests]
    D3[Artifacts persist across sessions]
    D4[Index queryable but optional]
  end

  subgraph FULL["Full — discovery + utilities"]
    direction TB
    F1["aiwg use all"]
    F2[Agents query aiwg discover<br/>for non-kernel skills]
    F3[Optional utilities: ralph,<br/>mc, daemon, mcp, schedule]
    F4[Cross-session memory,<br/>background orchestration]
  end

  MIN -.->|"upgrade anytime by<br/>adding usage"| MID
  MID -.->|"upgrade anytime by<br/>using more commands"| FULL
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/04-optional.png)

The upgrade arrows go both ways. Nothing is forced. The opt-in utilities (Ralph for agent loops, Mission Control for background orchestration, Daemon for cross-session persistence, MCP for tool-host integration, Schedule for cron-style automation) only run when you invoke them.

---

## 5. The `.aiwg/` lifecycle

`.aiwg/` is your project's structured workspace — every SDLC phase has a home, the working scratch has a clearly disposable bin, and what you commit to git is your choice. AIWG manages the structure; you choose what's permanent.

```mermaid
flowchart LR
  IDEA[Idea / project intent]
  IDEA --> INTAKE

  subgraph PHASES["SDLC phases — each writes to .aiwg/"]
    direction TB
    INTAKE[.aiwg/intake/]
    REQ[.aiwg/requirements/]
    ARCH[.aiwg/architecture/]
    PLAN[.aiwg/planning/]
    TEST[.aiwg/testing/]
    SEC[.aiwg/security/]
    DEPLOY[.aiwg/deployment/]
  end

  INTAKE --> REQ --> ARCH
  ARCH --> PLAN
  PLAN --> TEST
  PLAN --> SEC
  PLAN --> DEPLOY

  PHASES --> WORK
  WORK[.aiwg/working/<br/>scratch — safe to delete]

  PHASES --> REPORTS[.aiwg/reports/<br/>auto-generated status]
  PHASES --> ARCHIVE[.aiwg/archive/<br/>versioned snapshots]

  PHASES --> FRAME[.aiwg/frameworks/registry.json<br/>which frameworks are deployed]

  GIT([git repo])
  PHASES -.->|"commit artifacts<br/>(your choice)"| GIT
  WORK -.->|"ignore"| GIT

  classDef optional stroke-dasharray: 5 5,fill:#fef9e7
  class WORK optional
  class ARCHIVE optional
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/05-aiwg-dir.png)

`.aiwg/working/` is explicitly ephemeral — safe to delete, typically `.gitignore`'d. Whether to commit the rest of `.aiwg/` is a team decision; many teams commit everything except `working/` and the optional `archive/` directory.

---

## 6. Hermes context-file priority (first-match-wins)

[Hermes Agent](https://github.com/NousResearch/hermes-agent) loads exactly **one** project-context file per turn, by priority. AIWG always emits `.hermes.md` (the priority-1 file), so `AGENTS.md` and `CLAUDE.md` remain valid for Claude Code, Codex, and other providers without interfering with Hermes.

```mermaid
flowchart TB
  TURN([Hermes turn starts])
  TURN --> CWD[Get cwd]
  CWD --> WALK[Walk up to git root<br/>looking for .hermes.md or HERMES.md]

  WALK --> H{".hermes.md or<br/>HERMES.md found?"}
  H -->|Yes| HLOAD[Load .hermes.md<br/>STOP — winner]
  H -->|No| A{"AGENTS.md or<br/>agents.md in cwd?"}
  A -->|Yes| ALOAD[Load AGENTS.md<br/>STOP — winner]
  A -->|No| C{"CLAUDE.md or<br/>claude.md in cwd?"}
  C -->|Yes| CLOAD[Load CLAUDE.md<br/>STOP — winner]
  C -->|No| R{".cursorrules or<br/>.cursor/rules/*.mdc?"}
  R -->|Yes| RLOAD[Load .cursorrules<br/>STOP — winner]
  R -->|No| NONE[No project context loaded]

  HLOAD --> CAP[Cap at 20,000 chars<br/>head/tail truncate above]
  ALOAD --> CAP
  CLOAD --> CAP
  RLOAD --> CAP
  CAP --> PROMPT[Inject into system prompt<br/>this turn]
  NONE --> PROMPT

  classDef winner fill:#d4edda
  class HLOAD,ALOAD,CLOAD,RLOAD winner
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/06-hermes-resolver.png)

Source: `agent/prompt_builder.py:1410-1436` in the Hermes Agent repo. See [`docs/integrations/hermes-quickstart.md`](integrations/hermes-quickstart.md) for the full integration walkthrough.

---

## 7. Multi-platform deploy — one source, ten targets

AIWG's parity model: write/configure once, deploy to whichever AI platforms your team uses. The source-of-truth tree (`agentic/code/`) translates to ten provider-native target conventions through `aiwg use <framework> --provider <X>`.

```mermaid
flowchart LR
  subgraph SOURCE["AIWG framework source ($AIWG_ROOT)"]
    direction TB
    AG[agents/<br/>200+]
    SK[skills/<br/>400+]
    CM[commands/<br/>100+]
    RL[rules/<br/>60+]
    BE[behaviors/<br/>OpenClaw native]
  end

  CLI([aiwg use sdlc<br/>--provider X])
  SOURCE --> CLI

  CLI --> CC[".claude/agents/<br/>.claude/skills/<br/>.claude/rules/"]
  CLI --> CX[".codex/agents/<br/>~/.codex/skills/<br/>~/.codex/prompts/"]
  CLI --> CP[".github/agents/<br/>.github/skills/<br/>.github/instructions/"]
  CLI --> CR[".cursor/agents/<br/>.cursor/skills/<br/>.cursor/rules/"]
  CLI --> WP[".warp/agents/<br/>.warp/skills/<br/>+ WARP.md aggregate"]
  CLI --> WS[".windsurf/agents/<br/>.windsurf/skills/<br/>+ AGENTS.md"]
  CLI --> FA[".factory/droids/<br/>.factory/skills/<br/>.factory/rules/"]
  CLI --> OC[".opencode/agent/<br/>.opencode/skill/<br/>.opencode/rule/"]
  CLI --> HE[".hermes.md +<br/>~/.hermes/skills/<br/>via MCP sidecar"]
  CLI --> OW["~/.openclaw/agents/<br/>~/.openclaw/skills/<br/>~/.openclaw/behaviors/"]

  classDef claude fill:#e8f4ff
  classDef codex fill:#fef9e7
  classDef hermes fill:#fde9d9
  class CC claude
  class CX,CP,CR,WP,WS,FA,OC,OW codex
  class HE hermes
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/07-multi-target.png)

Switching platforms doesn't require redoing your team's agent/skill/rule investment — same source, different output convention. Hermes is special-cased because it uses an MCP-sidecar model rather than direct file deployment.

---

## 8. Session reload after `aiwg use`

Every AI platform caches its agent/skill registry at session start. After `aiwg use`, a running session retains its old registry until the right invalidation step runs — and the right step is different per platform. `aiwg use` prints the correct step in its post-deploy "Session reload required" section so operators don't have to guess.

```mermaid
flowchart TB
  DEPLOY([aiwg use completes<br/>new files on disk])
  DEPLOY --> Q{Was your AI session<br/>already running?}

  Q -->|No — fresh session| OK[Agents/skills load<br/>on first turn ✓]

  Q -->|Yes — running session| RELOAD{Which platform?}

  RELOAD -->|Claude Code<br/>Codex<br/>Cursor<br/>OpenCode<br/>Factory<br/>OpenClaw| RESTART[Restart the session<br/>close + reopen]

  RELOAD -->|Copilot<br/>VS Code| WIN["Developer: Reload Window"]

  RELOAD -->|Warp| TAB[Open a fresh Warp tab<br/>WARP.md re-read on tab start]

  RELOAD -->|Windsurf| WORK[Reload the workspace<br/>AGENTS.md re-parsed]

  RELOAD -->|Hermes| HCMD["/reload-skills<br/>/reload-mcp<br/>no restart needed"]

  RESTART --> DONE[✓ New agents/skills visible]
  WIN --> DONE
  TAB --> DONE
  WORK --> DONE
  HCMD --> DONE

  classDef good fill:#d4edda
  classDef hermes fill:#fff3cd
  class HCMD hermes
  class DONE good
```

![Polished version (placeholder — generate from #1248 prompts)](./architecture-overview/images/08-reload.png)

Hermes is the friendliest case — `/reload-skills` and `/reload-mcp` slash commands invalidate without a chat restart. Every other platform requires a session/window/tab reload, which is normal cache-invalidation behavior — not an AIWG-specific friction.

---

## Image generation status

Each diagram above has a polished image placeholder. Generation prompts (three aesthetic options — illustrated computing iconography, illustrated editorial, monospace-terminal) live on [issue #1248](https://git.integrolabs.net/roctinam/aiwg/issues/1248):

- [v4 (illustrated computing iconography — recommended)](https://git.integrolabs.net/roctinam/aiwg/issues/1248#issuecomment-41143)
- [v3 (monospace-terminal — for technical docs preferring that aesthetic)](https://git.integrolabs.net/roctinam/aiwg/issues/1248#issuecomment-41131)
- [v2 (illustrated editorial — for marketing/announcement copy)](https://git.integrolabs.net/roctinam/aiwg/issues/1248#issuecomment-41107)

All three sets share the 1-8 numbering. Generated images drop at `docs/architecture-overview/images/NN-name.png` and the placeholders above pick them up automatically.

---

## Related guides

- [`docs/how-it-works.md`](how-it-works.md) — the prose walkthrough of these same concepts
- [`docs/discovery-and-kernel-skills.md`](discovery-and-kernel-skills.md) — kernel/standard model in depth, verification steps
- [`docs/integrations/hermes-quickstart.md`](integrations/hermes-quickstart.md) — Hermes integration, capabilities catalog
- [`docs/cli-reference.md`](cli-reference.md) — complete CLI command reference
- [`.claude/rules/skill-discovery.md`](../agentic/code/addons/aiwg-utils/rules/skill-discovery.md) — the discover-first protocol (Rule 1.5)
