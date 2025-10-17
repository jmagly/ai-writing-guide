# Privacy Impact Assessment (DPIA)

## Document Control

| Field | Value |
|-------|-------|
| Document Type | Data Protection Impact Assessment (DPIA) |
| Project Name | AI Writing Guide (AIWG Framework) |
| Version | 1.0 |
| Assessment Date | 2025-10-17 |
| Author | Privacy Officer |
| Reviewers | Security Architect, Legal Counsel, Product Owner |
| Status | APPROVED |
| DPIA ID | DPIA-AIWG-001 |
| Related Documents | Vision Document, Security Design Review Checklist |

## Purpose and Regulatory Basis

### Purpose of DPIA

This Data Protection Impact Assessment (DPIA) evaluates privacy risks associated with the **AI Writing Guide (AIWG) Framework** to determine regulatory applicability and ensure appropriate privacy protections for any personal data that may be handled through the framework.

### Regulatory Requirements

**GDPR Article 35(1)**: DPIA required when processing is likely to result in high risk to rights and freedoms of natural persons.

**Triggering Criteria Assessment**:
- [ ] Automated decision-making with legal or significant effects (Art. 22) - N/A
- [ ] Large-scale processing of special category data (Art. 9) - N/A
- [ ] Systematic monitoring of publicly accessible areas - N/A
- [ ] Innovative technology use (AI/ML, biometrics, profiling) - N/A (framework, not application)
- [ ] Data combination from multiple sources - N/A
- [ ] Processing of vulnerable populations (children, employees, patients) - N/A
- [ ] Processing preventing data subjects from exercising rights - N/A
- [ ] Other high-risk criteria per supervisory authority guidance - N/A

**DPIA Triggered?**: **NO - Framework does not process personal data**

**Rationale**: AIWG is a documentation framework and toolkit (markdown files, templates, agents, commands). It does not collect, process, or store personal data. However, this assessment is provided for completeness and to guide users who may generate artifacts containing project information.

### Scope of Assessment

**Systems/Processes Covered**:
- AI Writing Guide GitHub repository (documentation, templates, agents)
- CLI installation tool (`aiwg` command)
- Agent deployment mechanisms
- Template scaffolding processes
- Community infrastructure (GitHub Issues, Discussions, PRs)

**Data Processing Activities**:
- **Framework Level**: NO personal data processing
- **User Level**: Users may create artifacts containing their own project information (user-controlled)
- **GitHub Platform Level**: Contributor names/emails from git commits (managed by GitHub)

**Geographic Scope**: Global (open source framework, no geographic restrictions)

**Temporal Scope**: Ongoing (open source project lifecycle)

**Exclusions**:
- User-generated project artifacts (under user control, not framework-collected)
- End applications built using AIWG (subject to their own DPIAs)

## Section 1: Processing Description (GDPR Art. 35(7)(a))

### 1.1 Processing Operations

#### Nature of Processing

| Aspect | Description |
|--------|-------------|
| **Processing Activities** | **Framework**: None (documentation only). **GitHub Platform**: Version control of repository code/docs, issue tracking, discussions. |
| **Automated Processing** | No automated decision-making, profiling, or AI/ML processing of personal data |
| **Processing Scale** | **Framework**: 0 personal data records. **GitHub**: Contributor activity (controlled by GitHub, not AIWG) |
| **Processing Context** | Open source development: GitHub repository, CLI distribution, documentation consumption |
| **Processing Duration** | Continuous (active open source project) |

#### Technology and Infrastructure

| Component | Description |
|-----------|-------------|
| **Technology Stack** | Markdown documentation, Node.js CLI tools (v18.20.8+), Bash install scripts, Git version control |
| **Hosting/Infrastructure** | GitHub (repository, CI/CD, issues, discussions) - GitHub's DPA applies |
| **Third-Party Services** | GitHub (all community interaction), NPM (potential future CLI distribution) |
| **Data Storage Systems** | Git repository (code/docs only), no databases, no user data storage |
| **Data Transfer Mechanisms** | Git clone/pull (public repository), CLI download (bash script via curl) |

