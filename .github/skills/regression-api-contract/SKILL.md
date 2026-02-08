# regression-api-contract

Detect breaking changes in API contracts across REST, GraphQL, and gRPC interfaces.

## Triggers

- "API breaking change"
- "contract regression"
- "schema compatibility"
- "API compatibility check"
- "breaking API change"
- "API contract drift"
- "backward compatibility"
- "API version check"

## Purpose

This skill detects API contract regressions by:
- Identifying breaking changes in REST API endpoints
- Detecting schema changes in request/response contracts
- Validating GraphQL schema compatibility
- Checking gRPC/protobuf definition changes
- Enforcing semantic versioning compliance
- Integrating consumer contract testing (Pact, Spring Cloud Contract)

## Behavior

When triggered, this skill:

1. **Identifies API contract scope**:
   - Discover API definition files (OpenAPI, GraphQL, protobuf)
   - Identify baseline version for comparison
   - Determine API type (REST, GraphQL, gRPC)
   - Locate consumer contract tests

2. **Compares contracts to baseline**:
   - Load current API definition
   - Load baseline API definition
   - Run compatibility analysis using appropriate tools
   - Generate detailed diff of changes

3. **Classifies changes by severity**:
   - **BREAKING**: Removed endpoints, fields, or enum values; type changes; new required fields
   - **NON-BREAKING**: New optional fields, new endpoints, extended enums
   - **DEPRECATED**: Marked for future removal
   - **INTERNAL**: Implementation changes with no contract impact

4. **Validates semantic versioning**:
   - Check if version increment matches change type
   - Ensure breaking changes trigger major version bump
   - Verify non-breaking changes use minor/patch versions
   - Flag version mismatches

5. **Runs consumer contract tests**:
   - Execute Pact or Spring Cloud Contract tests
   - Validate against consumer expectations
   - Identify consumers affected by changes
   - Generate compatibility matrix

6. **Generates compatibility report**:
   - List all breaking changes with locations
   - Document affected consumers
   - Recommend version bump strategy
   - Suggest migration paths for consumers

## Breaking Change Categories

### REST API Breaking Changes

```yaml
rest_breaking_changes:
  removed:
    - endpoint: "DELETE /api/v1/users/{id}"
      severity: BREAKING
      reason: "Endpoint removed entirely"

    - field: "email" from "User" response
      severity: BREAKING
      reason: "Required field removed from response"

    - enum_value: "PENDING" from "OrderStatus"
      severity: BREAKING
      reason: "Enum value removed"

  modified:
    - field: "created_at"
      from_type: "string"
      to_type: "integer"
      severity: BREAKING
      reason: "Field type changed"

    - field: "email"
      from_required: false
      to_required: true
      severity: BREAKING
      reason: "Optional field made required in request"

    - constraint: "password"
      from: "minLength: 6"
      to: "minLength: 12"
      severity: BREAKING
      reason: "Stricter validation on request field"

  renamed:
    - endpoint: "GET /api/v1/user/{id}"
      to: "GET /api/v1/users/{id}"
      severity: BREAKING
      reason: "Path renamed without redirect/alias"

    - parameter: "userId"
      to: "user_id"
      severity: BREAKING
      reason: "Parameter renamed without backward compatibility"
```

### GraphQL Schema Breaking Changes

```yaml
graphql_breaking_changes:
  removed:
    - field: "User.email"
      severity: BREAKING
      reason: "Field removed from type"

    - argument: "Query.users(filter: UserFilter)"
      severity: BREAKING
      reason: "Required argument removed"

    - type: "Address"
      severity: BREAKING
      reason: "Type removed from schema"

  modified:
    - field: "User.age"
      from_type: "Int"
      to_type: "String"
      severity: BREAKING
      reason: "Field type changed"

    - field: "User.email"
      from_nullable: true
      to_nullable: false
      severity: BREAKING
      reason: "Field made non-nullable"

    - argument: "Query.user(id: ID)"
      from_optional: true
      to_optional: false
      severity: BREAKING
      reason: "Argument made required"

  interface_changes:
    - interface: "Node"
      removed_implementation: "User"
      severity: BREAKING
      reason: "Type no longer implements interface"
```

