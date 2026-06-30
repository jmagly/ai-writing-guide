---
enforcement: medium
---

# Service Health Check Requirement

**Enforcement Level**: MEDIUM
**Scope**: All deployed services and applications documented in the IT extension
**Issue**: #491

## Principle

Every deployed service must have a defined, documented health check. A service without a health check is a service whose failures can only be detected by users.

## Mandatory Rules

1. **Health check required for every service**: Every application profile must include at least one health check endpoint or verification command. The health check must be documented in the application template's Health Checks section.

2. **Document expected healthy state**: Each health check must specify what a healthy response looks like (status code, response body pattern, command exit code). A health check without expected output is not a health check.

3. **Health check must be automatable**: The health check must be executable by monitoring systems without human intervention. Interactive checks or checks requiring manual interpretation do not satisfy this rule.

4. **Types of health checks** (at least one required, all three recommended):
   - **Liveness**: Is the process running? (e.g., HTTP 200 from `/healthz`)
   - **Readiness**: Can the service handle requests? (e.g., database connection confirmed)
   - **Deep health**: Are all dependencies healthy? (e.g., all downstream services reachable)

5. **Health checks must not have side effects**: A health check must be safe to call at any frequency without modifying state, consuming significant resources, or generating billable API calls.

6. **Stale health checks are invalid**: If a service's architecture changes (new dependency, new endpoint, changed port), the health check must be updated to reflect the current architecture.

## Validation

When creating or reviewing service documentation:

- [ ] At least one health check is documented
- [ ] Expected healthy output is specified
- [ ] Health check can be executed programmatically
- [ ] Health check covers critical dependencies
- [ ] Health check URL/command is current and tested

## Rationale

Health checks are the foundation of automated monitoring, alerting, and self-healing. Without them, service failures are detected by angry users instead of monitoring systems. The cost of adding a health endpoint is trivial compared to the cost of undetected downtime.
