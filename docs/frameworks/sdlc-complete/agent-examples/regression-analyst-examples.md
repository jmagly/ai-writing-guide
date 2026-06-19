# Regression Analyst — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Few-Shot Examples

### Example 1: Detecting a Regression from Test Failures

**Input:**
"The CI pipeline is failing with 3 test failures that were passing yesterday. Investigate and identify the regression."

**Output:**
```markdown
## Regression Detection Report

**Analysis Date**: 2024-01-20
**CI Build**: #4521 (failed)
**Previous Passing Build**: #4520 (passed)

### Thought: Goal
I need to identify what changed between build #4520 and #4521 that caused 3 tests to fail.

### Step 1: Identify Failing Tests

**Extraction**: From CI logs, the failing tests are:
- `test/unit/auth/token.test.ts`: "should refresh expired token"
- `test/unit/auth/token.test.ts`: "should handle refresh failure gracefully"
- `test/integration/auth/session.test.ts`: "should maintain session across refresh"

All failures are in the authentication module, specifically token refresh.

### Step 2: Compare Git History

**Action**: Check commits between builds
```bash
git log --oneline #4520..#4521
```

**Observation**: 4 commits found:
```
def7890 Update README with new API docs
abc4567 Refactor token refresh logic for clarity
890abcd Add logging to payment module
123efgh Fix typo in error message
```

**Reasoning**: Commit `abc4567` "Refactor token refresh logic" is the most likely culprit given all failures are in token refresh.

### Step 3: Analyze the Suspect Commit

**Action**: Review the diff
```bash
git show abc4567 --stat
```

**Observation**:
```
src/auth/token-manager.ts | 45 +++++++++++++++++++++------------------------
1 file changed, 21 insertions(+), 24 deletions(-)
```

**Extraction**: Key changes in the diff:
```diff
- async refreshToken(token: string): Promise<string> {
-   if (this.isExpired(token)) {
-     return await this.requestNewToken(token);
-   }
-   return token;
- }

+ async refreshToken(token: string): Promise<string> {
+   // Refactored for clarity
+   if (!this.isExpired(token)) {
+     return token;  // Early return for valid tokens
+   }
+   return await this.requestNewToken(token);
+ }
```

**Exception**: Wait - the logic appears identical after refactor. Let me check more carefully.

**Further Extraction**: Looking at the full diff:
```diff
- private isExpired(token: string): boolean {
-   const exp = this.decodeExpiry(token);
-   return Date.now() > exp;
- }

+ private isExpired(token: string): boolean {
+   const exp = this.decodeExpiry(token);
+   return Date.now() >= exp;  // Changed > to >=
+ }
```

**Reasoning**: Found it! The comparison changed from `>` to `>=`. This means tokens expiring at exactly the current timestamp are now considered expired when they weren't before. The tests likely use fixed timestamps that hit this edge case.

### Step 4: Confirm with Git Bisect

**Action**: Run automated bisect
```bash
git bisect start HEAD~5 HEAD~10
git bisect run npm test -- --grep "should refresh expired token"
```

**Observation**:
```
abc4567 is the first bad commit
```

Confirmed: Commit `abc4567` introduced the regression.

### Regression Summary

**ID**: REG-2024-001
**Severity**: High (authentication affected)
**Type**: Functional - boundary condition change

| Aspect | Value |
|--------|-------|
| Introduced In | abc4567 |
| Author | developer@example.com |
| Root Cause | Comparison operator change `>` to `>=` |
| Blast Radius | 3 tests, auth module only |

### Recommended Fix

```typescript
// Revert the comparison operator
private isExpired(token: string): boolean {
  const exp = this.decodeExpiry(token);
  return Date.now() > exp;  // Use > not >=
}
```

### Regression Test to Add

```typescript
it('should not consider token expired at exact expiry time', () => {
  // This catches the boundary condition
  const exactExpiryToken = createToken({ exp: Date.now() / 1000 });
  expect(tokenManager.isExpired(exactExpiryToken)).toBe(false);
});

it('should consider token expired 1ms after expiry', () => {
  const expiredToken = createToken({ exp: (Date.now() - 1) / 1000 });
  expect(tokenManager.isExpired(expiredToken)).toBe(true);
});
```
```

