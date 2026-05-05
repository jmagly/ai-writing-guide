# GitHub Copilot / VS Code — Provider Parity Assessment

**Issue:** #1092
**Assessed:** 2026-05-05
**Analyst:** Technical Researcher agent

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repository | https://github.com/microsoft/vscode |
| License | MIT |
| Commit assessed | `fdfcb7b4144e5fda748d8d4e08b5dfc5c36f9edb` |
| Clone strategy | `--filter=blob:none --sparse --depth 1`, sparse-checkout `src/vs/workbench/contrib/chat` |
| Clone path | `/tmp/aiwg-parity-2026-05/vscode` |
| OSS status | Open-source; GitHub Copilot extension is closed-source but VS Code chat integration is fully open |
| Source quality | HIGH — all findings derived directly from TypeScript source |

Primary files read:

- `src/vs/workbench/contrib/chat/common/promptSyntax/config/promptFileLocations.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/utils/promptFilesLocator.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/computeAutomaticInstructions.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/promptFileParser.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/hookTypes.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/hookSchema.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/config/config.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/hookClaudeCompat.ts`
- `src/vs/workbench/contrib/chat/common/promptSyntax/promptTypes.ts`

---

## 2. Discovery Mechanism

### 2.1 Skills

Source: `promptFileLocations.ts:157-164` — `DEFAULT_SKILL_SOURCE_FOLDERS` constant.

Copilot / VS Code scans ALL of the following skill locations simultaneously (HIGH confidence):

| Priority | Path | Storage | Source tag |
|----------|------|---------|-----------|
| 1 | `.agents/skills` | workspace-local | `AgentsWorkspace` |
| 2 | `.github/skills` | workspace-local | `GitHubWorkspace` |
| 3 | `.claude/skills` | workspace-local | `ClaudeWorkspace` |
| 4 | `~/.agents/skills` | user-global | `AgentsPersonal` |
| 5 | `~/.copilot/skills` | user-global | `CopilotPersonal` |
| 6 | `~/.claude/skills` | user-global | `ClaudePersonal` |

Skill discovery pattern (`promptFilesLocator.ts:718-748`):

- Iterates immediate subdirectories of each skill root folder
- Looks for `SKILL.md` (case-insensitive) within each subdirectory — one level deep only
- Skills named by parent folder name; regex `^[a-z0-9-]+$` enforced on folder names
- No recursion into skill subfolders beyond the SKILL.md lookup

User-configurable override via VS Code setting `chat.agentSkillsLocations` (`config.ts:71`).

### 2.2 Instructions (Rules)

Source: `promptFileLocations.ts:169-174` — `DEFAULT_INSTRUCTIONS_SOURCE_FOLDERS`.

| Priority | Path | Storage |
|----------|------|---------|
| 1 | `.github/instructions` | workspace-local |
| 2 | `.claude/rules` | workspace-local |
| 3 | `~/.copilot/instructions` | user-global |
| 4 | `~/.claude/rules` | user-global |

Recursion: instructions folders are scanned up to `MAX_INSTRUCTIONS_RECURSION_DEPTH = 5` levels deep, EXCEPT when the folder is the workspace root (`promptFilesLocator.ts:35, 524-528`). This means `.github/instructions/subdir/*.instructions.md` is discovered automatically.

File extension required: `.instructions.md` OR filename `copilot-instructions.md` (`promptFileLocations.ts:253`).

Any `.md` file (except `README.md`) inside `.claude/rules/` and its subdirectories is treated as an instruction file (`promptFileLocations.ts:272-275`).

User-configurable via `chat.instructionsFilesLocations`.

Special agent-level instruction files scanned separately (`computeAutomaticInstructions.ts:261`):

- `AGENTS.md` (anywhere in workspace, recursive full search)
- `CLAUDE.md` / `CLAUDE.local.md` at workspace roots
- `.github/copilot-instructions.md`

### 2.3 Prompt Files (Commands)

Source: `promptFileLocations.ts:179-181` — `DEFAULT_PROMPT_SOURCE_FOLDERS`.

| Path | Storage |
|------|---------|
| `.github/prompts` | workspace-local |

Extension: `.prompt.md` only. No user-global default. User-configurable via `chat.promptFilesLocations`. Glob patterns in this setting are deprecated but still supported with a warning.

### 2.4 Agents

