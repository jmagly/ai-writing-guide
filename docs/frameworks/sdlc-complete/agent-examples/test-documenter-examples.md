# Test Documenter — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Example 1: Master Test Plan (Step 1)

**Structure Master Test Plan:**

```markdown
---
title: Master Test Plan
version: 1.0
status: DRAFT | APPROVED | BASELINED
date: 2025-10-15
project: {project-name}
phase: Elaboration
primary-author: test-architect
reviewers: [test-engineer, security-architect, devops-engineer]
---

# Master Test Plan

## 1. Test Strategy

### Objectives
- Validate functional requirements (100% use case coverage)
- Verify non-functional requirements (performance, security, usability)
- Ensure regression safety (automated suite)
- Validate production readiness (smoke, sanity, acceptance tests)

### Scope

**In Scope:**
- Unit testing (all services)
- Integration testing (service-to-service, external APIs)
- System testing (end-to-end user flows)
- Performance testing (load, stress, endurance)
- Security testing (SAST, DAST, penetration testing)
- Acceptance testing (UAT with stakeholders)

**Out of Scope:**
- Third-party library testing (rely on vendor testing)
- Legacy system testing (assume SOAP API stable)
- Compatibility testing (Chrome/Edge only, mobile native apps only)

### Test Levels

| Level | Coverage Target | Automation | Tools | Responsibility |
|-------|----------------|------------|-------|----------------|
| **Unit** | ≥80% code coverage | 100% automated | Jest (Node), Pytest (Python) | Developers |
| **Integration** | ≥70% integration paths | 100% automated | Supertest, Postman/Newman | Test Engineers |
| **System** | 100% critical paths, ≥50% total flows | 80% automated | Cypress, Selenium | Test Engineers |
| **Performance** | 100% critical endpoints | 100% automated | k6, JMeter | Performance Engineers |
| **Security** | OWASP Top 10 | 100% automated | SonarQube (SAST), OWASP ZAP (DAST) | Security Engineers |
| **Acceptance** | 100% user stories | Manual | User walkthrough | Product Owner + Users |

## 2. Test Coverage

### Requirements Traceability

| Requirement | Use Case | Test Cases | Status |
|-------------|----------|------------|--------|
| REQ-001 (Auth) | UC-001 | TC-AUTH-001, TC-AUTH-002, TC-AUTH-003 | PASS |
| REQ-002 (Catalog) | UC-002 | TC-CAT-001, TC-CAT-002 | IN_PROGRESS |
| REQ-003 (Payment) | UC-004 | TC-PAY-001, TC-PAY-002, TC-PAY-003 | PASS |

**Coverage Metrics:**
- Requirements coverage: 100% (15/15 requirements have ≥1 test)
- Use case coverage: 95% (19/20 use cases have ≥1 test)
- Code coverage: Target ≥80% (current: 76%)

### Test Matrix

| Feature | Unit | Integration | System | Performance | Security | Status |
|---------|------|-------------|--------|-------------|----------|--------|
| User Login | ✓ | ✓ | ✓ | ✓ | ✓ | COMPLETE |
| Product Search | ✓ | ✓ | ✓ | ✓ | - | IN_PROGRESS |
| Checkout Flow | ✓ | ✓ | ✓ | - | ✓ | BLOCKED |
| Admin Dashboard | ✓ | ✓ | - | - | - | NOT_STARTED |

## 3. Test Environments

### Environment Specifications

**Development (Local):**
- Purpose: Developer unit and integration testing
- Deployment: Docker Compose
- Database: PostgreSQL 15 (local)
- Data: Synthetic test data (50 users, 100 products)
- Access: Developers only

**Test/QA:**
- Purpose: Automated integration and system testing
- Deployment: AWS ECS (Fargate), us-east-1
- Database: RDS PostgreSQL (t3.medium)
- Data: Anonymized production-like data (10K users, 50K products)
- Access: Test Engineers, Developers

**Staging:**
- Purpose: UAT, performance testing, pre-production validation
- Deployment: AWS ECS (Fargate), Multi-AZ, us-east-1
- Database: RDS PostgreSQL (r6g.large), Multi-AZ
- Data: Production-like data (100K users, 500K products)
- Access: Product Owner, Stakeholders, Test Engineers

**Production:**
- Purpose: Live system (testing via smoke/sanity only)
- Deployment: AWS ECS (Fargate), Multi-region
- Database: RDS PostgreSQL (r6g.xlarge), Multi-AZ
- Data: Real user data
- Access: Operations team only

### Environment Configuration

| Environment | API Endpoint | Database | Redis | Auth Tokens |
|-------------|--------------|----------|-------|-------------|
| Development | localhost:3000 | localhost:5432 | localhost:6379 | Test JWT (365d expiry) |
| Test | test-api.example.com | test-db.rds.amazonaws.com | test-redis | Test JWT (7d expiry) |
| Staging | staging-api.example.com | staging-db.rds.amazonaws.com | staging-redis | Staging JWT (24h expiry) |
| Production | api.example.com | prod-db.rds.amazonaws.com | prod-redis | Prod JWT (1h expiry) |

## 4. Test Data Strategy

### Data Sources

**Synthetic Data:**
- Use: Unit tests, integration tests
- Generation: Faker.js, Factory pattern
- Characteristics: Predictable, repeatable, no PII

**Anonymized Production Data:**
- Use: Staging, performance testing
- Source: Production database (monthly snapshot)
- Anonymization: PII masked (emails, names, addresses)
- Volume: 10% of production data

**Production-Like Data:**
- Use: Load testing, capacity planning
- Generation: Data generation scripts
- Volume: Match production scale (1M users, 10M transactions)

### Data Management

**Refresh Schedule:**
- Development: On-demand (reset daily via Docker Compose down/up)
- Test: Weekly (automated refresh Sunday 2 AM UTC)
- Staging: Monthly (production snapshot anonymization)

**Seed Data:**
```sql
-- Test users
INSERT INTO users (username, email, role) VALUES
  ('test-admin', 'admin@test.com', 'ADMIN'),
  ('test-user', 'user@test.com', 'USER'),
  ('test-manager', 'manager@test.com', 'MANAGER');

