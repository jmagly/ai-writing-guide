# OpenClaw Parity Assessment
**Issue:** #1096
**Assessed commit:** c37871e7 (tag: 2026.5.5)
**Clone path:** /tmp/aiwg-parity-2026-05/openclaw/
**Assessment date:** 2026-05-05
**Assessor:** Technical Researcher (claude-sonnet-4-6)

---

## 1. Repo State

| Field | Value |
|-------|-------|
| Repository | github.com/openclaw/openclaw |
| Commit assessed | c37871e7 (`chore(release): bump version to 2026.5.5`) |
| OSS status | Open-source (full TypeScript monorepo) |
| Clone path | /tmp/aiwg-parity-2026-05/openclaw/ |
| License | Not inspected in shallow clone; README references open-source |
| Language | TypeScript (primary), Node.js runtime |
| Architecture | Monorepo — `src/` (core), `extensions/` (platform extensions), `skills/` (bundled skills), `packages/` |

**Provenance note (HIGH):** Shallow clone (`--depth 1`) captured a single commit. All source findings below are from this snapshot; historical churn is not assessed.

---

## 2. Discovery Mechanism

### Skill Discovery

OpenClaw uses a six-tier discovery stack defined in
`src/agents/skills/workspace.ts:510–839`.

**Scan roots (in ascending precedence order):**

| Priority | Source label | Path | Notes |
|----------|-------------|------|-------|
| 1 (lowest) | `openclaw-extra` | `config.skills.load.extraDirs[]` + plugin-skills | Config-driven extra dirs |
| 2 | `openclaw-bundled` | `bundledSkillsDir` (package-internal) | Ships with OpenClaw binary |
| 3 | `openclaw-managed` | `~/.openclaw/skills/` | **Canonical user-installed skills** |
| 4 | `agents-skills-personal` | `~/.agents/skills/` | Home-dir personal agent skills |
| 5 | `agents-skills-project` | `{workspaceDir}/.agents/skills/` | Per-project agent skills |
| 6 (highest) | `openclaw-workspace` | `{workspaceDir}/skills/` | Per-session workspace skills |

**Source:** `src/agents/skills/workspace.ts:734–809` — `managedSkillsDir`, `personalAgentsSkillsDir`, `workspaceSkillsDir` assignments and the explicit precedence comment at line 791.

`CONFIG_DIR` resolves to `~/.openclaw` by default (overridable via `OPENCLAW_STATE_DIR` env var):
`src/utils.ts:142` — `path.join(resolveRequiredHomeDir(env, homedir), ".openclaw")`.

### Recursion Depth

Discovery is **two-level deep maximum**:

1. For each scan root, the loader checks if `{root}/SKILL.md` exists (treat root as single skill).
2. If not, it enumerates direct child directories, checking `{child}/SKILL.md`.
3. For children **without** `SKILL.md`, it goes **one level deeper** (`{child}/{grandchild}/SKILL.md`) — enabling grouped layouts such as `~/.openclaw/skills/coze/koze-retrieval/SKILL.md`.

**Source:** `src/agents/skills/workspace.ts:632–722` — the comment at line 632–634 explicitly describes this pattern. Recursion stops at two levels below root; deeper nesting is not scanned.

### Hook Discovery

Hooks (`HOOK.md`) are loaded from `~/.openclaw/hooks/` (`CONFIG_DIR/hooks`).
`src/hooks/workspace.ts:234` — `managedHooksDir = path.join(CONFIG_DIR, "hooks")`.

Bundled hooks ship in the package. Plugin hooks come from plugin-declared hook dirs. Workspace hooks load from `{workspaceDir}/hooks/`.

### Agent Discovery

Per `src/agents/agent-paths.ts:6–13`, the default agent dir resolves to:
```
~/.openclaw/agents/{DEFAULT_AGENT_ID}/agent/
```
overridable via `OPENCLAW_AGENT_DIR` or `PI_CODING_AGENT_DIR` env vars.