**Why This Is Good:**
- **Systematic investigation**: Follows a logical progression from symptom to root cause
- **Uses thought protocol**: Explicitly tracks reasoning with Goal, Extraction, Reasoning, Exception
- **Validates findings**: Confirms bisect result before concluding
- **Identifies root cause precisely**: Pinpoints exact line change causing regression
- **Provides actionable fix**: Includes specific code change to resolve
- **Recommends prevention**: Adds boundary condition tests to prevent recurrence

---

### Example 2: Analyzing Root Cause with Git Bisect

**Input:**
"Our API response time has degraded from p99 of 200ms to 450ms. Find when this started and identify the cause."

**Output:**
```markdown
## Performance Regression Analysis

**Metric**: API p99 Response Time
**Baseline**: 200ms (v2.3.0)
**Current**: 450ms (v2.4.0-rc2)
**Degradation**: +125%

### Thought: Goal
I need to identify when the p99 latency regression was introduced and determine the root cause.

### Step 1: Establish Timeline

**Action**: Query performance metrics over time
```bash
# Get daily p99 values for the past 2 weeks
curl -s "$METRICS_API/query?metric=api_latency_p99&range=14d" | jq '.data'
```

**Observation**: Performance data shows degradation starting 2024-01-18:
```
2024-01-15: 195ms
2024-01-16: 201ms
2024-01-17: 198ms
2024-01-18: 312ms  <-- Degradation starts
2024-01-19: 425ms
2024-01-20: 448ms
```

**Extraction**: The regression was introduced between 2024-01-17 and 2024-01-18.

### Step 2: Identify Commits in Window

**Action**: Find commits deployed on 2024-01-18
```bash
git log --after="2024-01-17" --before="2024-01-19" --oneline
```

**Observation**:
```
f1e2d3c Add detailed request logging
a4b5c6d Implement user activity tracking
789abc0 Update dependency versions
```

### Step 3: Create Bisect Test Script

**Reasoning**: I need a test that measures p99 latency reliably. A benchmark suite that makes 100 requests and checks the 99th percentile.

**Action**: Create bisect test
```bash
#!/bin/bash
# performance-bisect.sh

npm run build || exit 125

# Start server in background
npm run start:test &
SERVER_PID=$!
sleep 5

# Run benchmark
RESULT=$(npm run benchmark -- --requests=100 --json)
P99=$(echo $RESULT | jq '.p99')

kill $SERVER_PID

# Threshold: 250ms (between good and bad)
if (( $(echo "$P99 > 250" | bc -l) )); then
  exit 1  # Bad commit
else
  exit 0  # Good commit
fi
```

### Step 4: Run Git Bisect

**Action**: Execute bisect
```bash
git bisect start HEAD v2.3.0
git bisect run ./performance-bisect.sh
```

**Observation**:
```
running ./performance-bisect.sh
p99: 198ms - PASS
running ./performance-bisect.sh
p99: 445ms - FAIL
running ./performance-bisect.sh
p99: 312ms - FAIL
running ./performance-bisect.sh
p99: 199ms - PASS

f1e2d3c is the first bad commit
commit f1e2d3c
Author: developer@example.com
Date:   Thu Jan 18 09:15:00 2024

    Add detailed request logging
```

### Step 5: Analyze the Culprit Commit

**Action**: Review the diff
```bash
git show f1e2d3c
```

**Extraction**: Key changes:
```diff
+ import { RequestLogger } from './logging/request-logger';

  async handleRequest(req: Request, res: Response) {
+   const logger = new RequestLogger();
+   await logger.logRequestStart(req);

    const result = await this.processRequest(req);

+   await logger.logRequestEnd(req, result);
+   await logger.flush();  // Sync write to disk!

    return res.json(result);
  }
```

**Reasoning**: The issue is `await logger.flush()` - this is a synchronous disk write on every request. This blocks the response until logging is complete, adding significant latency especially under load when disk I/O queues up.

### Step 6: Profile to Confirm

**Action**: Add timing instrumentation
```bash
npm run profile -- --endpoint=/api/users --requests=100
```

**Observation**:
```
Request breakdown (avg):
  - Business logic:  45ms
  - Database query:  35ms
  - Serialization:   12ms
  - Logging flush:  245ms  <-- 54% of request time!
  - Other:          11ms
  Total:           348ms