-- Test products
INSERT INTO products (name, price, inventory) VALUES
  ('Test Product 1', 9.99, 100),
  ('Test Product 2', 19.99, 50);
```

## 5. Test Automation

### Automation Strategy

**Target:** 80% automation (by test case count)

**Frameworks:**
- **Unit:** Jest (JavaScript), Pytest (Python)
- **Integration:** Supertest (API tests), Postman/Newman (contract tests)
- **System:** Cypress (web), Appium (mobile)
- **Performance:** k6 (load tests), JMeter (stress tests)
- **Security:** SonarQube (SAST), OWASP ZAP (DAST)

### CI/CD Integration

**Pipeline Stages:**

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose up -d
      - run: npm run test:integration
      - run: docker-compose down

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
      - name: OWASP ZAP Baseline
        run: docker run -t owasp/zap2docker-stable zap-baseline.py -t ${{ env.TEST_URL }}
```

**Quality Gates:**
- Unit tests: 100% pass, ≥80% coverage
- Integration tests: 100% pass
- Security scans: Zero high/critical vulnerabilities
- Performance tests: p95 < 500ms (staging)

## 6. Defect Management

### Defect Workflow

1. **Discovery:** Tester finds defect during testing
2. **Triage:** Test Lead assigns priority and severity
3. **Assignment:** Defect assigned to developer
4. **Fix:** Developer fixes and commits with issue reference
5. **Verification:** Tester verifies fix in test environment
6. **Closure:** Defect closed after verification

### Defect Priorities

| Priority | Definition | Resolution SLA |
|----------|------------|----------------|
| **P0 - Critical** | System down, data loss, security breach | 4 hours |
| **P1 - High** | Core feature broken, major UX issue | 1 business day |
| **P2 - Medium** | Minor feature issue, workaround exists | 1 week |
| **P3 - Low** | Cosmetic, nice-to-have | 1 month |

### Defect Metrics

**Track:**
- Defects by priority (P0, P1, P2, P3)
- Defects by component (User Service, Product Service, etc.)
- Defect discovery rate (defects/day)
- Defect resolution rate (defects closed/day)
- Defect aging (time from discovery to closure)

**Target:**
- Zero P0/P1 defects in production
- P2 defects < 10 open at any time
- Average resolution time < SLA (by priority)

## 7. Test Schedule

### Phase-Based Testing

**Elaboration Phase:**
- **Week 1-2:** Test environment setup, test data preparation
- **Week 3-4:** Unit test framework setup, initial test cases
- **Week 5-6:** Integration test suite development
- **Week 7-8:** Test strategy review, Master Test Plan approval

**Construction Phase:**
- **Iteration 1-2:** Unit and integration tests per feature
- **Iteration 3-4:** System test suite development
- **Iteration 5-6:** Performance and security testing
- **Iteration 7-8:** Regression suite, UAT preparation

