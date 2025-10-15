# License Compliance Template

## Cover Page

- `Project Name`
- `License Compliance Management`
- `Version 1.0`

## Revision History

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `dd/mmm/yy` | `x.x` | `<details>` | `<name>` |

## Ownership & Collaboration

- Document Owner: Legal Liaison
- Contributor Roles: Build Engineer, Security Gatekeeper, Configuration Manager
- Automation Inputs: SBOM generation tools, license scanning tools, dependency managers
- Automation Outputs: License inventory, compliance reports, attribution files, CI/CD enforcement

## 1 Introduction

> Establish comprehensive license management for open source and commercial dependencies, ensuring legal compliance and IP protection.

### 1.1 Purpose

This document defines license policies, tracks license obligations, implements automated compliance checks, and manages IP risks related to third-party software components.

### 1.2 Scope

This document covers:
- Open source license policy (allowlist, denylist, review-required)
- License inventory and tracking
- License obligation management (attribution, copyleft, restrictions)
- Commercial license tracking and cost management
- SBOM generation and distribution
- CI/CD license enforcement
- Audit procedures and reporting

### 1.3 Definitions, Acronyms, and Abbreviations

- **SBOM**: Software Bill of Materials
- **MIT**: MIT License (permissive)
- **Apache 2.0**: Apache License 2.0 (permissive)
- **BSD**: Berkeley Software Distribution License (permissive)
- **GPL**: GNU General Public License (copyleft)
- **AGPL**: GNU Affero General Public License (network copyleft)
- **LGPL**: GNU Lesser General Public License (weak copyleft)
- **MPL**: Mozilla Public License
- **Copyleft**: License requiring derivative works to use same license
- **Attribution**: Requirement to credit original authors
- **Permissive**: License allowing proprietary derivative works

### 1.4 References

- `sbom-guidance.md` - SBOM generation procedures
- `dependency-policy-template.md` - Dependency management
- `bill-of-materials-template.md` - Release artifacts
- `contract-management-template.md` - Commercial license contracts
- `legal-risk-assessment-template.md` - IP risk tracking

### 1.5 Overview

Section 2 defines license policies; Section 3 inventories licenses; Section 4 tracks obligations; Section 5 covers SBOM integration; Section 6 implements CI/CD enforcement; Section 7 establishes audit procedures.

## 2 License Policy

> Define organizational policies for acceptable, restricted, and prohibited licenses.

### 2.1 Approved Licenses (Allowlist)

**Auto-Approved for Use** - No legal review required, CI/CD auto-approves

| License | SPDX ID | Type | Key Terms | Obligations | Risks |
| --- | --- | --- | --- | --- | --- |
| MIT License | MIT | Permissive | Use, modify, distribute freely | Attribution | Minimal |
| Apache License 2.0 | Apache-2.0 | Permissive | Use, modify, distribute, patent grant | Attribution, notices | Minimal |
| BSD 3-Clause | BSD-3-Clause | Permissive | Use, modify, distribute | Attribution | Minimal |
| BSD 2-Clause | BSD-2-Clause | Permissive | Use, modify, distribute | Attribution | Minimal |
| ISC License | ISC | Permissive | Use, modify, distribute | Attribution | Minimal |
| 0BSD License | 0BSD | Public domain equivalent | Use freely | None | Minimal |
| Creative Commons CC0 | CC0-1.0 | Public domain dedication | Use freely | None | Minimal |

**Rationale**: Permissive licenses allow proprietary derivative works, minimal restrictions, standard attribution requirements.

### 2.2 Restricted Licenses (Requires Legal Review)

**Manual Review Required** - CI/CD flags for legal review before approval

