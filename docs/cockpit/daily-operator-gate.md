# Cockpit Daily Linux Operator Gate

The daily gate is the bounded, report-producing proof for Cockpit's supported
Linux lane. It requires a real protected agentic-sandbox executor, a host
runtime, and a container runtime. VM and Apple rows are always reported as
preview and do not block the Linux result.

This is an operator-controlled test. It provisions temporary runtimes, drives
managed PTYs, interrupts connectivity, restarts the executor, and rehearses an
upgrade and rollback. Obtain the approvals required by the host's operations
policy before running it. Never overlap it with another E2E lane.

## One command

Prepare the environment and then run:

```bash
npm run uat:cockpit-daily
```

The command accepts no positional arguments, credentials, or inline hook
commands. All credentials stay behind file references. Hooks are executable
files invoked directly without a shell; their stdout and stderr are discarded
so they cannot become report content.

Required configuration:

```bash
export AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122
export AIWG_COCKPIT_EXECUTOR_TOKEN_FILE=/protected/path/cockpit-executor.token
export AIWG_COCKPIT_LIVE_PROVIDER=codex

export AIWG_COCKPIT_DAILY_PREVIOUS_AIWG_VERSION=2026.7.14
export AIWG_COCKPIT_DAILY_CANDIDATE_AIWG_VERSION=2026.7.15
export AIWG_COCKPIT_DAILY_PREVIOUS_EXECUTOR_VERSION=v2026.7.9
export AIWG_COCKPIT_DAILY_CANDIDATE_EXECUTOR_VERSION=v2026.7.10

export AIWG_COCKPIT_DAILY_UPGRADE_HOOK=/operator/hooks/cockpit-upgrade
export AIWG_COCKPIT_DAILY_ROLLBACK_HOOK=/operator/hooks/cockpit-rollback
export AIWG_COCKPIT_DAILY_TRANSIENT_HOOK=/operator/hooks/cockpit-transient
export AIWG_COCKPIT_DAILY_EXECUTOR_RESTART_HOOK=/operator/hooks/cockpit-executor-restart

export AIWG_COCKPIT_LIVE_EXPECT_CWD_HOST=/home/operator
export AIWG_COCKPIT_LIVE_EXPECT_CWD_CONTAINER=/home/agent
export AIWG_COCKPIT_LIVE_MUTATION_FILE=/operator/scratch/cockpit-daily-mutation
export AIWG_COCKPIT_LIVE_PROVISION_IMAGE=agentic/codex@sha256:<digest>
```

The token file must be a regular file inaccessible to group and other users
(mode `0600` on Unix). The mutation path must be a harmless, gate-owned scratch
path visible at the same location from the test runner and the temporary target
(for a container, use a scoped bind mount or loadout). The gate verifies exact
content and removes the mutation file during scoped cleanup. The container image
must use an immutable tag or digest; `latest` fails preflight.

Use exact CalVer package versions for AIWG and an immutable release version or
commit for the executor. Mutable names such as `main` and `latest` fail
preflight. The globally resolved `aiwg --version` must match the declared AIWG
version before upgrade, after upgrade, and after rollback. A real executor
identity endpoint must contain the declared executor version/commit in every
smoke phase; the live UAT's operator hint is recorded for context but cannot
satisfy this identity check by itself.

## Hook contract

Hooks receive only a narrow environment: `PATH`, `HOME`, `TMPDIR`, the executor
URL, the executor **token-file reference**, and the variables below. They never
receive a credential value in argv.

| Hook | `AIWG_COCKPIT_DAILY_ACTION` | Required behavior |
|---|---|---|
| upgrade | `upgrade` | Install the declared candidate AIWG/executor builds and return after readiness |
| rollback | `rollback` | Restore both declared previous-stable builds and return after readiness |
| transient | `disconnect`, then `restore` | Interrupt only the Bridge-to-executor path, then restore it without restarting the Bridge |
| executor restart | `restart` | Restart the executor in place and return after its listener is ready |

Upgrade and rollback hooks also receive
`AIWG_COCKPIT_DAILY_FROM_VERSION` and
`AIWG_COCKPIT_DAILY_TO_VERSION`, plus all four explicit product-specific
previous/candidate version variables. The recovery hooks receive
`AIWG_COCKPIT_EXECUTOR_URL` and
`AIWG_COCKPIT_EXECUTOR_TOKEN_FILE`.

Hooks must be bounded, idempotent where practical, and scoped to this gate's
executor. They must not start a second E2E lane, print secrets, remove unrelated
runtimes, or broaden host mutation. The wrapper attempts rollback after every
attempted upgrade, including a failed or partially applied upgrade. A successful
gate intentionally finishes on the declared previous-stable versions after the
rollback smoke.

## What must pass

The candidate phase provisions one gate-owned host target and one gate-owned
container target through the Bridge. For both it verifies protected inventory,
lifecycle mutation, session create/list, observer and controller attach, a real
provider-backed AIWG discovery workload, the exact managed-PTY working
directory, and the scratch mutation. It then proves:

- unauthenticated upstream inventory remains an explicit `401` or `403`;
- the same Bridge recovers inventory, running/session projections, and SSE
  after the transient hook, without a Bridge or browser restart;
- a Bridge restart re-adopts and reattaches every created managed session;
- an executor restart re-adopts and reattaches those sessions; and
- only gate-created sessions and instances are removed during cleanup.

The wrapper runs a previous-stable smoke, the upgrade hook, the full candidate
phase, the rollback hook, and a previous-stable rollback smoke. Missing evidence,
an unreachable or mock executor, missing authentication, any required skip,
cleanup failure, version mismatch, or secret-pattern finding makes the final
result fail.

Synthetic unit/integration tests validate orchestration and report semantics,
but their reports use `mode: synthetic` and can never satisfy this live gate.

## Reports and preview rows

Default artifacts are mode `0600`:

- `test-results/cockpit-daily-gate.json`
- `test-results/cockpit-daily-gate.md`
- phase reports beside them with `.previous_stable_smoke`, `.candidate_smoke`,
  and `.rollback_smoke` suffixes

Set `AIWG_COCKPIT_DAILY_REPORT` to change the report basename. The JSON schema is
`aiwg.cockpit-daily-gate/v1`; check and runtime rows have stable ordering.
Reports identify exact AIWG/executor versions, timings, required failures, and
linked blockers, while recording only the boolean authentication posture.

VM and Apple default to explicit `skip` preview rows. A separate preview run may
feed sanitized status/evidence into:

```bash
export AIWG_COCKPIT_DAILY_VM_STATUS=pass
export AIWG_COCKPIT_DAILY_VM_EVIDENCE='preview run artifact vm-report.json'
export AIWG_COCKPIT_DAILY_APPLE_STATUS=blocked
export AIWG_COCKPIT_DAILY_APPLE_EVIDENCE='preview capacity blocker devops#53'
export AIWG_COCKPIT_DAILY_BLOCKERS='aiwg#1732,devops#53'
```

Preview failures and blockers remain visible but do not turn a green Linux
host/container result red.

## Recovery after a failed run

1. Read the Markdown report first; it lists required failures without hook
   output or credentials.
2. Confirm the rollback phase and rollback smoke. If rollback failed, follow
   the operator-owned rollback procedure directly before another run.
3. Reconcile only gate-prefixed resources created by the failed run. Do not
   delete an instance merely because it appears in inventory.
4. Fix the named phase or linked upstream blocker, then rerun the same command.

See [Recovery](./recovery.md) for runtime-specific session semantics and
[Trust & Security](./trust-and-security.md) for credential custody and audit
redaction.