### gRPC/Protobuf Breaking Changes

```yaml
grpc_breaking_changes:
  removed:
    - field: "UserMessage.email"
      field_number: 3
      severity: BREAKING
      reason: "Field removed from message"

    - service: "UserService"
      severity: BREAKING
      reason: "Service removed"

    - rpc: "UserService.GetUser"
      severity: BREAKING
      reason: "RPC method removed"

  modified:
    - field: "UserMessage.age"
      from_type: "int32"
      to_type: "string"
      severity: BREAKING
      reason: "Field type changed"

    - field: "UserMessage.name"
      from_label: "optional"
      to_label: "required"
      severity: BREAKING
      reason: "Field made required"

    - field_number: 5
      from_reserved: false
      to_reserved: true
      severity: BREAKING
      reason: "Field number reserved (deletion)"

  renamed:
    - message: "User"
      to: "UserAccount"
      severity: BREAKING
      reason: "Message type renamed"

    - enum: "Status"
      to: "OrderStatus"
      severity: BREAKING
      reason: "Enum renamed"
```

## API Contract Tools Integration

### OpenAPI/REST

```yaml
openapi_tools:
  primary: openapi-diff
  alternatives:
    - oasdiff
    - swagger-diff
    - api-diff

  usage:
    install: "npm install -g openapi-diff"
    compare: |
      openapi-diff \
        .aiwg/api/baselines/openapi-v1.yaml \
        .aiwg/api/current/openapi.yaml \
        --format markdown \
        --breaking-only
    output: ".aiwg/api/compatibility/openapi-diff.md"

  configuration:
    strict_mode: true
    ignore_descriptions: true
    treat_as_breaking:
      - removed_endpoints
      - removed_fields
      - type_changes
      - required_field_additions
      - enum_value_removals
```

### GraphQL

```yaml
graphql_tools:
  primary: graphql-inspector
  alternatives:
    - apollo-cli (schema:check)
    - graphql-schema-diff

  usage:
    install: "npm install -g @graphql-inspector/cli"
    compare: |
      graphql-inspector diff \
        .aiwg/api/baselines/schema-v1.graphql \
        .aiwg/api/current/schema.graphql \
        --onComplete report.json
    output: ".aiwg/api/compatibility/graphql-diff.json"

  configuration:
    fail_on_breaking: true
    include_dangerous: true
    schema_extensions: true
```

### gRPC/Protobuf

```yaml
protobuf_tools:
  primary: buf
  alternatives:
    - prototool
    - protoc-gen-validate

  usage:
    install: "brew install buf" # or "go install github.com/bufbuild/buf/cmd/buf@latest"
    setup: |
      # Create buf.yaml
      version: v1
      breaking:
        use:
          - FILE
      lint:
        use:
          - DEFAULT
    compare: |
      buf breaking \
        .aiwg/api/current \
        --against .aiwg/api/baselines/v1
    output: "Breaking change detection via buf CLI"

  configuration:
    breaking_rules:
      - FIELD_SAME_TYPE
      - FIELD_NO_DELETE
      - ENUM_VALUE_NO_DELETE
      - RPC_NO_DELETE
      - MESSAGE_NO_DELETE
```

## Semantic Versioning Compliance

```yaml
semver_validation:
  rules:
    breaking_change:
      requires: major_version_bump
      examples:
        - "v1.2.3 → v2.0.0"
      violations:
        - detected: breaking_change
          version_change: "v1.2.3 → v1.3.0"
          verdict: VIOLATION
          message: "Breaking change detected but only minor version bumped"

    non_breaking_addition:
      requires: minor_version_bump
      examples:
        - "v1.2.3 → v1.3.0"
      acceptable:
        - "v1.2.3 → v2.0.0"  # Major bump also acceptable

    bug_fix:
      requires: patch_version_bump
      examples:
        - "v1.2.3 → v1.2.4"
      acceptable:
        - "v1.2.3 → v1.3.0"  # Minor/major also acceptable

  enforcement:
    block_deployment: true  # Block if version mismatch
    require_override: true  # Allow manual override with justification
```