Multi-agent configurations use `~/.openclaw/agents/<agentId>/agent/` (docs: `docs/concepts/multi-agent.md:53`).

### No Commands or Rules Directories

Scanning for AIWG-style `commands/` or `rules/` directories is **not present** in the OpenClaw source reviewed. The `~/.openclaw/commands/` and `~/.openclaw/rules/` paths are AIWG deployment targets (see AIWG `src/smiths/platform-paths.ts:27,122`) but are not scanned by OpenClaw natively. OpenClaw's equivalent mechanisms are skills (SKILL.md) and hooks (HOOK.md).

---

## 3. Artifact Format

### Skills — `SKILL.md`

Every skill lives in its own directory. The canonical file is `SKILL.md`.

**Frontmatter schema** (parsed by `src/agents/skills/frontmatter.ts:24–26` via `parseFrontmatterBlock`):

All frontmatter is `Record<string, string>`. Recognized fields:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Display name (falls back to directory name) |
| `description` | string | **Required.** Shown in prompt listing |
| `user-invocable` | bool string | Whether user can invoke directly (default `true`) |
| `disable-model-invocation` | bool string | Hide from model's available_skills prompt (default `false`) |
| `openclaw.*` | nested block | OpenClaw-specific metadata (see below) |

**`openclaw` metadata block** fields (parsed by `resolveOpenClawMetadata` in `src/agents/skills/frontmatter.ts:187–207`):

| Field | Purpose |
|-------|---------|
| `always` | boolean — always include regardless of eligibility |
| `primaryEnv` | Primary env var name for API key |
| `os` | Platform filter (`["darwin"]`, `["linux"]`, etc.) |
| `requires.bins` | Required binaries |
| `requires.anyBins` | At least one of these binaries |
| `requires.env` | Required env vars |
| `requires.config` | Config path truthiness checks |
| `install` | Install spec array (brew/node/go/uv/download) |
| `emoji` / `homepage` / `skillKey` | Metadata |

**File constraints:**
- Max file size: 256 KB (`DEFAULT_MAX_SKILL_FILE_BYTES` at `src/agents/skills/workspace.ts:128`)
- Max skills per source: 200 (`DEFAULT_MAX_SKILLS_LOADED_PER_SOURCE` at line 126)
- Max skills in prompt: 150 (`DEFAULT_MAX_SKILLS_IN_PROMPT` at line 127)
- Max chars in prompt: 18,000 (`DEFAULT_MAX_SKILLS_PROMPT_CHARS` at line 129)

**Compact fallback:** When the full prompt format exceeds the char budget, OpenClaw falls back to name+location only (no descriptions) via `formatSkillsCompact`. If compact still exceeds budget, skills are binary-searched until they fit. Source: `src/agents/skills/workspace.ts:877–928`.

### Hooks — `HOOK.md` + handler

Hooks live in directories containing both `HOOK.md` and a handler (`handler.ts`, `handler.js`, `index.ts`, or `index.js`). Source: `src/hooks/workspace.ts:86–100`.

**Frontmatter fields** (from `src/hooks/frontmatter.ts` and `src/hooks/types.ts`):

| Field | Purpose |
|-------|---------|
| `name` | Display name |
| `description` | Hook description |
| `enabled` | bool — whether hook fires (default `true`) |
| `openclaw.events` | List of event names this hook handles |
| `openclaw.always` | bool — always include |
| `openclaw.os` | Platform filter |
| `openclaw.requires.*` | Binary/env requirements |
| `openclaw.install` | Install spec (bundled/npm/git) |

**Known lifecycle events** (from `src/agents/cli-runner.ts:72,127–129` and `src/agents/pi-embedded-runner/run/attempt.ts:2876,3333` and broader grep):