| License | SPDX ID | Type | Key Concerns | Review Criteria | Typical Decision |
| --- | --- | --- | --- | --- | --- |
| GNU GPL v2 | GPL-2.0 | Strong copyleft | Derivative works must be GPL | Is code distributed? Is GPL isolation possible? | Reject if distributed, consider if internal-only |
| GNU GPL v3 | GPL-3.0 | Strong copyleft | Derivative works must be GPL, patent/DRM clauses | Same as GPL v2, plus patent implications | Reject if distributed |
| GNU AGPL v3 | AGPL-3.0 | Network copyleft | SaaS triggers copyleft | SaaS deployment = distribution | Reject (triggers on SaaS) |
| GNU LGPL v2.1/v3 | LGPL-2.1, LGPL-3.0 | Weak copyleft | Linking OK if separated | Dynamic vs. static linking, isolation | Approve if dynamically linked |
| Mozilla Public License 2.0 | MPL-2.0 | Weak copyleft | File-level copyleft | Is modified code isolated? | Approve if file-level isolation maintained |
| Eclipse Public License 2.0 | EPL-2.0 | Weak copyleft | Module-level copyleft | Is EPL code in separate modules? | Approve if modular isolation |
| Commercial licenses | N/A | Proprietary | Licensing costs, usage restrictions | Cost, seats, deployment limits | Case-by-case |
| Custom licenses | N/A | Unknown | Unknown terms | Full legal review | Case-by-case |

**Rationale**: Copyleft licenses impose restrictions on distribution, require legal analysis of deployment model and isolation strategies.

### 2.3 Prohibited Licenses (Denylist)

**Auto-Rejected** - CI/CD blocks merge, no exceptions without General Counsel approval

| License | SPDX ID | Reason for Prohibition | Alternative |
| --- | --- | --- | --- |
| Unlicensed code | NONE | No legal right to use | Find licensed alternative or contact author |
| WTFPL | WTFPL | Unprofessional, uncertain legal status | MIT, Apache 2.0 |
| JSON License | JSON | "Good, not evil" clause creates legal uncertainty | MIT-licensed JSON libraries |
| [Add org-specific prohibitions] | [SPDX ID] | [Reason] | [Alternative] |

**Rationale**: Unlicensed code has no grant of rights, unprofessional or legally ambiguous licenses create unnecessary risk.

### 2.4 License Compatibility Matrix

| Our License | Compatible With | Incompatible With |
| --- | --- | --- |
| Proprietary | MIT, Apache, BSD, ISC | GPL, AGPL (if distributed) |
| Open Source (MIT) | MIT, Apache, BSD, GPL | N/A (MIT is compatible with everything) |
| Open Source (Apache 2.0) | MIT, Apache, BSD, GPL v3 (not v2) | GPL v2 |

