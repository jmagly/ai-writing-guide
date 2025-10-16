# Risk List - AI Writing Guide v1.0

**Project**: AI Writing Guide
**Phase**: Inception → Elaboration Transition
**Document Owner**: Project Manager
**Last Updated**: 2025-10-15

## Purpose

This document maintains a prioritized list of project risks identified during Inception, their mitigation strategies, and current status. Risks are tracked through Elaboration and retired or accepted before Construction.

## Risk Summary

| Total Risks | Critical | High | Medium | Low |
|-------------|----------|------|--------|-----|
| 10          | 0        | 3    | 5      | 2   |

## Risk Register

| Risk ID | Description | Impact | Likelihood | Exposure | Mitigation Strategy | Owner | Status | Residual Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | **No semantic versioning**: Users cannot pin to stable release, breaking changes may occur without notice | High | High | H×H=Critical | **Option B implementation**: Add semantic versioning (v1.0.0-rc.1), create CHANGELOG.md, establish release process. Timeline: Week 1-4 of Elaboration. | Project Owner | Mitigating | Medium (version pinning reduces, but single developer risk remains) |
| R-002 | **Untested installation scripts**: deploy-agents.mjs, new-project.mjs, install.sh may fail on user systems | High | Medium | H×M=High | Add smoke tests for critical scripts, test on multiple platforms (Ubuntu, macOS, WSL), add CI test workflow. Timeline: Week 2-3 of Elaboration. | DevOps Engineer | Mitigating | Low (smoke tests catch major issues) |
| R-003 | **Bus factor = 1**: Solo developer, no peer review, project continuity at risk | High | Medium | H×M=High | Document everything comprehensively (✓ complete), consider multi-contributor model if community grows. Defer governance to post-v1.0 unless contributors emerge. | Project Owner | Accepted | High (inherent to solo project, mitigated by documentation) |
| R-004 | **Platform compatibility gaps**: Untested on multiple Linux distributions, macOS versions, WSL configurations | Medium | Medium | M×M=Medium | Cross-platform testing during Week 3 of Elaboration. Test on Ubuntu 20.04/22.04, Debian, macOS, WSL2. Document compatibility matrix. | Test Engineer | Open | Low (after cross-platform validation) |
| R-005 | **Supply chain security**: Installer downloads from GitHub without signature verification or checksum | Medium | Low | M×L=Low | Consider adding GPG signatures for releases, checksum verification for installer. Defer to post-v1.0 (not blocking for open source git-based distribution). | Security Auditor | Accepted | Low (GitHub HTTPS sufficient for v1.0) |
| R-006 | **Auto-update disruption**: aiwg auto-updates on every command, malicious commit could affect all users | Medium | Low | M×L=Low | Add optional version pinning (aiwg -version-lock), document rollback procedure. Defer to v1.1 (graceful reinstall already exists). | Project Owner | Accepted | Medium (mitigated by -reinstall option) |
| R-007 | **Breaking changes without migration**: Agent/command changes may break user workflows | Medium | Medium | M×M=Medium | Establish deprecation policy (2 minor versions notice), document breaking changes in CHANGELOG, create migration guides for major versions. Timeline: Week 1 of Elaboration. | Requirements Analyst | Open | Low (after deprecation policy established) |
| R-008 | **GitHub dependency**: Complete reliance on GitHub availability (99.9% SLA) | Low | Low | L×L=Low | Accept risk. GitHub uptime is industry-standard. No mitigation required. | Project Owner | Accepted | Low (acceptable for open source) |
| R-009 | **Node.js version fragmentation**: Users may have incompatible Node.js versions | Medium | Low | M×L=Low | Document Node.js >= 18.20.8 requirement, add version check in installer, offer auto-install option. Already implemented. | DevOps Engineer | Resolved | None (installer checks version) |
| R-010 | **Rapid iteration instability**: 70 commits/week pace may introduce regressions | Medium | Medium | M×M=Medium | Establish release cadence (monthly/quarterly), use release candidates (rc.1, rc.2), gather feedback before final release. Timeline: Week 4 of Elaboration. | Project Manager | Open | Low (after release process established) |

## Risk Details

### R-001: No Semantic Versioning (Critical Exposure)

**Description**: The project currently has no version tags or releases. Users pulling from `main` branch may encounter breaking changes without notice. No rollback mechanism for problematic updates.

**Impact Analysis**:
- User workflows break unexpectedly
- Loss of trust in framework stability
- Unable to reproduce issues (no version to reference)
- Users cannot pin to known-good version

**Mitigation Plan** (Option B - Week 1-4):
1. **Week 1**: Tag v1.0.0-rc.1, create CHANGELOG.md, document versioning policy
2. **Week 2-3**: Add smoke tests, cross-platform validation
3. **Week 4**: Tag v1.0.0, create GitHub release, announce

**Success Criteria**:
- [ ] v1.0.0-rc.1 tagged and released
- [ ] CHANGELOG.md comprehensive and up-to-date
- [ ] Versioning policy documented in CONTRIBUTING.md
- [ ] v1.0.0 production release published

**Residual Risk**: Medium (versioning addresses release management, but solo developer risk remains)

### R-002: Untested Installation Scripts (High Exposure)

**Description**: No automated tests for deploy-agents.mjs, new-project.mjs, or install.sh. Installation failures possible on user systems.