## Consumer Contract Testing

### Pact Integration

```yaml
pact_integration:
  provider: api-service
  consumers:
    - name: web-frontend
      pact_file: ".aiwg/api/pacts/web-frontend.json"
      criticality: high

    - name: mobile-app
      pact_file: ".aiwg/api/pacts/mobile-app.json"
      criticality: high

    - name: partner-api
      pact_file: ".aiwg/api/pacts/partner-api.json"
      criticality: medium

  verification:
    run: |
      npm run test:pact
      # Verifies provider meets all consumer contracts
    on_failure:
      action: block_deployment
      notification: consumers_affected

  compatibility_matrix:
    provider_version: v2.0.0
    consumers:
      - consumer: web-frontend
        version: v1.5.0
        compatible: true
        tests_passing: 45/45

      - consumer: mobile-app
        version: v2.1.0
        compatible: false
        tests_passing: 38/42
        failing_tests:
          - "POST /api/users - email field type mismatch"
          - "GET /api/users/{id} - missing 'phone' field"

      - consumer: partner-api
        version: v1.0.0
        compatible: true
        tests_passing: 12/12
```

### Spring Cloud Contract

```yaml
spring_cloud_contract:
  contracts_location: ".aiwg/api/contracts/"
  consumers:
    - name: order-service
      contracts: "contracts/order-service/**/*.groovy"

    - name: payment-service
      contracts: "contracts/payment-service/**/*.groovy"

  verification:
    run: "./mvnw clean test"
    stub_generation: true
    publish_stubs: true

  compatibility_check:
    baseline: v1.0.0
    current: v2.0.0
    results:
      - consumer: order-service
        compatible: true
        contracts_verified: 8/8

      - consumer: payment-service
        compatible: false
        contracts_verified: 5/7
        failures:
          - "User schema missing 'email' field"
          - "Order status enum missing 'PENDING'"
```

## API Compatibility Report