**Reference**: [Open Source Initiative License Compatibility Guide](https://opensource.org/licenses/category)

## 3 License Inventory

> Maintain a comprehensive, up-to-date inventory of all third-party licenses used in the project.

### 3.1 Dependency License Inventory

| Component | Version | License | SPDX ID | Source | Risk Level | Obligations | Approval Status | Approval Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React | 18.2.0 | MIT | MIT | npm | Low | Attribution | Auto-approved | N/A (allowlist) |
| Lodash | 4.17.21 | MIT | MIT | npm | Low | Attribution | Auto-approved | N/A (allowlist) |
| Django | 4.2.0 | BSD 3-Clause | BSD-3-Clause | PyPI | Low | Attribution | Auto-approved | N/A (allowlist) |
| MySQL Connector | 8.0.33 | GPL v2 | GPL-2.0 | Maven | High | Source disclosure if distributed | Under review | [yyyy-mm-dd] |
| AWS SDK | 2.1048.0 | Apache 2.0 | Apache-2.0 | npm | Low | Attribution, notices | Auto-approved | N/A (allowlist) |

**Inventory Source**: Generated from SBOM, updated per build

**Review Frequency**: Quarterly full review, continuous monitoring via CI/CD

### 3.2 License Distribution Summary

| License Type | Count | Percentage | Risk Assessment |
| --- | --- | --- | --- |
| MIT | 450 | 65% | Low |
| Apache 2.0 | 180 | 26% | Low |
| BSD (all variants) | 45 | 6% | Low |
| ISC | 15 | 2% | Low |
| LGPL | 5 | 0.7% | Medium (under review) |
| GPL | 1 | 0.1% | High (under review) |
| Unknown/Unlicensed | 0 | 0% | Blocked by CI/CD |

**Target Distribution**: > 95% permissive licenses (MIT, Apache, BSD)

**Alert Threshold**: If copyleft licenses > 1%, escalate to Legal Liaison

### 3.3 High-Risk Dependencies

| Component | Version | License | Risk | Impact | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MySQL Connector | 8.0.33 | GPL v2 | Binary distribution triggers GPL | Must release source code | Replace with MIT-licensed connector | Engineering Lead | In Progress |
| [Component] | [Version] | [License] | [Risk description] | [Impact] | [Mitigation] | [Owner] | [Status] |

**Escalation**: High-risk dependencies escalated to Legal Liaison within 24 hours of detection

## 4 License Obligation Tracking

> Track and fulfill obligations imposed by licenses, including attribution, copyleft, and restrictions.

### 4.1 Attribution Requirements

#### 4.1.1 Components Requiring Attribution

| Component | Version | License | Attribution Method | Attribution Text | Status |
| --- | --- | --- | --- | --- | --- |
| React | 18.2.0 | MIT | LICENSE.txt in distribution | "React © Facebook, Inc. and its affiliates. MIT License." | [Complete/Pending] |
| Lodash | 4.17.21 | MIT | LICENSE.txt in distribution | "Lodash © JS Foundation and other contributors. MIT License." | [Complete/Pending] |
| Django | 4.2.0 | BSD 3-Clause | LICENSE.txt in distribution | "Django © Django Software Foundation. BSD License." | [Complete/Pending] |

**Attribution Method**: Consolidated LICENSE.txt or ATTRIBUTIONS.md file included in release artifacts

**Automation**: Attribution file auto-generated from SBOM during build process

**Verification**: CI/CD checks that attribution file exists and is up-to-date before release

#### 4.1.2 Attribution Display Locations

- **Distribution package**: LICENSE.txt or ATTRIBUTIONS.md in package root
- **Application UI**: "About" dialog or settings page (if GUI application)
- **Website/Documentation**: Attribution page on documentation site
- **Repository**: ATTRIBUTIONS.md in repository root

### 4.2 Copyleft Compliance

#### 4.2.1 GPL-Licensed Components (If Any)

| Component | Version | License | Distribution Trigger | Source Disclosure Obligation | Status |
| --- | --- | --- | --- | --- | --- |
| [Component] | [Version] | GPL v2/v3 | Binary distribution | Must provide source code | [Avoiding/Complying] |

**Distribution Triggers**:
- **Binary distribution**: Providing compiled software to customers = triggers GPL
- **SaaS deployment**: GPL v2/v3 does NOT trigger on SaaS (AGPL does)
- **Internal use**: Internal-only use does NOT trigger GPL

**Compliance Strategy**:
1. **Avoidance**: Replace GPL components with permissive alternatives (preferred)
2. **Isolation**: Separate GPL components to avoid contaminating proprietary code
3. **Compliance**: If GPL unavoidable, publish source code per GPL terms

#### 4.2.2 AGPL-Licensed Components (If Any)

| Component | Version | License | Network Trigger | Disclosure Obligation | Status |
| --- | --- | --- | --- | --- | --- |
| [Component] | [Version] | AGPL v3 | SaaS deployment | Must provide source code to network users | [Avoiding/Complying] |

**AGPL Policy**: AGPL components are PROHIBITED for SaaS applications (denylist)

**Rationale**: AGPL network copyleft triggers on SaaS, forcing source disclosure to all users

### 4.3 Commercial License Terms

#### 4.3.1 Commercial License Inventory

| Product | Vendor | License Type | Seats/Usage Limit | Current Usage | Cost | Renewal Date | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| JetBrains IntelliJ IDEA | JetBrains | Seat-based subscription | 50 seats | 48 seats | $15K/year | 2025-12-31 | Engineering Lead |
| Sentry | Sentry.io | Usage-based SaaS | 100K events/month | 85K events/month | $5K/month | Monthly | DevOps Lead |
| Datadog | Datadog | Host-based SaaS | 200 hosts | 180 hosts | $50K/year | 2025-02-01 | DevOps Lead |

**Tracking**: Usage tracked in [tool], alerted if approaching limits

**Cost Optimization**: Review quarterly for optimization opportunities (reduce seats, optimize usage)

#### 4.3.2 License Compliance Checks

| Product | Compliance Check | Frequency | Last Check | Status | Risk |
| --- | --- | --- | --- | --- | --- |
| JetBrains | Seat count vs. license count | Monthly | [yyyy-mm-dd] | 48/50 seats used | Green |
| Sentry | Event volume vs. plan limit | Daily | [yyyy-mm-dd] | 85K/100K events | Green |
| Datadog | Host count vs. plan limit | Daily | [yyyy-mm-dd] | 180/200 hosts | Yellow (approaching limit) |

**Alert Threshold**: If usage > 90% of limit, alert owner to upgrade or optimize

### 4.4 Contributor License Agreements (CLAs)

**Policy**: [Does project require CLAs? Yes/No]

**CLA Type**: [Individual CLA / Corporate CLA / Developer Certificate of Origin (DCO)]

**CLA Text**: [Link to CLA document or embed text]

**Enforcement**:
- **Manual**: Contributors sign CLA before first contribution
- **Automated**: CLA bot checks GitHub PRs, blocks merge if CLA not signed

**CLA Records**: Stored in [location], maintained by [owner]

## 5 SBOM Integration

> Generate, store, and distribute Software Bill of Materials for transparency and compliance.

### 5.1 SBOM Generation

**SBOM Format**: [CycloneDX / SPDX / Both]

**Generation Tool**: [Syft, CycloneDX CLI, SPDX tools, language-specific tools]

**Generation Frequency**: Per build (CI/CD integration)

**SBOM Location**: Stored as build artifact alongside release packages

**Example**:

```bash
# Generate SBOM using Syft
syft packages dir:. -o cyclonedx-json > sbom.cyclonedx.json
syft packages dir:. -o spdx-json > sbom.spdx.json
```

### 5.2 SBOM Contents

**Included in SBOM**:
- Component name, version, source (npm, PyPI, Maven, etc.)
- License (SPDX ID)
- Package URL (PURL)
- Dependency relationships (direct vs. transitive)
- File hashes (SHA-256)

**Example SBOM Entry**:

```json
{
  "name": "react",
  "version": "18.2.0",
  "purl": "pkg:npm/react@18.2.0",
  "licenses": [{"license": {"id": "MIT"}}],
  "hashes": [{"alg": "SHA-256", "content": "abc123..."}]
}
```

### 5.3 SBOM Storage and Distribution

**Storage Location**: Build artifact repository (e.g., Artifactory, S3, GitHub Releases)

**Distribution**:
- **Included in release package**: SBOM file bundled with software distribution
- **Available on request**: For customer due diligence, security audits
- **Public repository**: For open source projects, publish SBOM alongside releases

**Retention Period**: Lifecycle + 7 years (align with contract retention policies)

### 5.4 SBOM Review Process

**Frequency**: Per release

**Reviewer**: Legal Liaison

**Review Criteria**:
- [ ] All components have identified licenses (no "Unknown")
- [ ] No prohibited licenses (denylist)
- [ ] All restricted licenses have approval records
- [ ] Attribution file matches SBOM
- [ ] High-risk components have mitigation plans

**Sign-Off**: Legal Liaison must approve SBOM before production release

## 6 CI/CD License Enforcement

> Automate license scanning and enforcement in the development pipeline to prevent non-compliant code from merging.

### 6.1 License Scanning Tool

**Tool Selection**: [FOSSA, Snyk, Black Duck, Licensee (GitHub), Scancode Toolkit (open source)]

**Integration Points**:
1. **Pre-commit hook** (optional): Warn developers on local machine
2. **Pull request check**: Scan on every PR, block merge if issues found
3. **Build pipeline**: Scan during build, fail build if issues found
4. **Release gate**: Final scan before production deployment

### 6.2 CI/CD Pipeline Configuration

#### 6.2.1 Pull Request License Check

**Tool**: [Tool name]

**Trigger**: On every pull request

**Actions**:
- Scan all dependencies (direct and transitive)
- Compare licenses against allowlist, denylist, review-required list
- Post results as PR comment

**Pass Criteria**:
- All licenses are allowlisted, OR
- All restricted licenses have approval records

**Fail Criteria**:
- Any denylisted licenses found
- Any unknown/unlicensed components found
- Any restricted licenses without approval

**Example GitHub Actions Workflow**:

```yaml
name: License Check
on: [pull_request]
jobs:
  license-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Scan licenses
        run: |
          # Install scanning tool
          npm install -g license-checker
          # Scan and fail if prohibited licenses found
          license-checker --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;ISC" --failOn "GPL;AGPL;UNLICENSED"
```

#### 6.2.2 Build Pipeline License Check

**Tool**: [Tool name]

**Trigger**: On every build

**Actions**:
- Generate SBOM
- Scan SBOM for license issues
- Store SBOM as build artifact
- Fail build if issues found

**Notifications**: Alert Legal Liaison and Engineering Lead if build fails due to license issues

### 6.3 License Policy Enforcement

| License Category | CI/CD Action | Notification | Resolution |
| --- | --- | --- | --- |
| Allowlist (MIT, Apache, BSD) | Auto-approve, merge proceeds | None | N/A |
| Review-required (LGPL, MPL) | Block merge, create review ticket | Alert Legal Liaison | Legal review, approval/rejection |
| Denylist (GPL, AGPL, Unlicensed) | Block merge, fail build | Alert Legal Liaison and Engineer | Remove dependency or find alternative |
| Unknown license | Block merge, create investigation ticket | Alert Legal Liaison | Identify license, classify, retry |

### 6.4 Override Process

**Policy**: CI/CD enforcement cannot be overridden without General Counsel approval

**Override Procedure**:
1. Engineer creates exception request with justification
2. Legal Liaison reviews and escalates to General Counsel
3. If approved, General Counsel adds exception to CI/CD configuration
4. Exception documented in license compliance log with expiration date

**Rationale**: Prevents ad-hoc overrides that bypass legal review

## 7 Audit and Reporting

> Conduct regular audits to ensure ongoing license compliance and identify compliance drift.

### 7.1 Quarterly License Audit

**Frequency**: Quarterly

**Owner**: Legal Liaison

**Process**:
1. **Generate full SBOM**: For all active projects, all branches
2. **Compare against previous quarter**: Identify new dependencies, removed dependencies
3. **Review new dependencies**: Verify CI/CD approval process worked correctly
4. **Verify attributions**: Check that attribution files are up-to-date
5. **Review commercial licenses**: Check usage vs. limits, upcoming renewals
6. **Generate audit report**: Summary of findings, issues, recommendations

**Audit Checklist**:
- [ ] All dependencies have identified licenses
- [ ] No prohibited licenses in production
- [ ] All restricted licenses have approval records
- [ ] Attribution files are current
- [ ] Commercial license usage within limits
- [ ] No license compliance violations in past quarter

### 7.2 Audit Report Template

**Quarterly License Compliance Audit Report**

**Period**: [Q1/Q2/Q3/Q4 YYYY]

**Projects Audited**: [List of projects]

**Summary**:
- Total dependencies: [count]
- License distribution: [% by license type]
- New dependencies: [count], [licenses]
- Removed dependencies: [count]
- Open issues: [count], [severity]

**Findings**:
1. [Finding description, severity, recommendation]
2. [Finding description, severity, recommendation]

**Action Items**:
1. [Action item, owner, due date]
2. [Action item, owner, due date]

**Approval**: Legal Liaison signature, date

### 7.3 License Compliance Dashboard

**Real-Time Metrics**:
- License distribution pie chart (% MIT, % Apache, % GPL, etc.)
- High-risk dependencies count (denylist, review-required)
- Compliance status traffic light (green/yellow/red)
- Attribution coverage (% of components with attribution)
- Commercial license usage (usage vs. limits)

**Historical Trends**:
- Total dependency count over time
- License distribution trends
- New denylist detections per quarter
- Average time to resolve license issues

**Access**: Dashboard accessible to Legal Liaison, Engineering Leadership, Compliance Team

### 7.4 License Violation Response

**Detection**: License violation detected (manual audit, CI/CD alert, customer report)

**Immediate Actions**:
1. **Assess severity**: Is code already distributed? Is violation public?
2. **Contain**: Stop further distribution if needed
3. **Notify stakeholders**: Legal Liaison, Engineering Lead, General Counsel
4. **Document**: Create incident record with details

**Remediation Options**:
1. **Remove dependency**: Replace with compliant alternative (preferred)
2. **Obtain license**: If commercial, purchase appropriate license
3. **Comply with terms**: If GPL, publish source code per license terms
4. **Negotiate exception**: Contact licensor, request exception or alternative license

**Post-Incident**:
1. **Root cause analysis**: Why did CI/CD not catch this?
2. **Process improvement**: Update CI/CD checks, policies, training
3. **Communication**: Notify affected customers if needed
4. **Document lessons learned**: Update compliance procedures

## Appendices

### Appendix A: License Reference

| License | Description | Key Terms | Use Cases |
| --- | --- | --- | --- |
| MIT | Most permissive common license | Attribution required | General-purpose libraries |
| Apache 2.0 | Permissive with patent grant | Attribution, patent protection | Enterprise libraries |
| BSD 3-Clause | Permissive, no patent grant | Attribution, no endorsement | Academic, legacy code |
| GPL v2/v3 | Strong copyleft | Distribution triggers source disclosure | Linux, GCC, many GNU tools |
| AGPL v3 | Network copyleft | SaaS triggers source disclosure | MongoDB (historically), network services |
| LGPL v2.1/v3 | Weak copyleft | Linking OK if separated | Libraries (e.g., Qt) |

**Full License Texts**: [Link to license text repository or SPDX website]

### Appendix B: License Scanning Tool Comparison

| Tool | Type | Cost | Features | Integration |
| --- | --- | --- | --- | --- |
| FOSSA | Commercial | $$$ | Comprehensive, policy enforcement, SBOM, vulnerability scanning | GitHub, GitLab, CI/CD |
| Snyk | Commercial | $$$ | License + vulnerability scanning, policy enforcement | GitHub, GitLab, CI/CD |
| Black Duck | Commercial | $$$$ | Enterprise-grade, deep scanning, legal workflows | GitHub, GitLab, CI/CD |
| Licensee (GitHub) | Open Source | Free | Basic license detection for GitHub repos | GitHub only |
| Scancode Toolkit | Open Source | Free | Comprehensive scanning, requires setup | CLI, scriptable |
| license-checker (npm) | Open Source | Free | npm dependencies only | CLI, npm scripts |

**Recommendation**: [Tool selection based on budget, coverage needs, integration requirements]

### Appendix C: Compliance Contact Information

| Role | Name | Email | Phone | Responsibilities |
| --- | --- | --- | --- | --- |
| Legal Liaison | [name] | [email] | [phone] | License policy, approval, audit |
| Build Engineer | [name] | [email] | [phone] | CI/CD integration, SBOM generation |
| Security Gatekeeper | [name] | [email] | [phone] | Security implications of dependencies |

## Agent Notes

- Automate license scanning in CI/CD to prevent non-compliant code from merging
- Generate SBOM per release for transparency and customer due diligence
- Prioritize replacing GPL/AGPL components to avoid copyleft obligations
- Maintain attribution file automatically from SBOM to reduce manual effort
- Conduct quarterly audits to detect compliance drift over time
- Escalate denylist detections immediately (within 24 hours)
- Verify Automation Outputs entry is satisfied before signaling completion
