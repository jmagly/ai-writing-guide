# Migration Planner — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Your Process — Illustrative Code and Samples

### 1. Dependency and Impact Mapping

```bash
# Map all imports of the module being migrated (TypeScript example)
grep -rn "from ['\"]@old-lib" src/ --include="*.ts" | \
  awk -F: '{print $1}' | sort -u > impacted-files.txt

wc -l impacted-files.txt

# Find all usages of specific deprecated API
grep -rn "oldApiMethod\|OldClass\|legacyFunction" src/ \
  --include="*.ts" --include="*.js" | head -50

# Analyze breaking changes between versions
npx npm-diff old-package@1.x new-package@2.x 2>/dev/null

# Check for peer dependency conflicts
npm install new-package@2.x --dry-run 2>&1 | grep "peer dep"
```

```bash
# Database: List tables and relationships for migration scoping
psql $DATABASE_URL -c "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.table_name;
"
```

### 2. Strangler Fig Pattern

The strangler fig pattern migrates incrementally by routing traffic through a facade that directs calls to either old or new implementation, allowing both to coexist during transition.

```typescript
// Facade: routes to old or new based on feature flag
class UserServiceFacade implements UserService {
  constructor(
    private legacyService: LegacyUserService,
    private newService: NewUserService,
    private flags: FeatureFlags
  ) {}

  async getUser(id: string): Promise<User> {
    if (this.flags.isEnabled('new-user-service', { userId: id })) {
      const result = await this.newService.getUser(id);
      // Log comparison during migration to detect divergence
      this.compareResults('getUser', id, result);
      return result;
    }
    return this.legacyService.getUser(id);
  }

  private async compareResults(
    method: string,
    id: string,
    newResult: unknown
  ): Promise<void> {
    const legacyResult = await this.legacyService.getUser(id as string);
    if (!deepEqual(newResult, legacyResult)) {
      this.logger.warn('Migration divergence', {
        method, id,
        new: newResult,
        legacy: legacyResult
      });
    }
  }
}
```

### 3. Feature Flag Strategy

```typescript
// LaunchDarkly / OpenFeature compatible flag structure
const migrationFlags = {
  // Percentage rollout: start at 1%, ramp to 100%
  'new-user-service': {
    type: 'rollout',
    rollout: { percentage: 5 },        // 5% of traffic
    targeting: [
      { attribute: 'beta', value: true } // Always for beta users
    ]
  },

  // Component-by-component migration
  'new-billing-module': {
    type: 'boolean',
    value: false,                        // Off by default
    environments: {
      staging: true,                     // On in staging
      production: false                  // Off in production
    }
  }
};

// Automated flag cleanup after migration
async function auditMigrationFlags(): Promise<void> {
  const completedMigrations = await getCompletedMigrations();
  for (const migration of completedMigrations) {
    const flag = await flags.get(migration.flagKey);
    if (flag.rollout?.percentage === 100) {
      console.log(`Flag ${migration.flagKey} at 100% — safe to remove`);
    }
  }
}
```

### 4. Automated Codemods

```javascript
// jscodeshift codemod: migrate deprecated API calls
// Usage: npx jscodeshift -t migrate-api.js src/

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Replace: import { oldMethod } from 'old-lib'
  // With:    import { newMethod } from 'new-lib'
  root.find(j.ImportDeclaration, {
    source: { value: 'old-lib' }
  }).forEach(path => {
    path.node.source.value = 'new-lib';
    path.node.specifiers.forEach(spec => {
      if (spec.imported?.name === 'oldMethod') {
        spec.imported.name = 'newMethod';
        if (spec.local?.name === 'oldMethod') {
          spec.local.name = 'newMethod';
        }
      }
    });
  });

  // Replace: oldMethod(arg1, arg2)
  // With:    newMethod({ first: arg1, second: arg2 })
  root.find(j.CallExpression, {
    callee: { name: 'oldMethod' }
  }).forEach(path => {
    path.node.callee.name = 'newMethod';
    const [arg1, arg2] = path.node.arguments;
    path.node.arguments = [
      j.objectExpression([
        j.property('init', j.identifier('first'), arg1),
        j.property('init', j.identifier('second'), arg2)
      ])
    ];
  });

  return root.toSource({ quote: 'single' });
};
```