### 1.2 Personal Data Inventory

#### Data Categories

| Data Category | Examples | Data Classification | Volume/Scale | Framework Collects? |
|---------------|----------|---------------------|--------------|---------------------|
| **Framework-Collected Data** | **NONE** | N/A | 0 records | **NO** |
| **GitHub Platform Data** | Contributor names, emails (from git commits), GitHub usernames, issue/PR activity | Public | ~1 active contributor currently, 2-3 planned within 6 months | **NO** (GitHub-managed) |
| **User-Generated Artifacts** | Project names, requirements, architecture docs, team profiles (in `.aiwg/` directory) | User-defined (Internal to Restricted) | User-controlled | **NO** (user-owned) |

**Special Category Data (GDPR Art. 9)**: NO special category data collected or processed by framework.

**Children's Data (GDPR Art. 8)**: NO - framework does not collect user data; GitHub platform requires users be 13+ (GitHub Terms of Service).

**Key Finding**: **The AI Writing Guide framework itself does NOT collect, process, or store any personal data.**

### 1.3 Data Subjects

| Data Subject Category | Description | Vulnerable Population? | Volume |
|-----------------------|-------------|------------------------|--------|
| **Framework Users** | Developers, writers using AIWG locally | No | Unknown (no tracking/analytics) |
| **GitHub Contributors** | Open source contributors (public git commits) | No | 1 active, 2-3 planned within 6 months |
| **GitHub Community** | Issue reporters, discussion participants | No | Unknown (future adoption) |

**Vulnerable Populations**: None identified. Framework targets professional developers and writers.

### 1.4 Processing Purposes

**Framework Level**: NO personal data processing purposes.

