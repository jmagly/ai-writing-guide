# Twelve-Factor Design Checklist

Use this checklist before or during implementation.

## Original Twelve-Factor Criteria

- Codebase: one codebase per app with explicit deploys.
- Dependencies: dependencies are declared, isolated, and reproducible.
- Config: environment-specific config is externalized from code.
- Backing services: attached services are treated as replaceable resources.
- Build, release, run: build artifacts, release config, and runtime execution are separated.
- Processes: application processes are stateless and share nothing.
- Port binding: the app exports services through explicit ports or equivalent platform contracts.
- Concurrency: horizontal scaling is handled through process model or platform workers.
- Disposability: startup and shutdown are fast, graceful, and restart-safe.
- Dev/prod parity: development, staging, and production stay similar enough to catch drift.
- Logs: logs are emitted as event streams for platform collection.
- Admin processes: administrative tasks run as one-off processes with release context.

## Modern Extension Criteria

- API-first contracts: external contracts are versioned, reviewed, and tested.
- Telemetry: metrics, traces, logs, SLOs, and alerts are designed before launch.
- Security by default: authentication, authorization, secrets, input validation, and secure defaults are explicit.
- Supply-chain provenance: build inputs, artifacts, SBOMs, signatures, and provenance are planned.
- Dependency hygiene: dependency update, vulnerability, and license workflows are defined.
- Runtime disposability: termination, health checks, retries, idempotency, and state recovery are designed.
- Platform portability: platform-specific dependencies are isolated and documented.

## Design Review Questions

- What factor decisions need ADR coverage?
- Which factor claims require implementation or runtime evidence later?
- Which gaps should become delivery issues before coding starts?
- Which factors rely on platform capabilities outside the application repository?