Source: `promptFileLocations.ts:186-191` — `DEFAULT_AGENT_SOURCE_FOLDERS`.

| Priority | Path | Storage |
|----------|------|---------|
| 1 | `.github/agents` | workspace-local |
| 2 | `.claude/agents` | workspace-local |
| 3 | `~/.copilot/agents` | user-global |
| 4 | `~/.claude/agents` | user-global |

File extensions recognized: `.agent.md` (primary), `.chatmode.md` (legacy alias), or any `.md` file (except `README.md`) directly in the agents folder (`promptFileLocations.ts:267-269`).

**Important:** Agents must be directly inside the agents folder — no subfolder nesting (`promptFileLocations.ts:208-210` — `isInAgentsFolder` checks `dir.endsWith('/' + AGENTS_SOURCE_FOLDER)`).

User-configurable via `chat.agentFilesLocations`.

### 2.5 Hooks

Source: `promptFileLocations.ts:197-203` — `DEFAULT_HOOK_FILE_PATHS`.

| Priority | Path | Storage |
|----------|------|---------|
| 1 | `.github/hooks` | workspace-local |
| 2 | `.claude/settings.local.json` | workspace-local |
| 3 | `.claude/settings.json` | workspace-local |
| 4 | `~/.copilot/hooks` | user-global |
| 5 | `~/.claude/settings.json` | user-global |

Hook files are `.json`. Claude `settings.json` format is parsed natively via `hookClaudeCompat.ts`.

### 2.6 Scan Order and Parent Repo Walking

Source: `promptFilesLocator.ts:106-165`.

When `chat.useCustomizationsInParentRepositories` is enabled, VS Code walks upward from the workspace folder to find a `.git` root, adding intermediate parent folders to the scan roots. This means AIWG customizations placed at a monorepo root are discovered even when VS Code opens a subdirectory workspace. Trusted-folder check applies.

---

## 3. Artifact Format

### 3.1 File Extensions

| Type | Extension | Notes |
|------|-----------|-------|
| Skill | `SKILL.md` | Case-insensitive match (`compareIgnoreCase`) |
| Instruction | `.instructions.md` | Or `copilot-instructions.md` as a special case |
| Prompt/Command | `.prompt.md` | |
| Agent | `.agent.md` | Also `.chatmode.md` (legacy); or plain `.md` in agents folder |
| Hook | `.json` | |

Source: `promptFileLocations.ts:15-31`.

### 3.2 YAML Frontmatter Schema

Source: `promptFileParser.ts:65-88` — `PromptHeaderAttributes` namespace.

All prompt file types share YAML frontmatter delimited by `---`. Recognized fields:

| Field | Applies to | Description |
|-------|-----------|-------------|
| `name` | all | Display name |
| `description` | all | Summary shown in UI / skill listing |
| `applyTo` | instructions | Glob pattern for auto-attach (comma-separated) |
| `paths` | instructions | Alias for `applyTo` |
| `model` | agents | Model override |
| `mode` | agents | Chat mode |
| `tools` | agents | Allowed tools list |
| `agent` | agents | Agent name reference |
| `handoffs` | agents | Handoff targets |
| `argument-hint` | agents/skills | UI hint for argument |
| `user-invocable` | agents | Whether user can invoke via slash command |
| `disable-model-invocation` | skills | Prevents model auto-loading; slash-command only |
| `hooks` | agents | Inline lifecycle hooks (YAML, parsed via `hookSchema.ts`) |
| `context` | agents | Context hints |
| `target` | all | `vscode`, `github-copilot`, `claude`, or `undefined` |
| `sessionTypes` | instructions/skills | Session type filter |
| `excludeAgent` | instructions | Exclude from specific agents |
| `agents` | instructions | Agent allowlist |
| `compatibility` | all | Cross-platform compatibility metadata |
| `license` | all | License identifier |
| `metadata` | all | Arbitrary metadata map |
| `infer` | all | Inference hint |
| `advancedOptions` | agents | Advanced configuration map |

The `applyTo` field supports comma-separated glob patterns including `**`, `**/src/**`, and bare relative globs like `src/**/*.ts` (auto-prefixed with `**/` internally — `computeAutomaticInstructions.ts:307-309`).

### 3.3 Skill Format

