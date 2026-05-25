# Codex `/goal` Integration Research

Date: 2026-05-24
Issues: #1451, #1469

## Finding

Codex exposes `/goal` as an in-session standing-goal primitive. In this runtime it is not a detached CLI process and should not be emulated by launching AIWG's in-session loop machinery. AIWG loop skills should branch on provider and use Codex's native goal mechanism for visible, same-session iteration.

## Invocation Mode

Skills cannot assume a portable shell command for `/goal`. On Codex, the agent should use the native goal surface when available in the host runtime. If the host does not expose a programmatic goal tool to the agent, the skill must tell the operator exactly what to run:

```text
/goal "<task>; completion: <measurable criterion>"
```

The branch stays inside the same skill. Users still invoke `agent-loop`, `ralph`, or `address-issues`; they do not pick a provider-specific clone.

## Completion-Criteria Mapping

AIWG `--completion` maps to the goal text as an explicit completion clause. When completion is omitted, AIWG still runs `infer-completion-criteria` first and passes the resolved criterion to `/goal`.

Examples:

- AIWG: `agent-loop "fix tests" --completion "npm test passes"`
- Codex goal: `/goal "Fix tests; completion: npm test passes"`

## Cycle Status and Audit Trail

Codex `/goal` drives the iterative loop, but AIWG-owned skills remain responsible for external audit surfaces:

- `address-issues` still posts AL CYCLE comments to issue threads.
- Activity-log entries are written by the orchestration skill, not delegated to `/goal`.
- Verification evidence remains the same command output or file evidence used on non-Codex providers.

## Boundaries

- `agent-loop-ext` / `ralph-external` stays AIWG-native because it is detached, crash-resilient, and cross-session.
- Multi-loop fan-out stays AIWG-native unless the provider exposes a native parallel goal primitive with equivalent isolation and status APIs.
- Human-authorization gates apply before destructive work regardless of whether the active loop mechanism is `/goal` or AIWG internal iteration.


## Claude Code `/goal` Dialect

Issue #1469 confirmed Claude Code exposes the same operator-facing in-session primitive:

```text
/goal "<task>; completion: <measurable criterion>"
```

The portable AIWG mapping is therefore shared for Codex and Claude Code. The provider branch should be described as "provider with native `/goal`" unless a runtime later exposes a materially different dialect.

Programmatic invocation remains host-dependent. If the active assistant cannot call a goal tool directly, AIWG skills must print the exact slash command for the operator rather than silently running a second emulated loop.

AIWG bookkeeping stays outside the native goal primitive: activity-log writes, issue-thread AL CYCLE comments, threat preflight, and human-authorization gates remain the responsibility of the invoking AIWG skill before and around the native `/goal` loop.