**Transition Phase:**
- **Week 1:** Final regression testing
- **Week 2:** UAT execution
- **Week 3:** Production smoke tests, cutover preparation
- **Week 4:** Hypercare testing, monitoring

## 8. Test Deliverables

**Per Iteration:**
- Test case specifications (new features)
- Test execution reports (automated + manual)
- Defect summary report
- Code coverage report

**Per Phase:**
- Master Test Plan (Elaboration)
- Test strategy updates (Construction)
- UAT report (Transition)
- Regression test results (Transition)

## 9. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test environment unstable | HIGH | MEDIUM | Dedicated DevOps support, automated provisioning |
| Test data unavailable | MEDIUM | LOW | Synthetic data generation, weekly data refresh |
| Insufficient test coverage | HIGH | MEDIUM | Automated coverage tracking, quality gates |
| Performance testing delays | MEDIUM | MEDIUM | Early performance baseline, continuous load testing |

## Sign-Off

**Required Approvals:**
- [ ] Test Architect: {APPROVED | CONDITIONAL | PENDING} - {name, date}
- [ ] Test Engineer: {APPROVED | CONDITIONAL | PENDING} - {name, date}
- [ ] Security Architect: {APPROVED | CONDITIONAL | PENDING} - {name, date}
- [ ] DevOps Engineer: {APPROVED | CONDITIONAL | PENDING} - {name, date}
```

## Example 2: Test Case Specifications (Step 2)

**Structure test cases:**

```markdown
# Test Case Specification

## TC-AUTH-001: Successful User Login

**Feature:** User Authentication
**Requirement:** REQ-001, UC-001
**Priority:** P0 (Critical)
**Test Type:** Functional, Integration
**Automation:** Yes (Cypress)

### Preconditions
- User account exists (username: test-user, password: Test123!)
- Authentication service is operational
- Database contains user record

### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /login | Login page displayed |
| 2 | Enter username: "test-user" | Username field populated |
| 3 | Enter password: "Test123!" | Password field populated (masked) |
| 4 | Click "Login" button | Loading indicator displayed |
| 5 | Wait for response | Redirected to /dashboard within 2 seconds |
| 6 | Verify dashboard | Welcome message "Hello, test-user" displayed |
| 7 | Check browser storage | JWT token present (localStorage.getItem('token')) |
| 8 | Verify token expiry | Token expires in 24 hours |

### Test Data
```json
{
  "username": "test-user",
  "email": "test@example.com",
  "password": "Test123!",
  "role": "USER"
}
```

### Expected Results
- User successfully authenticated
- JWT token issued and stored
- User redirected to dashboard
- Response time < 2 seconds (p95)

### Actual Results
- Status: {PASS | FAIL | BLOCKED}
- Execution Date: {YYYY-MM-DD}
- Execution Time: {HH:MM:SS}
- Response Time: {ms}
- Tester: {name}

### Defects
- {Defect-ID}: {Brief description} - Status: {OPEN | FIXED | VERIFIED}
```

## Example 3: Feedback and Annotations (Step 4)

```markdown
## 5. Test Automation

<!-- TEST-DOC: EXCELLENT - Comprehensive automation strategy -->

**Target:** 80% automation (by test case count)

**Frameworks:**
- **Unit:** Jest (JavaScript), Pytest (Python)
- **Integration:** Supertest (API tests) <!-- TEST-DOC: GOOD - Matches Node.js backend -->
- **System:** Cypress (web), Appium (mobile) <!-- TEST-DOC: APPROVED - Modern frameworks -->
- **Performance:** k6 (load tests) <!-- TEST-DOC: QUESTION - Why k6 vs JMeter? Please document rationale or create ADR. -->

<!-- TEST-DOC: MISSING - No contract testing mentioned. Consider adding Pact or similar for service contracts. -->

## 6. Defect Management

### Defect Priorities

| Priority | Definition | Resolution SLA |
|----------|------------|----------------|
| **P0 - Critical** | System down | 4 hours <!-- TEST-DOC: WARNING - 4 hour SLA may be aggressive. Verify with team capacity. -->
| **P1 - High** | Core feature broken | 1 business day <!-- TEST-DOC: APPROVED - Reasonable SLA -->
| **P2 - Medium** | Minor feature issue | 1 week <!-- TEST-DOC: APPROVED -->
| **P3 - Low** | Cosmetic | Backlog <!-- TEST-DOC: SUGGESTION - Consider "1 month" instead of "Backlog" for trackability -->

<!-- TEST-DOC: MISSING - No defect tracking tool specified. Add section on Jira, GitHub Issues, or equivalent. -->
```