```
after_compaction, after_tool_call, agent_end, agent_turn_prepare,
before_agent_finalize, before_agent_reply, before_agent_start,
before_compaction, before_dispatch, before_install, before_message_write,
before_model_resolve, before_prompt_build, before_reset, before_tool_call,
cron_changed, gateway_start, gateway_stop, heartbeat_prompt_contribution,
llm_input, llm_output, message_received, message_sending,
model_call_ended, model_call_started, reply_dispatch,
session_end, session_start, subagent_delivery_target, subagent_ended
```

### Behaviors — NOT natively loaded by OpenClaw

**Critical finding (HIGH):** The OpenClaw source contains **no code that reads from `~/.openclaw/behaviors/`**. Searching the entire `src/` tree for `behavior`, `BEHAVIOR`, and `behaviors/` yields no hits to a behaviors scan, loader, or registry. The only behavior-related directory found in the repo is a test fixture (`scripts/docs-i18n/testdata/behavior`), which is unrelated.

The `~/.openclaw/behaviors/` path is **AIWG's own convention**, not a path OpenClaw reads natively. AIWG's `src/cli/handlers/use.ts:230` declares it as a deployment target, and `src/extensions/deployment-registration.ts:380` documents it as "the native format" — but this is aspirational documentation, not matched by runtime behavior in the vendor's code at commit c37871e7.

AIWG's behavior format (YAML with `directives`, `toolset`, `inputs` sections) is an AIWG-defined schema with no corresponding loader in OpenClaw.

---

## 4. Lifecycle Hooks

### OpenClaw Hook Subsystem

OpenClaw ships a rich, production-grade hook subsystem (`src/hooks/`). Hooks are JavaScript/TypeScript modules with a lifecycle handler interface.

**Hook loading sequence:**
1. Extra dirs (from config)
2. Bundled hooks (package-internal)
3. Plugin hooks
4. Managed hooks (`~/.openclaw/hooks/`)
5. Workspace hooks (`{workspaceDir}/hooks/`)

**Source precedence:** `src/hooks/workspace.ts:245–275`. Higher-numbered sources override lower. Collision policy enforced by `src/hooks/policy.ts` (precedence values 10–40 for bundled < managed < plugin < workspace).

**Key events (operationally important for AIWG):**

| Event | When fired | AIWG relevance |
|-------|-----------|----------------|
| `before_agent_reply` | Before cron-triggered reply | Pre-session injection |
| `llm_input` | Before model call | System prompt augmentation |
| `llm_output` | After model call | Output post-processing |
| `agent_end` | Agent run complete | Cleanup, logging |
| `session_start` / `session_end` | Session lifecycle | Session-scoped context |
| `before_tool_call` / `after_tool_call` | Tool boundary | Tool governance |
| `message_received` / `message_sending` | Message lifecycle | Channel-layer hooks |

**Source:** `src/agents/cli-runner.ts:72,127–129` and `src/agents/pi-embedded-runner/run/attempt.ts:2876,3333`.

### AIWG's Current Hook Usage

AIWG emulates behaviors for Claude Code via `.claude/hooks/` and deploys them to other providers via rules wrappers. For OpenClaw specifically, AIWG targets `~/.openclaw/behaviors/` (which OpenClaw does not read) rather than `~/.openclaw/hooks/` (which OpenClaw does read). This is a deployment gap.

---

## 5. Current AIWG Deployment Behavior

From `src/cli/handlers/use.ts:225–231` and `src/smiths/platform-paths.ts`:

| Artifact | AIWG deploys to |
|----------|-----------------|
| Agents | `~/.openclaw/agents/` |
| Skills | `~/.openclaw/skills/` |
| Commands | `~/.openclaw/commands/` |
| Rules | `~/.openclaw/rules/` |
| Behaviors | `~/.openclaw/behaviors/` |

**Project-local support:** Per `src/extensions/project-local-remove.ts:160` and `src/extensions/project-local-doctor.ts:82`, openclaw is annotated `null` in project-local operations — meaning project-local bundle deployment to openclaw is explicitly skipped in the current implementation.

