# Pi Provider Implementation and Verification Plan

## Goal

Deliver `aiwg use all --provider pi` as an experimental provider integration using Pi's stable native resource surfaces. Preserve existing provider behavior and avoid executable extensions in the initial milestone.

## Current implementation status (2026-09-03)

- Phase 1 is implemented for issue #2148: canonical identity/schema, aliasing,
  exact process and executable detection, capability/context contracts, CLI
  enumeration, Steward routing, wizard/doctor compatibility, and generated
  `.mjs` deployment routing.
- Pi kernel skills route to the shared native `.agents/skills` surface. Portable
  Agent Skills imported explicitly for Pi route to Pi's native `.pi/skills`
  surface, avoiding provider-ownership collisions on the shared directory.
- Issue #2149 resource projection is implemented in the working tree: a
  Pi-neutral `AGENTS.md` bootstrap, native `.pi/prompts` translation, shared
  kernel skills, idempotent/project-safe writes, actionable trust guidance,
  and user-scope routing through `${PI_CODING_AGENT_DIR:-~/.pi/agent}`.
  Pi does not require generated settings or package metadata for these loose
  native resources, so `.pi/settings.json` remains entirely operator-owned.
- Model execution, extensions, sessions, and the complete published-version
  conformance matrix remain assigned to #2150–#2153.
- Verification completed across #2148 and #2149 includes focused
  provider/lifecycle, prompt argument, trust, strict dry-run, project/user
  scope, kernel, and CLI integration tests. An isolated
  `aiwg use all --provider pi --dry-run` leaves both project and home empty;
  apply produces prompts, skills, context, and deployment/status counts.
  Earlier #2148 verification included 344 focused
  tests, TypeScript, discovery coverage, CLI build, kernel conformance, and a
  disposable Pi deployment smoke. The full repository run produced 9,759 passes
  and 15 failures; the one Pi-related assertion was corrected and rerun green,
  while the remaining failures are unrelated installation-identity/timing or
  pre-existing dirty-worktree failures.

## Phase 0: upstream qualification fixture

1. Add a small versioned fixture recording:
   - supported published Pi version;
   - audited upstream commit;
   - Node runtime requirement;
   - expected context, skill, prompt, trust, and CLI contracts.
2. Add a script or test helper that can query `pi --version` without installing or updating Pi.
3. Keep live/upstream qualification opt-in or scheduled; normal unit tests must not require network access.

Exit criteria:

- drift evidence is machine-readable;
- tests distinguish the reproducible published-version gate from advisory `main` qualification.

## Phase 1: provider registry and routing

Add `pi` to the canonical provider type and every registry derived from it. Use aliases such as `pi-coding-agent`; do not use `openai` or confuse Pi's harness identifier with Pi's `--provider` model-backend flag.

Primary touch points:

- `src/agents/types.ts`
- `src/providers/provider-definitions.ts` and generated/runtime twin if still required
- `agentic/code/providers/capability-matrix.yaml`
- provider resolution, CLI init/wizard, status, doctor, deployment verification, and help surfaces
- deployment scripts whose provider lists are not yet registry-driven
- model/provider policy only where a harness provider is represented; do not invent Pi model-role mappings

Definition sketch:

```text
id: pi
status: experimental
deployTarget: project
artifacts:
  agents: .agents/skills
  commands: .pi/prompts
  skills: .pi/.aiwg/skills
  rules: null
context bootstrap: AGENTS.md
config: AGENTS.md (Pi's .pi/settings.json is known but not managed initially)
MCP injection: null
```

Exit criteria:

- `pi` resolves consistently from explicit flags, config, aliases, and runtime detection;
- no unknown-provider fallback silently selects Claude;
- all exhaustive provider tests include Pi or explicitly explain exclusion.

## Phase 2: projection implementation

### Skills

Reuse the Agent Skills deployment path and validation. Confirm that generated directories contain `SKILL.md`, names meet Pi limits, descriptions are present and within 1024 characters, and duplicate names fail before deployment.

### Commands

Add a Pi prompt-template translator and write direct children of `.pi/prompts`. Translate description and argument hint metadata, validate placeholders, and report unsupported provider directives. Do not create nested prompt directories.

### Agents

Add a Pi-specific agent-to-skill transformation or reuse a generic transformation only if it explicitly removes claims of isolation, independent models, or parallel subagent execution. Namespace or collision policy must be deterministic.

### Rules and context

Generate the standard thin `AGENTS.md` provider bootstrap. Keep rule discovery in `AIWG.md` and the AIWG index. Do not manufacture `.pi/rules`.

### Receipts and pruning

Record every generated Pi artifact in the existing transformation/deployment receipt. On refresh, update managed files and prune only stale files previously owned by AIWG. Never remove user-authored `.pi` resources.

Exit criteria:

- dry-run reports exact paths and transformations;
- deployment is idempotent;
- uninstall/prune preserves pre-existing user files and modified managed files according to existing policy.

## Phase 3: documentation

Add:

- `docs/integrations/pi-quickstart.md` with install prerequisites, deployment, `/trust`, restart/reload, `/skill:name`, and prompt invocation;
- `docs/agents/providers/pi.md` operational reference;
- Pi rows in provider overview, capability, skill-path, and setup-guide matrices;
- troubleshooting for missing project resources in non-interactive mode;
- an explicit statement that Pi has no built-in MCP and that AIWG does not auto-install an MCP extension;
- an explicit Node compatibility note: AIWG supports Node 20, while the audited Pi release requires Node 22.19 or newer.

Avoid recommending global `defaultProjectTrust: "always"`. For CI fixtures, show `--approve` only with a warning that the repository is trusted.

## Phase 4: conformance tests

### Unit tests

- provider schema, aliases, paths, context contract, and capabilities;
- command frontmatter/argument translation;
- agent-to-skill truthfulness and metadata limits;
- collision detection and deterministic ordering;
- provider resolution and runtime marker precedence;
- capability degradation for MCP, rules, and subagents.

### Deployment integration tests

In a disposable git repository, assert:

- `AGENTS.md`, `.agents/skills`, and `.pi/prompts` are created;
- `.pi/settings.json`, `.pi/extensions`, `.pi/skills`, and `.pi/rules` are not created;
- another provider's directories are not created;
- dry-run creates nothing;
- a second deployment produces no unexpected diff;
- refresh and prune affect only receipted artifacts;
- user-authored prompt and skill files survive deploy/remove.

### Live Pi qualification

With a pinned published Pi executable and no model call:

1. Run Pi in a disposable trusted fixture with `--approve` and a deterministic extension or inspection hook that reports discovered resources.
2. Verify the root `AGENTS.md` is reported as loaded.
3. Verify at least one generated skill is discoverable and `/skill:<name>` expands.
4. Verify at least one `.pi/prompts` template expands arguments.
5. Run without approval and confirm trust-gated project resources are not loaded under the default policy.
6. Verify `--no-skills`, `--no-prompt-templates`, and `--no-context-files` disable only their documented surfaces.

Do not require a paid LLM request for provider file-location conformance.

## Phase 5: optional follow-ons

Each follow-on needs separate scope and review:

1. **Session adapter** — ingest Pi's tree-shaped JSONL sessions into AIWG session intelligence.
2. **RPC bridge** — strict LF JSONL client with response correlation, asynchronous event handling, abort, steering, and follow-up support.
3. **Extension package** — opt-in event/provenance hooks, interactive policy gates, or registered tools.
4. **Subagent orchestration** — explicit extension or process strategy; never claim native support.
5. **MCP bridge** — only if a maintained extension is selected and threat-modeled; not part of the core Pi provider.

Experimental Pi services (`experimental` client/server, mini, Radius, Chord facets) remain out of scope until their APIs stabilize and a new ADR accepts the compatibility cost.

## Traceability matrix

| Requirement | Verification |
|---|---|
| PI-CTX-001: thin `AGENTS.md` bootstrap | provider-definition unit test; live loaded-context smoke test |
| PI-SKL-001: native `.agents/skills` deployment | path integration test; Pi discovery smoke test |
| PI-CMD-001: `.pi/prompts` translation | translator unit tests; argument expansion smoke test |
| PI-AGT-001: truthful agent-to-skill degradation | golden transformation test; capability test |
| PI-RUL-001: no fictitious native rules path | provider schema and negative filesystem assertions |
| PI-MCP-001: no core MCP injection | capability matrix and deployment negative test |
| PI-TRUST-001: trust boundary preserved | approved/unapproved live fixture tests |
| PI-OWN-001: receipt-bound cleanup | idempotence, mutation, prune, and uninstall tests |
| PI-DRIFT-001: upstream evidence recorded | qualification fixture and scheduled drift job |
| PI-SES-001: session ingestion excluded initially | release checklist; follow-on issue |

## Release gates

- Typecheck and relevant unit/integration suites pass.
- Provider inventory and documentation discoverability tests pass.
- Published Pi version qualification passes on Linux and at least one of macOS or Windows.
- Security review confirms no settings, packages, extensions, credentials, or trust decisions are silently written.
- Documentation links to a recorded upstream commit and identifies the supported released version.
- Pi remains `experimental` until two consecutive release qualifications and a manual TUI smoke test pass.

## Rollback

Because the first milestone only writes receipted declarative artifacts, rollback is provider removal/pruning of AIWG-owned `.pi/prompts` and `.agents/skills` entries plus regeneration of the shared `AGENTS.md` if Pi was the final consumer. User-authored resources and saved Pi trust decisions are never removed automatically.