```

**Synthesis**: Confirmed. The synchronous logging flush accounts for 245ms of the 350ms average response time, explaining the p99 jump from 200ms to 450ms.

### Root Cause Analysis

**ID**: REG-PERF-2024-002
**Type**: Performance regression
**Severity**: High
**Introduced**: f1e2d3c (2024-01-18)

| Factor | Finding |
|--------|---------|
| What | Synchronous disk write on every request |
| Why | `logger.flush()` called with await in request path |
| Impact | +245ms average latency per request |
| Blast Radius | All API endpoints |

### Recommended Fixes

**Option A: Async Logging (Recommended)**
```typescript
async handleRequest(req: Request, res: Response) {
  const logger = new RequestLogger();
  logger.logRequestStart(req);  // Fire and forget

  const result = await this.processRequest(req);

  logger.logRequestEnd(req, result);
  logger.scheduleFlush();  // Batch and flush asynchronously

  return res.json(result);
}
```

**Option B: Background Queue**
```typescript
// Use a dedicated logging worker
import { loggingQueue } from './logging/queue';

async handleRequest(req: Request, res: Response) {
  const result = await this.processRequest(req);

  // Queue for background processing
  loggingQueue.enqueue({ type: 'request', req, result });

  return res.json(result);
}
```

### Performance Guardrails to Add

```yaml
# .github/workflows/performance-gate.yml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - run: npm run benchmark -- --json > results.json
    - name: Check p99 threshold
      run: |
        P99=$(jq '.p99' results.json)
        if (( $(echo "$P99 > 250" | bc -l) )); then
          echo "Performance regression: p99 ${P99}ms > 250ms threshold"
          exit 1
        fi
```
```

**Why This Is Good:**
- **Data-driven timeline**: Uses metrics to establish when regression started
- **Automated bisect with performance test**: Creates reproducible benchmark script
- **Profiling confirmation**: Validates root cause with actual timing data
- **Multiple fix options**: Provides alternatives with trade-offs
- **CI guardrail**: Recommends automated prevention for future

---

### Example 3: Generating Regression Prevention Recommendations

**Input:**
"We've had 5 regressions in the billing module in the past quarter. Analyze the pattern and recommend prevention strategies."

**Output:**
```markdown
## Regression Pattern Analysis & Prevention Plan

**Module**: `src/billing/`
**Analysis Period**: Q4 2023 (Oct - Dec)
**Regressions Analyzed**: 5

### Thought: Goal
I need to identify patterns in the billing module regressions and recommend targeted prevention strategies.

### Historical Regression Analysis

| ID | Date | Type | Root Cause | Time to Detect | Fix Time |
|----|------|------|------------|----------------|----------|
| REG-041 | Oct 5 | Calculation | Float precision in tax calc | 3 days | 2 hours |
| REG-047 | Oct 22 | Integration | Payment gateway timeout not handled | 1 day | 4 hours |
| REG-052 | Nov 8 | Boundary | Discount > 100% allowed | 5 days | 1 hour |
| REG-058 | Nov 29 | State | Invoice state machine invalid transition | 2 days | 3 hours |
| REG-063 | Dec 15 | Calculation | Currency rounding error | 7 days | 2 hours |

### Pattern Extraction

**Reasoning**: Analyzing the regression types and root causes:

| Pattern | Count | Percentage | Examples |
|---------|-------|------------|----------|
| Calculation/Precision | 3 | 60% | REG-041, REG-052, REG-063 |
| Integration/External | 1 | 20% | REG-047 |
| State Management | 1 | 20% | REG-058 |

**Key Finding**: 60% of regressions are related to numerical calculations (tax, discount, currency). This indicates a systemic weakness in testing financial calculations.

### Coverage Analysis

**Action**: Analyze current test coverage
```bash
npm run coverage -- --scope=src/billing
```

**Observation**:
```
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
src/billing/              |   72.3  |   58.4   |   81.2  |   71.8  |
  calculator.ts           |   68.1  |   45.2   |   75.0  |   67.3  |  <-- Weak
  tax-service.ts          |   65.4  |   52.1   |   70.0  |   64.8  |  <-- Weak
  discount-engine.ts      |   71.2  |   48.9   |   80.0  |   70.5  |  <-- Weak
  invoice-state.ts        |   82.3  |   71.4   |   90.0  |   81.9  |
  payment-gateway.ts      |   78.5  |   62.3   |   85.0  |   77.2  |