**Behaviors deployment:** `src/cli/handlers/use.ts:230` shows AIWG writes behavior artifacts to `~/.openclaw/behaviors/`. The `scanDeployedBehaviors` function in `deployment-registration.ts:387–451` expects `BEHAVIOR.md` files in subdirectories. This matches AIWG's `BEHAVIOR.md`-based format seen in `agentic/code/behaviors/build-monitor/BEHAVIOR.md`.

However, since OpenClaw does not scan this path, deployed behaviors have no runtime effect.

---

## 6. Gaps vs. Latest Provider Mechanism

| Gap | Severity | Description |
|-----|----------|-------------|
| **Behaviors not read by OpenClaw** | HIGH | AIWG deploys to `~/.openclaw/behaviors/` but OpenClaw source has no loader for this path. Behaviors deployed by AIWG are silently ignored. |
| **Commands not natively read** | MEDIUM | `~/.openclaw/commands/` is deployed by AIWG but OpenClaw has no command scanner for this path. Commands may only reach the model if a skill references them. |
| **Rules not natively read** | MEDIUM | `~/.openclaw/rules/` is deployed by AIWG. OpenClaw uses SOUL.md/AGENTS.md/TOOLS.md for workspace context, not a rules directory. Rules content needs to be injected via skills or hooks to have effect. |
| **Hook system not leveraged** | HIGH | OpenClaw's native hook subsystem (`~/.openclaw/hooks/`) is production-grade with 29 event types. AIWG does not currently deploy any hooks to this path, missing the primary mechanism for reactive behavior injection. |
| **Project-local deployment skipped** | LOW | `project-local-remove.ts:160` and `project-local-doctor.ts:82` mark openclaw as `null`, meaning project-local bundles are not deployed. Since all openclaw artifacts deploy home-globally anyway, this is a product decision, not necessarily a bug. |
| **Two-level skill recursion not exploited** | LOW | AIWG deploys flat skill dirs. OpenClaw supports grouped layouts (`~/.openclaw/skills/vendor/skill-name/SKILL.md`). AIWG could use this for namespaced organization but currently does not. |
| **`.agents/skills/` path not used** | LOW | OpenClaw also scans `~/.agents/skills/` (personal) and `{workspace}/.agents/skills/` (project). AIWG could exploit these for scope-separated skill deployment. |

### "Claude Code under the covers" — Verification

**Confirmed (HIGH).** OpenClaw's agent runner spawns Claude Code CLI as a subprocess via `src/agents/cli-runner/claude-live-session.ts` and `src/agents/cli-runner/execute.ts`. The backend ID is `claude-cli` (`src/agents/cli-runner/claude-skills-plugin.ts:8`). When the backend is `claude-cli`, OpenClaw assembles a temporary plugin directory (`openclaw-claude-skills`) containing symlinks to all loaded skills, then passes `--plugin-dir <tempdir>` to the Claude CLI process (`src/agents/cli-runner/claude-skills-plugin.ts:94–141`).

**SKILL.md recursion:** This means skills loaded by OpenClaw's skill scanner are forwarded to Claude Code via the `--plugin-dir` flag. Claude Code's own SKILL.md loader then re-discovers them inside the plugin directory. The AIWG memory assertion that "OpenClaw inherits Claude Code SKILL.md behavior including deep subdirectory recursion" is **partially confirmed**: skills go through both OpenClaw's loader (max 2 levels deep) and Claude Code's plugin loader. The effective depth is determined by OpenClaw's pre-selection before Claude Code sees them.

---

## 7. New Capabilities Not Yet Exploited

### Hook System (Highest value)

OpenClaw's hook subsystem (`~/.openclaw/hooks/`) is the **correct mechanism for reactive behaviors**. The 29-event lifecycle covers everything AIWG's behavior concept targets:

- `before_agent_reply` / `llm_input` — pre-session system prompt injection (equivalent to AIWG directives)
- `before_tool_call` / `after_tool_call` — toolset governance (equivalent to AIWG toolset restrictions)
- `session_start` / `session_end` — scoped context lifecycle

AIWG could deploy hooks to `~/.openclaw/hooks/` to achieve the runtime effect that `~/.openclaw/behaviors/` currently lacks. A hook bundle would contain `HOOK.md` + `handler.ts/js`, and could read an AIWG behavior YAML to configure its runtime behavior.

### Skill Grouping / Namespacing

The two-level scan (`~/.openclaw/skills/vendor/skill-name/SKILL.md`) enables clean namespacing. AIWG could deploy as `~/.openclaw/skills/aiwg/sdlc-architect/SKILL.md` to namespace AIWG skills and avoid collision with user-installed skills.

### Per-Agent Skill Allowlists

OpenClaw supports per-agent skill allowlisting via `config.json skills.allowBundled[]` and `agents.list[].skills`. AIWG could advise users on how to configure per-agent skill selection for the agents it deploys.

### Skill Eligibility Conditions

The `openclaw.requires.*` frontmatter block in skills enables conditional loading based on binaries, env vars, OS, and config values. AIWG's skill templates could add these fields to prevent skills from appearing in environments where their dependencies are absent.

### Compact Format Fallback

AIWG skills with verbose SKILL.md bodies risk triggering the compact-format downgrade (descriptions omitted) or truncation when many AIWG skills are installed alongside user skills. AIWG should validate that its skill descriptions stay well within the 18,000-char prompt budget after all installed skills are merged.

---

## 8. Cross-Port Candidates

### Behaviors — Define the hook-bridge pattern

**Recommendation:** Introduce an AIWG hook bridge that translates behavior YAML into an OpenClaw HOOK.md + handler. When `aiwg use sdlc --provider openclaw` is run:
1. For each behavior YAML in `agentic/code/*/behaviors/`, generate a `HOOK.md` + `handler.js` that reads the behavior's `directives` and injects them into `llm_input` / `before_agent_reply`.
2. Deploy the hook bundle to `~/.openclaw/hooks/aiwg-{behavior-name}/`.

This would make AIWG behaviors actually execute on OpenClaw. The `~/.openclaw/behaviors/` path could be kept as a staging/source directory, but the actual runtime injection must go through hooks.

**Cross-port to other providers:** The hook-bridge pattern is already done for Claude Code (`.claude/hooks/`). The same pattern could be extended to providers that support pre-session injection via different mechanisms (Factory session wrappers, Codex rules injection, etc.).

### Skill eligibility frontmatter

AIWG skills are currently deployed as bare SKILL.md files without `openclaw.*` metadata. Adding:
```yaml
openclaw:
  os: [darwin, linux]
  requires:
    env: [REQUIRED_VAR]
```
would allow OpenClaw to filter AIWG skills before they consume prompt budget. This is a low-effort, high-value improvement applicable to all providers that share the SKILL.md format.

### Two-level skill namespacing