Skills use a folder convention: `<skill-root>/<skill-name>/SKILL.md`. The skill name is the folder name. Folder name regex: `^[a-z0-9-]+$` (`promptFileLocations.ts:47`). No frontmatter is required in SKILL.md, but `description` and `disable-model-invocation` are read. Skills with no `description` field are excluded from model-invocable listing (`computeAutomaticInstructions.ts:407-409`).

### 3.4 Character Budget for Skills

Source: `computeAutomaticInstructions.ts:465-505`.

When the `skill` tool is available: maximum 15,000 characters of skill description content injected into context. After budget exhaustion, remaining skill names are appended (up to a further 5,000-character name list). This budget applies per chat request.

---

## 4. Lifecycle Hooks

Source: `hookTypes.ts:12-68`.

VS Code supports the following hook types natively (PascalCase format in `.github/hooks/*.json`):

| Hook | VS Code | GitHub Copilot CLI |
|------|---------|-------------------|
| `SessionStart` | Yes | `sessionStart` |
| `SessionEnd` | No | `sessionEnd` |
| `UserPromptSubmit` | Yes | `userPromptSubmitted` |
| `PreToolUse` | Yes | `preToolUse` |
| `PostToolUse` | Yes | `postToolUse` |
| `PreCompact` | Yes | No |
| `SubagentStart` | Yes | No |
| `SubagentStop` | Yes | `subagentStop` |
| `Stop` | Yes | `agentStop` |
| `ErrorOccurred` | No | `errorOccurred` |

Hook files are `.json` in `.github/hooks/` (workspace) or `~/.copilot/hooks/` (user-global). The JSON schema (`hookSchema.ts:211-275`) uses a conditional: if the file has a `version` number field, camelCase Copilot CLI format is applied; otherwise PascalCase VS Code format.

Claude `settings.json` hook format is read cross-compatibly. Claude-style nested matcher structure (`{ matcher: "...", hooks: [...] }`) is handled via `hookClaudeCompat.ts` and `hookSchema.ts:486-521`.

Inline hooks in agent `.agent.md` frontmatter (`hooks:` key) are also supported, parsed from YAML via `hookSchema.ts:585-628`. Both VS Code and Claude hook type name conventions are accepted.

---

## 5. Current AIWG Deployment Behavior

Source: `src/smiths/platform-paths.ts`, `src/cli/handlers/use.ts:190-196`, `src/agents/agent-deployer.ts:397`.

AIWG currently deploys the following for `--provider copilot`:

| Artifact type | AIWG deploy path | Format |
|---------------|-----------------|--------|
| Agents | `.github/agents/` | Generic `.md` (no `.agent.md` extension) |
| Skills | `.github/skills/` | `<skill-name>/SKILL.md` folders |
| Commands | `.github/commands/` | `.md` files |
| Rules | `.github/copilot-rules/` | `.md` files |
| Behaviors | `.github/copilot-rules/` | Emulated via session wrapper |

The AIWG packager uses `convertToGenericFormat` for Copilot agents (not `.agent.md` format) — `agent-packager.ts:26-28`. This means agents deployed to `.github/agents/` are plain `.md` files, which VS Code does accept (any `.md` file in the agents folder is recognized), but the `.agent.md` extension is preferred for native UI tooling.

The AIWG command path `.github/commands/` is not a VS Code default scan location. Commands should be deployed to `.github/prompts/` as `.prompt.md` files, not `.github/commands/` as plain `.md` files.

Rules are deployed to `.github/copilot-rules/` which is not in VS Code's default instruction scan paths (`.github/instructions/` is the correct location). Files need the `.instructions.md` extension to be recognized.

---

## 6. Gaps vs. Latest Provider Mechanism