```

**Extraction**: The three files with lowest branch coverage (`calculator.ts`, `tax-service.ts`, `discount-engine.ts`) are exactly where calculation regressions occurred.

### Risk Heat Map

**Reasoning**: Combining regression history, coverage, and complexity:

| Component | Regressions | Coverage | Complexity | Risk Score |
|-----------|-------------|----------|------------|------------|
| calculator.ts | 2 | 45% branch | 15 cyclomatic | **CRITICAL** |
| tax-service.ts | 1 | 52% branch | 12 cyclomatic | **HIGH** |
| discount-engine.ts | 1 | 49% branch | 11 cyclomatic | **HIGH** |
| invoice-state.ts | 1 | 71% branch | 8 cyclomatic | MEDIUM |
| payment-gateway.ts | 0 | 62% branch | 9 cyclomatic | MEDIUM |

### Prevention Recommendations

#### 1. Property-Based Testing for Calculations (CRITICAL)

**Rationale**: Calculation regressions stem from edge cases that example-based tests miss. Property-based testing generates hundreds of test cases automatically.

**Implementation**:
```typescript
// test/billing/calculator.property.test.ts
import * as fc from 'fast-check';
import { calculateTotal, applyDiscount, calculateTax } from '@/billing/calculator';

describe('Calculator Properties', () => {
  describe('calculateTotal', () => {
    it('should always be >= 0', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            price: fc.float({ min: 0, max: 10000 }),
            quantity: fc.integer({ min: 1, max: 100 })
          })),
          (items) => calculateTotal(items) >= 0
        )
      );
    });

    it('should be sum of (price * quantity)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            price: fc.float({ min: 0, max: 10000 }),
            quantity: fc.integer({ min: 1, max: 100 })
          })),
          (items) => {
            const expected = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            return Math.abs(calculateTotal(items) - expected) < 0.01;
          }
        )
      );
    });
  });

  describe('applyDiscount', () => {
    it('discount should never exceed original price', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }),
          fc.float({ min: 0, max: 100 }),
          (price, discountPercent) => applyDiscount(price, discountPercent) <= price
        )
      );
    });

    it('discount should never result in negative price', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }),
          fc.float({ min: 0, max: 200 }),  // Even with invalid >100% discount
          (price, discountPercent) => applyDiscount(price, discountPercent) >= 0
        )
      );
    });
  });
});
```

**Expected Impact**: Would have caught REG-041, REG-052, REG-063 (all 3 calculation regressions)

#### 2. State Machine Testing for Invoice Lifecycle (HIGH)

**Rationale**: State transition bugs are hard to find with example tests. Model-based testing exhaustively tests all state transitions.

**Implementation**:
```typescript
// test/billing/invoice-state.model.test.ts
import { createModel } from '@xstate/test';
import { invoiceStateMachine } from '@/billing/invoice-state';

const testModel = createModel(invoiceStateMachine).withEvents({
  CREATE: { exec: async (context) => await context.invoice.create() },
  APPROVE: { exec: async (context) => await context.invoice.approve() },
  SEND: { exec: async (context) => await context.invoice.send() },
  PAY: { exec: async (context) => await context.invoice.pay() },
  CANCEL: { exec: async (context) => await context.invoice.cancel() },
});

describe('Invoice State Machine', () => {
  const testPlans = testModel.getSimplePathPlans();

  testPlans.forEach(plan => {
    describe(plan.description, () => {
      plan.paths.forEach(path => {
        it(path.description, async () => {
          const context = { invoice: new Invoice() };
          await path.test(context);
        });
      });
    });
  });
});
```

**Expected Impact**: Would have caught REG-058 (invalid state transition)

#### 3. Integration Test with Chaos Engineering (MEDIUM)

**Rationale**: REG-047 was caused by unhandled timeout. Inject failures to test resilience.

**Implementation**:
```typescript
// test/integration/payment-gateway.chaos.test.ts
import { PaymentGateway } from '@/billing/payment-gateway';
import { mockGatewayWithLatency, mockGatewayWithFailure } from '@/test/mocks';

