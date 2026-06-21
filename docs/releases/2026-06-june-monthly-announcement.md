# AIWG — June 2026 in review

*Covers releases 2026.6.0 → 2026.6.3 (2026-06-12 → 2026-06-20)*

Starting this month, AIWG moves to a **monthly announcement cadence**. Point
releases still ship through June as they're ready (and each has its own
CHANGELOG entry), but instead of a separate write-up per patch, this single
rollup covers everything that landed across the June cuts.

It was a big month. June added **provider #11**, shipped the **declarative Flow
+ cross-stack Mission** layer, turned the research framework into a real
**corpus-intelligence** toolkit, and — the through-line across three of the
four cuts — stood up the **AIWG Cockpit** from empty substrate to a control
plane you can actually drive against a live agentic-sandbox. Alongside it: a
fleet-wide **agent debloat** that put every definition under the dispatch
ceiling, and a **documentation-accuracy** pass that reconciled every skill and
agent count against source.

Install or upgrade:

```bash
npm install -g aiwg          # fresh install (stable)
aiwg refresh                 # update an existing install + redeploy
```

---

## The headline: AIWG Cockpit — groundwork → usable operator surface

The **AIWG Cockpit** is a UX-first control plane that sits *on top of* the AIWG
CLI and the per-provider agentic stacks. It lets you manage an install,
deployed agents, and live multi-stack sessions from one surface — without ever
replacing or weakening the CLI underneath. June took it from nothing to a
usable surface in three steps:

