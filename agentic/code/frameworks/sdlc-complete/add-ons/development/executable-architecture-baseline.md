# Executable Architecture Baseline (Prototype) - Development Add-On

**Category**: Development
**Phase Applicability**: Elaboration
**Purpose**: Build working prototype that proves architecture (steel thread implementation)
**Agent Coordination**: Software Implementer, Test Engineer, Deployment Manager, Code Reviewer

## Overview

The Executable Architecture Baseline (also called "prototype" or "steel thread") is a working implementation that demonstrates the system's architecture is viable. This is NOT a "toy app" - it must prove the architecture with real components, real integrations, and real tests.

**Key Principle**: 10-20% of final functionality, 100% of architectural coverage

## When to Use This Add-On

**Trigger Points**:
- During Elaboration phase (after Architecture Baseline Plan created)
- After Software Architecture Document (SAD) is drafted
- When architecturally significant use cases are identified
- Before committing to full-scale Construction

**Prerequisites**:
- [ ] Lifecycle Objective Milestone (LOM) achieved
- [ ] Architecture Baseline Plan documented
- [ ] Steel thread use cases selected (2-3 architecturally significant)
- [ ] Software Architecture Document (SAD) in draft or review
- [ ] Development environment ready

## Prototype Requirements

### Must Include

**End-to-End Flow**:
- User action (UI or API)
- Business logic layer
- Data persistence layer
- Response back to user

**Architecturally Significant Components**:
- Authentication and authorization mechanisms
- Data persistence (database, ORM, migrations)
- API integration (external system calls)
- Logging and monitoring hooks
- Error handling patterns
- Configuration management

**Quality Gates**:
- Unit tests (≥60% coverage minimum)
- Integration tests (at least 2 end-to-end flows)
- Code review completed
- CI/CD pipeline operational
- Deployed to test environment

### Can Exclude

**Non-Architecturally Significant**:
- Full UI polish (basic functional UI sufficient)
- Non-critical features (defer to Construction)
- Performance optimization (establish baseline only)
- Complete test coverage (prove patterns, not exhaustive)
- Production-grade monitoring (basic observability sufficient)

**Rationale**: Prototype proves architecture, not product completeness

## Commands and Tools

### Build Prototype

```bash
# Build application
npm run build  # or equivalent for tech stack (mvn package, cargo build, etc.)

# Run locally
npm run dev  # or equivalent

# Check build artifacts
ls dist/  # or build/, target/, etc.
```

### Run Tests

```bash
# Unit tests
npm run test
npm run test:coverage

# Integration tests
npm run test:integration

# Performance baseline
npm run test:performance

# View test results
open coverage/index.html  # or equivalent
```

### Deploy to Test Environment

```bash
# Deploy via CI/CD
git push origin feature/prototype
# (CI/CD pipeline triggers automatically)

# Or manual deployment
npm run deploy:test

# Validate deployment
curl {test-endpoint}/health
curl {test-endpoint}/api/v1/status

# Check logs
kubectl logs {pod-name}  # or docker logs, journalctl, etc.
```

### Agent Coordination

**Software Implementer** (lead):
- Implement steel thread use cases
- Follow architecture patterns from SAD
- Write unit tests alongside code
- Document code and configuration

**Test Engineer**:
- Create integration test suite
- Establish test data strategy
- Configure test environments
- Validate test coverage

**Deployment Manager**:
- Set up CI/CD pipeline (build, test, deploy)
- Configure test environment
- Implement smoke tests
- Document deployment process

**Code Reviewer**:
- Review code for architectural conformance
- Validate coding standards
- Check test coverage
- Ensure documentation complete

## Validation Criteria

### Prototype Validation Checklist

**Functionality** (End-to-End):
- [ ] Prototype runs successfully in development environment
- [ ] User can complete steel thread use case end-to-end
- [ ] Data persists correctly (database writes/reads)
- [ ] External integrations working (API calls successful)
- [ ] Error handling demonstrates graceful degradation