```markdown
# API Compatibility Report

**Date**: 2026-01-28
**Baseline**: v1.5.0 (OpenAPI)
**Current**: v2.0.0
**API Type**: REST (OpenAPI 3.0)

## Executive Summary

**Status**: ⚠️ BREAKING CHANGES DETECTED
**Severity**: HIGH
**Breaking Changes**: 5
**Non-Breaking Changes**: 12
**Version Compliance**: ✅ CORRECT (major bump)
**Consumer Impact**: 2 of 4 consumers affected

## Version Validation

| Aspect | Baseline | Current | Required | Status |
|--------|----------|---------|----------|--------|
| Version | v1.5.0 | v2.0.0 | v2.x.x | ✅ CORRECT |
| Reason | - | Breaking changes detected | Major bump | ✅ VALID |

## Breaking Changes

### 1. Removed Endpoint

**Endpoint**: `DELETE /api/v1/users/{id}`
**Severity**: BREAKING
**Impact**: HIGH

**Details**:
- Endpoint removed entirely from API
- No replacement or redirect provided
- Used by 2 consumers: `web-frontend`, `admin-panel`

**Consumer Impact**:
- web-frontend: 3 call sites affected
- admin-panel: 1 call site affected

**Recommendation**:
- Provide migration path: Use `POST /api/v1/users/{id}/deactivate` instead
- Update consumer documentation
- Consider deprecation period instead of immediate removal

### 2. Field Removed: `User.email`

**Resource**: `User` (GET /api/v1/users/{id} response)
**Field**: `email`
**Severity**: BREAKING
**Impact**: CRITICAL

**Details**:
- Required field `email` removed from User response
- Breaking for consumers expecting this field
- No alternative field provided

**Consumer Impact**:
- web-frontend: AFFECTED (displays user email in profile)
- mobile-app: AFFECTED (uses email for contact)
- partner-api: NOT AFFECTED (does not use email)

**Recommendation**:
- DO NOT REMOVE - Add deprecation warning instead
- Or provide migration: Add `contactInfo.email` as replacement
- Document migration path clearly

### 3. Field Type Changed: `created_at`

**Field**: `created_at`
**From**: `string` (ISO-8601)
**To**: `integer` (Unix timestamp)
**Severity**: BREAKING
**Impact**: HIGH

**Details**:
- Field type incompatible change
- All consumers parsing as ISO-8601 will break
- No backward compatibility layer

**Consumer Impact**:
- ALL CONSUMERS AFFECTED (4/4)
- Requires code changes in all consumers

**Recommendation**:
- Add `created_at_unix` as new field (non-breaking)
- Deprecate `created_at` string format
- Maintain both for 2 versions before removing string format

### 4. New Required Field: `password_policy`

**Endpoint**: `POST /api/v1/users`
**Field**: `password_policy`
**Severity**: BREAKING
**Impact**: MEDIUM

**Details**:
- New field added as required in request body
- Consumers not sending this field will get 400 errors
- Breaking for existing integrations

**Consumer Impact**:
- web-frontend: AFFECTED (user registration form)
- mobile-app: AFFECTED (sign-up flow)

**Recommendation**:
- Make field optional with sensible default
- Or add default value if not provided
- Document new requirement clearly

### 5. Enum Value Removed: `OrderStatus.PENDING`

**Enum**: `OrderStatus`
**Value**: `PENDING`
**Severity**: BREAKING
**Impact**: HIGH

**Details**:
- Enum value removed without replacement
- Consumers comparing against `PENDING` will break
- Orders in `PENDING` state require migration

**Consumer Impact**:
- order-service: CRITICAL (manages pending orders)
- payment-service: AFFECTED (checks pending status)

**Recommendation**:
- DO NOT REMOVE - Deprecate instead
- Or provide mapping: `PENDING` → `AWAITING_CONFIRMATION`
- Migrate existing data before API deployment

## Non-Breaking Changes

### Safe Additions

| Change | Type | Impact |
|--------|------|--------|
| New endpoint: `GET /api/v2/users/search` | Addition | None |
| New optional field: `User.avatar_url` | Addition | None |
| New enum value: `OrderStatus.CANCELLED` | Addition | None |
| New query parameter: `?include_inactive` | Addition | None |

### Deprecations

| Item | Deprecated In | Remove In | Replacement |
|------|---------------|-----------|-------------|
| `GET /api/v1/users/list` | v2.0.0 | v3.0.0 | `GET /api/v2/users` |
| Field `User.phone` | v2.0.0 | v3.0.0 | `User.contactInfo.phone` |

## Consumer Contract Test Results

### Pact Verification

| Consumer | Version | Compatible | Tests | Failures |
|----------|---------|------------|-------|----------|
| web-frontend | v1.5.0 | ❌ NO | 38/45 | 7 |
| mobile-app | v2.1.0 | ❌ NO | 40/42 | 2 |
| partner-api | v1.0.0 | ✅ YES | 12/12 | 0 |
| admin-panel | v0.9.0 | ❌ NO | 15/18 | 3 |

### Failing Contract Tests

**web-frontend failures**:
1. `GET /api/v1/users/{id}` - Missing `email` field in response
2. `POST /api/v1/users` - Missing required field `password_policy`
3. `DELETE /api/v1/users/{id}` - Endpoint not found (404)

**mobile-app failures**:
1. `GET /api/v1/users/{id}` - Field type mismatch: `created_at`
2. `POST /api/v1/users` - Validation error: `password_policy` required

**admin-panel failures**:
1. `DELETE /api/v1/users/{id}` - Endpoint removed
2. `GET /api/v1/orders` - Enum value `PENDING` not recognized
3. `GET /api/v1/users/{id}` - Missing `email` field

## Backward Compatibility Analysis

```yaml
compatibility_assessment:
  backward_compatible: false
  reason: "5 breaking changes detected"

  migration_effort:
    web-frontend: HIGH (7 changes required)
    mobile-app: MEDIUM (2 changes required)
    partner-api: NONE (no changes needed)
    admin-panel: HIGH (3 changes required)

  recommended_strategy:
    option_1:
      name: "Parallel API versions"
      description: "Maintain v1 and v2 simultaneously"
      effort: HIGH
      timeline: "6 months dual support"

    option_2:
      name: "Phased migration"
      description: "Reduce breaking changes, migrate in phases"
      effort: MEDIUM
      timeline: "3 months migration window"
      preferred: true

    option_3:
      name: "Hard cutover"
      description: "Deploy v2, deprecate v1 immediately"
      effort: LOW
      timeline: "1 month notice"
      risk: HIGH