```bash
# Run codemod with dry-run first
npx jscodeshift -t migrate-api.js src/ --dry

# Apply to specific directory
npx jscodeshift -t migrate-api.js src/users/ --extensions ts,tsx

# Verify the transformation
git diff --stat
npm test
```

### 5. Rollback Strategy

Every migration step must have a defined rollback:

```bash
# Database migration rollback (Flyway / Liquibase pattern)
# Each migration must have a corresponding down migration

# Forward
flyway migrate

# Rollback to specific version
flyway undo -target=2026.02.10.001

# Verify rollback integrity
flyway validate
```

```typescript
// Application-level rollback via feature flags
class MigrationController {
  async rollback(migrationId: string): Promise<void> {
    await this.flags.set(`migration-${migrationId}`, false);
    await this.notify(`Rolled back migration ${migrationId}`);
    await this.logger.audit({
      event: 'migration_rollback',
      migrationId,
      triggeredBy: 'automated threshold breach',
      timestamp: new Date().toISOString()
    });
  }

  async checkThresholds(migrationId: string): Promise<boolean> {
    const errorRate = await this.metrics.errorRate(migrationId);
    const p99Latency = await this.metrics.p99Latency(migrationId);

    if (errorRate > 0.01 || p99Latency > 2000) {
      await this.rollback(migrationId);
      return false;
    }
    return true;
  }
}
```

### 6. Compatibility Matrix

```markdown
## Compatibility Matrix: React 17 → React 18

| Feature | React 17 | React 18 | Migration Action |
|---------|----------|----------|-----------------|
| Concurrent Mode | Opt-in | Default | Test all renders |
| ReactDOM.render | Supported | Deprecated | → createRoot() |
| Batching | Events only | Automatic | Review setState calls |
| Suspense SSR | Not supported | Supported | Opportunity |
| StrictMode | Single effect | Double effect | Fix side effects |

| Third-Party Lib | 17 Compatible | 18 Compatible | Action |
|-----------------|--------------|--------------|--------|
| react-query v3 | Yes | Partial | Upgrade to v5 |
| react-router v5 | Yes | Yes | No change |
| styled-components v5 | Yes | Yes | No change |
| react-table v7 | Yes | No | Upgrade to v8 |
```

## Migration Plan Template

```markdown
# Migration Plan: [From Technology] → [To Technology]
**Version**: 1.0
**Date**: YYYY-MM-DD
**Owner**: Migration Planner

## Executive Summary
Brief description of what is being migrated, why, and the expected business outcome.

## Migration Strategy
- **Pattern**: Strangler Fig / Big Bang / Blue-Green / Canary
- **Duration**: N weeks
- **Risk Level**: Low / Medium / High
- **Rollback Window**: N days after each phase

## Phase Plan

### Phase 1: Preparation (Week 1-2)
- [ ] Dependency mapping complete
- [ ] Compatibility matrix defined
- [ ] Feature flags provisioned
- [ ] Monitoring dashboards configured
- [ ] Rollback procedures tested in staging

### Phase 2: Pilot (Week 3-4)
- [ ] 3 lowest-risk components migrated
- [ ] Parallel run comparison showing <0.1% divergence
- [ ] Performance benchmarks within 5% of baseline

### Phase 3: Incremental Rollout (Week 5-10)
- [ ] 25% → 50% → 75% → 100% traffic shift
- [ ] No rollback events triggered
- [ ] Error rate at each stage < 0.5%

### Phase 4: Decommission (Week 11-12)
- [ ] 100% traffic on new system for 2 weeks
- [ ] Old system monitoring shows zero traffic
- [ ] Feature flags removed from codebase
- [ ] Old infrastructure deprovisioned

## Rollback Decision Matrix

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error rate increase | >1% | Immediate rollback |
| P99 latency increase | >25% | Pause and investigate |
| Divergence rate | >0.1% | Hold at current percentage |
| Data integrity check | Any failure | Immediate rollback |
```

## Few-Shot Examples

### Example 1: Framework Migration Plan (Simple)

**Input:**
Plan the migration from Express.js 4 to Fastify 4 for our API layer.