**Architecture Validation**:
- [ ] Architecture patterns visible in code (layers, separation of concerns)
- [ ] Component boundaries match SAD (logical components implemented)
- [ ] Technology stack operational (frameworks, libraries, databases)
- [ ] Integration architecture proven (external systems connected)
- [ ] Security mechanisms operational (authentication, authorization)

**Quality Validation**:
- [ ] Unit test coverage ≥60% (target met)
- [ ] Integration tests passing (at least 2 end-to-end flows)
- [ ] Code reviewed and meets coding standards
- [ ] No critical bugs (P0/P1) in prototype
- [ ] Technical debt documented (known limitations captured)

**Deployment Validation**:
- [ ] CI/CD pipeline builds and deploys prototype automatically
- [ ] Smoke tests pass post-deployment (critical paths validated)
- [ ] Test environment accessible (URL/endpoint reachable)
- [ ] Logs visible and structured (logging framework operational)
- [ ] Monitoring hooks present (metrics, health checks)

**Performance Baseline**:
- [ ] Performance baseline established (load test results captured)
- [ ] Response time measured (p50, p95, p99 recorded)
- [ ] Throughput measured (requests/second under load)
- [ ] Resource utilization captured (CPU, memory, disk, network)
- [ ] Bottlenecks identified (if any)

### Success Criteria

**GO to ABM Review**:
- All validation checklist items passed
- No Show Stopper defects (P0 bugs)
- Architectural risks retired (prototype proves viability)
- Stakeholder demo successful (working system demonstrated)