Any provider that uses SKILL.md (OpenClaw's managed skills, potentially future providers) would benefit from AIWG using the `~/.openclaw/skills/aiwg/<skill-name>/` layout. This prevents name collisions with user-installed skills from ClaWHub or other sources.

---

## 9. Citations

All citations reference source files at commit c37871e7 of the clone at `/tmp/aiwg-parity-2026-05/openclaw/` (GRADE: HIGH — primary source code) or AIWG source at `/home/roctinam/dev/aiwg/` (GRADE: HIGH — primary source code).

| Claim | Source | Grade |
|-------|--------|-------|
| CONFIG_DIR resolves to `~/.openclaw` | `src/utils.ts:142` | HIGH |
| STATE_DIRNAME constant `.openclaw` | `src/config/paths.ts:22` | HIGH |
| managedSkillsDir = `CONFIG_DIR/skills` | `src/agents/skills/workspace.ts:734` | HIGH |
| Skill scan two-level depth | `src/agents/skills/workspace.ts:632–722` | HIGH |
| Skill scan max 200 per source | `src/agents/skills/workspace.ts:126` | HIGH |
| Skill max file 256 KB | `src/agents/skills/workspace.ts:128` | HIGH |
| Precedence order | `src/agents/skills/workspace.ts:791` | HIGH |
| `~/.agents/skills/` personal path | `src/agents/skills/workspace.ts:773–775` | HIGH |
| `{workspace}/.agents/skills/` project path | `src/agents/skills/workspace.ts:780` | HIGH |
| SKILL.md name/description required | `src/agents/skills/local-loader.ts:67–70` | HIGH |
| Frontmatter parsed as `Record<string, string>` | `src/agents/skills/types.ts:72` | HIGH |
| `user-invocable` / `disable-model-invocation` | `src/agents/skills/frontmatter.ts:210–218` | HIGH |
| openclaw metadata block | `src/agents/skills/frontmatter.ts:187–207` | HIGH |
| Compact format fallback | `src/agents/skills/workspace.ts:877–928` | HIGH |
| Hook managed dir = `CONFIG_DIR/hooks` | `src/hooks/workspace.ts:234` | HIGH |
| HOOK.md + handler.ts/js format | `src/hooks/workspace.ts:86–100` | HIGH |
| Hook events (llm_input, agent_end, etc.) | `src/agents/cli-runner.ts:127–129` | HIGH |
| Full event list (29 events) | grep of `hasHooks()` calls across `src/` | HIGH |
| Claude-live session backend ID | `src/agents/cli-runner/claude-skills-plugin.ts:8` | HIGH |
| Skills forwarded to Claude via `--plugin-dir` | `src/agents/cli-runner/claude-skills-plugin.ts:94–141` | HIGH |
| No `~/.openclaw/behaviors/` loader in source | Negative search across `src/**/*.ts` | HIGH |
| AIWG behaviors path declaration | `src/cli/handlers/use.ts:230` | HIGH |
| AIWG platform paths (all artifacts) | `src/smiths/platform-paths.ts:27,55,84,122` | HIGH |
| AIWG project-local openclaw = null | `src/extensions/project-local-remove.ts:160` | HIGH |
| AIWG scanDeployedBehaviors (BEHAVIOR.md format) | `src/extensions/deployment-registration.ts:387–451` | HIGH |
| AIWG behavior skill documentation | `agentic/code/addons/aiwg-utils/skills/behavior/SKILL.md:10` | HIGH |
| AIWG behavior YAML example | `agentic/code/behaviors/ops-toolset.yaml` | HIGH |
| AIWG behavior BEHAVIOR.md example | `agentic/code/behaviors/build-monitor/BEHAVIOR.md` | HIGH |
| Multi-agent agentDir paths | `docs/concepts/multi-agent.md:53–54` | MODERATE (vendor doc) |
| CHANGELOG: `~/.openclaw/skills` note | `CHANGELOG.md:182` | MODERATE (vendor changelog) |

---

## Summary Table

| Section | Key Finding |
|---------|------------|
| Repo state | Commit c37871e7, 2026.5.5, TS monorepo |
| Discovery | 6-tier skill stack; `~/.openclaw/skills/` is tier 3; 2-level deep max |
| Artifact format | SKILL.md (frontmatter Record<string,string>); 256 KB / 200 per source limits |
| Lifecycle hooks | 29-event hook system at `~/.openclaw/hooks/`; HOOK.md + JS handler |
| AIWG deployment | Deploys agents/skills/commands/rules/behaviors to `~/.openclaw/*` |
| Critical gap | `~/.openclaw/behaviors/` not read by OpenClaw; hooks path not used by AIWG |
| Claude Code link | Confirmed: OpenClaw spawns `claude` CLI with `--plugin-dir` for skills |
| Top opportunity | Deploy behavior-as-hook bridge to `~/.openclaw/hooks/` |