| Gap | Severity | Description |
|-----|----------|-------------|
| Commands deployed to wrong path | HIGH | AIWG writes `.github/commands/*.md`; VS Code only scans `.github/prompts/*.prompt.md` — commands are invisible to Copilot |
| Rules deployed to wrong path | HIGH | AIWG writes `.github/copilot-rules/*.md`; VS Code scans `.github/instructions/*.instructions.md` — rules are invisible |
| Agent format lacks `.agent.md` extension | MEDIUM | AIWG uses plain `.md` extension; while VS Code accepts any `.md` in `.github/agents/`, the `.agent.md` extension is the canonical format and enables VS Code editor tooling (syntax highlighting, schema validation) |
| User-global paths not deployed | MEDIUM | VS Code supports `~/.copilot/agents`, `~/.copilot/skills`, `~/.copilot/instructions`; AIWG has no user-global deployment for Copilot (only project-local) |
| Hook deployment not implemented | MEDIUM | VS Code has a first-class `.github/hooks/*.json` mechanism with 8 lifecycle events; AIWG has no Copilot hook deployment path |
| Instructions `applyTo` not used | LOW | AIWG rules are deployed as flat files with no `applyTo` frontmatter; they are always attached to every chat request rather than conditionally applied |
| `.claude/skills` already scanned | INFO | AIWG Claude skills at `.claude/skills/` are already visible to Copilot with no extra work — no gap, but no current documentation of this |
| `.claude/agents` already scanned | INFO | AIWG agents at `.claude/agents/` are discovered by Copilot natively — Copilot reads both `.github/agents/` and `.claude/agents/` |
| `.claude/rules` already scanned | INFO | AIWG rules at `.claude/rules/` are treated as instructions by Copilot — any `.md` file in `.claude/rules/**` is recognized as an instruction file |

---

## 7. New Capabilities Not Yet Exploited

### 7.1 `applyTo` Glob Filtering on Instructions

VS Code instructions support `applyTo: "**/*.ts,**/*.tsx"` frontmatter to auto-attach only when matching files are in chat context. AIWG currently deploys rules without this field, meaning all rules attach unconditionally. Adding `applyTo` frontmatter to AIWG rules files would reduce context bloat and improve relevance.

Source: `computeAutomaticInstructions.ts:184-238`, `promptFileParser.ts:71`.

### 7.2 `disable-model-invocation` on Skills

Skills can set `disable-model-invocation: true` to become slash-command-only (not auto-injected into context). AIWG has no mechanism to set this. Skills that are large or domain-specific would benefit from this opt-out.

Source: `promptFileParser.ts:85`, `computeAutomaticInstructions.ts:408`.

### 7.3 Inline Agent Hooks via Frontmatter

Agent `.agent.md` files support a `hooks:` YAML key that defines per-agent lifecycle hooks (PreToolUse, PostToolUse, etc.) without a separate `.github/hooks/` file. AIWG agent definitions could embed hook behaviors directly.

Source: `hookSchema.ts:557-628`.

### 7.4 `sessionTypes` Filtering

Instructions and skills support `sessionTypes:` frontmatter to restrict to specific chat session types (e.g., agent mode only). AIWG does not generate this field.

Source: `computeAutomaticInstructions.ts:200`, `promptFileParser.ts` (attribute parsed but not listed in current AIWG packager output).

### 7.5 Parent Repository Scanning

When `chat.useCustomizationsInParentRepositories` is enabled, VS Code walks up to the `.git` root. This means monorepo root-level AIWG artifacts are discovered in subdirectory workspaces. AIWG documentation does not mention this, and no deployment guidance exists for monorepo layouts.

Source: `promptFilesLocator.ts:106-165`.

### 7.6 User-Global Skill and Agent Paths

VS Code scans `~/.copilot/skills/`, `~/.copilot/agents/`, and `~/.copilot/instructions/` for user-scope artifacts. AIWG has no user-global deployment for Copilot. User-global skills would allow shared AIWG workflows across all projects on a machine.

Source: `promptFileLocations.ts:157-191`.

### 7.7 Skill Budget Adherence Prompt (Experimental)

When `chat.experimental.useSkillAdherencePrompt` is enabled, VS Code injects a stronger directive requiring the model to load relevant skills before responding. This is experimental but already in the codebase.

Source: `computeAutomaticInstructions.ts:431-464`.

### 7.8 `target` Field for Cross-Platform Scoping

The `target` frontmatter field (`vscode`, `github-copilot`, `claude`, `undefined`) allows artifact files to declare which platform they are intended for. AIWG's multi-platform deployment could use this to scope artifacts and prevent cross-platform bleed.

Source: `promptFileParser.ts:78`, `promptTypes.ts:121-126`.

---

## 8. Cross-Port Candidates

These patterns from VS Code are worth porting back into AIWG's general artifact schema or deployment pipeline:

| Pattern | Direction | Description |
|---------|-----------|-------------|
| `applyTo` glob filtering | Copilot → AIWG schema | Add `applyTo` field to AIWG rule/instruction template frontmatter; deploy it to `.github/instructions/` |
| `.agent.md` extension | AIWG packager fix | Switch `agent-packager.ts` Copilot branch from `convertToGenericFormat` (plain `.md`) to a new `convertToCopilotFormat` that outputs `.agent.md` |
| `.github/prompts/*.prompt.md` for commands | AIWG deploy fix | Fix `PROVIDER_PATHS.copilot.commands` in `use.ts` from `.github/commands` to `.github/prompts`; rename files with `.prompt.md` extension |
| `.github/instructions/*.instructions.md` for rules | AIWG deploy fix | Fix `PROVIDER_PATHS.copilot.rules` from `.github/copilot-rules` to `.github/instructions`; rename files with `.instructions.md` extension |
| Hook deployment | New feature | Add `.github/hooks/*.json` generation to Copilot provider in `use.ts`; map AIWG hook definitions to VS Code JSON schema |
| `disable-model-invocation` | AIWG skill manifest | Add opt-in flag in AIWG skill manifest; pass through to `SKILL.md` frontmatter on Copilot deploy |
| `sessionTypes` | AIWG rule schema | Add optional `sessionTypes` field to AIWG instruction/rule manifest |

---

## 9. Citations

All source-code citations are from commit `fdfcb7b4144e5fda748d8d4e08b5dfc5c36f9edb` of `https://github.com/microsoft/vscode`, sparse-cloned on 2026-05-05.

| Claim | Source | GRADE |
|-------|--------|-------|
| Skill scan paths (6 locations) | `promptFileLocations.ts:157-164` | HIGH |
| Skill discovery (SKILL.md in immediate subdirs) | `promptFilesLocator.ts:718-748` | HIGH |
| Instructions scan paths | `promptFileLocations.ts:169-174` | HIGH |
| Instructions recursion depth = 5 | `promptFilesLocator.ts:35` | HIGH |
| `.claude/rules/**` treated as instructions | `promptFileLocations.ts:232-236`, `272-275` | HIGH |
| Prompt files in `.github/prompts/*.prompt.md` | `promptFileLocations.ts:82, 179-181` | HIGH |
| Agent scan paths (4 locations) | `promptFileLocations.ts:186-191` | HIGH |
| `.agent.md` as primary agent extension | `promptFileLocations.ts:30` | HIGH |
| Agents directly in folder, no subfolders | `promptFileLocations.ts:208-211` | HIGH |
| Hook paths and JSON format | `promptFileLocations.ts:197-203` | HIGH |
| VS Code hook type names | `hookTypes.ts:32-41` | HIGH |
| GitHub Copilot CLI hook type names | `hookTypes.ts:43-50` | HIGH |
| Inline agent hooks via YAML frontmatter | `hookSchema.ts:557-628` | HIGH |
| YAML frontmatter fields | `promptFileParser.ts:65-88` | HIGH |
| `applyTo` glob matching | `computeAutomaticInstructions.ts:184-238` | HIGH |
| `disable-model-invocation` filtering | `computeAutomaticInstructions.ts:407-409` | HIGH |
| Skill budget (15k chars) | `computeAutomaticInstructions.ts:465` | HIGH |
| Parent repo walking | `promptFilesLocator.ts:106-165` | HIGH |
| `target` frontmatter field | `promptTypes.ts:121-126` | HIGH |
| User-configurable skill path setting | `config.ts:71` | HIGH |
| AIWG deploys agents to `.github/agents/` in generic format | `src/agents/agent-packager.ts:26-28`, `src/smiths/platform-paths.ts:24` | HIGH |
| AIWG deploys commands to `.github/commands/` | `src/cli/handlers/use.ts:193` | HIGH |
| AIWG deploys rules to `.github/copilot-rules/` | `src/cli/handlers/use.ts:194`, `src/smiths/platform-paths.ts:119` | HIGH |
| `.claude/skills/` scanned by Copilot | `promptFileLocations.ts:160` | HIGH |
| `.claude/agents/` scanned by Copilot | `promptFileLocations.ts:188` | HIGH |

---

*Assessment conducted from source code only. No vendor documentation was fetched — all findings are HIGH-confidence source-derived. AIWG reference files consulted: `src/smiths/platform-paths.ts`, `src/cli/handlers/use.ts`, `src/agents/agent-packager.ts`, `src/agents/agent-deployer.ts`, `docs/providers/skills-paths.md`, `docs/providers/capability-matrix.md`.*