```

## Recommendations

### Immediate Actions

- [ ] Revert breaking changes or provide backward compatibility layer
- [ ] Make `password_policy` field optional with default value
- [ ] Add `created_at_unix` alongside `created_at` string
- [ ] Do not remove `email` field - deprecate with timeline instead
- [ ] Provide `PENDING` → `AWAITING_CONFIRMATION` enum mapping

### Consumer Migration

- [ ] Notify all consumers of breaking changes
- [ ] Provide migration guide with code examples
- [ ] Offer migration support timeline (3 months)
- [ ] Update consumer contract tests
- [ ] Coordinate deployment across consumers

### Process Improvements

- [ ] Add contract testing to CI/CD pipeline
- [ ] Require compatibility report in PR template
- [ ] Enforce semantic versioning in release process
- [ ] Implement API deprecation policy (6-month notice)
- [ ] Add breaking change review gate

## Migration Guide

### For web-frontend

```diff
// User profile display
- const email = user.email;
+ const email = user.contactInfo?.email || user.email;

// User registration
  const userData = {
    username: form.username,
    password: form.password,
+   password_policy: 'default',
  };

// Delete user
- await api.delete(`/api/v1/users/${id}`);
+ await api.post(`/api/v1/users/${id}/deactivate`);
```

### For mobile-app

```diff
// Timestamp parsing
- const createdAt = new Date(user.created_at); // ISO string
+ const createdAt = user.created_at_unix
+   ? new Date(user.created_at_unix * 1000)
+   : new Date(user.created_at);

// User registration
  const userData = {
    ...
+   password_policy: 'default',
  };
```

## Tool Output

### OpenAPI Diff

```bash
$ openapi-diff baseline.yaml current.yaml --breaking-only

BREAKING CHANGES DETECTED (5):

1. DELETE /api/v1/users/{id}
   - Endpoint removed

2. GET /api/v1/users/{id}
   - Response schema changed
   - Field 'email' removed

3. POST /api/v1/users
   - Request schema changed
   - Field 'password_policy' now required

4. OrderStatus enum
   - Value 'PENDING' removed

5. Multiple endpoints
   - Field 'created_at' type changed: string → integer

See full report: openapi-diff-report.md
```
```

## Usage Examples

### Detect REST API Regression

```
User: "Check API contract for breaking changes"

Skill executes:
1. Locate OpenAPI spec files
2. Load baseline (v1.5.0)
3. Load current (v2.0.0)
4. Run openapi-diff
5. Classify changes
6. Check semantic versioning
7. Run Pact tests

Output:
"API Compatibility Report

Status: BREAKING CHANGES DETECTED
Breaking: 5
Non-Breaking: 12
Version: v1.5.0 → v2.0.0 (CORRECT major bump)
Consumer Impact: 3 of 4 consumers affected

Critical Issues:
1. Field removed: User.email (affects web-frontend, mobile-app)
2. Endpoint removed: DELETE /api/v1/users/{id}
3. Type change: created_at string → integer

See full report: .aiwg/api/compatibility/report-2026-01-28.md

Recommendation: Revert breaking changes or add compatibility layer"
```

### Detect GraphQL Schema Regression