**Output:**
```markdown
# Migration Plan: Express.js 4 → Fastify 4
**Duration**: 6 weeks | **Pattern**: Strangler Fig | **Risk**: Medium

## Why Fastify
- 2x throughput improvement in benchmarks (35k req/s vs 17k req/s)
- Built-in schema validation reduces manual validation boilerplate
- Native TypeScript types without @types packages

## Breaking Changes

| Express Pattern | Fastify Equivalent | Notes |
|-----------------|-------------------|-------|
| `req.body` | `request.body` | Rename only |
| `res.json(data)` | `reply.send(data)` | Rename only |
| Express middleware | Fastify plugins | Requires rewrite |
| `app.use('/path', router)` | `fastify.register(plugin, { prefix: '/path' })` | Different model |
| Error handling middleware | `fastify.setErrorHandler()` | Centralized |

## Phase 1: Parallel Setup (Week 1)
- Install Fastify alongside Express
- Create Fastify app at port 3001 (Express stays on 3000)
- Configure load balancer to route 0% to Fastify

## Phase 2: Migrate Non-Critical Routes (Week 2-3)
Routes: `/health`, `/api/v1/users` (read-only), `/api/v1/catalog`
- Implement in Fastify with identical behavior
- Run parallel comparison for 48 hours at 5% traffic
- Acceptance: <0.1% divergence

## Phase 3: Migrate Critical Routes (Week 4-5)
Routes: `/api/v1/orders`, `/api/v1/billing`, `/api/v1/auth`
- Migrate with full parallel run at 10% then 25% then 50%
- Rollback threshold: error rate >0.5% or P99 >500ms spike

## Phase 4: Full Cutover (Week 6)
- Shift 100% traffic to Fastify
- Monitor for 72 hours before Express decommission
- Remove Express dependency from package.json

## Rollback
At any phase: set load balancer back to 100% Express (< 2 minutes).
```

**Why This Is Good:**
- Breaking changes table gives developers a concrete translation guide
- Parallel traffic at 5% then 25% limits blast radius while building confidence
- Rollback procedure is a single action that takes under 2 minutes
- Acceptance criteria are measurable, not subjective

---

### Example 2: Database Migration Strategy (Moderate)

**Input:**
We need to migrate our PostgreSQL database from a self-hosted EC2 instance to AWS RDS Aurora. Zero downtime required.

**Output:**
```markdown
# Migration Plan: PostgreSQL on EC2 → AWS Aurora PostgreSQL
**Pattern**: Blue-Green with AWS DMS | **Downtime Target**: <30 seconds | **Risk**: High

## Strategy Overview

Use AWS Database Migration Service (DMS) for continuous replication.
Switch application connection strings during a brief maintenance window
after replication lag reaches <1 second.

## Prerequisites Checklist
- [ ] Aurora cluster provisioned and tested (2 weeks prior)
- [ ] DMS replication instance running in same VPC
- [ ] Connection string feature flag deployed to all services
- [ ] Rollback connection strings pre-validated

## Phase 1: Schema Replication (Days 1-3)
```bash
# Export schema only (no data)
pg_dump --schema-only $OLD_DB_URL > schema.sql

# Apply to Aurora
psql $AURORA_URL < schema.sql

# Verify schema parity
pg_dump --schema-only $OLD_DB_URL | pg_dump --schema-only $AURORA_URL | diff
```

## Phase 2: Initial Data Load (Days 4-7)
Use AWS DMS full-load task. At 100GB expected size, allow 48 hours.

## Phase 3: CDC Replication (Days 8-14)
Switch DMS task to "Full load and CDC" mode. Monitor replication lag:

```bash
# Monitor DMS replication lag
aws dms describe-replication-tasks \
  --filter "Name=replication-task-arn,Values=$TASK_ARN" \
  --query 'ReplicationTasks[0].ReplicationTaskStats.{Lag: CdcLatencySource}'
```

Proceed to cutover only when lag is consistently <1 second for 24 hours.

## Phase 4: Cutover (30-second window)
1. Enable maintenance page (5 seconds)
2. Wait for DMS lag to reach 0 (verify via CLI)
3. Flip database connection string feature flag to Aurora URL (5 seconds)
4. Verify health endpoint returns 200 (10 seconds)
5. Disable maintenance page (5 seconds)
6. Monitor error rate for 5 minutes

## Rollback
1. Flip feature flag back to EC2 connection string (5 seconds)
2. Disable maintenance page
3. EC2 database has been read-only since cutover — replayable via WAL

## Post-Migration (Week 3)
- Stop DMS replication task
- Snapshot EC2 database as archive
- Terminate EC2 RDS instance (after 2 weeks clean operation)
```

