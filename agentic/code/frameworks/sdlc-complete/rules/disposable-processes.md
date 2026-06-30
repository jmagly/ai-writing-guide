---
enforcement: medium
name: disposable-processes
severity: HIGH
category: reliability
factor: 12-factor-IX
---

# Disposable Processes

**Enforcement Level**: MEDIUM
## Rule

Processes must start fast and shut down gracefully. The runtime environment can kill or restart any process at any moment — the application must tolerate this without data loss, in-flight work loss, or noticeable user impact.

**Why:** Disposability enables rolling deployments, autoscaling, crash recovery, and operator-initiated restarts. Undisposable processes force long deploy windows, cause data loss on crash, and waste autoscaling cost.

**How to apply:**

### Fast startup
- **Target**: < 10 seconds from process launch to ready-to-serve
- Avoid loading full datasets at startup — lazy-load from backing services
- Avoid synchronous warm-up that blocks readiness
- Readiness probe should return ready only when the process can actually serve traffic

### Graceful shutdown
- Register SIGTERM handler in the main process entry point
- On SIGTERM: stop accepting new work, finish in-flight work within a grace window, flush buffers, close connections, exit cleanly
- Grace window should be shorter than the orchestrator's SIGKILL timeout (typically < 30s)
- Workers consuming queues: return the in-flight message to the queue before exiting

### Crash safety
- Any work that can't be redone must be checkpointed to a backing service before acknowledgment
- Idempotency keys for any operation that could retry after crash
- Database transactions wrap multi-step operations

## What to check

1. **Main process entry point has a SIGTERM handler** that initiates graceful shutdown
2. **Readiness probe** distinguishes "running" from "ready to serve"
3. **Startup time measured** and documented in `operational-readiness-checklist`
4. **Rolling restart strategy** in `deployment-plan` specifies grace window and SIGKILL timeout
5. **Queue consumers** use visibility timeouts or ack-on-success patterns

## Acceptable deviations (require ADR)

- **Stateful services** (databases, message brokers) — these have their own disposability patterns
- **Batch jobs with long-running compute** — must still implement checkpointing; raw restart-from-zero is unacceptable
- **Legacy monoliths mid-migration** — temporary allowed with documented remediation plan

## Related

- Factor IX (disposability) — https://12factor.net/disposability
- Factor VI (stateless processes) — prerequisite
- `rules/stateless-processes.md` — companion rule
- Issue #821 — 12-factor gap analysis
