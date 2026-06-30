---
enforcement: medium
name: stateless-processes
severity: HIGH
category: architecture
factor: 12-factor-VI
---

# Stateless Processes

**Enforcement Level**: MEDIUM
## Rule

Application processes must be stateless. Any data that must survive beyond a single request or job must be externalized to a backing service (database, cache, object store, queue).

**Why:** Stateful processes break horizontal scaling, rolling deployments, and disposability. A process holding in-memory session state cannot be replaced, restarted, or scaled without data loss.

**How to apply:**
- Session data → external session store (Redis, database, signed cookie)
- Uploaded files → object store (S3, GCS) not local disk
- Caches that must survive restart → external cache (Redis, Memcached)
- Background work state → queue or database, not in-memory worker state
- Local disk writes are permitted only for: `/tmp` scratch, pre-declared volume mounts, structured logs to stdout

## What to check

1. **Every process type has an entry in the SAD "Process State Model" table** listing state kind + storage location
2. **No file writes outside `/tmp` or declared volume paths** without an ADR justifying the deviation
3. **No session state, cache, or business data** stored in module-level variables, class instances, or local files
4. **If using sticky sessions, that decision is an ADR** explicitly trading scaling flexibility for session consistency

## Acceptable deviations (require ADR)

- **Event-sourced systems** where the process is a write-ahead log cache (still must support rebuild from storage)
- **Specialized compute with local scratch** (ML training checkpoints, video transcoding) — must declare volume mount
- **Legacy migrations** — temporary allowed, ADR must include remediation timeline

## Related

- Factor VI (stateless processes) — https://12factor.net/processes
- Factor IX (disposability) — depends on this rule
- `rules/disposable-processes.md` — companion rule
- Issue #821 — 12-factor gap analysis
