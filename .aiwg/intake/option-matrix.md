# Option Matrix (Project Context & Intent)

**Purpose**: Capture what this project IS - its nature, audience, constraints, and intent - to determine appropriate SDLC framework application (templates, commands, agents, rigor levels).

**Generated**: 2025-10-16 (from codebase analysis + interactive user responses)

## Step 1: Project Reality

### What IS This Project?

**Project Description** (in natural language):

```
Documentation framework and SDLC toolkit providing:
1. Writing quality guides to reduce AI formulaic patterns
2. Comprehensive SDLC framework (58 agents, 45 commands, 156 templates)

Pre-launch (0 users), solo developer (30 years system engineering), 485 markdown files + 22 Node.js tools, GitHub-hosted open source (MIT license).

Ship-now mindset: already usable but accepting imperfections, iterating based on user feedback. Expects multiple refactors for multi-platform evolution (Claude Code primary, OpenAI/Codex future).

Framework is modular - users load only subsets relevant to their project type (personal scripts to enterprise systems). Tooling enables self-improvement loops: used to build/manage itself, generates superior documentation vs chat logs.

Enterprise SRE/eng background, plan to use for enterprise work eventually, but initial focus is smaller projects (1-10 devs, 10k-100k LoC, months to ship).
```

### Audience & Scale

**Who uses this?** (from codebase analysis + user responses):
- [x] Just me (personal project) - *Currently: solo developer, self-application testing*
- [x] Small team (2-10 people, known individuals) - *Target within 6 months: 2-3 contributors*
- [x] Department (10-100 people, organization-internal) - *Enterprise SRE/eng eventual usage*
- [x] External customers (100-10k users, paying or free) - *If community adoption grows*
- [ ] Large scale (10k-100k+ users, public-facing) - *Not targeting, but possible long-term*
- [ ] Other: N/A