**NO-GO** (Extend Elaboration):
- Critical functionality broken (prototype doesn't run)
- Architecture patterns not evident (code doesn't match SAD)
- Test coverage insufficient (<40%)
- CI/CD pipeline not operational
- Major architectural risks remain unaddressed

## Output: Executable Architecture Baseline Report

```markdown
# Executable Architecture Baseline Report

**Project**: {project-name}
**Prototype Version**: {version} (e.g., 0.1.0-prototype)
**Date**: {date}
**Status**: {OPERATIONAL | PARTIAL | FAILED}

## Prototype Scope

### Steel Thread Use Cases Implemented
1. **UC-{ID}**: {use-case-name}
   - Implementation Status: {COMPLETE | PARTIAL | NOT STARTED}
   - Architectural Significance: {why this use case proves architecture}
   - Risks Addressed: {list risk IDs retired by this use case}

2. **UC-{ID}**: {use-case-name}
   - Implementation Status: {COMPLETE | PARTIAL | NOT STARTED}
   - Architectural Significance: {why this use case proves architecture}
   - Risks Addressed: {list risk IDs retired by this use case}

### Components Implemented
- **Component A**: {description} - Status: {OPERATIONAL | PARTIAL}
- **Component B**: {description} - Status: {OPERATIONAL | PARTIAL}
- **Component C**: {description} - Status: {OPERATIONAL | PARTIAL}

### Integrations Demonstrated
- **External System 1**: {description} - Status: {WORKING | STUBBED | FAILED}
- **External System 2**: {description} - Status: {WORKING | STUBBED | FAILED}

### Technology Stack Validated
- **Languages**: {list} - Status: {PROVEN}
- **Frameworks**: {list} - Status: {PROVEN | ISSUES}
- **Databases**: {list} - Status: {PROVEN | ISSUES}
- **Infrastructure**: {list} - Status: {PROVEN | ISSUES}

## Test Results

### Unit Tests
- **Coverage**: {percentage}% (target: ≥60%)
- **Tests Passing**: {passed}/{total}
- **Critical Failures**: {count} (P0/P1 bugs)
- **Status**: {PASS | FAIL}

### Integration Tests
- **End-to-End Flows**: {count} flows tested
- **Tests Passing**: {passed}/{total}
- **Critical Failures**: {count} (P0/P1 bugs)
- **Status**: {PASS | FAIL}

### Performance Baseline
- **Response Time (p50)**: {value}ms
- **Response Time (p95)**: {value}ms
- **Response Time (p99)**: {value}ms
- **Throughput**: {value} req/s
- **Resource Utilization**: CPU {percentage}%, Memory {GB}
- **Status**: {ACCEPTABLE | NEEDS OPTIMIZATION}

## Deployment Status

### Environments
- **Development**: {DEPLOYED | FAILED} - URL: {url}
- **Test**: {DEPLOYED | FAILED} - URL: {url}
- **Staging**: {DEPLOYED | NOT READY}

### CI/CD Pipeline
- **Build**: {OPERATIONAL | FAILED}
- **Test Automation**: {OPERATIONAL | PARTIAL}
- **Deployment Automation**: {OPERATIONAL | MANUAL}
- **Smoke Tests**: {PASSING | FAILING}
- **Status**: {OPERATIONAL | INCOMPLETE}

## Architecture Validation

### Architectural Patterns Demonstrated
- [ ] **Layering**: Presentation, business logic, data access layers visible
- [ ] **Modularity**: Clear component boundaries, low coupling, high cohesion
- [ ] **Separation of Concerns**: Each component has single responsibility
- [ ] **Dependency Injection**: Components decoupled via DI container
- [ ] **Error Handling**: Consistent error handling across layers
- [ ] **Configuration**: Externalized configuration (env vars, config files)

### Architectural Drivers Validated
- [ ] **Performance**: Response time acceptable (p95 < {target}ms)
- [ ] **Scalability**: Architecture supports horizontal scaling (if required)
- [ ] **Security**: Authentication and authorization mechanisms operational
- [ ] **Maintainability**: Code is readable, documented, follows standards
- [ ] **Testability**: Code is testable, mocking/stubbing possible

### Integration Architecture Proven
- [ ] **External API Integration**: HTTP client working, error handling proven
- [ ] **Database Integration**: ORM/query layer operational, migrations working
- [ ] **Message Queue**: (If applicable) Pub/sub or queue demonstrated
- [ ] **Caching**: (If applicable) Cache layer operational
- [ ] **Logging**: Structured logging operational, log aggregation working
- [ ] **Monitoring**: Health checks, metrics endpoints operational

## Issues and Gaps

### Known Issues (Defects)
| ID | Severity | Description | Status | Owner |
| --- | --- | --- | --- | --- |
| BUG-001 | P2 | {description} | Open | {name} |
| BUG-002 | P3 | {description} | Open | {name} |

### Technical Debt
| ID | Type | Description | Deferral Rationale | Plan to Address |
| --- | --- | --- | --- | --- |
| TD-001 | Code Quality | {description} | Prototype scope - defer to Construction | Refactor in Iteration 1 |
| TD-002 | Test Coverage | {description} | 60% sufficient for prototype | Increase to 80% in Construction |

### Out of Scope (Deferred to Construction)
- {Feature 1}: Not architecturally significant, defer to Construction
- {Feature 2}: Polish/UX improvement, defer to Construction
- {Feature 3}: Performance optimization, baseline sufficient

## Conclusion

**Architecture Proven**: {YES | NO | PARTIAL}

**Rationale**:
{Detailed reasoning based on validation checklist. Explain:
- What architectural patterns were successfully demonstrated
- What architectural risks were retired
- What architectural assumptions were validated
- What gaps remain (if any)}

**Recommendation**: {GO to ABM Review | Extend Elaboration | Pivot Architecture}

**Next Steps**:
1. {action-item-1}
2. {action-item-2}
3. {action-item-3}

---

**Report Generated**: {date}
**Report Version**: {version}
**Reviewed By**: {architect-name}, {test-architect-name}
**Approved By**: {executive-sponsor-name} (if approved)
```

## Common Pitfalls and Mitigations

### Pitfall: Prototype Becomes Full Product

**Symptom**: Team spends 6+ weeks building prototype, adding "just one more feature"

**Mitigation**:
- Timebox prototype development: 3-5 weeks maximum
- Ruthlessly scope: Only steel thread use cases (2-3 use cases max)
- Defer polish: Basic UI, no optimization, 60% test coverage
- Technical debt is acceptable: Capture in backlog, address in Construction

**Guideline**: If prototype has >20% of final features, you've built too much

### Pitfall: Prototype Doesn't Prove Architecture

**Symptom**: Prototype is a "toy app" that doesn't exercise real architectural patterns

**Mitigation**:
- Select architecturally significant use cases (high-risk, complex integration)
- Implement end-to-end (UI → business logic → database → external API)
- Include real authentication, real data persistence, real integrations
- No mocks/stubs for architectural components (stub external systems only)

**Guideline**: If prototype can't deploy to test environment, it's not executable

### Pitfall: Zero Technical Debt Tolerance

**Symptom**: Team refactors prototype code to "production quality", delays ABM

**Mitigation**:
- Accept technical debt in prototype (document for Construction)
- Don't refactor during Elaboration (unless architecture flawed)
- Code quality sufficient: Readable, tested (60%), follows standards
- Save optimization for Construction iterations

**Guideline**: Prototype proves architecture, not code quality

### Pitfall: Skipping Tests

**Symptom**: Team focuses on code, skips unit/integration tests, "we'll test later"

**Mitigation**:
- Require unit tests ≥60% coverage (gate criteria)
- Require integration tests (at least 2 end-to-end flows)
- Tests are part of architecture validation (testability is architectural quality)
- No test = incomplete prototype

**Guideline**: Untested prototype doesn't prove architecture

## Integration with Other SDLC Components

**Prerequisites**:
- `/flow-concept-to-inception` completed (LOM achieved)
- Architecture Baseline Plan created (Step 2 of Inception → Elaboration flow)
- Software Architecture Document drafted (Step 3)

**Outputs Used By**:
- Risk Retirement Report (Step 5) - Prototype retires architectural risks
- Requirements Baseline (Step 6) - Prototype validates architecturally significant use cases
- ABM Review (Step 7) - Prototype demonstration required for GO decision

**Related Add-Ons**:
- `steel-thread-selection.md` - How to select architecturally significant use cases
- `spike-execution.md` - How to run time-boxed technical spikes
- `architecture-peer-review.md` - How to conduct architecture reviews

## Metrics to Track

**Development Velocity**:
- Story points completed per week (prototype backlog)
- Cycle time: Commit → deploy to test (target: <1 day)
- Defect density: Bugs per 1000 lines of code (target: <5)

**Quality Metrics**:
- Unit test coverage (target: ≥60%)
- Integration test pass rate (target: 100%)
- Code review turnaround time (target: <24 hours)
- CI/CD pipeline success rate (target: ≥90%)

**Architecture Validation**:
- Architectural risks retired (count)
- Architectural patterns demonstrated (count)
- Technology stack components validated (count)
- External integrations proven (count)

## References

**SDLC Templates**:
- `requirements/use-case-spec-template.md` - Steel thread use case specifications
- `analysis-design/software-architecture-doc-template.md` - SAD structure
- `analysis-design/spike-card-template.md` - Technical spike documentation
- `test/master-test-plan-template.md` - Test strategy

**Related Flows**:
- `/flow-inception-to-elaboration` - Full Elaboration phase workflow (this component is Step 4)
- `/flow-gate-check elaboration` - ABM gate criteria validation
- `/flow-risk-management-cycle` - Risk identification and retirement

**Related Agents**:
- `software-implementer.md` - Coding and implementation
- `test-engineer.md` - Test automation and quality
- `deployment-manager.md` - CI/CD and environments
- `code-reviewer.md` - Code quality and standards
- `architecture-designer.md` - Architecture guidance

---

**Add-On Version**: 1.0
**Phase**: Elaboration
**Mandatory**: Yes (ABM gate requires executable architecture baseline)
**Typical Duration**: 3-5 weeks (after architecture planning)