**Groundwork (2026.6.1).** The substrate landed behind an opt-in `@aiwg/cockpit`
package (epic #1588):

- A **data-driven core** bound to the extension / `aiwg discover` / artifact-index
  registry — capabilities are derived from the registry, not hardcoded.
- **Instance control** normalized on the agentic-sandbox A2A interface, with a
  live session view and a running-agents board.
- **Two shells over one shared core** — a Tauri (Rust) desktop app and a VS Code
  extension (#1594).
- A declarative **UI contribution model** — extensions contribute screens,
  actions, workflows, and event-hooks (#1591).
- Strong local control-surface auth — `127.0.0.1` + Origin + CSRF + per-launch
  token + OS-keychain handshake (#1595).
- A base-footprint CI guard (#1593) so the opt-in package never bloats the base
  `npm i -g aiwg` install.

**Live proof (2026.6.2).** The release gate got stricter: a provider workload
now has to emit both `AIWG_COCKPIT_LIVE_OK` *and* a real AIWG discovery result
from inside a managed agentic-sandbox session — proving real discovery, not
just shell plumbing. The 2026-06-18 host proof passed with Codex
(`codex exec -s read-only`) in a managed `tmux` session.

**Usable surface (2026.6.3).** The operator UX caught up to the substrate:

- The **running board derives from real A2A tasks** (#1639), and **Home stays
  usable against a real v2 executor** — degrading the running/approvals panes
  instead of collapsing to "No stack connected" (#1638).
- **Starting a session is one explicit picker** (#1640, #1641): instance ·
  runtime · loadout · backend · posture → confirm → attach. It surfaces the
  **full loadout catalog** via a new Bridge `/api/loadouts` passthrough, guards
  against silently replacing an attached session, and shows failures inline —
  retiring the param-less start that read as a no-op.
- The **attach view is a real terminal** — the PTY renders through xterm.js, so
  ANSI/VT/tmux redraws are interpreted, not dumped as raw escape bytes.
- **One command brings up the whole stack** — a canonical dev bring-up harness
  replaces the ad-hoc `/tmp` rigs, with documented test stages and a contract
  guard pinning the mock's admin surface to the real v2 divergence.
- Smaller correctness fixes: capability injection uses the plain skill name
  (discover-first resolves it), not a `/`-prefixed pseudo-command (#1642); and
  `/api/show` resolves by the discovered path, so same-named artifacts (e.g. two
  `aiwg-steward`) return a 4xx instead of a 502 (#1643).

There's a chat-style agent view on deck, too: an ADR (#1645) proposes a
per-session Terminal↔Chat toggle with a normalized output-parsing contract,
structured-stream-preferred and PTY-parser-fallback, Claude Code first.

> **Status:** Cockpit is opt-in beta. It is not installed by `npm i -g aiwg`;
> the base CLI footprint is unchanged. Install `@aiwg/cockpit` only if you want
> to drive the foundation as it firms up.

```bash
npm install -g @aiwg/cockpit   # opt-in; not part of the base CLI
```

---

## OpenHuman is provider #11

`aiwg use <framework> --provider openhuman` deploys AIWG to
[tinyhumansai/openhuman](https://github.com/tinyhumansai/openhuman), an OSS
personal-AI runtime (epic #1552). Kernel skills install **globally** to
`~/.openhuman/skills/` — the ungated user-scope root OpenHuman's own installer
writes to — personas land in the workspace `.agents/agents/` for the coding
hosts OpenHuman drives, and commands/rules aggregate into an `AGENTS.md` bridge.
Verified live: OpenHuman's agent harness scans the deployed `SKILL.md` bundles
and event-bus-wires the triggered ones.

That brings AIWG to 11 deployment providers from one source of truth. See the
[OpenHuman quickstart](../integrations/openhuman-quickstart.md).

---

## Releases and the CLI run on declarative Flows + cross-stack Missions

The `flow-*` migration to **`flow.aiwg.io/v1`** completed this month (#1539):
`flow-release`, `flow-architecture-evolution`, and the rest are now declarative
YAML Flows with an executor fan-out contract — discoverable directly via
`aiwg discover`, runnable as orchestration with intra-step multi-agent panels +
synthesis. The release gate sequence lives in `.aiwg/release.config`, so the
Flow body is portable across CalVer/SemVer projects.

On top of Flows, the **cross-stack Mission conductor** landed (#1546): one
conductor fans heterogeneous workers across stacks — a Claude session
dispatching Codex subagents, for instance — over the `runtime:<name>` executor
convention. `/aiwg-mission` ships AIWG-owned on Codex with no plugin dependency.

---

## The research framework became a corpus-intelligence toolkit

June turned the research corpus from a document pile into something searchable
and auditable:

- **Semantic + lexical search** — `aiwg index query --semantic` (embeddings) and
  `--fulltext` (BM25), plus `similar` and a `dedup-report` (#1493, #1494).
- **Citation-graph densification** — `extract-crossrefs` + `citation-backfill`
  (#1505), profile-graph edges + embedding similarity (#1501).
- **Integrity + provenance** — corpus integrity / submission-risk scan (#1506),
  sidecar lint & metadata repair (#1503), per-type induction-depth audit (#1504).
- **Vision extraction** — provider-neutral scanned-page extraction (#1507).
- **Discoverability** — an extensible source-type registry + by-source-type and
  by-project / project-impact index views (#1495, #1509).

Plus a **Fortemi index export** — `aiwg index export --format fortemi` emits a
browser-consumable, schema-validated project index for React integrations.

---

## Leaner agents, and docs that match the code

- **Every agent definition is under the dispatch ceiling.** A repo-wide debloat
  (#1587, #1600) moved worked examples and restated rule boilerplate out of agent
  definitions into the discoverable example catalog, and added a hard **16 KB**
  size ceiling enforced by `aiwg doctor`. Oversized definitions had been silently
  failing subagent dispatch with `Prompt is too long` at 0 tokens; that class of
  failure is now gone, with few-shot coverage preserved via the catalog.
- **Docs reconciled against source.** A `doc-sync code-to-docs` pass corrected
  every skill/agent count across the documentation — kernel skills to **20**,
  addons to **29**, per-framework counts fixed (research → 39, security-engineering
  → 27, sdlc agents → 93) — and resolved three doc-to-doc contradictions.

---

## Cross-provider hardening & discovery

- **Discovery matches how you actually ask (#1581).** Full natural-language
  questions ("help me choose the right AIWG framework") normalize to keyword
  phrases and match; single-content-token queries no longer dead-end. `discover`
  is the exclusive agentic-capability surface and induces discover-first on new
  directives, not just on decline.
- **Cursor** emits rules as native `.mdc` (and cleanup preserves operator `.mdc`).
- **OpenClaw** gets the Steward identity in `SOUL.md`, correctly-aggregated
  commands, and a discover-first bridge.
- **Warp**'s `WARP.md` is now a lean discover-first managed bridge (down from a
  17.5k-line aggregate).
- **OpenCode** loads `AIWG.md` directive classification via `instructions[]` and
  wires deployed rules into `opencode.json`.
- **Codex** ships AIWG-owned `/aiwg-mission` and loads `AIWG.md` via
  `instructions[]`.
- **Public-facing output** — the `aiwg use` version stamp, `aiwg diagnose` bug
  link, and entrypoint messages now read `github.com/jmagly/aiwg`, sourced from
  `package.json` rather than the internal build origin.

---

## The June cuts at a glance

| Release | Date | Headline |
|---|---|---|
| [2026.6.0](v2026.6.0-announcement.md) | 2026-06-12 | OpenHuman provider #11; declarative Flows + cross-stack Missions; research-corpus intelligence; cross-provider hardening |
| [2026.6.1](v2026.6.1-announcement.md) | 2026-06-15 | AIWG Cockpit groundwork (beta); declarative-Flow migration complete; agent debloat under the 16 KB ceiling; doc-accuracy pass |
| [2026.6.2](v2026.6.2-announcement.md) | 2026-06-18 | Cockpit live-proof hardening — the live UAT gate must prove real AIWG discovery from inside a session |
| [2026.6.3](v2026.6.3-announcement.md) | 2026-06-20 | Cockpit groundwork → usable operator surface — running board from real A2A tasks, session-start picker, xterm.js terminal, one-command bring-up |

---

## Upgrade notes

- **No action required** for the base CLI — all June changes are additive or
  self-healing on the next `aiwg refresh` / `aiwg use`.
- **OpenHuman operators:** `aiwg use sdlc --provider openhuman` installs kernel
  skills globally to `~/.openhuman/skills/`; they load in OpenHuman's agent
  harness immediately. (The beta "Skills Explorer → Installed" tab reads
  `~/.openhuman/workflows/`, not `skills/`, so they won't render there yet — an
  upstream OpenHuman limitation tracked in #1560.)
- **Cockpit** is the opt-in `@aiwg/cockpit` package; it is not installed by
  `npm i -g aiwg`, and the base footprint is unchanged.

---

## Links

- **Changelog:** [CHANGELOG.md](https://github.com/jmagly/aiwg/blob/main/CHANGELOG.md)
- **Per-release announcements:** [2026.6.0](v2026.6.0-announcement.md) · [2026.6.1](v2026.6.1-announcement.md) · [2026.6.2](v2026.6.2-announcement.md) · [2026.6.3](v2026.6.3-announcement.md)
- **OpenHuman quickstart:** [docs/integrations/openhuman-quickstart.md](../integrations/openhuman-quickstart.md)
- **Website:** [aiwg.io](https://aiwg.io) · **Docs:** [docs.aiwg.io](https://docs.aiwg.io) · **Repo:** [github.com/jmagly/aiwg](https://github.com/jmagly/aiwg)

```bash
npm install -g aiwg
```
