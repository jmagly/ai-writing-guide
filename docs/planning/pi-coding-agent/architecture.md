# Pi Provider Architecture

## Scope

This design adds Pi as an AIWG deployment provider. It does not embed Pi, add an LLM API provider, or adopt Pi's experimental distributed runtime. In AIWG terminology, `pi` identifies the coding-agent harness; Pi's own `--provider` option continues to identify model backends such as Anthropic or OpenAI.

## Provider contract

| Concern | Pi surface | AIWG projection | Support |
|---|---|---|---|
| Startup context | `AGENTS.override.md`, `AGENTS.md`, then `CLAUDE.md` while walking from filesystem/repository root to cwd | Root `AGENTS.md` bootstrap to `WORKSPACE.md` and `AIWG.md` | Native |
| Skills | `.agents/skills/**/SKILL.md` and `.pi/skills/**/SKILL.md` | `.agents/skills/<name>/SKILL.md` | Native |
| Commands | `.pi/prompts/*.md` | Translated AIWG command prompt templates | Native |
| Agents | No native agent-definition resource; no built-in subagents | Agent-to-skill projection with explicit limitations | Emulated |
| Rules | No standalone native rules resource | Context aggregation into `AIWG.md`/`AGENTS.md`; on-demand rule index remains AIWG-owned | Emulated |
| Hooks | TypeScript extensions and lifecycle events | Optional `.pi/extensions/aiwg.ts` in a later phase | Deferred |
| MCP | Deliberately absent from Pi core | No config injection; use CLI-backed skills or a separately installed extension | Unsupported |
| Configuration | `.pi/settings.json` | Avoid writing by default; optional minimal managed fragment only if ownership/merge semantics are implemented | Deferred |
| Sessions | Tree-shaped JSONL under `~/.pi/agent/sessions/`, or configured `sessionDir` | Dedicated read-only session adapter | Follow-on |
| Automation | print, JSON, RPC, and SDK modes | CLI smoke tests first; strict RPC client only when needed | Native/follow-on |

## Deployment layout

```text
<project>/
├── AGENTS.md                         # managed bootstrap, shared with other providers
├── WORKSPACE.md                      # canonical project/operator context
├── AIWG.md                           # generated discovery and routing context
├── .agents/
│   └── skills/
│       └── <skill>/SKILL.md          # native Pi skill discovery
└── .pi/
    └── prompts/
        └── <command>.md              # native Pi prompt templates
```

The initial provider must not create `.pi/settings.json`, `.pi/extensions`, `.pi/skills`, `.pi/npm`, or `.pi/git`. Those paths imply configuration ownership, executable code, duplicated skill state, or package installation and therefore require additional policy.

## Context behavior

Pi concatenates matching context files and recognizes `AGENTS.override.md` as a directory-local replacement. AIWG should retain its current thin `AGENTS.md` bootstrap rather than copying the full corpus into startup context. Markdown links are navigational, not includes, so the generated prose must explicitly instruct Pi to read `WORKSPACE.md` and then `AIWG.md`.

The provider definition should describe:

- `startupFiles`: `AGENTS.override.md`, `AGENTS.md`, `CLAUDE.md`
- `loadMode`: `prose-directive`
- `bootstrapTargets`: `AGENTS.md`
- `nestedContext`: `true`
- `support`: `supported`
- verification source pinned to the audited upstream commit

Pi may load `CLAUDE.md` as a compatibility fallback, but AIWG must not generate or mutate `CLAUDE.md` merely to support Pi.

## Skill compatibility

Pi follows the Agent Skills standard with lenient validation and these important behaviors:

- A valid skill needs `name` and non-empty `description` frontmatter.
- Names should be lowercase kebab case and no longer than 64 characters.
- Descriptions must be no longer than 1024 characters.
- Directories containing `SKILL.md` are discovered recursively.
- Pi permits the frontmatter name to differ from the directory, though AIWG should keep them aligned.
- Name collisions keep the first discovered skill and emit a warning.
- `allowed-tools` is experimental and must not be treated as an enforced authorization boundary.
- `disable-model-invocation: true` hides the skill from the system prompt but preserves `/skill:name` invocation.