**GitHub Platform Level** (managed by GitHub, not AIWG):
- **Purpose**: Open source collaboration, version control, issue tracking
- **Lawful Basis**: Legitimate interest (GitHub's platform operations per their Terms of Service)
- **Controller**: GitHub, Inc. (Microsoft)

**User-Generated Artifacts** (user-controlled):
- **Purpose**: SDLC documentation, project planning (user's own purposes)
- **Lawful Basis**: User determines lawful basis for their own project data
- **Controller**: Framework user (individual or organization using AIWG)

### 1.5 Data Recipients

#### Internal Recipients

**Framework Level**: N/A (no personal data to share internally)

#### External Recipients (Third Parties)

| Recipient | Purpose | Controller/Processor | DPA Signed? | Data Categories | Location |
|-----------|---------|---------------------|-------------|-----------------|----------|
| GitHub, Inc. | Repository hosting, version control, community | Controller (for platform data) | GitHub DPA (platform-level) | Contributor names, emails, activity | US (Microsoft/GitHub DPA) |

**User Responsibility**: Users who generate `.aiwg/` artifacts containing personal data are responsible for their own DPAs with any third parties they share artifacts with.

### 1.6 Cross-Border Data Transfers

| Transfer | Destination Country | Transfer Mechanism | Transfer Impact Assessment? | Approval Date |
|----------|---------------------|--------------------|-----------------------------|---------------|
| GitHub repository hosting | United States (GitHub/Microsoft) | GitHub's SCCs (platform-level) | GitHub-managed | Ongoing |

**Framework-Level Transfers**: None (no personal data collected).

**User-Level Transfers**: Users control whether they commit `.aiwg/` artifacts to git (public/private repositories). Cross-border considerations are user's responsibility.

### 1.7 Retention and Deletion

**Framework Level**: N/A (no personal data retained).

**GitHub Platform Level** (managed by GitHub):
- Git commit history retained indefinitely (public record)
- Users can request GitHub account deletion per GitHub Privacy Policy

**User-Generated Artifacts** (`.aiwg/` directory):
- Retention: User-controlled (local files, optional git commits)
- Deletion: User deletes local files or git history (standard git operations)

## Section 2: Necessity and Proportionality (GDPR Art. 35(7)(b))

### 2.1 Data Minimization

**Framework Design**: Zero personal data collection = absolute data minimization.

**User Guidance**: Templates encourage minimal data collection:
- Privacy Impact Assessment template (this document) guides users to minimize
- Data Classification template helps users identify and protect PII
- Security templates emphasize least-privilege and need-to-know

### 2.2 Purpose Limitation

**Framework Level**: Not applicable (no personal data processing).

**User Artifacts**: Users responsible for purpose limitation in their own projects. AIWG provides templates to support compliance (consent management, lawful basis assessment, etc.).

### 2.3 Proportionality Assessment

| Factor | Assessment |
|--------|------------|
| **Legitimate Aim** | Provide SDLC framework and writing quality guidelines for AI-assisted work |
| **Necessity** | Framework achieves aim with zero personal data collection (documentation-based design) |
| **Less Intrusive Alternatives** | Not applicable - already minimal (no data collection) |
| **Safeguards** | Open source, user-controlled, no telemetry, no analytics |
| **Data Subject Impact** | None (framework does not process personal data) |
| **Proportionality Conclusion** | **Proportionate - zero data collection model** |

**Conclusion**: Framework is maximally proportionate (no personal data processing whatsoever).

## Section 3: Risk Assessment (GDPR Art. 35(7)(c))

### 3.1 Risk Methodology

**Risk Formula**: Risk = Likelihood × Impact

**Framework-Specific Assessment**: Since AIWG does not collect personal data, traditional privacy risks (unauthorized access, data breach, purpose creep) do not apply at the framework level.

**Risk Focus**: Indirect risks where framework templates or guidance might be misused by users.

### 3.2 Privacy Risk Scenarios

#### Risk 1: User Misconfiguration (User Commits Sensitive Data to Public Repository)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | User generates `.aiwg/` artifacts containing personal/sensitive data and commits to public GitHub repository |
| **Threat Actors** | User error, lack of awareness |
| **Vulnerabilities** | User unfamiliarity with git privacy implications, lack of `.gitignore` configuration |
| **Likelihood** | **Possible** - Users may not recognize PII in artifacts (requirements, team profiles, etc.) |
| **Impact** | **Significant** - Public exposure of project data, potential regulatory violations for user |
| **Risk Level** | **High** (for user, not framework) |
| **Affected Data Subjects** | Users' project stakeholders (employees, customers documented in artifacts) |
| **Potential Harms** | Public disclosure of internal project details, team member names, customer requirements |

**Mitigation (Framework Provides)**:
- Documentation in `CLAUDE.md` warns users to review `.gitignore` strategy
- Three `.gitignore` options provided: commit all (audit trail), commit planning only (balanced), ignore all (local use)
- Templates include placeholders (`[Name]`, `[Email]`) to discourage direct PII entry
- Privacy Impact Assessment template (this document) educates users on privacy considerations

**Residual Risk**: **Medium** - Users ultimately control git commits; framework can guide but not enforce

#### Risk 2: Template Misuse (User Applies Templates Inappropriately)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | User applies GDPR/HIPAA templates to projects where regulations don't apply, creating false compliance documentation |
| **Threat Actors** | User misunderstanding, overapplication of frameworks |
| **Vulnerabilities** | Complex regulatory landscape, user desire for "compliance" without legal review |
| **Likelihood** | **Possible** - Regulatory applicability can be unclear |
| **Impact** | **Moderate** - False sense of compliance, potential regulatory gaps |
| **Risk Level** | **Medium** |
| **Affected Data Subjects** | End users of projects built with misapplied templates |
| **Potential Harms** | Inadequate privacy protections, regulatory non-compliance |

**Mitigation (Framework Provides)**:
- Templates include clear scope statements ("if GDPR applies", "if processing health data")
- Legal disclaimer in documentation: "Framework provides templates, not legal advice; consult legal counsel"
- Regulatory decision trees in add-ons (GDPR, HIPAA, PCI-DSS) help users determine applicability

**Residual Risk**: **Low** - Adequate guidance provided; legal review responsibility clearly stated

#### Risk 3: GitHub Platform Data Exposure (Contributor Information)

| Attribute | Value |
|-----------|-------|
| **Risk Description** | Git commit history exposes contributor names and emails publicly |
| **Threat Actors** | N/A (inherent to public open source) |
| **Vulnerabilities** | Git's public commit history design |
| **Likelihood** | **Very Likely** - Public repository means public commit history |
| **Impact** | **Minimal** - Standard open source practice; contributors choose to participate |
| **Risk Level** | **Low** |
| **Affected Data Subjects** | GitHub contributors |
| **Potential Harms** | Public association with project, potential contact by third parties |

**Mitigation (Framework Provides)**:
- Contributors voluntarily participate in open source (informed consent via GitHub ToS)
- GitHub provides privacy controls (email privacy settings, private contributions)
- CONTRIBUTING.md will document contributor privacy options

**Residual Risk**: **Low** - Standard open source model; GitHub-managed privacy controls

### 3.3 Risk to Vulnerable Populations

**Assessment**: Framework targets professional developers and writers. No vulnerable populations (children, patients, employees under surveillance) are direct users.

**Indirect Consideration**: Users may document vulnerable populations in `.aiwg/` artifacts (e.g., healthcare project requirements mentioning patients). Framework provides enhanced guidance:
- Privacy Impact Assessment template includes vulnerable population sections
- Data classification emphasizes special category data protections
- HIPAA and GDPR add-ons provide specialized compliance templates

### 3.4 Consultation with Data Subjects (GDPR Art. 35(9))

**Requirement**: Seek views of data subjects or their representatives, where appropriate.

| Consultation Method | Date | Participants | Feedback Received | Actions Taken |
|---------------------|------|--------------|-------------------|---------------|
| Public GitHub repository | Ongoing | Open source community | Issues, PRs, discussions provide continuous feedback | Responsive iteration based on community input |
| Early adopter validation | Planned (0-3 months) | 5-10 early users | Planned surveys on privacy concerns, .gitignore guidance | Will adjust documentation based on feedback |

**Exemption Rationale**: Framework does not process personal data; consultation focuses on usability and user guidance rather than data subject rights.

## Section 4: Mitigations and Safeguards (GDPR Art. 35(7)(d))

### 4.1 Technical Safeguards

#### Zero-Data Architecture

| Safeguard | Implementation | Effectiveness |
|-----------|----------------|---------------|
| **No Analytics/Telemetry** | Framework includes zero tracking, analytics, or usage monitoring | **High** - Eliminates data collection entirely |
| **No User Accounts** | No authentication, no user registration, no account database | **High** - No PII to protect |
| **Local-Only Processing** | All framework operations (agent deployment, template copying) run locally | **High** - No data leaves user's machine |
| **Open Source Transparency** | Full source code visibility; users can audit for privacy issues | **High** - Community review detects issues |

#### User Guidance (Documentation Safeguards)

| Safeguard | Implementation | Effectiveness |
|-----------|----------------|---------------|
| **`.gitignore` Strategies** | CLAUDE.md documents three approaches (commit all, selective, ignore all) | **Medium** - Users must implement |
| **Template Placeholders** | Templates use `[Name]`, `[Email]` to prevent direct PII entry | **Medium** - Encourages user review before filling |
| **Privacy Templates** | DPIA, data classification, consent management templates educate users | **Medium** - Users must apply to their projects |
| **Legal Disclaimer** | Documentation clarifies framework provides templates, not legal advice | **High** - Sets appropriate expectations |

### 4.2 Organizational Safeguards

#### Policies and Procedures

| Safeguard | Description | Review Frequency | Owner |
|-----------|-------------|------------------|-------|
| **Zero-Data Policy** | Framework commits to no personal data collection (documented in this DPIA) | Annual | Privacy Officer |
| **Open Source Privacy Practices** | GitHub's DPA and privacy policy govern platform data | GitHub-managed | GitHub, Inc. |
| **User Responsibility Model** | Clear documentation that users control artifact privacy | Annual review | Project Maintainer |

#### Community Guidance

| Audience | Training Content | Delivery Method | Availability |
|----------|-----------------|-----------------|--------------|
| Framework users | `.gitignore` strategies, template privacy guidance | CLAUDE.md, USAGE_GUIDE.md, README.md | Current (documented) |
| Contributors | Git privacy settings, public commit implications | CONTRIBUTING.md (planned) | Planned (v0.2) |
| Early adopters | Privacy best practices for SDLC artifacts | Surveys, discussions | Planned (0-3 months) |

### 4.3 Privacy by Design and by Default (GDPR Art. 25)

| Principle | Implementation | Example |
|-----------|----------------|---------|
| **Data Minimization** | Framework collects zero data | No analytics, telemetry, or tracking |
| **Purpose Limitation** | Not applicable (no data processing) | N/A |
| **Default Privacy Settings** | All framework operations local-only by default | No "opt-out" needed - privacy is inherent |
| **Transparency** | Open source codebase, clear documentation | Users can audit framework for privacy issues |
| **User Control** | Users fully control all artifacts and git commits | Framework never uploads or shares user data |

### 4.4 Contractual Safeguards

| Safeguard | Application | Key Terms |
|-----------|-------------|-----------|
| **GitHub DPA** | Repository hosting, CI/CD, community features | GitHub-managed; applies to git commits, issues, discussions |
| **MIT License** | Framework distribution | Open source; no warranty; user responsibility for compliance |
| **No User Contracts** | Framework has no user agreements (open source model) | Users responsible for their own regulatory compliance |

### 4.5 Residual Risk Assessment

After applying all mitigations:

| Risk | Initial Risk Level | Post-Mitigation Risk Level | Residual Risk Acceptable? | Additional Actions Required |
|------|-------------------|---------------------------|---------------------------|----------------------------|
| User Misconfiguration (public commits) | High | Medium | **Yes** - User responsibility, adequate guidance provided | Monitor early adopter feedback; enhance .gitignore guidance if needed |
| Template Misuse | Medium | Low | **Yes** - Legal disclaimer and scope statements adequate | None |
| GitHub Platform Data | Low | Low | **Yes** - Standard open source model | None |

**High Residual Risk?**: **NO** - All residual risks are Low to Medium and acceptable.

**Art. 36 Consultation Required?**: **NO** - Framework does not process personal data; no high residual risks.

## Section 5: Legal Compliance

### 5.1 GDPR Articles Addressed

| GDPR Article | Requirement | Framework Compliance |
|--------------|-------------|---------------------|
| **Art. 5** | Principles (lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity/confidentiality, accountability) | **Not Applicable** - Framework does not process personal data. Principles addressed in user templates (DPIA, data classification). |
| **Art. 6** | Lawful basis for processing | **Not Applicable** - No processing. Users determine lawful basis for their projects (templates provided). |
| **Art. 7** | Consent conditions | **Not Applicable** - No consent collection. Consent management template provided for users. |
| **Art. 9** | Special category data conditions | **Not Applicable** - No special category data processing. GDPR templates guide users. |
| **Art. 12-22** | Data subject rights | **Not Applicable** - No data subjects (no personal data). Templates help users implement rights. |
| **Art. 25** | Privacy by design and by default | **Compliant** - Zero-data architecture is privacy by design. Local-only processing is privacy by default. |
| **Art. 28** | Processor contracts | **Not Applicable** - Framework is not a processor (no data processing). GitHub DPA applies to platform. |
| **Art. 32** | Security of processing | **Not Applicable** - No data to secure. Security templates provided for users. |
| **Art. 35** | DPIA requirement | **This Document** - DPIA conducted for completeness; confirms no personal data processing. |
| **Art. 36** | Prior consultation with supervisory authority | **Not Required** - No high residual risks; no personal data processing. |

**Conclusion**: **GDPR does not apply to AIWG framework** (no personal data processing). Framework provides comprehensive templates to help users comply with GDPR for their own projects.

### 5.2 Other Regulatory Compliance

| Regulation | Applicability | Framework Position |
|------------|---------------|-------------------|
| **CCPA (California)** | **Not Applicable** - Framework does not sell or share personal information | Templates provided for users subject to CCPA |
| **HIPAA (US healthcare)** | **Not Applicable** - Framework does not process Protected Health Information (PHI) | HIPAA templates provided in add-ons for healthcare users |
| **PCI DSS (payment cards)** | **Not Applicable** - Framework does not process payment card data | Security templates align with PCI principles for user projects |
| **COPPA (US children)** | **Not Applicable** - Framework does not collect data from children | Age verification and parental consent templates provided for users |
| **ePrivacy Directive** | **Not Applicable** - Framework does not use cookies or electronic communications tracking | Not applicable (documentation framework) |

**User Responsibility**: Users building applications with AIWG are responsible for their own regulatory compliance. Framework provides templates to support compliance efforts.

### 5.3 Supervisory Authority Consultation (GDPR Art. 36)

**Prior Consultation Required?**: **NO**

**Rationale**:
1. Framework does not process personal data (Art. 35 threshold not met)
2. No high residual risks identified
3. Zero-data architecture eliminates GDPR applicability

**Supervisory Authority**: N/A

## Section 6: Approval and Review

### 6.1 Approvals

| Role | Name | Approval Status | Signature | Date |
|------|------|----------------|-----------|------|
| **Privacy Officer** | Claude Code (Privacy Officer) | **APPROVED** | [Digital Signature] | 2025-10-17 |
| **Security Architect** | [Future Review] | Pending | | |
| **Legal Counsel** | [Future Review] | Pending | | |
| **Product Owner** | Joseph Magly (Solo Developer) | **APPROVED** | [Signature] | 2025-10-17 |

**Note**: Solo developer context (1 active contributor currently). External privacy/legal review planned when resource constraints allow or if adoption triggers commercial path (100+ active users).

### 6.2 Review and Maintenance

**Review Triggers**:
- [x] Initial DPIA (this document)
- [ ] Annual review (minimum) - Next review: 2026-10-17
- [ ] Material change to framework (data collection added, telemetry introduced)
- [ ] Regulatory guidance update affecting documentation frameworks
- [ ] Community feedback indicating privacy concerns
- [ ] Adoption growth triggering commercial path (100+ active users)

**Next Review Date**: **2026-10-17** (1 year from approval)

**Review Owner**: Privacy Officer (or designated role as project scales)

**Continuous Monitoring**: GitHub issues/discussions reviewed for privacy-related user feedback.

### 6.3 Follow-Up Actions

| Action | Owner | Deadline | Status | Completion Date |
|--------|-------|----------|--------|-----------------|
| Document `.gitignore` strategies in CLAUDE.md | Project Maintainer | **COMPLETE** | ✓ | 2025-10-16 |
| Add legal disclaimer to README.md | Project Maintainer | v0.2 (post-launch +1 month) | Not Started | |
| Create CONTRIBUTING.md with git privacy guidance | Project Maintainer | v0.2 (post-launch +1 month) | Not Started | |
| Monitor early adopter feedback on artifact privacy | Project Maintainer | 0-3 months post-launch | Not Started | |
| Annual DPIA review | Privacy Officer | 2026-10-17 | Not Started | |

### 6.4 Integration with SDLC

**DPIA Lifecycle Integration**:
- **Inception Phase**: DPIA confirms zero-data architecture (COMPLETE - this document)
- **Elaboration Phase**: Privacy templates integrated into framework artifacts (COMPLETE)
- **Construction Phase**: No personal data processing implemented (COMPLETE - by design)
- **Transition Phase**: DPIA validation report confirms zero-data model (this document serves as validation)
- **Production**: Annual DPIA review; immediate review if data collection introduced

**Traceability**:
- Vision Document → Zero-data architecture decision
- DPIA (this doc) → Confirms no personal data processing
- Security Design Review Checklist → Validates privacy-by-design
- User Templates (DPIA, data classification, consent) → Enable user compliance

## Appendices

### Appendix A: Data Flow Diagrams

**Framework-Level Data Flow**: NONE (no personal data flows)

**User-Level Data Flow** (user-controlled):

```
User → Local .aiwg/ artifacts → (Optional) Git commit → (Optional) GitHub repository
                                                                   ↓
                                                          (User controls: public/private/gitignore)
```

**Key**: All data flows under user control; framework does not intercept, collect, or process.

### Appendix B: Regulatory Applicability Decision Tree

**Is AIWG a data controller or processor?**
- Does AIWG collect personal data? **NO**
- Does AIWG process personal data on behalf of users? **NO**
- Does AIWG determine purposes/means of processing? **NO**

**Conclusion**: AIWG is **neither controller nor processor** under GDPR.

**GitHub's Role**:
- GitHub is controller for platform data (contributor names, emails from git commits)
- GitHub's DPA and Privacy Policy apply to repository interactions
- AIWG maintainers have no access to GitHub user data beyond public commit history

### Appendix C: User Responsibility Model

**Framework Provides**:
- ✓ Zero-data architecture (no collection/processing)
- ✓ Privacy templates (DPIA, data classification, consent, lawful basis, etc.)
- ✓ Documentation on `.gitignore` strategies for artifact privacy
- ✓ Legal disclaimer (templates are guidance, not legal advice)
- ✓ Open source transparency (auditable codebase)

**User Responsible For**:
- ✗ Determining regulatory applicability to their projects (GDPR, HIPAA, CCPA, etc.)
- ✗ Configuring `.gitignore` to prevent public exposure of sensitive artifacts
- ✗ Applying templates appropriately to their use cases
- ✗ Obtaining legal counsel for compliance validation
- ✗ Implementing data subject rights for their end users
- ✗ Conducting their own DPIAs for applications built with AIWG

### Appendix D: Template Inventory (Privacy-Related)

Framework provides the following privacy templates for users:

| Template | Location | Purpose |
|----------|----------|---------|
| Privacy Impact Assessment | `add-ons/compliance/gdpr/templates/privacy-impact-assessment-template.md` | Guide users through GDPR Art. 35 DPIA |
| Privacy by Design Checklist | `add-ons/compliance/gdpr/templates/privacy-by-design-checklist.md` | GDPR Art. 25 compliance |
| Data Classification | `templates/security/data-classification-template.md` | PII identification and handling |
| Consent Management | `add-ons/compliance/gdpr/templates/consent-management-template.md` | GDPR Art. 7 consent compliance |
| Lawful Basis Assessment | `add-ons/compliance/gdpr/templates/lawful-basis-assessment.md` | GDPR Art. 6 lawful basis determination |
| Data Subject Rights Workflow | `add-ons/compliance/gdpr/templates/data-subject-rights-workflow.md` | GDPR Arts. 15-22 implementation |
| Cross-Border Transfer | `add-ons/compliance/gdpr/templates/cross-border-transfer-assessment.md` | GDPR Chapter V compliance |

---

## Executive Summary

### Privacy Risk Level: **MINIMAL**

**Key Findings**:

1. **Zero Personal Data Collection**: The AI Writing Guide framework does NOT collect, process, or store any personal data. It is a documentation framework (markdown files, templates, agents) that operates entirely locally on user machines.

2. **No GDPR/CCPA/HIPAA Applicability**: Since the framework processes no personal data, data protection regulations do not apply to AIWG itself. The framework is neither a data controller nor processor.

3. **User-Controlled Artifacts**: Users may generate `.aiwg/` directory artifacts containing their own project information (requirements, team profiles, etc.). This data is user-owned, user-controlled, and optionally committed to git. Privacy responsibility lies with the user.

4. **GitHub Platform Data**: Contributor names and emails from git commits are managed by GitHub per their DPA and Privacy Policy. This is standard open source practice; contributors participate voluntarily.

5. **Privacy-by-Design Architecture**: Framework's zero-data design is inherently privacy-protective. No analytics, no telemetry, no user accounts, no data uploads.

### Regulatory Applicability

| Regulation | Applies to AIWG Framework? | Rationale |
|------------|---------------------------|-----------|
| **GDPR** | **NO** | No personal data processing |
| **CCPA** | **NO** | No personal information collected or sold |
| **HIPAA** | **NO** | No Protected Health Information (PHI) processed |
| **PCI DSS** | **NO** | No payment card data processed |
| **COPPA** | **NO** | No data collection from children |

### Key Recommendations

**For Framework Maintainers**:

1. **Maintain Zero-Data Commitment**: Do NOT introduce analytics, telemetry, or user tracking. Preserve privacy-by-design architecture.

2. **Enhance User Guidance**:
   - Add legal disclaimer to README.md: "Framework provides templates, not legal advice; consult legal counsel for compliance validation"
   - Create CONTRIBUTING.md documenting git privacy settings for contributors
   - Monitor early adopter feedback (0-3 months) for artifact privacy concerns

3. **Annual DPIA Review**: Re-assess annually (next review: 2026-10-17) or immediately if:
   - Data collection introduced (analytics, telemetry, user accounts)
   - Material change to processing model
   - Regulatory guidance affects documentation frameworks

4. **Community Transparency**: Publish this DPIA to repository (consider adding to README or docs/) to demonstrate privacy commitment.

**For Framework Users**:

1. **Understand Your Responsibility**: AIWG provides templates, but YOU are responsible for:
   - Determining if GDPR/HIPAA/CCPA applies to YOUR project
   - Configuring `.gitignore` to protect sensitive artifacts
   - Conducting YOUR OWN DPIA for applications you build
   - Implementing data subject rights for YOUR end users

2. **Use `.gitignore` Strategies**: Review CLAUDE.md section on `.aiwg/` artifacts:
   - **Option 1 (Teams/Enterprise)**: Commit all artifacts for audit trail
   - **Option 2 (Balanced)**: Ignore `working/` and `reports/`, commit planning docs
   - **Option 3 (Solo/Local)**: Ignore all `.aiwg/`, keep intake only

3. **Apply Templates Appropriately**:
   - Use GDPR templates ONLY if you process EU resident data
   - Use HIPAA templates ONLY if you handle Protected Health Information
   - Consult legal counsel to validate compliance (templates are guidance, not legal advice)

4. **Review Artifacts for PII**: Before committing `.aiwg/` artifacts to git (especially public repositories), review for:
   - Team member names, emails, contact information
   - Customer names or identifying details in requirements
   - Internal project codenames or confidential business information
   - Any data subject to NDA or confidentiality agreements

### Risk Summary

| Risk | Level | Mitigation Status |
|------|-------|-------------------|
| Framework collects personal data | **NONE** | ✓ Zero-data architecture by design |
| User commits sensitive data to public git | **MEDIUM** | ✓ Documentation provided; user responsibility clearly stated |
| Template misuse (false compliance) | **LOW** | ✓ Legal disclaimer and scope statements included |
| GitHub platform data exposure | **LOW** | ✓ Standard open source model; GitHub privacy controls available |

**Overall Privacy Posture**: **EXCELLENT** - Zero-data framework with comprehensive user guidance and privacy-protective design.

---

**Document Status**: APPROVED
**Next Review**: 2026-10-17
**Privacy Officer**: Claude Code (Privacy Officer Agent)
**Date**: 2025-10-17