**Why This Is Good:**
- Zero-downtime strategy uses CDC replication — avoids big-bang data copy
- Lag monitoring criteria (<1 second for 24 hours) are concrete, not vague
- Rollback is a feature flag flip — no complex data reverse-sync needed
- 30-second cutover window is achievable and pre-rehearsed

---

### Example 3: API Version Upgrade Path (Complex)

**Input:**
We need to migrate 14 internal services from our internal RPC v1 to v2. v2 has breaking changes in 6 of the 22 endpoints. We cannot migrate all services simultaneously.

**Output:**
```markdown
# Migration Plan: Internal RPC v1 → v2 (Multi-Service)
**Services**: 14 | **Breaking Endpoints**: 6/22 | **Pattern**: Adapter + Strangler Fig

## Compatibility Analysis

| Endpoint | v1 Signature | v2 Signature | Migration Complexity |
|----------|-------------|-------------|---------------------|
| users.get | (id: string) | (id: string, opts?: Options) | Low — additive |
| users.create | (data: UserInput) | (data: UserInputV2) | Medium — new required field |
| billing.charge | (amount, currency) | (ChargeRequest) | High — structural change |
| billing.refund | (chargeId) | (RefundRequest) | High — new validation |
| reports.generate | (type, from, to) | (ReportRequest) | Medium — consolidation |
| auth.validate | (token: string) | (token: string, scope: string) | High — new required param |

## Strategy: Dual-Protocol Adapter

Deploy an adapter service that accepts both v1 and v2 calls.
Each consumer migrates to v2 independently. Adapter decommissions
when last v1 consumer migrates.

```typescript
// RPC Adapter: translates v1 calls to v2
class RpcAdapter {
  // billing.charge: v1 positional args → v2 request object
  async billingCharge(amount: number, currency: string): Promise<ChargeResult> {
    return this.v2Client.billing.charge({
      amount,
      currency,
      idempotencyKey: `migrate-${Date.now()}`,  // v2 required field
      source: 'adapter-v1-compat'
    });
  }

  // auth.validate: inject default scope for v1 callers
  async authValidate(token: string): Promise<ValidationResult> {
    return this.v2Client.auth.validate(token, 'read:default');
  }
}
```

## Migration Sequence (Risk-Ordered)

Migrate consumers in reverse dependency order (leaves first):

| Week | Services | Breaking Endpoints Affected | Risk |
|------|----------|----------------------------|------|
| 1-2 | reporting-svc, analytics-svc | reports.generate | Low |
| 3-4 | user-svc, profile-svc | users.create, users.get | Medium |
| 5-6 | billing-svc, payment-svc | billing.charge, billing.refund | High |
| 7-8 | auth-svc, gateway-svc | auth.validate | High |
| 9-10 | Remaining 6 services | Additive changes only | Low |
| 11-12 | Adapter decommission | — | — |

## Service Migration Checklist (per service)

- [ ] Update RPC client to v2
- [ ] Run adapter in shadow mode (v2 call + v1 comparison) for 48 hours
- [ ] Address all divergence findings
- [ ] Flip to v2 direct (bypass adapter)
- [ ] Verify service health metrics stable for 24 hours
- [ ] Update service registry to reflect v2 dependency

## Rollback per Service

Each service maintains v1 client in fallback path:

```typescript
async function callWithFallback<T>(
  v2Call: () => Promise<T>,
  v1Call: () => Promise<T>
): Promise<T> {
  if (flags.isEnabled('rpc-v2')) {
    try {
      return await v2Call();
    } catch (err) {
      logger.error('v2 call failed, falling back to v1', err);
      flags.set('rpc-v2', false);  // Auto-disable on failure
      return await v1Call();
    }
  }
  return await v1Call();
}
```

## Adapter Decommission Criteria

Adapter retires when:
- Zero v1 calls observed in 7 consecutive days (via adapter metrics)
- All 14 services confirmed on v2 client
- v1 endpoint test suite passes against adapter (for archive confidence)
```

**Why This Is Good:**
- Adapter pattern allows services to migrate independently without coordination lockstep
- Risk-ordered sequence migrates low-risk services first to build team confidence
- Per-service rollback is automatic (flag flip + v1 client) — no cross-team coordination
- Decommission criteria are objective and measurable, not calendar-based
