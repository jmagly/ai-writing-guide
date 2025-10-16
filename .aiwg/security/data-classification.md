# Data Classification - AI Writing Guide

**Project**: AI Writing Guide
**Phase**: Inception
**Document Owner**: Security Architect
**Date**: 2025-10-15
**Status**: APPROVED

## Purpose

This document classifies all data handled, stored, or processed by the AI Writing Guide project and establishes appropriate security controls for each classification level.

## Executive Summary

The AI Writing Guide is a documentation and tooling framework that **processes no user data**. All content is public (open source, MIT license) with no PII, secrets, or sensitive information.

**Classification**: **PUBLIC**

**Compliance Requirements**: None (no GDPR, PCI-DSS, HIPAA, or other regulatory requirements)

**Security Posture**: Minimal (appropriate for open-source documentation repository)

## Data Inventory

### Data Categories

| Category | Classification | Location | Sensitivity | Compliance |
| --- | --- | --- | --- | --- |
| Source Code (Markdown, JavaScript, Shell) | PUBLIC | GitHub repository | None | MIT License (open source) |
| Documentation (README, guides, examples) | PUBLIC | GitHub repository | None | MIT License (open source) |
| Agent Definitions (.claude/agents/*.md) | PUBLIC | GitHub repository | None | MIT License (open source) |
| Command Definitions (.claude/commands/*.md) | PUBLIC | GitHub repository | None | MIT License (open source) |
| Templates (SDLC artifacts) | PUBLIC | GitHub repository | None | MIT License (open source) |
| Distribution Tools (install.sh, deploy scripts) | PUBLIC | GitHub repository | None | MIT License (open source) |
| CI/CD Configuration (.github/workflows/) | PUBLIC | GitHub repository | None | No secrets stored |
| Git Commit History | PUBLIC | GitHub repository | None | Public repository |

### Data Classification Levels

**PUBLIC**:
- **Definition**: Information intended for unrestricted public access
- **Examples**: All project code, documentation, templates, tools
- **Protection**: Version control only (git)
- **Access Control**: Public GitHub repository
- **Retention**: Indefinite (git history)

**INTERNAL** (Not Applicable):
- No internal-only data exists for this project

**CONFIDENTIAL** (Not Applicable):
- No confidential data exists for this project

**RESTRICTED** (Not Applicable):
- No restricted data exists for this project

## Security Controls by Classification

### PUBLIC Data (All Project Data)

**Access Controls**:
- Public GitHub repository (anyone can read)
- Write access: Project owner only (solo developer)
- Fork access: Anyone (open source model)

**Encryption**:
- In transit: GitHub HTTPS/TLS (enforced)
- At rest: GitHub server-side encryption (default)
- No additional encryption required

**Backup and Retention**:
- Primary: GitHub repository (highly available, replicated)
- Secondary: User forks and clones (distributed backups)
- Retention: Indefinite (git history preserved)

**Audit Logging**:
- Git commit history (all changes logged)
- GitHub Actions logs (CI/CD execution)
- No additional logging required

### No User Data Processing

**User Data**: The AI Writing Guide processes **zero user data**:
- No user accounts or authentication
- No telemetry or analytics (no tracking of users)
- No PII collection (names, emails, IPs not collected)
- No user-generated content storage (users store their own projects locally)
- No cookies or tracking pixels

**Rationale**: Documentation framework distributed via git. Users clone/fork repository. No server-side processing or data collection.

## Compliance Assessment

### GDPR (General Data Protection Regulation)

**Applicability**: **NOT APPLICABLE**

**Rationale**:
- No personal data processed
- No EU users' data collected
- No user accounts or profiles
- No tracking or analytics

**Article 4 Assessment** (Personal Data Definition):
- Name: Not collected
- Email: Not collected
- IP address: Not logged (GitHub may log, but under GitHub's GDPR compliance)
- Location: Not collected
- Usage patterns: Not tracked

**Conclusion**: GDPR does not apply. No DPIA (Data Protection Impact Assessment) required.

### PCI-DSS (Payment Card Industry)

**Applicability**: **NOT APPLICABLE**

**Rationale**:
- No payment processing
- No credit card data handled
- No e-commerce functionality
- Open source project with no monetization

### HIPAA (Health Insurance Portability and Accountability Act)

**Applicability**: **NOT APPLICABLE**

**Rationale**:
- No health information processed
- No Protected Health Information (PHI)
- Documentation framework unrelated to healthcare

### SOC 2 (Service Organization Control)

**Applicability**: **NOT APPLICABLE**

**Rationale**:
- Not a service organization (no SaaS offering)
- No customer data custody
- Open source distribution model (users self-host)

### ISO 27001 (Information Security Management)

**Applicability**: **OPTIONAL** (best practices only)

**Rationale**:
- Could adopt ISO 27001 controls voluntarily for security best practices
- Not required for open source projects
- Focus on supply chain security (git-based distribution)

**Recommended Controls**:
- Version control (git) - **Implemented**
- Code review (currently solo, defer to multi-contributor phase) - **Deferred**
- Vulnerability scanning (Dependabot for npm dependencies) - **Recommended** (low priority)

## Security Risks and Mitigations

### Supply Chain Security

**Risk**: Installer script (`install.sh`) runs arbitrary code from GitHub
- **Classification**: Medium (users trust repository, but no signature verification)
- **Mitigation**:
  - Open source code (community review possible)
  - GitHub HTTPS/TLS (encrypted transport)
  - Git commit signatures (recommended for releases)
  - Checksum verification (recommended for v1.1+)
- **Status**: Accepted for v1.0 (GitHub HTTPS sufficient)

### Auto-Update Risk

**Risk**: `aiwg` CLI auto-updates on every command (malicious commit could affect users)
- **Classification**: Medium (rapid distribution of compromised code)
- **Mitigation**:
  - Graceful reinstall option (`aiwg -reinstall`)
  - Version pinning (defer to v1.1: `aiwg -version-lock 1.0.0`)
  - Release candidates for testing (v1.0.0-rc.1 before final)
- **Status**: Accepted for v1.0 (reinstall provides recovery)

### GitHub Account Compromise

**Risk**: Project owner's GitHub account compromised (malicious commits pushed)
- **Classification**: Medium (single point of failure)
- **Mitigation**:
  - Two-factor authentication (2FA) on GitHub account - **Required**
  - Git commit signing with GPG key - **Recommended**
  - GitHub security alerts enabled - **Recommended**
  - Repository transfer to organization (if multi-contributor) - **Deferred**
- **Status**: Monitor and enforce 2FA

### Secrets in Repository

**Risk**: Accidental commit of secrets (API keys, passwords) to public repository
- **Classification**: None (no secrets exist currently)
- **Prevention**:
  - No secrets required for project operation
  - No API keys, passwords, or credentials
  - No `.env` files or configuration secrets
  - GitHub secret scanning enabled (default for public repos)
- **Status**: No risk (no secrets to leak)

## Security Controls Implementation

### Current Security Controls (Implemented)

1. **Version Control**: Git with GitHub (public repository)
2. **Access Control**: Public read, project owner write
3. **Encryption in Transit**: GitHub HTTPS/TLS enforced
4. **Audit Logging**: Git commit history
5. **CI/CD**: GitHub Actions with no secrets
6. **Markdown Linting**: Quality gates for documentation
7. **Graceful Recovery**: `aiwg -reinstall` for corruption

### Recommended Security Controls (Post-v1.0)

1. **Git Commit Signing**: GPG signatures for releases (v1.1+)
2. **Checksum Verification**: SHA-256 checksums for installer (v1.1+)
3. **Dependabot**: Vulnerability scanning for npm dependencies (v1.0)
4. **GitHub Security Alerts**: Enable for all dependencies (v1.0)
5. **2FA Enforcement**: Two-factor authentication for GitHub account (immediate)

### Not Recommended (Overkill)

- SAST/DAST scanning (static content, no code execution)
- Penetration testing (no attack surface, documentation repository)
- Security audit (no sensitive data processing)
- Vulnerability disclosure program (low risk profile)

## Data Lifecycle

### Data Creation

**Source**: Developer creates documentation, code, templates
**Classification**: PUBLIC (by design, open source)
**Controls**: Git version control

### Data Storage

**Primary Storage**: GitHub repository
**Backup**: User forks/clones (distributed)
**Encryption**: GitHub server-side (default)
**Access**: Public read, project owner write

### Data Processing

**Processing**: None (static content)
**No user data**: Framework doesn't process user data
**No analytics**: No telemetry or tracking

### Data Transmission

**Distribution**: Git clone/pull (HTTPS)
**Encryption**: TLS 1.2+ (GitHub enforced)
**Verification**: Git commit hashes (integrity check)

### Data Destruction

**Retention**: Indefinite (git history preserved)
**Deletion**: Git history rewrite possible (not recommended)
**No user data to delete**: No GDPR "right to be forgotten" obligations

## Incident Response

### Security Incident Classification

**Critical**: Malicious code introduced to repository
- **Response**: Revert commit immediately, force push, notify users
- **Timeline**: <1 hour response, <4 hours resolution

**High**: GitHub account compromise suspected
- **Response**: Change passwords, revoke tokens, audit recent commits
- **Timeline**: <4 hours response, <24 hours resolution

**Medium**: Vulnerability in dependency discovered
- **Response**: Update dependency, test, release patch version
- **Timeline**: <48 hours response, <1 week resolution

**Low**: Documentation error or typo
- **Response**: Fix in next release, no urgency
- **Timeline**: <1 week response, next release cycle

### Communication Plan

**Internal**: Solo developer (no internal team)

**External**:
- GitHub security advisory (for vulnerabilities)
- GitHub issue (for non-security bugs)
- README banner (for critical security updates)
- CHANGELOG entry (for all security patches)

## Security Review Cadence

**During Development**:
- Manual review of all commits (project owner)
- CI/CD quality gates (markdown linting)

**Pre-Release**:
- Review CHANGELOG for security-relevant changes
- Test installation on clean systems
- Verify no secrets in repository

**Post-Release**:
- Monitor GitHub security alerts
- Review Dependabot PRs (if enabled)
- Respond to security issue reports

**Periodic Review**:
- Quarterly: Review security controls effectiveness
- Annually: Update data classification (if project scope changes)

## Approval and Sign-Off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Security Architect | AI Writing Guide Team | APPROVED | 2025-10-15 |
| Project Owner | Joseph Magly | APPROVED | 2025-10-15 |

**Conclusion**: The AI Writing Guide has **no data classification concerns** for Inception exit. All data is PUBLIC, no compliance requirements exist, and security controls are appropriate for an open-source documentation repository.

**LOM Gate Criteria**: ✅ PASSED (Data classification complete, no Show Stopper security concerns)

---

**Related Documents**:
- Risk assessment: `.aiwg/risks/risk-list.md` (R-005: Supply Chain Security)
- Security controls: Implementation noted in project-intake.md
- Compliance: No requirements (open source, no user data)