**Audience Characteristics**:
- **Technical sophistication**: Technical (developers, SRE/eng teams, agentic coding users)
- **User risk tolerance**: Experimental OK now (MVP phase), Expects stability later (Production/Enterprise)
- **Support expectations**: Self-service (solo developer can't support 100 issues/week, need FAQs/self-improvement loops)

**Usage Scale** (current or projected):
- **Active users**: 0 currently (pre-launch), 2-5 user testing target (2-4 weeks), 10-100 if community adopts (6-12 months)
- **Request volume**: N/A (documentation/tools, not a service. CLI invocations: local only, no server)
- **Data volume**: N/A (stateless tools, no user data storage. Repository: ~500 files, primarily text)
- **Geographic distribution**: Global (GitHub repository, open source, any user worldwide)

### Deployment & Infrastructure

**Expected Deployment Model** (from codebase analysis):
- [x] Client-only (CLI tool, desktop app) - *Bash installer + Node.js tools, runs locally*
- [x] Static site (documentation hosted files) - *GitHub repository (markdown files)*
- [ ] Client-server (SPA + API backend) - *Not applicable*
- [ ] Full-stack application - *Not applicable*
- [ ] Multi-system (microservices, distributed) - *Not applicable*
- [ ] Distributed application (edge computing, P2P) - *Not applicable*
- [ ] Embedded/IoT - *Not applicable*
- [ ] Hybrid - *Not applicable (pure client-side + static docs)*

**Where does this run?** (from infrastructure analysis):
- [x] Local only (user's laptop/desktop) - *CLI tools, agent deployment happens locally*
- [ ] Personal hosting - *Not applicable*
- [x] Cloud platform (GitHub for repository hosting) - *GitHub Pages potential for docs site*
- [ ] On-premise - *Users can run on on-premise machines*
- [ ] Hybrid - *Not applicable*
- [ ] Edge/CDN - *Not applicable*
- [ ] Mobile - *Not applicable*
- [ ] Desktop - *CLI runs on desktop/laptop*
- [x] Browser (if GitHub Pages site added) - *Potential documentation site*

**Infrastructure Complexity**:
- **Deployment type**: Static site (GitHub repository) + CLI tool (bash installer + Node.js runtime)
- **Data persistence**: Client-side only (manifests, generated intake docs stored in user's `.aiwg/` directory)
- **External dependencies**: 1 service (GitHub for repository hosting, CI/CD, issue tracking)
- **Network topology**: Standalone (CLI runs locally, no network calls except git pull for updates)

### Technical Complexity

**Codebase Characteristics** (from analysis):
- **Size**: 10k-100k LoC equivalent (485 markdown files ~500 lines avg, 22 .mjs scripts ~200 lines avg)
- **Languages**: Markdown (primary content), JavaScript/Node.js (tooling), Bash (installer)
- **Architecture**: Multi-component (writing guides + SDLC framework + CLI tools, modular composition)
- **Team familiarity**: Brownfield (active development for 3 months, but expects refactors)

**Technical Risk Factors** (from security/performance analysis):
- [ ] Performance-sensitive - *Documentation project, tools fast (<5s), not performance-critical*
- [ ] Security-sensitive - *No PII, open source, no authentication/authorization*
- [ ] Data integrity-critical - *No user data, documentation only*
- [ ] High concurrency - *Single-user CLI tool, no concurrency*
- [x] Complex business logic - *SDLC orchestration patterns, project type selection, modular composition logic*
- [ ] Integration-heavy - *1 integration (GitHub), minimal external dependencies*
- [x] None straightforward - *But: Complex domain (SDLC framework, AI writing quality), requires deep understanding*

---

## Step 2: Constraints & Context

### Resources

**Team** (from git analysis + user responses):
- **Size**: 1 developer currently (solo), planning 2-3 within 6 months, enterprise SRE/eng background (30 years)
- **Experience**: Senior (enterprise SRE/eng, 30 years system engineering, deep SDLC knowledge)
- **Availability**: Part-time/volunteer (1+ commit/day for 3 months, but solo developer velocity constraints)

**Budget** (from guidance + infrastructure):
- **Development**: Zero (personal project, solo volunteer time)
- **Infrastructure**: Free tier (GitHub repository, GitHub Actions CI/CD, no paid services)
- **Timeline**: No deadline (ship-now mindset, but flexible iteration cadence based on user feedback)

### Regulatory & Compliance

**Data Sensitivity** (from security analysis):
- [x] Public data only (open source repository, MIT license, no user accounts)
- [ ] User-provided content - *No user data collected*
- [ ] PII - *None*
- [ ] Payment information - *None*
- [ ] PHI - *None*
- [ ] Sensitive business data - *All public, open source*

**Regulatory Requirements** (from compliance analysis):
- [x] None (no specific regulations apply to documentation project)
- [ ] GDPR - *No PII, no data collection*
- [ ] CCPA - *No PII*
- [ ] HIPAA - *No PHI*
- [ ] PCI-DSS - *No payments*
- [ ] SOX - *No financial data*
- [ ] FedRAMP - *No government usage*
- [ ] ISO27001 - *Not pursuing certification*
- [ ] SOC2 - *Not pursuing certification*

**Contractual Obligations** (from guidance):
- [x] None (open source, no contracts, no SLAs)
- [ ] SLA commitments - *No uptime/response guarantees*
- [ ] Security requirements - *No security audits required*
- [ ] Compliance certifications - *None*
- [ ] Data residency - *No data stored*
- [ ] Right to audit - *Open source, anyone can audit*

### Technical Context

**Current State** (existing project self-analysis):
- **Current stage**: Early users (planning 2-5 user testing, pre-launch)
- **Test coverage**: None automated (0%), 30-50% manual coverage (accepting short-term, will add post-validation)
- **Documentation**: Comprehensive (README, USAGE_GUIDE, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, per-directory READMEs)
- **Deployment automation**: CI/CD basic (GitHub Actions for linting, manifest validation. Bash installer for user deployment)

**Technical Debt** (from user responses):
- **Severity**: Moderate (accepting for velocity, but enterprise background indicates eventual quality focus)
- **Type**: Code quality (refactoring deferred), Tests (manual only), Documentation (may need beginner paths)
- **Priority**: Can wait (ship-now mode, will address post-user-validation, expects multiple refactors)

---

## Step 3: Priorities & Trade-offs

### What Matters Most?

**Ranked Priorities** (from interactive user responses):

1. **Speed to delivery** (highest priority): Ship-now, iterate based on feedback, 1+ commit/day velocity
2. **Quality & security** (tied for 2nd/3rd): Enterprise background, eventual enterprise usage, but accepting debt short-term
3. **Reliability & scale** (tied for 2nd/3rd): Pre-launch now, but planning for community/enterprise scale
4. **Cost efficiency** (lowest priority): Solo volunteer time, zero budget, but time-efficient workflows (self-improvement loops)

**Priority Weights** (derived from ranking + user responses):

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| **Delivery speed** | 0.40 | Ship-now mindset critical. Already usable, need user validation fast. 1+ commit/day velocity, iterate based on feedback. |
| **Cost efficiency** | 0.20 | Solo developer time-constrained, but efficient (self-improvement loops, tooling). Not primary constraint (no budget limitations). |
| **Quality/security** | 0.20 | Accepting technical debt short-term for velocity. Enterprise SRE/eng background indicates eventual quality focus. Will increase to 0.40-0.45 in Production/Enterprise phase. |
| **Reliability/scale** | 0.20 | Pre-launch (0 users), not yet concern. Documentation project scales naturally (GitHub). Will increase if community adoption grows. |
| **TOTAL** | **1.00** | |

### Trade-off Context

**What are you optimizing for?** (user's words from question responses):

```
"SDLC framework is critical path - writing guide can iterate slower. Ship now - already usable, iterate based on feedback. The toolset itself is being used to build/manage the toolset. We will be leaning into tooling that allows for self improvement."
```

**What are you willing to sacrifice?** (user's words):

```
"Comprehensive testing (ship with manual testing only). The framework is modular - users compose their own subset based on project type (smallest to largest apps). We are comprehensive and complex to handle building the smallest to the largest application, but the tooling is not meant to be loaded in entirety. It's meant to be added to existing context to provide better rails and reduce errorness improvisations.

Further, the generated documents based on the templates provides a superior record of decision and process than hard-to-process chat logs."
```

**What is non-negotiable?** (user's words):

```
"Modular deployment - handle diverse project types (personal scripts to enterprise systems). Framework must support comprehensive coverage BUT users only load subsets relevant to their project."

"Self-improvement loops both through issues/questions filed and through the acceptance of PRs."

"Generated documents (template-based) provide superior record vs chat logs."
```

---

## Step 4: Intent & Decision Context

### Why This Intake Now?

**What triggered this intake?** (from guidance + user responses):
- [x] Documenting existing project (never had formal intake, 3 months active development)
- [x] Preparing for scale/growth (planning 2-3 contributors within 6 months, user testing 2-5 users)
- [ ] Compliance requirement - *Not applicable*
- [x] Team expansion (2nd contributor within 6 months, need shared understanding)
- [x] Technical pivot (expects multiple refactors, multi-platform potential if OpenAI/Codex demand grows)
- [ ] Handoff/transition - *Not applicable*
- [ ] Funding/business milestone - *Undecided on commercial vs community*

**What decisions need making?** (from user responses):

```
1. **Community vs Commercial vs Personal Tool Path**: Undecided - depends on traction. Open source first, see where it goes. Could pivot any direction based on response.

2. **Multi-platform abstraction timing**: Currently Claude Code-focused. Need to decide when/if to abstract for OpenAI/Codex based on user demand.

3. **Support model at scale**: Solo developer can't support 100 issues/week. Need self-service infrastructure (FAQs, self-improvement loops, PR automation) if community grows.

4. **Testing investment timing**: Accepting 30-50% manual coverage now. When to invest in 60-80% automated tests? After user validation or sooner?

5. **Self-application maturity**: Early/experimental stage. How much investment in self-hosting before broader launch?
```

**What's uncertain or controversial?** (from user responses):

```
1. **User workflows**: Assumptions about how users discover, install, use framework. Need user testing to validate (pivot trigger if wrong).

2. **Performance at scale**: CLI tools fast now (<5s), but will agent coordination be efficient with 10+ users? (pivot trigger if issues emerge).

3. **Documentation clarity**: Comprehensive docs exist, but may be too complex for non-experts. Need beginner-friendly paths? Won't know until user testing.

4. **Platform demand**: Is multi-platform (OpenAI/Codex) needed, or is Claude Code sufficient? Depends on user requests.
```

**Success criteria for this intake process** (from context):

```
1. **Clear framework recommendation**: Which SDLC components (templates, commands, agents) to use for THIS project (documentation framework + SDLC toolkit, pre-launch, solo developer, ship-now mode).

2. **Shared understanding of trade-offs**: Document speed vs quality vs scale priorities, evolution plan (MVP → Production → Enterprise path).

3. **Roadmap for process evolution**: How to grow from solo → small team, pre-launch → user testing → community/enterprise, manual testing → automated testing.

4. **Self-application guidance**: How to use framework on itself (early/experimental stage, discover what works, iterate).
```

---

## Step 5: Framework Application

### Relevant SDLC Components

Based on project reality (documentation framework, pre-launch, solo developer, ship-now mode) and priorities (speed 0.40, quality 0.20):

**Templates** (check applicable):
- [x] **Intake** (project-intake, solution-profile, option-matrix) - **Using now (this document)**
- [x] **Requirements** (user-stories, use-cases) - **Minimal/lightweight** (README + USAGE_GUIDE sufficient, formal user stories only if team expands >3)
- [ ] **Architecture** (SAD, ADRs) - **Defer** (expects refactors, will document post-stabilization. Add ADRs for major decisions only)
- [x] **Test** (test-strategy, smoke tests) - **Minimal** (smoke tests for critical paths: deploy-agents, new-project, install. Full test-plan deferred to Production phase)
- [ ] **Security** (threat-model) - **Not applicable** (public documentation, no user data, no authentication)
- [ ] **Deployment** (deployment-plan, runbook) - **Not applicable** (bash installer, GitHub distribution, user-initiated local install)
- [ ] **Governance** (decision-log, RACI) - **Defer** (solo developer, will add when team >3 or if community governance needed)

**Commands** (check applicable):
- [x] **Intake commands** (intake-wizard, intake-from-codebase, intake-start) - **Using now**
- [x] **Flow commands** (iteration, discovery, delivery) - **Use for development cycles**: `flow-iteration-dual-track` (self-application)
- [ ] **Quality gates** (security-gate, gate-check) - **Defer** (no compliance, manual quality checks sufficient until Production phase)
- [x] **Specialized** (project-status, troubleshooting-guide) - **Selective**: `project-status` for milestone tracking

**Agents** (check applicable):
- [x] **Core SDLC agents** (requirements-analyst, code-reviewer, test-engineer, devops) - **Selective use**: code-reviewer for Node.js tools, documentation-synthesizer for intake/templates
- [ ] **Security specialists** - **Not applicable** (no security requirements)
- [ ] **Operations specialists** - **Not applicable** (no production runtime systems)
- [ ] **Enterprise specialists** - **Defer** (not yet enterprise phase, will add if enterprise customers emerge)

**Process Rigor Level** (select based on evidence):
- [x] **Minimal** (README, lightweight notes, ad-hoc) - **Current mode**: Solo developer, ship-now, manual testing, self-review
- [ ] **Moderate** (user stories, basic architecture, test plan) - **Target in 1-3 months**: Team expansion (2-3 contributors), automated testing (60-80%), formal workflows
- [ ] **Full** (comprehensive docs, traceability, gates) - **Target in 6-12 months if enterprise**: Compliance documentation, support SLAs, audit trails
- [ ] **Enterprise** (audit trails, compliance evidence, change control) - **Possible long-term** (depends on traction: community vs enterprise vs personal tool path)

### Rationale for Framework Choices

**Why this subset of framework?** (based on analysis + user responses):

```
Documentation framework + SDLC toolkit (pre-launch, solo developer, ship-now mode) needs MINIMAL rigor with SELECTIVE advanced usage:

**Use Now**:
- Intake (this process): Establish baseline, plan evolution, document for future contributors
- flow-iteration-dual-track: Self-application testing (use framework on itself, early/experimental)
- project-status: Track milestone progress (user testing → team expansion → community/enterprise)
- Smoke tests: Prevent regression in critical paths (deploy-agents, new-project, install)

**Skip/Defer**:
- Comprehensive architecture docs: Expects refactors, will document post-stabilization (add ADRs for major decisions only)
- Full test suite: Accepting 30-50% manual coverage, will invest in 60-80% automated post-user-validation
- Security templates: No PII, public documentation, no authentication (not applicable)
- Governance templates: Solo developer, will add when team >3 or community governance needed

**Relevant Specialized Agents**:
- writing-validator: Core product value (AI pattern reduction, content authenticity) - use extensively
- prompt-optimizer: Improve generated prompts/templates - use for content creation
- code-reviewer: Node.js tools (deploy, scaffold, lint) - use for tooling quality
- documentation-synthesizer: Intake process, template generation - use for SDLC artifacts

**Why modular?**:
Framework designed for diverse project types (personal scripts to enterprise). This project (documentation/tools) uses MINIMAL subset. Enterprise SRE/eng projects (future usage) will use FULL/Enterprise subset. Modular composition is non-negotiable design principle.
```

**What we're skipping and why** (be explicit):

```
Skipping enterprise templates because:
- Pre-launch (0 users, no production runtime, no SLAs)
- No regulatory requirements (open source, no PII, MIT license)
- No team coordination needs yet (solo developer, planning 2-3 within 6 months)
- No compliance obligations (no customer data, no contracts)
- No operational complexity (CLI tool, GitHub distribution, no server infrastructure)

Will revisit if:
- User testing validates market fit → community governance needs
- Enterprise customers request framework → compliance documentation (SOC2, ISO27001 patterns)
- Commercial path chosen → support SLAs, paid features
- Team expands >5 people → formal change control, decision tracking (RACI, CCB)
```

---

## Step 6: Evolution & Adaptation

### Expected Changes

**How might this project evolve?** (from user responses + guidance):
- [ ] No planned changes - *Explicitly expects multiple refactors*
- [x] User base growth (when: 2-4 weeks user testing, trigger: 2-5 users recruited) - *Then 6-12 months community if traction*
- [x] Feature expansion (when: continuous, trigger: user feedback) - *Self-improvement loops, multi-platform if demand*
- [x] Team expansion (when: within 6 months, trigger: stability milestone + contributor recruitment) - *2-3 contributors target*
- [ ] Commercial/monetization (when: undecided, trigger: depends on traction) - *Community vs enterprise vs personal tool path TBD*
- [ ] Compliance requirements (when: if enterprise customers, trigger: customer contracts) - *Enterprise SRE/eng eventual usage*
- [x] Technical pivot (when: if user testing fails or performance issues, trigger: wrong assumptions or scale problems) - *Explicitly stated pivot triggers*

### Adaptation Triggers (From User Responses)

**When to revisit framework application** (explicit pivot triggers):

```
1. **User testing reveals wrong assumptions** (2-4 weeks):
   - Workflows confusing, counter to how users work, fundamental UX issues
   - Response: Pause features, conduct interviews, prototype alternative, validate before refactor

2. **Performance/scale issues at even small usage** (ongoing monitoring):
   - CLI tools slow (>2s), agent coordination inefficient, documentation overwhelming
   - Response: Performance profiling, optimization, possible architecture refactor

3. **Multi-platform expansion demand** (6-12 months if requests grow):
   - User requests for OpenAI/Codex support increase
   - Response: Prototype abstraction layer, test with 1-2 users, decide platform strategy

4. **Team growth >3 contributors** (6-12 months if community grows):
   - Solo workflows break down, need formal coordination
   - Response: Add governance (PR review, RACI, decision log), formal SDLC workflows

5. **10x user growth** (hypothetical, but planning now):
   - Support capacity overwhelmed (100 issues/week)
   - Response: Self-service infrastructure (FAQs, GitHub Discussions), PR automation (self-improvement loops)
```

**Planned Framework Evolution** (from user responses):

- **Current (0-4 weeks)**: Minimal rigor (intake, smoke tests, self-application testing, ship-now mode)
- **3 months**: Moderate rigor (team expansion 2-3, automated testing 60-80%, formal iterations)
- **6 months**: Moderate-to-Full (user base 10-100 if community, enterprise templates if enterprise customers)
- **12 months**: Depends on path:
  - **Community**: Full self-service (FAQs, PR automation, community governance)
  - **Enterprise**: Full-to-Enterprise (compliance docs, support SLAs, audit trails)
  - **Personal**: Minimal stable (low-maintenance, clear no-support boundaries)

---

## Summary & Next Actions

### Project Reality Snapshot

This is a **documentation framework + SDLC toolkit** with:
- **485 markdown files** (writing guides + SDLC templates)
- **58 agents, 45 commands** (comprehensive but modular)
- **Solo developer** (enterprise SRE/eng, 30 years experience, 105 commits in 3 months)
- **Pre-launch** (0 users, planning 2-5 user testing, ship-now mindset)
- **Modular by design** (users load subsets for project type: personal scripts to enterprise)
- **Self-improvement focus** (tooling builds/manages itself, generates docs vs chat logs)

### Intent & Decision Context

**Optimizing for**: Speed to user validation (0.40), iterating based on feedback, self-improvement loops

**Willing to sacrifice**: Comprehensive testing (manual 30-50% OK now), technical debt (will refactor post-validation)

**Non-negotiable**: Modular composition (diverse project types), generated documentation (superior to chat logs), self-improvement capability

**Key Decisions**:
1. Community vs commercial vs personal tool (undecided, depends on traction)
2. Multi-platform timing (defer until user demand validates)
3. Support model at scale (self-service + PR automation required)
4. Testing investment (post-user-validation, 60-80% target)

### Framework Recommendation

**For THIS project (documentation framework, pre-launch, solo developer, ship-now mode)**:

**Use MINIMAL rigor with SELECTIVE advanced features**:

| Component | Usage | Rationale |
|-----------|-------|-----------|
| **Intake** | ✓ Full (this process) | Establish baseline, document for future contributors, plan evolution |
| **Requirements** | ✗ Skip formal user stories | README + USAGE_GUIDE sufficient, solo developer clarity |
| **Architecture** | ⚠️ Minimal ADRs only | Expects refactors, full SAD deferred to post-stabilization |
| **Testing** | ⚠️ Smoke tests only | Critical paths (deploy, scaffold, install), full suite post-validation |
| **Security** | ✗ Not applicable | Public docs, no PII, no authentication |
| **Deployment** | ✗ Not applicable | Bash installer sufficient (user-initiated local install) |
| **Governance** | ✗ Defer | Solo developer, add when team >3 or community governance needed |
| **Iteration Workflow** | ✓ flow-iteration-dual-track | Self-application testing, framework on itself |
| **Status Tracking** | ✓ project-status | Milestone progress (user testing → team → community/enterprise) |
| **Writing Agents** | ✓ Full (writing-validator, prompt-optimizer, content-diversifier) | Core product value |
| **Code Reviewer** | ✓ Selective (Node.js tools) | Tooling quality for deploy/scaffold/lint scripts |

**Evolution Plan**:
- **Now (0-4 weeks)**: Minimal (intake, smoke tests, self-application, ship-now)
- **3 months**: Moderate (team 2-3, testing 60-80%, formal iterations)
- **6-12 months**: Depends on traction (community self-service, enterprise compliance, or personal stable)

### Immediate Next Actions

1. **Complete user testing** (this intake completes Step 1):
   - Recruit 2-5 users
   - Validate workflows (install, deploy, scaffold, usage)
   - Fix critical bugs, identify pivot triggers

2. **Add smoke tests** (within 2 weeks):
   - deploy-agents.mjs (agent/command deployment)
   - new-project.mjs (project scaffolding)
   - install.sh (bash installer)
   - CI/CD: Run on all PRs

3. **Self-application iteration** (ongoing):
   - Use `flow-iteration-dual-track` for next development cycle
   - Document learnings in retrospectives
   - Mature early/experimental self-hosting

4. **Monitor pivot triggers** (continuous):
   - User feedback (workflow confusion, UX issues)
   - Performance (CLI execution time, agent coordination)
   - Multi-platform requests (OpenAI/Codex demand)
   - Team coordination needs (>3 contributors)

5. **Prepare for team expansion** (within 6 months):
   - Document onboarding (use `flow-team-onboarding`)
   - Establish PR review process
   - Expand CONTRIBUTING.md with team workflows