describe('Payment Gateway Resilience', () => {
  it('should handle gateway timeout gracefully', async () => {
    const gateway = new PaymentGateway(mockGatewayWithLatency(5000));

    const result = await gateway.processPayment({
      amount: 100,
      timeout: 3000
    });

    expect(result.status).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('should handle gateway 5xx errors with retry', async () => {
    const gateway = new PaymentGateway(mockGatewayWithFailure(500, 2)); // Fail twice, then succeed

    const result = await gateway.processPayment({ amount: 100 });

    expect(result.status).toBe('success');
    expect(result.attempts).toBe(3);
  });
});
```

**Expected Impact**: Would have caught REG-047 (gateway timeout)

#### 4. CI Pipeline Enhancements

```yaml
# .github/workflows/billing-quality-gate.yml
name: Billing Quality Gate

on:
  pull_request:
    paths:
      - 'src/billing/**'

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Property-based tests
        run: npm run test:property -- --scope=billing

      - name: Mutation testing
        run: npx stryker run --mutate="src/billing/**/*.ts"

      - name: Branch coverage check
        run: |
          npm run coverage -- --scope=src/billing --json > coverage.json
          BRANCH=$(jq '.total.branches.pct' coverage.json)
          if (( $(echo "$BRANCH < 75" | bc -l) )); then
            echo "Branch coverage ${BRANCH}% below 75% threshold"
            exit 1
          fi

      - name: Calculation precision audit
        run: |
          # Check for float comparisons without epsilon
          grep -r "==\|!=" src/billing/*.ts | grep -v "===" | grep -v "!==" && exit 1
          # Check for integer division in financial code
          grep -r "/ [0-9]" src/billing/*.ts && exit 1
          exit 0
```

### Implementation Roadmap

| Phase | Action | Owner | ETA | Impact |
|-------|--------|-------|-----|--------|
| 1 | Add property-based tests for calculator.ts | Test Engineer | Week 1 | Prevents 60% of regressions |
| 2 | Add property-based tests for tax and discount | Test Engineer | Week 2 | Completes calculation coverage |
| 3 | Add state machine tests for invoice | Test Engineer | Week 3 | Prevents state regressions |
| 4 | Enable mutation testing in CI | DevOps | Week 3 | Catches weak tests |
| 5 | Add chaos tests for payment gateway | Test Engineer | Week 4 | Prevents integration regressions |
| 6 | Implement coverage gates | DevOps | Week 4 | Maintains quality |

### Synthesis: Expected Outcomes

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Regressions per quarter | 5 | 1 | Q1 2024 |
| Branch coverage | 58% | 80% | 4 weeks |
| Mutation score | Unknown | 75% | 4 weeks |
| Time to detect regression | 3.6 days avg | < 1 day | Immediate |

### Regression Register Update

Added prevention tracking to `.aiwg/testing/regression-register/prevention-plan.yaml`:
```yaml
module: src/billing/
analysis_date: 2024-01-20
regressions_analyzed: 5
patterns_identified:
  - calculation_precision
  - integration_timeout
  - state_transition
prevention_measures:
  - id: PREV-001
    type: property_based_testing
    status: planned
    target_regressions: [REG-041, REG-052, REG-063]
  - id: PREV-002
    type: state_machine_testing
    status: planned
    target_regressions: [REG-058]
  - id: PREV-003
    type: chaos_testing
    status: planned
    target_regressions: [REG-047]
next_review: 2024-04-01
```
```

**Why This Is Good:**
- **Pattern-based analysis**: Groups regressions by type to identify systemic issues
- **Data-driven recommendations**: Uses coverage data to target weak areas
- **Specific test code**: Provides ready-to-implement test examples
- **CI integration**: Includes workflow configuration for automated enforcement
- **Prioritized roadmap**: Orders actions by impact with clear ownership
- **Measurable outcomes**: Sets specific targets for improvement

## Reference Output Formats

Externalized from the agent definition (#1600). These are the full templates the
agent definition summarizes; reproduce them verbatim when emitting reports.

### Regression Analysis Report

```markdown
## Regression Analysis Report

**Project**: [project-name]
**Analysis Date**: YYYY-MM-DD
**Baseline Version**: v2.1.0
**Current Version**: v2.2.0-rc1

### Executive Summary

- **Total Regressions Found**: 3
- **Critical**: 1 (blocks release)
- **High**: 1 (fix before release)
- **Medium**: 1 (schedule fix)

### Critical Regressions (Fix Immediately)

#### REG-001: Payment calculation returns incorrect discount

**Symptom**: Discount calculation fails for orders > $1000
**Introduced In**: commit abc1234 (2024-01-15)
**Author**: developer@example.com
**Root Cause**: Integer overflow in discount percentage calculation

**Git Bisect Results**:
```
abc1234 is the first bad commit
commit abc1234
Author: developer@example.com
Date: Mon Jan 15 10:30:00 2024

    Optimize discount calculation for performance
```

**Affected Code**:
```diff
- const discount = (price * discountPercent) / 100;
+ const discount = price * (discountPercent / 100);  // Integer division!
```

**Blast Radius**:
- Direct: `src/billing/discount.ts`
- Transitive: `src/checkout/cart.ts`, `src/orders/summary.ts`, `src/reports/revenue.ts`
- Tests Affected: 12 unit tests, 3 integration tests

**Recommended Fix**:
```typescript
const discount = (price * discountPercent) / 100.0;  // Force float division
```

**Regression Tests to Add**:
```typescript
describe('discount calculation', () => {
  it('should handle large orders correctly', () => {
    expect(calculateDiscount(10000, 15)).toBe(1500);
  });

  it('should maintain precision for percentage calculations', () => {
    expect(calculateDiscount(33, 10)).toBeCloseTo(3.3, 2);
  });
});
```

### High Priority Regressions

[... detailed analysis for each ...]

### Regression Prevention Recommendations

| Area | Risk Level | Current Coverage | Recommended Action |
|------|------------|------------------|-------------------|
| `src/billing/` | High | 65% | Add property-based tests for calculations |
| `src/auth/` | Medium | 78% | Add contract tests for token validation |
| `src/api/` | Medium | 72% | Add performance benchmarks |

### Metrics

| Metric | Baseline | Current | Delta |
|--------|----------|---------|-------|
| Test Pass Rate | 100% | 97.2% | -2.8% |
| p50 Latency | 45ms | 52ms | +15.5% |
| Error Rate | 0.1% | 0.3% | +200% |
```

### Regression Register Entry

```yaml
# .aiwg/testing/regression-register/REG-001.yaml
id: REG-001
title: "Payment calculation returns incorrect discount"
status: open  # open, investigating, fixing, resolved, wont-fix
severity: critical
type: functional

detection:
  date: 2024-01-20
  method: automated_test_failure
  reporter: ci-pipeline
  test_name: "billing.discount.should handle large orders"

analysis:
  root_cause: "Integer division in discount calculation"
  introduced_in:
    commit: abc1234
    date: 2024-01-15
    author: developer@example.com
    pr: "#456"
  blast_radius:
    direct_files: 1
    transitive_files: 3
    affected_tests: 15

resolution:
  fix_commit: null
  fix_pr: null
  regression_test_added: false
  resolved_date: null

prevention:
  guardrails_recommended:
    - "Add property-based tests for all financial calculations"
    - "Enable integer overflow detection in CI"
  similar_risks:
    - "src/billing/tax.ts uses same pattern"
```

### High-Risk Area Identification (reference implementation)

```typescript
interface HighRiskArea {
  path: string;
  riskFactors: string[];
  regressionHistory: number;  // Past regression count
  testCoverage: number;       // Percentage
  complexityScore: number;    // Cyclomatic complexity
  recommendation: string;
}

function identifyHighRiskAreas(
  codebase: CodebaseAnalysis,
  regressionHistory: RegressionRegister
): HighRiskArea[] {
  return codebase.modules
    .map(module => ({
      path: module.path,
      riskFactors: [
        module.testCoverage < 0.8 ? 'Low test coverage' : null,
        module.complexityScore > 10 ? 'High complexity' : null,
        module.changeFrequency > 5 ? 'Frequently modified' : null,
        regressionHistory.countForPath(module.path) > 2 ? 'Prior regressions' : null
      ].filter(Boolean),
      regressionHistory: regressionHistory.countForPath(module.path),
      testCoverage: module.testCoverage,
      complexityScore: module.complexityScore,
      recommendation: generateRecommendation(module)
    }))
    .filter(area => area.riskFactors.length > 0)
    .sort((a, b) => b.riskFactors.length - a.riskFactors.length);
}
```
