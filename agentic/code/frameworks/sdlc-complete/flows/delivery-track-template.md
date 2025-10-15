# Delivery Track Flow

## Objective

Implement prioritized slices with tests and quality gates.

## Workflow

| Step | Activity | Agent/Role | Templates | Gate Criteria |
|------|----------|------------|-----------|---------------|
| 1 | Plan task slices | Component Owner, Project Manager | `management/work-package-card.md`<br>`management/iteration-plan-template.md` | Task slices 1-2 hours each, acceptance criteria defined, test-first strategy documented |
| 2 | Implement code and tests | Component Owner, Build Engineer | `implementation/design-class-card.md`<br>`test/use-case-test-card.md` | Code implements acceptance criteria, unit tests written, commits traceable to requirements |
| 3 | Run test suites, fix defects | QA Engineer, Component Owner | `test/iteration-test-plan-template.md`<br>`test/test-evaluation-summary-template.md` | Unit tests ≥80% coverage, integration tests passing, defects documented in issue tracker |
| 4 | Validate quality gates | Security Gatekeeper, Reliability Engineer | `security/security-test-case-card.md`<br>`deployment/sli-card.md` | Security scans passing (no High/Critical vulnerabilities), performance metrics within SLO targets |
| 5 | Integrate and prepare documentation | Deployment Manager, Technical Writer | `deployment/release-notes-template.md`<br>`deployment/runbook-entry-card.md` | Integration build successful, release notes updated, runbooks updated for operational changes |
| 6 | Update iteration assessment | Project Manager | `management/iteration-assessment-template.md` | Iteration goals met, velocity tracked, risks updated, lessons learned captured |

## Exit Criteria per Iteration

### Code Completeness
- [ ] All planned work items implemented (per iteration plan)
- [ ] Code peer-reviewed and approved
- [ ] Code merged to main/trunk branch
- [ ] No compiler warnings or linter errors
- [ ] Technical debt documented (if any introduced)

### Test Completeness
- [ ] Unit test coverage ≥ 80% (or per project standard from Master Test Plan)
- [ ] Integration tests passing 100%
- [ ] Acceptance tests passing (per DoD from handoff checklist)
- [ ] Regression tests passing (no existing functionality broken)
- [ ] Performance tests passing (if applicable per iteration scope)
- [ ] Security scans passing (no High/Critical vulnerabilities)

### Quality Gate Validation
- [ ] **Security Gate**: SAST/DAST scans clean, Security Gatekeeper signoff
- [ ] **Reliability Gate**: SLIs within targets, no performance regressions
- [ ] **Documentation Gate**: Code comments, README updates, runbook entries complete
- [ ] **Traceability Gate**: Requirements → code → tests linkage verified

### Documentation Updates
- [ ] Release notes updated (user-facing changes documented)
- [ ] Runbooks updated (operational procedures for new features)
- [ ] API documentation updated (if applicable)
- [ ] Architecture diagrams updated (if structural changes)

### Iteration Assessment
- [ ] Iteration assessment completed (iteration-assessment-template.md)
- [ ] Velocity calculated and tracked
- [ ] Risks updated (new risks identified, closed risks documented)
- [ ] Retrospective actions captured
- [ ] Traceability matrix updated

## Definition of Done (DoD)

A work item is DONE when:

### Implementation Complete
- [ ] Code implements all acceptance criteria
- [ ] Code peer-reviewed by at least 1 reviewer
- [ ] Code merged to integration branch
- [ ] No outstanding code review comments

### Tests Complete
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Acceptance tests passing (per DoR criteria)
- [ ] Test coverage meets project standards

### Documentation Complete
- [ ] Code comments added (public APIs documented)
- [ ] Release notes entry added
- [ ] Runbook entry added (if operational impact)
- [ ] Traceability updated (work item → code → tests)

### Quality Gates Passed
- [ ] Security scan passing
- [ ] Performance within SLO targets
- [ ] No new High/Critical defects introduced

### Deployment Ready
- [ ] Deployed to dev environment successfully
- [ ] Deployed to test/staging environment successfully
- [ ] Feature flag configured (if applicable)
- [ ] Configuration changes documented

## Quality Gate Failure Recovery

If a quality gate fails:

1. **Security Gate Failure** (High/Critical vulnerabilities found)
   - STOP: Do not proceed to next iteration
   - Security Gatekeeper triages vulnerability
   - If P0/P1: Emergency fix required, may require architecture change
   - If P2: Document in backlog, schedule for next iteration
   - Re-scan after fix, Security Gatekeeper re-approval required

2. **Reliability Gate Failure** (Performance regression, SLO breach)
   - STOP: Do not merge to main
   - Reliability Engineer investigates root cause
   - Performance profiling, load testing to identify bottleneck
   - Fix and re-test, Reliability Engineer re-approval required

3. **Test Coverage Gate Failure** (Coverage below threshold)
   - STOP: Do not merge to main
   - Test Architect reviews coverage gaps
   - Additional tests written to cover critical paths
   - Re-run coverage analysis, Test Architect re-approval required

4. **Regression Gate Failure** (Existing tests failing)
   - STOP: Do not merge to main
   - Root cause analysis: bug in new code or test issue?
   - Fix bug or update test (if requirements changed)
   - Re-run full regression suite

## Agent Assignments

- **Task Planning**: Project Manager (lead), Component Owner
- **Implementation**: Component Owner, Build Engineer
- **Testing**: QA Engineer, Test Architect (review)
- **Security Review**: Security Gatekeeper (gate approval)
- **Performance Review**: Reliability Engineer (gate approval)
- **Integration**: Configuration Manager, Deployment Manager
- **Documentation**: Technical Writer, Component Owner
- **Iteration Assessment**: Project Manager

## Integration with Discovery Track

- **Input from Discovery**: Ready backlog items (passed DoR from discovery-delivery handoff)
- **Synchronization**: Delivery consumes work 1 iteration behind Discovery
- **Feedback Loop**: If implementation discovers requirements gap, escalate to Requirements Reviewer, may return to Discovery
- **Handoff Cadence**: Weekly or per iteration boundary (align with dual-track iteration flow)

## References

- Discovery → Delivery handoff: See `handoff-checklist-template.md` (DoR section)
- Construction phase exit criteria: See `gate-criteria-by-phase.md` (Operational Capability Milestone)
- Iteration planning: See `management/iteration-plan-template.md`
- Test strategy: See `test/master-test-plan-template.md`
- Deployment pipeline validation: See `deployment/deployment-plan-template.md`