AIWG's existing Agent Skills validation should become the release gate. Provider transformation must preserve unknown frontmatter only when Pi safely ignores it; provider-only fields that create misleading behavior should be removed or translated.

## Command translation

Static AIWG commands map to `.pi/prompts/<name>.md`:

```markdown
---
description: Short command description
argument-hint: "[arguments]"
---
<prompt body>
```

Translation rules:

1. Preserve the command body as a prompt, not executable code.
2. Translate `argumentHint` or `argument-hint` to Pi's `argument-hint`.
3. Translate generic all-arguments placeholders to `$ARGUMENTS` only where semantics match.
4. Preserve `$1`, `$2`, and supported Pi slices/defaults.
5. Reject or visibly degrade provider-specific tool allowlists, model pins, and runtime command handlers.
6. Detect collisions with built-in Pi commands, `/skill:<name>`, and another prompt filename.
7. Keep prompt discovery non-recursive: every generated prompt must be a direct child of `.pi/prompts`.

## Agent projection

Pi's philosophy leaves subagent orchestration to extensions, packages, tmux, or user-built workflows. The initial provider therefore projects AIWG agent personas into skills that load role instructions into the active agent. The transformation must say that it changes the current role; it must not claim isolation, parallel execution, independent context, or a separate model.

Flows requiring actual concurrent agents must consult the provider capability matrix and choose a documented degraded execution path. A future subagent extension is a separate feature with its own threat model because extensions execute with the user's full permissions.

## Trust and security boundaries

Project context files load before trust, but project settings, `.pi` resources, packages, extensions, and project `.agents/skills` are trust-gated. Interactive Pi prompts for trust; non-interactive modes do not. Conformance fixtures use `--approve` because they are disposable and controlled. User documentation should prefer `/trust` for normal interactive use and warn that `--approve` grants project resources permission to execute trusted extensions or install configured packages.

The adapter must never silently:

- set global `defaultProjectTrust` to `always`;
- install a Pi package;
- create an executable extension;
- add MCP support;
- write authentication or model settings;
- place API keys on the command line or in generated files.

## Optional extension boundary

An optional extension may later provide richer command handlers, UI approvals, event/provenance capture, or tool registration. It should be shipped as reviewed source or a version-pinned package and remain opt-in. The extension must use documented stable `ExtensionAPI` events; experimental Chord, Radius, mini, and facet APIs are excluded until separately approved.

## Session adapter boundary

Pi sessions are append-only JSONL trees, not flat chats. A future `src/sessions/adapters/pi.ts` should:

- validate the session header and retain unknown fields;
- reconstruct the active branch using `id`/`parentId` rather than file order alone;
- preserve compaction and branch-summary boundaries;
- distinguish `custom`, `custom_message`, label, model-change, thinking-level, and session-info entries;
- redact secrets using the shared session-ingestion policy;
- read configured `sessionDir` without mutating Pi state;
- include fixtures for forks, imported sessions, malformed/truncated final lines, and forward-compatible entry types.

Session ingestion is not required for initial deployment support and must not delay the file-projection milestone.

## Capability declaration

Initial capability values should communicate reality rather than provider parity:

| Capability | Value |
|---|---|
| native context | yes |
| native skills | yes |
| native prompt commands | yes |
| native agents/subagents | no |
| native rules directory | no |
| native hooks | extension-only, deferred |
| native MCP | no |
| JSON event stream | yes |
| RPC | yes, strict JSONL |
| SDK | yes, Node.js |
| session import | not in initial release |

## Compatibility policy

Tests should target a pinned published Pi version for reproducibility and run a scheduled advisory check against upstream `main`. A `main` failure opens drift work but does not retroactively break the supported release. Promote Pi from experimental to stable only after two consecutive published-version qualification runs and a manual smoke test of trust, skill discovery, prompt expansion, and context bootstrap.
