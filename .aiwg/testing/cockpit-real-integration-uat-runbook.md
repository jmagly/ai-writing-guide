# Cockpit Real-Integration UAT Runbook

Date: 2026-06-19
Status: Executable release-validation runbook
Related: #1621, #1630, #1631, #1632, #1622, #1529
Planning source: `.aiwg/testing/cockpit-real-integration-uat-plan-2026-06-19.md`

## Purpose

This runbook is the canonical operator procedure for Cockpit real-integration
UAT. It separates deterministic mock coverage from release evidence that uses a
real `agentic-sandbox` executor, real AIWG repository data, and a real provider
CLI running inside the managed target session.

Mock-only success is not release evidence. `AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1`
is allowed only for harness development.

## Evidence Rules

- Store generated markdown and JSON reports under `.aiwg/testing/`.
- Store selected release screenshots under `.aiwg/testing/` only after review.
- Do not copy provider auth material, bearer tokens, private keys, CSRs,
  bootstrap tokens, certificate private keys, or raw secret values into reports.
- Record exact blocker reasons instead of silently skipping unavailable runtime
  families.
- Provider workloads must execute inside the attached session, not on the host
  test runner.

## Required Environment Variables

| Variable | Required for | Meaning |
| --- | --- | --- |
| `AIWG_COCKPIT_EXECUTOR_URL` | real smoke, provider, matrix | Real executor base URL, for example `http://127.0.0.1:8122`. |
| `AIWG_COCKPIT_LIVE_REQUIRED=1` | release evidence | Fails instead of skipping when the executor is unreachable. |
| `AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1` | strict matrix | Requires host, Docker/container, and VM target families. |
| `AIWG_COCKPIT_LIVE_MATRIX_TARGETS` | scoped matrix | Optional comma-separated subset of `host,container,vm`; default is all three. |
| `AIWG_COCKPIT_LIVE_PROVIDER` | provider workloads | `codex` or `claude`. |
| `AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT` | provider workloads | Expected AIWG discovery result; default is `issue-audit`. |
| `AIWG_COCKPIT_LIVE_WORKLOAD` | optional | Override prompt while still requiring the marker and discovery result. |
| `AIWG_COCKPIT_LIVE_MUTATION_FILE` | PTY mutation proof | Absolute safe test path written through a controller-driven PTY command. |
| `AIWG_COCKPIT_LIVE_MUTATION_TEXT` | PTY mutation proof | Expected file content; defaults to a timestamped mutation string. |
| `AIWG_COCKPIT_EXECUTOR_VERSION` | release evidence | Tested `agentic-sandbox` tag or commit when the API does not expose identity. |
| `AIWG_COCKPIT_LIVE_REPORT` | all preserved runs | Report base path without extension. |
| `AIWG_SANDBOX_CONFORMANCE_REPORT` | optional | Path to an upstream conformance report linked from Cockpit evidence. |

## Provider Profiles

### Codex

Use this profile for #1631.

```bash
export AIWG_COCKPIT_LIVE_PROVIDER=codex
export AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit
```

The harness drives the attached session with:

```bash
codex exec -s read-only '<prompt>'
```

The provider output must include `AIWG_COCKPIT_LIVE_OK` and `issue-audit`, unless
`AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT` intentionally names a replacement.

### Claude

Use this profile for #1632.

```bash
export AIWG_COCKPIT_LIVE_PROVIDER=claude
export AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit
```

The harness drives the attached session with:

```bash
claude --print --permission-mode dontAsk --output-format text '<prompt>'
```

If Claude reports login required inside the managed session, preserve the report
as blocked evidence for #1632. The 2026-06-19 isolated host proof shows Claude
can use operator-approved auth state in a managed host session when the host
agent registers through the mTLS bootstrap path. Do not copy Claude auth files
or tokens into Cockpit, reports, browser storage, or activity logs.

## Tier 0 - Mock Baseline

Purpose: deterministic CI and UI regression coverage.

```bash
npm --prefix apps/cockpit run check
```

Expected result: the Cockpit package build, typecheck, render tests, smokes, and
security PoCs pass. This tier cannot satisfy release UAT by itself.

## Tier 1 - Real Executor Smoke

Purpose: prove the Bridge can reach a real executor and normalize real inventory.

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/cockpit-real-uat-<date> \
npm run uat:cockpit-live
```

Required evidence:

- Bridge health against the real executor URL.
- Inventory posture normalization.
- Runtime posture and transport posture.
- Session metadata when the executor exposes sessions.
- Task projection or exact executor-backed skip reason.

## Tier 2 - Codex Provider UAT

Purpose: preserve Codex-specific real-session evidence for #1631.

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1 \
AIWG_COCKPIT_LIVE_PROVIDER=codex \
AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/cockpit-real-codex-matrix-<date> \
npm run uat:cockpit-live:matrix
```

Host-only rehearsal evidence is acceptable for #1631 only when the report also
records exact Docker/container and VM blockers and links #1621. It does not close
the parent strict matrix gate.

## Tier 2A - Host PTY Drive/Mutation UAT

