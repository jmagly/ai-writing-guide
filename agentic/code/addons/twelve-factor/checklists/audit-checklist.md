# Twelve-Factor Audit Checklist

Use this checklist to collect implementation and runtime evidence.

## Evidence Sources

- Source tree, module boundaries, dependency manifests, and lockfiles
- Configuration files, environment variable documentation, and secret handling records
- Deployment manifests, container definitions, release metadata, and platform configuration
- API contracts, event schemas, compatibility tests, and consumer documentation
- Unit, integration, contract, smoke, resilience, and operational tests
- CI/CD workflows, artifact signing, SBOM, provenance, and vulnerability scan outputs
- Logs, metrics, traces, dashboards, alerts, runbooks, and incident records
- ADRs, requirements, security reviews, quality gates, and issue tracker links

## Factor Checks

- Codebase: repository and deploy mapping are explicit.
- Dependencies: declared dependencies and lockfiles are consistent.
- Config: environment config is externalized and documented.
- Backing services: external services are attachable, replaceable, and failure-mode aware.
- Build/release/run: artifact creation, release configuration, and runtime are separable.
- Processes: service state is externalized or intentionally bounded.
- Ports: service ingress is explicit and testable.
- Concurrency: scaling model and queue/worker boundaries are documented.
- Disposability: health, readiness, shutdown, retries, and idempotency are tested.
- Dev/prod parity: drift is measured or constrained.
- Logs: logs are structured enough for platform collection.
- Admin processes: operational jobs run with release context and auditability.
- API-first: contracts are versioned, tested, and traceable.
- Telemetry: metrics, traces, logs, dashboards, alerts, and SLOs are present.
- Security: auth, secrets, input handling, secure defaults, and threat assumptions are evidenced.
- Supply chain: build provenance, artifact integrity, SBOM, and signing evidence exists.
- Dependency hygiene: update cadence, vulnerability triage, and license posture are evidenced.
- Platform portability: portability constraints and platform-specific choices are documented.