```
User: "API breaking change check for GraphQL"

Skill executes:
1. Locate GraphQL schema files
2. Load baseline schema
3. Load current schema
4. Run graphql-inspector diff
5. Identify breaking vs safe changes

Output:
"GraphQL Schema Compatibility

Status: BREAKING CHANGES DETECTED
Breaking: 2
Dangerous: 3
Safe: 8

Breaking Changes:
1. Field 'User.email' removed
2. Type 'Address' removed

Dangerous Changes:
1. Field 'User.age' type changed: Int → String
2. Argument 'Query.users(limit)' default changed: 10 → 100
3. Enum 'Status' value 'ACTIVE' description changed

Recommendation: Review breaking changes before deployment"
```

### Consumer Contract Verification

```
User: "Run consumer contract tests"

Skill executes:
1. Locate Pact contracts
2. Run provider verification tests
3. Generate compatibility matrix

Output:
"Consumer Contract Verification

Status: INCOMPATIBLE CONSUMERS DETECTED
Compatible: 1/4
Failing: 3/4

Results:
✅ partner-api (12/12 tests passing)
❌ web-frontend (38/45 passing, 7 failures)
❌ mobile-app (40/42 passing, 2 failures)
❌ admin-panel (15/18 passing, 3 failures)

Common Failures:
- Missing field: User.email (3 consumers)
- Endpoint not found: DELETE /api/v1/users/{id} (2 consumers)

Action Required: Update consumers or revert breaking changes"
```

## Integration

This skill uses:
- `regression-baseline`: Store API contract baselines
- `regression-bisect`: Find commit that introduced breaking change
- `regression-report`: Generate comprehensive regression report
- `project-awareness`: Detect API framework (OpenAPI, GraphQL, gRPC)

## Agent Orchestration

```yaml
agents:
  detection:
    agent: api-designer
    focus: Identify and classify API changes

  analysis:
    agent: architecture-designer
    focus: Assess impact and recommend migration

  testing:
    agent: test-engineer
    focus: Run consumer contract tests

  approval:
    agent: tech-lead
    focus: Approve breaking changes or require fixes
```

## Configuration

### Detection Settings

```yaml
api_contract_detection:
  api_types:
    - rest_openapi
    - graphql
    - grpc_protobuf

  tools:
    rest: openapi-diff
    graphql: graphql-inspector
    grpc: buf

  baselines:
    storage: .aiwg/api/baselines/
    naming: "{api-name}-{version}.{ext}"

  strict_mode: true  # Fail on any breaking change
  semver_enforcement: true
```

### Breaking Change Rules

```yaml
breaking_rules:
  rest:
    - removed_endpoints
    - removed_fields
    - type_changes
    - new_required_fields
    - enum_value_removals
    - stricter_validations

  graphql:
    - removed_fields
    - removed_types
    - type_changes
    - non_nullable_additions
    - argument_removals

  grpc:
    - removed_services
    - removed_rpcs
    - removed_fields
    - type_changes
    - required_field_additions
```

### Consumer Contract Testing

```yaml
consumer_contracts:
  enabled: true
  framework: pact  # or spring-cloud-contract

  pact:
    broker_url: https://pact-broker.example.com
    publish_verification: true

  contracts_location: .aiwg/api/contracts/
  fail_on_incompatibility: true
```

## Output Locations

- Baselines: `.aiwg/api/baselines/{api-name}-{version}.{yaml|graphql|proto}`
- Reports: `.aiwg/api/compatibility/report-{date}.md`
- Diffs: `.aiwg/api/compatibility/diff-{baseline}-to-{current}.md`
- Pact Results: `.aiwg/api/pact-results/`
- Migration Guides: `.aiwg/api/migration/{version}/MIGRATION.md`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml
- @agentic/code/frameworks/sdlc-complete/agents/api-designer.md
- @agentic/code/frameworks/sdlc-complete/skills/regression-baseline/SKILL.md
- @agentic/code/frameworks/sdlc-complete/skills/regression-bisect/SKILL.md
- @.aiwg/research/findings/REF-013-metagpt.md
- @.claude/rules/executable-feedback.md