Purpose: preserve evidence that Cockpit can observe a real managed PTY, inject a
provider prompt, then inject a direct command into a fresh PTY on the same target
and verify target data changed.

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_TARGETS=host \
AIWG_COCKPIT_LIVE_PROVIDER=codex \
AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_MUTATION_FILE=/absolute/path/to/safe-test-artifact.txt \
AIWG_COCKPIT_LIVE_MUTATION_TEXT='cockpit mutation proof <date> codex host pty' \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/cockpit-real-codex-mutation-<date> \
npm run uat:cockpit-live:matrix
```

Required evidence:

- Provider workload emits `AIWG_COCKPIT_LIVE_OK` and `issue-audit` from a real
  managed host session.
- Mutation session grants observe attach and controller drive attach.
- Mutation command is injected through `pty.session_input`, emits
  `AIWG_COCKPIT_MUTATION_OK`, and writes the exact expected file content.
- The report records `mutation_file`, `mutation_marker`, and the host
  `matrix host` PASS detail.

This tier is scoped host evidence. It does not replace Tier 4 strict
host/container/VM release evidence.

## Tier 3 - Claude Provider UAT

Purpose: preserve Claude auth-state and real-session evidence for #1632.

```bash
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:<real-executor-port> \
AIWG_COCKPIT_LIVE_REQUIRED=1 \
AIWG_COCKPIT_LIVE_MATRIX_REQUIRED=1 \
AIWG_COCKPIT_LIVE_PROVIDER=claude \
AIWG_COCKPIT_LIVE_DISCOVERY_EXPECT=issue-audit \
AIWG_COCKPIT_EXECUTOR_VERSION=<agentic-sandbox-tag-or-commit> \
AIWG_COCKPIT_LIVE_REPORT=.aiwg/testing/cockpit-real-claude-matrix-<date> \
npm run uat:cockpit-live:matrix
```

Claude release evidence requires a managed target session that can use
operator-approved Claude auth state without Cockpit reading or storing secrets.
If auth regresses, record the run as blocked and link
`roctinam/agentic-sandbox#499`.

## Tier 4 - Strict Host/Container/VM Matrix

Purpose: release-grade UAT for #1621.

Prerequisites:

- Host runtime target registered and session-capable.
- Docker/container target registered and session-capable.
- VM target registered and session-capable.
- Every target exposes enough runtime, transport, and backend metadata for
  Cockpit to normalize posture.

Required evidence:

- `matrix host`: PASS.
- `matrix container`: PASS.
- `matrix vm`: PASS.
- No mock allowance.
- Report includes executor URL, executor identity/version, provider, discovery
  expectation, target family, instance id, runtime family, backend, timestamps,
  conformance report path if available, and artifact paths.

## Tier 5 - Manual Operator Workflow UAT

Purpose: validate the operator experience using the same real executor.

1. Open Cockpit through the Bridge URL.
2. Compare `Topology` and `Handoff` Home modes for #1622.
3. Verify inventory posture labels for host, Docker/container, and VM.
4. Create a managed session, observe first, then explicitly drive when allowed.
5. Search Explore for `issue audit` and confirm real AIWG discovery results.
6. Use Actions to inject one safe read-only command into the session.
7. Confirm Running reflects the provider workload or records a clear absence.
8. Process a real or seeded HITL prompt.
9. Restart the Bridge and verify reattach does not perturb the target session.

## Artifact Paths

Use these names unless the release operator supplies a dated successor:

| Tier | Markdown/JSON base |
| --- | --- |
| Real smoke | `.aiwg/testing/cockpit-real-uat-<date>` |
| Codex smoke | `.aiwg/testing/cockpit-real-codex-smoke-<date>` |
| Codex matrix/status | `.aiwg/testing/cockpit-real-codex-matrix-<date>` |
| Codex host PTY mutation | `.aiwg/testing/cockpit-real-codex-mutation-<date>` |
| Claude smoke | `.aiwg/testing/cockpit-real-claude-smoke-<date>` |
| Claude matrix/status | `.aiwg/testing/cockpit-real-claude-matrix-<date>` |
| Strict matrix | `.aiwg/testing/cockpit-real-matrix-uat-<date>` |

## Current 2026-06-19 State

- Host Codex proof exists from `.aiwg/testing/cockpit-real-codex-matrix-2026-06-19.*`:
  a real host agent registered over mTLS, opened a managed `tmux` session,
  launched Codex inside that session, and returned `AIWG_COCKPIT_LIVE_OK` plus
  `issue-audit`.
- Host PTY mutation proof exists from
  `.aiwg/testing/cockpit-real-codex-mutation-2026-06-19.*`: Cockpit used a real
  host managed session for Codex prompt injection, then used a fresh host
  managed PTY session to inject a command and verify
  `.aiwg/testing/cockpit-pty-mutation-2026-06-19.txt` contained
  `cockpit mutation proof 2026-06-19 codex host pty`.
- Host Claude proof exists from `.aiwg/testing/cockpit-real-claude-matrix-2026-06-19.*`:
  the same real host/mTLS/session path launched Claude inside the managed
  session and returned `AIWG_COCKPIT_LIVE_OK` plus `issue-audit`.
- Docker/container is still blocked by secure transport provisioning,
  `roctinam/agentic-sandbox#497`.
- VM is still blocked by guest registration/session readiness,
  `roctinam/agentic-sandbox#498`.
- `roctinam/agentic-sandbox#499` should be treated as previously reproduced but
  not reproduced by the 2026-06-19 isolated host proof; keep the issue linked
  for regression tracking until upstream closes it.

Keep #1621 open until the strict host, Docker/container, and VM matrix passes
without `AIWG_COCKPIT_LIVE_ALLOW_MOCK_MATRIX=1`.