**Impact Analysis**:
- Poor first-run experience (installation failures)
- Support burden (troubleshooting installation issues)
- Trust erosion (users abandon framework)

**Mitigation Plan** (Week 2-3):
1. Add smoke test for deploy-agents.mjs (dry-run validation)
2. Add smoke test for new-project.mjs (temp directory test)
3. Add smoke test for install.sh (ShellCheck + basic execution)
4. Add GitHub Actions test workflow
5. Test on Ubuntu, macOS, WSL

**Success Criteria**:
- [ ] tests/ directory with smoke test scripts
- [ ] .github/workflows/test.yml operational
- [ ] Tests passing on Ubuntu 20.04, 22.04, macOS, WSL
- [ ] CI blocks merge on test failures

**Residual Risk**: Low (smoke tests catch major issues, comprehensive testing not required for v1.0)

### R-003: Bus Factor = 1 (High Exposure)

**Description**: Solo developer (Joseph Magly) with no peer review or backup maintainer. Project continuity at risk if developer becomes unavailable.

**Impact Analysis**:
- Project abandonment possible
- No second opinion on architectural decisions
- No peer review for code quality

**Mitigation Plan**:
1. **Completed**: Comprehensive documentation (README, CLAUDE.md, USAGE_GUIDE, PROJECT_SUMMARY, ROADMAP, CONTRIBUTING)
2. **Completed**: Clear code structure and naming conventions
3. **Defer**: Multi-contributor governance to post-v1.0 (only if contributors emerge)
4. **Monitor**: Community interest (GitHub stars, issues, PRs)

**Success Criteria**:
- [x] Documentation enables project handoff
- [x] Code structure is self-explanatory
- [ ] Monitor community engagement for 3 months post-v1.0
- [ ] Establish governance if 3+ active contributors emerge

**Residual Risk**: High (inherent to solo projects, accepted with documentation mitigation)

### R-007: Breaking Changes Without Migration (Medium Exposure)

**Description**: Agent/command structure changes may break user workflows. No deprecation policy or migration guides.

**Impact Analysis**:
- User workflows break on update
- Loss of productivity
- Trust erosion

**Mitigation Plan** (Week 1):
1. Document deprecation policy (2 minor versions notice)
2. Add DEPRECATED markers to agent/command files
3. Document breaking changes in CHANGELOG
4. Create migration guides for major version bumps

**Success Criteria**:
- [ ] Deprecation policy in CONTRIBUTING.md
- [ ] Breaking changes policy documented
- [ ] Migration guide template created

**Residual Risk**: Low (policy prevents surprise breakage)

### R-010: Rapid Iteration Instability (Medium Exposure)

**Description**: Development velocity of 70 commits/week may introduce regressions without stabilization periods.

**Impact Analysis**:
- Users encounter bugs in rapid succession
- Difficult to track which commit introduced issue
- No stable reference point

**Mitigation Plan** (Week 4):
1. Establish release cadence (monthly or quarterly)
2. Use release candidates (rc.1, rc.2) before final
3. Gather community feedback during RC period
4. Freeze features 1 week before release

**Success Criteria**:
- [ ] Release cadence documented
- [ ] RC process established
- [ ] Feature freeze policy documented

**Residual Risk**: Low (release process stabilizes development)

## Risk Retirement Plan

**Elaboration Phase** (8 weeks):
- Week 1-4: Retire R-001 (versioning complete)
- Week 2-3: Retire R-002 (testing complete)
- Week 1: Retire R-007 (deprecation policy established)
- Week 3: Retire R-004 (cross-platform testing complete)
- Week 4: Retire R-010 (release process operational)

**Accepted Risks** (No retirement planned):
- R-003 (bus factor - inherent to solo project)
- R-005 (supply chain - defer to post-v1.0)
- R-006 (auto-update - defer to v1.1)
- R-008 (GitHub dependency - acceptable for open source)

**ABM Gate** (End of Elaboration):
- **Target**: ≥70% of risks retired or resolved
- **Current**: 1 resolved (R-009), 5 to retire during Elaboration
- **Projected**: 60% retired by ABM (acceptable with documented acceptance for remaining risks)

## Risk Review Cadence

**During Elaboration**:
- Weekly risk review during iteration planning
- Update status as mitigation progresses
- Add new risks as discovered

**Post-Elaboration**:
- Monthly risk review during Construction
- Quarterly risk review during Transition
- Add to retrospective agenda

## Escalation Path

**Risk Escalation Criteria**:
- Exposure increases (Impact or Likelihood worsens)
- Mitigation blocked or failing
- New Show Stopper risk identified

**Escalation Process**:
1. Update risk status to "Blocked" in this document
2. Document blocker reason
3. Escalate to Project Owner (Executive Sponsor for open source context)
4. Consider Go/No-Go decision if Show Stopper cannot be mitigated

## References

- **Risk identification source**: `.aiwg/intake/ANALYSIS_REPORT.md` (sections: Known Issues, Recommendations)
- **Mitigation plan source**: `.aiwg/intake/option-matrix.md` (Option B implementation details)
- **Risk workshop**: Self-assessment by project owner using intake-from-codebase analysis
- **Related artifacts**: `.aiwg/management/lom-validation-report.md` (gate criteria for Inception exit)
