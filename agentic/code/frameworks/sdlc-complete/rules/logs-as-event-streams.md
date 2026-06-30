---
enforcement: medium
name: logs-as-event-streams
severity: HIGH
category: observability
factor: 12-factor-XI
---

# Logs as Event Streams

**Enforcement Level**: MEDIUM
## Rule

Applications must write logs as an unbuffered stream of events to stdout and stderr. The environment — container runtime, systemd, orchestrator, or log shipper — is responsible for routing, aggregation, persistence, and rotation.

**Why:** File-based logging breaks container log aggregation, Kubernetes log collection, and cloud-native observability stacks. When the app manages log files, it's doing the environment's job badly (and duplicating storage, rotation, and retention concerns).

**How to apply:**

### Output
- Write logs to `stdout` (normal operation) and `stderr` (errors/warnings)
- Do not open or write to local log files
- Do not configure log rotation in the application
- Do not depend on a syslog daemon being present

### Format
- Structured JSON lines preferred for machine consumption
- Include at minimum: `timestamp`, `level`, `message`, correlation/trace IDs
- Text format acceptable for local development but JSON should be default in deployed environments

### Levels
- Standard levels: `debug`, `info`, `warn`, `error`
- Log level controlled via environment variable (e.g. `LOG_LEVEL=info`)
- `debug` disabled by default in production

### Correlation
- Every request/job gets a correlation ID in its logs
- Propagate correlation IDs across service boundaries (headers, message attributes)

## What to check

1. **No `FileHandler`, `RotatingFileHandler`, `logging.config.fileConfig` with local paths** in source
2. **Logging library configured to write to stdout/stderr** with JSON formatter
3. **`LOG_LEVEL` environment variable** respected by the application
4. **Operational readiness checklist confirms** structured logging format
5. **Correlation IDs emitted** for every request — check middleware/interceptors

## Acceptable deviations (require ADR)

- **Security/audit logs requiring tamper-evident local storage** — write to stdout AND append-only local file, with documented retention pipeline
- **Embedded systems or offline-first apps** — local log files may be necessary; ship plan for later export
- **Regulated environments** — specific log format or destination may be mandated; capture in ADR

## Related

- Factor XI (logs as event streams) — https://12factor.net/logs
- `agents/reliability-engineer.md` — reviews observability
- Issue #821 — 12-factor gap analysis
