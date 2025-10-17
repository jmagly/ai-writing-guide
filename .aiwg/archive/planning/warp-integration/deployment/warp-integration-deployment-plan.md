# Warp AI Platform Integration - Deployment Plan

## 1. Introduction

### Purpose

This document outlines the deployment strategy for integrating Warp AI platform support into the AI Writing Guide (AIWG) installation system. The integration adds Warp as a third provider alongside existing Claude and OpenAI/Codex support, enabling SDLC agent deployment to Warp AI's custom WARP.md format.

### Scope

**In Scope:**

- Warp provider detection and configuration in `deploy-agents.mjs`
- WARP.md file format generation for agent aggregation
- CLI parameter additions (`--provider warp`, `--as-warp-md`)
- Documentation updates across installation, CLI, and agent compatibility
- Backwards compatibility validation for existing Claude/OpenAI deployments
- User migration guidance for existing installations

**Out of Scope:**

- Warp AI platform development or API changes
- Agent content modifications (agents remain provider-agnostic)
- Template or command format changes
- Third-party integrations beyond Warp AI

### Release Identifiers

- **Release Version**: v1.4.0
- **Feature Name**: Warp AI Platform Support
- **Release Date Target**: TBD (post-beta validation)
- **Code Name**: "Triforce" (3-provider support)

### References

- **Technical Design**: `.aiwg/working/warp-integration/design/warp-integration-technical-design.md`
- **Test Strategy**: `.aiwg/working/warp-integration/testing/warp-integration-test-strategy.md`
- **Security Threat Model**: `.aiwg/working/warp-integration/security/warp-threat-model.md`
- **Template**: `/home/manitcor/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/deployment/deployment-plan-template.md`
- **Warp AI Documentation**: https://docs.warp.dev/features/warp-ai (assumed)
- **Multi-Provider Compat**: `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`

---

## 2. Deployment Strategy

### Deployment Model

**Phased rollout** with progressive user opt-in:

1. **Phase 1: Internal Testing** (1 week) - Maintainer validation in controlled environments
2. **Phase 2: Beta Release** (2 weeks) - Early adopters via feature flag
3. **Phase 3: General Availability** (ongoing) - Full release with documentation
4. **Phase 4: Documentation & Examples** (1 week post-GA) - Comprehensive guides and templates

### Rationale

**Why Phased:**

- **Risk Mitigation**: Warp AI is a newer platform; phased rollout allows early issue detection before broad impact
- **Backwards Compatibility Validation**: Critical to ensure existing Claude/OpenAI users experience zero disruption
- **User Feedback Integration**: Beta users provide real-world validation of WARP.md format and CLI ergonomics
- **Controlled Rollback**: If critical issues emerge, only beta users are affected during early phases

**Why Progressive Opt-In:**

- Users explicitly choose Warp via `--provider warp` (no default changes)
- Existing installations continue working without updates required
- No breaking changes to CLI interface or file paths

### Deployment Constraints

- **Zero Disruption**: Existing Claude/OpenAI deployments MUST function identically post-release
- **CLI Consistency**: Warp integration follows identical patterns to OpenAI (`.warp/` directory, `--provider warp`)
- **No Automatic Updates**: Users control when to adopt Warp support (manual `aiwg -update` or new installs)
- **Documentation Completeness**: GA release requires comprehensive Warp-specific documentation

---

## 3. Environments and Prerequisites

### Target Environments

| Environment | Purpose | User Persona | Validation Criteria |
|-------------|---------|--------------|---------------------|
| **Local Dev (Maintainer)** | Internal testing, code validation | AIWG maintainers | All unit tests pass, manual CLI smoke tests |
| **Beta User (Early Adopter)** | Real-world validation, feedback gathering | Tech-savvy users with Warp AI access | Successful agent deployment, no Claude/OpenAI regressions |
| **Production (General Availability)** | Public release | All AIWG users with Warp AI | Comprehensive docs, zero critical issues |

### Configuration Requirements

**Common Prerequisites (All Environments):**

- Node.js >= 18.20.8 (LTS Hydrogen)
- Git >= 2.20
- AIWG installed at `~/.local/share/ai-writing-guide` (standard path)
- Shell RC file configured (`~/.bash_aliases` or `~/.zshrc`)

**Warp-Specific Prerequisites:**

- Warp terminal installed and accessible
- Warp AI feature enabled (assumes Warp AI is available to user)
- Target project directory with write permissions
- `.warp/` directory creation permissions (similar to `.claude/`, `.codex/`)

**Phase-Specific Access Requirements:**

- **Phase 1**: Maintainer GitHub repository write access
- **Phase 2**: Beta users require feature flag or branch access (see rollout plan)
- **Phase 3**: Standard public AIWG installation (no special access)

### Environment Readiness Checks

**Pre-Deployment Validation (Per Environment):**

```bash
# Check Node version
node -v  # Must be >= v18.20.8

# Check AIWG installation
aiwg -version  # Should display commit hash and branch

# Check git repository health
git -C ~/.local/share/ai-writing-guide status  # Should be clean

# Verify existing provider deployments (if applicable)
ls .claude/agents/*.md 2>/dev/null || echo "No Claude agents"
ls .codex/agents/*.md 2>/dev/null || echo "No OpenAI agents"

# Test write permissions for .warp/ directory
mkdir -p .warp/test && rmdir .warp/test && echo "Write permissions OK"
```

**Post-Deployment Validation:**

```bash
# Verify Warp deployment succeeded
ls .warp/agents/*.md 2>/dev/null || ls .warp/WARP.md 2>/dev/null

# Count deployed agents
echo "Total agents: $(find .warp -name '*.md' | wc -l)"

# Validate WARP.md structure (if aggregated)
grep -c "^---$" .warp/WARP.md  # Should match agent count * 2 (frontmatter blocks)

# Check for Claude/OpenAI regression
ls .claude/agents/*.md 2>/dev/null && echo "Claude agents intact"
ls .codex/agents/*.md 2>/dev/null && echo "OpenAI agents intact"
```

---

## 4. Deployment Schedule

### Timeline Overview

| Phase | Duration | Start Date | End Date | Key Milestones |
|-------|----------|------------|----------|----------------|
| **Phase 1: Internal Testing** | 1 week | TBD | TBD+7d | Code complete, unit tests pass, maintainer sign-off |
| **Phase 2: Beta Release** | 2 weeks | TBD+7d | TBD+21d | 10+ beta users, zero critical bugs, feedback incorporated |
| **Phase 3: General Availability** | Immediate | TBD+21d | - | Merge to main, release notes published |
| **Phase 4: Documentation** | 1 week | TBD+21d | TBD+28d | Warp-specific guides, examples, FAQ complete |

### Detailed Schedule

#### Phase 1: Internal Testing (Week 1)

| Day | Activity | Owner | Duration | Deliverables |
|-----|----------|-------|----------|--------------|
| 1 | Merge Warp integration PR to `dev` branch | Lead Maintainer | 2h | Feature branch merged |
| 1-2 | Deploy to maintainer dev environment | Lead Maintainer | 4h | Warp agents deployed to test project |
| 2-3 | Execute unit test suite | QA Lead | 8h | All tests passing (target: 100% pass rate) |
| 3-4 | Manual CLI smoke tests (all providers) | Lead Maintainer | 6h | Test matrix completed (see below) |
| 4-5 | Backwards compatibility validation | QA Lead | 8h | Claude/OpenAI deployments verified |
| 5 | Fix critical issues (if any) | Dev Team | Variable | Hotfixes applied to `dev` branch |
| 6-7 | Maintainer review and sign-off | Lead Maintainer | 4h | Phase 1 gate approval |

**Test Matrix (Phase 1):**

- Deploy general agents only (`--mode general`)
- Deploy SDLC agents only (`--mode sdlc`)
- Deploy both modes (`--mode both`)
- Deploy with `--as-warp-md` aggregation
- Deploy to existing project with Claude agents (verify no conflicts)
- Deploy to existing project with OpenAI agents (verify no conflicts)
- Deploy with custom models (`--reasoning-model`, etc.)
- Dry-run mode (`--dry-run`)
- Force overwrite mode (`--force`)

#### Phase 2: Beta Release (Weeks 2-3)

| Day | Activity | Owner | Duration | Deliverables |
|-----|----------|-------|----------|--------------|
| 7 | Merge `dev` → `beta` branch, tag release | Release Manager | 1h | `v1.4.0-beta.1` tag created |
| 7 | Publish beta release notes (GitHub Discussions) | Docs Lead | 2h | Beta announcement with opt-in instructions |
| 7-14 | Beta user enrollment (10-20 target users) | Community Manager | Ongoing | Beta user cohort identified |
| 8-14 | Beta users deploy Warp agents in real projects | Beta Users | Self-service | Real-world validation data |
| 8-21 | Collect feedback via GitHub Issues/Discussions | Community Manager | Ongoing | Feedback log compiled |
| 15-21 | Triage and fix non-critical issues | Dev Team | Variable | Patch releases (`beta.2`, `beta.3`) |
| 21 | Beta retrospective, GA readiness review | All | 2h | Go/No-Go decision for GA |

**Beta User Communication Checkpoints:**

- **Day 7**: Beta announcement, opt-in instructions
- **Day 10**: Check-in survey (deployment success rate)
- **Day 14**: Midpoint feedback session (async or sync)
- **Day 21**: Final beta survey, migration to GA path

#### Phase 3: General Availability (Week 4+)

| Day | Activity | Owner | Duration | Deliverables |
|-----|----------|-------|----------|--------------|
| 21 | Merge `beta` → `main`, tag GA release | Release Manager | 1h | `v1.4.0` tag created |
| 21 | Publish GA release notes (GitHub Releases) | Docs Lead | 2h | Official changelog with migration guide |
| 21 | Update README.md with Warp support | Docs Lead | 1h | Multi-provider table updated |
| 21 | Announce on GitHub Discussions, social media | Community Manager | 2h | Public announcement |
| 21+ | Monitor GitHub Issues for Warp-related bugs | Support Team | Ongoing | Issue triage and response |
| 22-28 | Weekly bug fix releases (if needed) | Dev Team | Variable | Patch releases (`v1.4.1`, `v1.4.2`) |

#### Phase 4: Documentation & Examples (Weeks 4-5)

| Day | Activity | Owner | Duration | Deliverables |
|-----|----------|-------|----------|--------------|
| 21-24 | Write Warp-specific deployment guide | Docs Lead | 8h | `docs/guides/warp-deployment.md` |
| 24-26 | Create example Warp project with WARP.md | Docs Lead | 6h | `examples/warp-project/` |
| 26-27 | Add Warp FAQ section to main docs | Docs Lead | 4h | FAQ entries for common Warp issues |
| 27-28 | Video tutorial: Deploying to Warp AI | Community Manager | 8h | YouTube/Loom walkthrough video |
| 28 | Documentation review and sign-off | Lead Maintainer | 2h | Phase 4 complete |

### Freeze Periods

- **Code Freeze**: Day 6 (end of Phase 1) → Day 7 (start of Phase 2 beta)
  - No new features added during beta period
  - Only critical bug fixes merged to `beta` branch
- **Documentation Freeze**: Day 21 (GA release) → No freeze, docs can evolve post-GA
- **Deployment Freeze**: None (users deploy at their own pace via `aiwg -update`)

### Communication Checkpoints

| Checkpoint | Audience | Channel | Message |
|------------|----------|---------|---------|
| **Phase 1 Start** | Maintainers | Private Slack/Discord | "Warp integration testing underway" |
| **Phase 1 Complete** | Maintainers | GitHub PR comment | "Ready for beta release" |
| **Phase 2 Start** | Beta Users | GitHub Discussion (pinned) | "Warp AI support beta - opt-in instructions" |
| **Phase 2 Midpoint** | Beta Users | Email/Discussion update | "Beta feedback request - survey link" |
| **Phase 2 Complete** | Beta Users, Public | GitHub Discussion | "GA release imminent, final beta feedback" |
| **Phase 3 Start** | All Users | GitHub Release, README | "Warp AI support now available in v1.4.0" |
| **Phase 4 Complete** | All Users | GitHub Discussion | "Warp deployment guides and examples published" |

---

## 5. Deployment Steps

### Phase 1: Internal Testing Deployment

**Owner**: Lead Maintainer
**Expected Duration**: 1 day (setup + initial tests)

#### Step 1.1: Merge Warp Integration Code

```bash
# Checkout dev branch and merge feature branch
cd ~/.local/share/ai-writing-guide
git checkout dev
git merge feature/warp-integration  # Assumes PR reviewed and approved
git push origin dev

# Tag as pre-release for tracking
git tag v1.4.0-alpha.1
git push origin v1.4.0-alpha.1
```

**Validation**: `git log --oneline -5` shows merge commit, tag exists

#### Step 1.2: Deploy to Test Project (General Mode)

```bash
# Create clean test project
mkdir -p ~/test-projects/warp-test-general
cd ~/test-projects/warp-test-general

# Deploy general agents to Warp
aiwg -deploy-agents --provider warp --mode general --target .

# Verify deployment
ls -1 .warp/agents/*.md | wc -l  # Should match general agent count
```

**Validation**: `.warp/agents/` contains 3-5 general agents, no errors logged

#### Step 1.3: Deploy to Test Project (SDLC Mode)

```bash
# Create clean test project
mkdir -p ~/test-projects/warp-test-sdlc
cd ~/test-projects/warp-test-sdlc

# Deploy SDLC agents to Warp
aiwg -deploy-agents --provider warp --mode sdlc --target .

# Verify deployment
ls -1 .warp/agents/*.md | wc -l  # Should match SDLC agent count (~51)
```

**Validation**: `.warp/agents/` contains 51+ SDLC agents, no errors logged

#### Step 1.4: Test WARP.md Aggregation

```bash
# Create test project for aggregated format
mkdir -p ~/test-projects/warp-test-aggregated
cd ~/test-projects/warp-test-aggregated

# Deploy as single WARP.md
aiwg -deploy-agents --provider warp --mode both --as-warp-md --target .

# Verify structure
[ -f .warp/WARP.md ] && echo "WARP.md created successfully"
grep -c "^---$" .warp/WARP.md  # Should be even number (frontmatter pairs)
```

**Validation**: `.warp/WARP.md` exists, contains all agent definitions with valid YAML frontmatter

#### Step 1.5: Backwards Compatibility Test (Claude)

```bash
# Create project with existing Claude agents
mkdir -p ~/test-projects/warp-compat-claude
cd ~/test-projects/warp-compat-claude

# Deploy Claude agents first
aiwg -deploy-agents --provider claude --mode general --target .

# Add Warp agents to same project
aiwg -deploy-agents --provider warp --mode general --target .

# Verify both exist independently
ls -d .claude/agents .warp/agents
diff -q .claude/agents/writing-validator.md .warp/agents/writing-validator.md
```

**Validation**: Both `.claude/` and `.warp/` directories exist, agent contents differ only in model names

#### Step 1.6: Backwards Compatibility Test (OpenAI)

```bash
# Create project with existing OpenAI agents
mkdir -p ~/test-projects/warp-compat-openai
cd ~/test-projects/warp-compat-openai

# Deploy OpenAI agents first
aiwg -deploy-agents --provider openai --mode sdlc --target .

# Add Warp agents to same project
aiwg -deploy-agents --provider warp --mode sdlc --target .

# Verify both exist independently
ls -d .codex/agents .warp/agents
[ $(ls -1 .codex/agents/*.md | wc -l) -eq $(ls -1 .warp/agents/*.md | wc -l) ] && echo "Agent counts match"
```

**Validation**: Both `.codex/` and `.warp/` directories exist, agent counts identical

#### Step 1.7: Custom Model Override Test

```bash
# Test custom Warp models
mkdir -p ~/test-projects/warp-test-custom-models
cd ~/test-projects/warp-test-custom-models

aiwg -deploy-agents --provider warp --mode general \
  --reasoning-model warp-custom-reasoning \
  --coding-model warp-custom-coding \
  --efficiency-model warp-custom-efficiency \
  --target .

# Verify custom models in frontmatter
grep "^model:" .warp/agents/*.md | sort -u
```

**Validation**: Deployed agents contain custom model names, not defaults

#### Step 1.8: Dry-Run and Force Mode Tests

```bash
# Test dry-run (should not write files)
cd ~/test-projects/warp-test-general
rm -rf .warp/
aiwg -deploy-agents --provider warp --mode general --target . --dry-run
[ ! -d .warp ] && echo "Dry-run OK: no files written"

# Test force overwrite
aiwg -deploy-agents --provider warp --mode general --target .
echo "# Modified" >> .warp/agents/writing-validator.md
aiwg -deploy-agents --provider warp --mode general --target . --force
grep -q "^# Modified" .warp/agents/writing-validator.md && echo "ERROR: Force mode failed" || echo "Force mode OK"
```

**Validation**: Dry-run produces no files, force mode overwrites modified agents

### Phase 2: Beta Release Deployment

**Owner**: Release Manager
**Expected Duration**: 1 hour (branch management + tagging)

#### Step 2.1: Create Beta Branch and Tag

```bash
cd ~/.local/share/ai-writing-guide
git checkout dev
git pull origin dev

# Create beta branch
git checkout -b beta
git push origin beta

# Tag beta release
git tag v1.4.0-beta.1
git push origin v1.4.0-beta.1
```

**Validation**: Beta branch exists on remote, tag visible on GitHub Releases

#### Step 2.2: Publish Beta Release Notes

**Owner**: Docs Lead

**GitHub Discussions Post (Template):**

```markdown
# [BETA] Warp AI Platform Support - v1.4.0-beta.1

We're excited to announce beta support for Warp AI platform in the AI Writing Guide! 🚀

## What's New

- Deploy AIWG agents to Warp AI using `--provider warp`
- Support for `.warp/` directory structure
- Aggregate agents to single `WARP.md` file with `--as-warp-md`
- Full backwards compatibility with Claude and OpenAI deployments

## Beta Opt-In Instructions

**Prerequisites:**
- Warp terminal installed
- AIWG installation at `~/.local/share/ai-writing-guide`

**Installation:**
```bash
# Update to beta branch
cd ~/.local/share/ai-writing-guide
git fetch --all
git checkout beta
git pull origin beta

# Verify version
aiwg -version  # Should show beta.1 tag

# Deploy to your project
cd /path/to/your/project
aiwg -deploy-agents --provider warp --mode sdlc
```

## Feedback Needed

Please report any issues or feedback via:
- GitHub Issues: https://github.com/jmagly/ai-writing-guide/issues
- This Discussion thread (comments below)

**Specific areas for testing:**
- Warp agent deployment success/failures
- WARP.md format compatibility with Warp AI
- CLI ergonomics and error messages
- Documentation clarity

## Known Limitations (Beta)

- Warp AI platform must be enabled in your Warp terminal settings
- Limited examples and templates (Phase 4 deliverable)
- Beta branch requires manual checkout (not automatic via `aiwg -update`)

Thank you for being an early adopter! 🙏
```

**Validation**: Discussion posted, pinned to top of forum, beta users can find instructions

#### Step 2.3: Beta User Enrollment

**Owner**: Community Manager

**Outreach Channels:**

1. GitHub Discussions (announcement post)
2. Twitter/X: "@aiwg Beta release: Warp AI support! 🚀"
3. Discord/Slack community channels (if applicable)
4. Direct outreach to known power users (email/DM)

**Target Cohort:** 10-20 beta users with:

- Active AIWG usage history (GitHub stars, forks, issues)
- Warp terminal users (verify via profile/bio/past discussions)
- Technical proficiency (comfortable with git checkouts, CLI debugging)

**Enrollment Tracking:**

Maintain spreadsheet with:

- Username
- GitHub handle
- Warp AI experience level
- Deployment date
- Feedback status (pending/received)
- Issues reported

**Validation**: 10+ users enrolled by Day 10, at least 5 deployments confirmed

#### Step 2.4: Beta Feedback Collection

**Owner**: Community Manager

**Day 10 Check-In Survey (Google Forms/TypeForm):**

- Did Warp agent deployment succeed on first try? (Yes/No)
- Which deployment mode did you use? (general/sdlc/both)
- Did you use `--as-warp-md` aggregation? (Yes/No)
- How do deployed agents appear in Warp AI? (Works perfectly / Minor issues / Not working)
- Did deployment affect existing Claude/OpenAI agents? (No impact / Conflicts / Other)
- What issues did you encounter? (Free text)
- How likely are you to recommend Warp support to others? (1-10 NPS)

**Day 14 Midpoint Feedback Session:**

- Async: GitHub Discussion thread for structured feedback
- Sync (optional): 30-minute Zoom/Meet call with interested beta users

**Day 21 Final Beta Survey:**

- Same questions as Day 10, plus:
- Would you deploy Warp agents in production projects? (Yes/No/Maybe)
- What documentation is missing for GA release? (Free text)
- Any blockers preventing GA adoption? (Free text)

**Validation**: 50%+ survey response rate, feedback compiled into GitHub Issues

### Phase 3: General Availability Deployment

**Owner**: Release Manager
**Expected Duration**: 2 hours (merge + release notes + announcement)

#### Step 3.1: Merge to Main and Tag GA Release

```bash
cd ~/.local/share/ai-writing-guide

# Ensure all beta fixes are merged
git checkout beta
git pull origin beta

# Merge to main
git checkout main
git pull origin main
git merge beta  # Should be fast-forward if no other changes
git push origin main

# Tag GA release
git tag v1.4.0
git push origin v1.4.0

# Verify tag on GitHub
open https://github.com/jmagly/ai-writing-guide/releases/tag/v1.4.0
```

**Validation**: `main` branch HEAD matches `v1.4.0` tag, tag visible on GitHub

#### Step 3.2: Publish GA Release Notes

**Owner**: Docs Lead

**GitHub Release (v1.4.0) - Template:**

```markdown
# AI Writing Guide v1.4.0 - Warp AI Platform Support

We're thrilled to announce official support for **Warp AI platform**! 🎉

## 🚀 New Features

### Warp AI Provider Support

Deploy AIWG agents to Warp AI with a single command:

```bash
# Deploy all SDLC agents to Warp
aiwg -deploy-agents --provider warp --mode sdlc

# Aggregate to single WARP.md file
aiwg -deploy-agents --provider warp --as-warp-md
```

**Key capabilities:**
- ✅ Deploy to `.warp/` directory (similar to `.claude/`, `.codex/`)
- ✅ WARP.md aggregated format for streamlined agent management
- ✅ Custom model overrides (`--reasoning-model`, `--coding-model`, `--efficiency-model`)
- ✅ Full backwards compatibility with Claude and OpenAI deployments

### CLI Enhancements

- Added `--provider warp` flag to `aiwg -deploy-agents`
- Added `--as-warp-md` flag for single-file aggregation
- Improved error messaging for provider-specific failures

## 📚 Documentation

- **Deployment Guide**: [docs/guides/warp-deployment.md](docs/guides/warp-deployment.md)
- **Multi-Provider Compat**: Updated `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`
- **FAQ**: See [README.md § Multi-Provider Support](README.md#multi-provider-support)

## 🐛 Bug Fixes

- Fixed model transformation edge case for empty frontmatter
- Improved deployment conflict detection for existing `.warp/` directories

## 🙏 Special Thanks

Huge thanks to our beta testers for invaluable feedback:
@user1, @user2, @user3 [list actual beta users]

## 📦 Migration Guide

### For New Users

```bash
# Standard installation
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

# Deploy to Warp
aiwg -deploy-agents --provider warp
```

### For Existing Users

```bash
# Update to latest version
aiwg -update

# Verify Warp support available
aiwg -deploy-agents --help | grep warp

# Deploy (does not affect existing Claude/OpenAI agents)
aiwg -deploy-agents --provider warp
```

## 🔗 Links

- **Full Changelog**: https://github.com/jmagly/ai-writing-guide/compare/v1.3.0...v1.4.0
- **Documentation**: https://github.com/jmagly/ai-writing-guide#readme
- **Report Issues**: https://github.com/jmagly/ai-writing-guide/issues

---

**Compatibility:** Node.js >= 18.20.8, Git >= 2.20
**Breaking Changes:** None (fully backwards compatible)
```

**Validation**: Release notes published, visible on GitHub Releases page, linked in README.md

#### Step 3.3: Update README.md

**Owner**: Docs Lead

**Changes Required:**

1. **Multi-Provider Support Section** (add Warp column):

```markdown
## Multi-Provider Support

Agents support Claude, OpenAI, and Warp AI platforms:

| Provider | CLI Flag | Output Directory | Aggregation |
|----------|----------|------------------|-------------|
| Claude   | `--provider claude` (default) | `.claude/agents/` | N/A |
| OpenAI   | `--provider openai` | `.codex/agents/` | `--as-agents-md` |
| Warp AI  | `--provider warp` | `.warp/agents/` | `--as-warp-md` |

**Examples:**

```bash
# Deploy to Claude (default)
aiwg -deploy-agents

# Deploy to OpenAI
aiwg -deploy-agents --provider openai

# Deploy to Warp AI
aiwg -deploy-agents --provider warp

# Aggregate to single file (Warp)
aiwg -deploy-agents --provider warp --as-warp-md
```
```

2. **Installation Section** (no changes, already provider-agnostic)
3. **FAQ Section** (add Warp-specific entry):

```markdown
### Does Warp AI support work with existing Claude/OpenAI deployments?

Yes! Warp deployment is completely independent:

- `.warp/` directory is separate from `.claude/` and `.codex/`
- Deploying to Warp does not modify existing agents
- You can deploy to multiple providers in the same project
```

**Validation**: README.md updated, links work, table formatting correct

#### Step 3.4: Public Announcement

**Owner**: Community Manager

**GitHub Discussions Post:**

```markdown
# [GA] Warp AI Platform Support Now Available! 🚀

We're excited to announce that Warp AI platform support is now officially released in **v1.4.0**!

After successful beta testing with 15+ users, we're confident in bringing this to general availability.

## Quick Start

```bash
# Update to latest version
aiwg -update

# Deploy to Warp AI
aiwg -deploy-agents --provider warp
```

## What's New

- Deploy SDLC agents to Warp AI terminal
- Aggregate agents to single `WARP.md` file
- Full backwards compatibility with Claude/OpenAI
- Comprehensive documentation and examples

## Resources

- **Release Notes**: https://github.com/jmagly/ai-writing-guide/releases/tag/v1.4.0
- **Deployment Guide**: docs/guides/warp-deployment.md
- **Example Project**: examples/warp-project/

## Feedback Welcome

Try it out and let us know what you think! Report issues or suggestions:
- GitHub Issues: https://github.com/jmagly/ai-writing-guide/issues
- This Discussion thread

Happy coding with Warp AI! 🎉
```

**Twitter/X Post:**

```
🚀 AI Writing Guide v1.4.0 is here!

Now supporting Warp AI platform:
✅ 51 SDLC agents
✅ One-command deployment
✅ Full backwards compatibility

Deploy to Warp:
aiwg -deploy-agents --provider warp

Release: https://github.com/jmagly/ai-writing-guide/releases/tag/v1.4.0

#WarpAI #DevTools #SDLC
```

**Validation**: Announcements posted, engagement monitored (comments, stars, issues)

### Phase 4: Documentation Deployment

**Owner**: Docs Lead
**Expected Duration**: 1 week (incremental additions)

#### Step 4.1: Write Warp Deployment Guide

**Create**: `docs/guides/warp-deployment.md`

**Content Structure:**

```markdown
# Warp AI Platform Deployment Guide

## Overview

Learn how to deploy AI Writing Guide agents to Warp AI platform.

## Prerequisites

- Warp terminal installed ([download](https://www.warp.dev/))
- Warp AI feature enabled in terminal settings
- AIWG installed (`aiwg -version` to verify)

## Deployment Options

### Option 1: Individual Agent Files

Deploy agents as separate `.md` files to `.warp/agents/`:

[... detailed steps with screenshots ...]

### Option 2: Aggregated WARP.md

Deploy all agents to single `WARP.md` file:

[... detailed steps with screenshots ...]

## Verification

How to verify agents are accessible in Warp AI:

1. Open Warp terminal
2. Navigate to project directory
3. Type `/project:` and check for agent autocomplete
4. [Screenshot of agent selection UI]

## Troubleshooting

### "Provider 'warp' not recognized"

**Cause:** Outdated AIWG version
**Solution:**
```bash
aiwg -update
aiwg -version  # Should be >= v1.4.0
```

[... more troubleshooting scenarios ...]

## Advanced Usage

### Custom Model Configuration

[... examples of model overrides ...]

### Mixed-Provider Projects

[... guidance on deploying to multiple providers ...]

## See Also

- Multi-Provider Support: [openai-compat.md](../../agentic/code/frameworks/sdlc-complete/agents/openai-compat.md)
- CLI Reference: [README.md § CLI Commands](../../README.md#cli-commands)
```

**Validation**: Guide complete, screenshots added, links verified

#### Step 4.2: Create Example Warp Project

**Create**: `examples/warp-project/`

**Structure:**

```
examples/warp-project/
├── README.md               # Project overview and setup instructions
├── .warp/
│   └── WARP.md            # Aggregated agent definitions (51 SDLC agents)
├── .aiwg/
│   └── intake/            # Sample intake forms
│       ├── intake-business.md
│       ├── intake-technical.md
│       └── intake-resources.md
├── src/                   # Sample application code
│   └── app.js
└── AGENTS_USAGE.md        # How to use deployed agents in Warp AI
```

**README.md Content:**

```markdown
# Example Warp AI Project

This example demonstrates a complete AIWG setup for Warp AI platform.

## Setup

1. Navigate to this directory:
   ```bash
   cd examples/warp-project
   ```

2. Agents are pre-deployed in `.warp/WARP.md`

3. Open Warp terminal and try:
   ```bash
   /project:intake-wizard "Build a customer portal"
   ```

## Project Structure

- `.warp/WARP.md` - All 51 SDLC agents in aggregated format
- `.aiwg/intake/` - Sample intake forms (pre-filled)
- `src/` - Sample application code
- `AGENTS_USAGE.md` - Agent usage examples

## Deployed Agents

This project includes all SDLC framework agents:
- Intake Coordinator, Requirements Analyst, Architecture Designer
- Test Engineer, Security Gatekeeper, DevOps Engineer
- [... full list ...]

See `AGENTS_USAGE.md` for practical examples.
```

**AGENTS_USAGE.md Content:**

```markdown
# Using AIWG Agents in Warp AI

## Common Workflows

### 1. Project Intake

Start a new project with guided intake:

```bash
/project:intake-wizard "E-commerce platform with AI recommendations" --interactive
```

The **Intake Coordinator** will:
- Ask strategic questions about business goals
- Gather technical requirements
- Output structured intake forms to `.aiwg/intake/`

[... more workflow examples ...]

### 2. Architecture Design

Create software architecture document:

```bash
/project:flow-inception-to-elaboration
```

The orchestration will:
1. **Architecture Designer** creates SAD draft
2. **Security Architect** reviews security aspects
3. **Test Architect** reviews testability
4. **Documentation Synthesizer** merges feedback

[... more examples ...]
```

**Validation**: Example project runs successfully, agents accessible in Warp

#### Step 4.3: Add Warp FAQ Section

**Owner**: Docs Lead

**Update**: Main `README.md` § FAQ

**New FAQs:**

```markdown
### What Warp AI features are required?

Warp AI sub-agents and the `/project:` command system. Verify support in your Warp version via:

```bash
# In Warp terminal
/project:help
```

If unavailable, update Warp to the latest version.

---

### Can I use both Claude and Warp agents in the same project?

Yes! They deploy to separate directories:

- Claude: `.claude/agents/`
- Warp: `.warp/agents/`

Warp AI will only recognize agents in `.warp/`, while Claude Code will only see `.claude/` agents.

---

### Which format is better: individual agents or WARP.md?

**Individual files** (default):
- ✅ Easier to version control (git diff shows per-agent changes)
- ✅ Simpler to update specific agents
- ❌ More files to manage

**Aggregated WARP.md** (`--as-warp-md`):
- ✅ Single file to deploy/share
- ✅ Faster Warp AI parsing (single file load)
- ❌ Harder to track changes in version control

**Recommendation:** Use WARP.md for production, individual files for development.

---

### Do I need to redeploy agents when AIWG updates?

Only if agent definitions change. Check release notes:

- **Agent content updates** → Redeploy (`aiwg -deploy-agents --provider warp --force`)
- **CLI or template updates** → No redeployment needed
- **New agents added** → Redeploy to get new agents

Use `--dry-run` to preview changes before overwriting.
```

**Validation**: FAQ entries added, formatting consistent, links work

#### Step 4.4: Video Tutorial (Optional)

**Owner**: Community Manager

**Concept:**

- **Duration:** 5-7 minutes
- **Platform:** YouTube (embed in README), Loom (link in docs)
- **Title:** "Deploy AI Writing Guide Agents to Warp AI in 5 Minutes"

**Script Outline:**

1. **Intro** (30s): What is AIWG + Warp AI
2. **Prerequisites** (45s): Show Warp terminal, verify AIWG install
3. **Deployment** (2m): Live demo of `aiwg -deploy-agents --provider warp`
4. **Verification** (1m): Show agents in Warp AI, use `/project:` command
5. **Advanced** (1m): Demo `--as-warp-md` aggregation
6. **Outro** (30s): Link to docs, encourage feedback

**Validation**: Video published, embedded in README.md and `docs/guides/warp-deployment.md`

---

## 6. Data Migration Plan

### Scope

**No data migration required** for Warp integration. This is a **net-new feature** deployment, not a migration of existing data structures.

### Rationale

- Warp deployment creates `.warp/` directory fresh (no existing data to migrate)
- Agent definitions are copied from source repository (not transformed from user data)
- Existing Claude/OpenAI deployments remain untouched (no cross-provider migration)

### Edge Cases Requiring Attention

#### Case 1: User Manually Created `.warp/` Directory

**Scenario:** User previously created `.warp/` directory for custom purposes (not AIWG agents)

**Handling:**

1. Deployment script checks if `.warp/agents/` exists
2. If exists and contains non-AIWG files:
   - Prompt user: "`.warp/agents/` exists with custom files. Overwrite? (yes/no/backup)"
   - `--force` flag bypasses prompt and overwrites
3. If `--backup` chosen:
   - Move existing `.warp/agents/` to `.warp/agents.backup-YYYYMMDD-HHMMSS/`
   - Proceed with deployment

**Code Change (deploy-agents.mjs):**

```javascript
function checkExistingWarpDir(targetDir) {
  const warpAgentsDir = path.join(targetDir, '.warp', 'agents');
  if (fs.existsSync(warpAgentsDir)) {
    const files = fs.readdirSync(warpAgentsDir);
    const nonAiwgFiles = files.filter(f => !isAiwgAgent(f)); // heuristic check
    if (nonAiwgFiles.length > 0) {
      console.warn(`Warning: .warp/agents/ contains ${nonAiwgFiles.length} custom files`);
      // Prompt for backup/overwrite (implementation depends on CLI library)
    }
  }
}
```

**Validation:** Test with pre-populated `.warp/agents/` containing dummy files

#### Case 2: User Deploys Warp After Claude/OpenAI

**Scenario:** User has existing `.claude/agents/` or `.codex/agents/` and wants to add Warp

**Handling:**

- **No migration needed** - Warp deployment is additive
- Both providers' agents coexist independently
- No cross-contamination (Claude doesn't read `.warp/`, Warp doesn't read `.claude/`)

**Validation:**

```bash
# Test script
mkdir test-multi-provider
cd test-multi-provider

aiwg -deploy-agents --provider claude --mode general
aiwg -deploy-agents --provider openai --mode general
aiwg -deploy-agents --provider warp --mode general

# Verify independence
ls -d .claude/agents .codex/agents .warp/agents  # All three should exist
diff .claude/agents/writing-validator.md .warp/agents/writing-validator.md  # Should differ (models)
```

#### Case 3: WARP.md Aggregation Conflicts

**Scenario:** User deploys individual agent files, then later deploys with `--as-warp-md`

**Handling:**

1. If `.warp/agents/*.md` exists AND user specifies `--as-warp-md`:
   - Warn: "Switching to aggregated format. Individual agent files will be removed."
   - Prompt: "Continue? (yes/no)"
2. If yes:
   - Delete `.warp/agents/*.md`
   - Create `.warp/WARP.md`
3. Reverse scenario (WARP.md → individual files):
   - Warn: "Switching to individual files. WARP.md will be removed."
   - Prompt and delete if confirmed

**Code Change (deploy-agents.mjs):**

```javascript
function handleFormatSwitch(targetDir, asWarpMd) {
  const agentsDir = path.join(targetDir, '.warp', 'agents');
  const warpMdPath = path.join(targetDir, '.warp', 'WARP.md');

  const hasIndividualFiles = fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length > 0;
  const hasWarpMd = fs.existsSync(warpMdPath);

  if (asWarpMd && hasIndividualFiles) {
    console.warn('Switching to aggregated WARP.md format. Individual files will be removed.');
    // Prompt for confirmation
    if (confirmed) fs.rmSync(agentsDir, { recursive: true, force: true });
  } else if (!asWarpMd && hasWarpMd) {
    console.warn('Switching to individual agent files. WARP.md will be removed.');
    // Prompt for confirmation
    if (confirmed) fs.unlinkSync(warpMdPath);
  }
}
```

**Validation:** Test format switching in both directions with confirmation prompts

### Data Backup Strategy

**User Responsibility:**

- Users should commit `.warp/` to version control (git) for backup
- AIWG deployment script does not auto-backup (user-controlled deployments)

**Recommended Workflow (Documentation):**

```bash
# Before redeploying with --force
git add .warp/
git commit -m "Backup: Warp agents before AIWG update"

# Redeploy
aiwg -deploy-agents --provider warp --force

# Verify changes
git diff HEAD~1 .warp/

# Rollback if needed
git checkout HEAD~1 -- .warp/
```

---

## 7. Verification and Validation

### Smoke Tests (Post-Deployment)

**Execute after each phase deployment.**

#### Test Suite 1: Basic Deployment

| Test ID | Test Case | Command | Expected Outcome | Pass/Fail |
|---------|-----------|---------|------------------|-----------|
| ST-01 | Deploy general agents | `aiwg -deploy-agents --provider warp --mode general --target test-general` | `.warp/agents/` contains 3-5 agents | ☐ |
| ST-02 | Deploy SDLC agents | `aiwg -deploy-agents --provider warp --mode sdlc --target test-sdlc` | `.warp/agents/` contains 51+ agents | ☐ |
| ST-03 | Deploy both modes | `aiwg -deploy-agents --provider warp --mode both --target test-both` | `.warp/agents/` contains 54+ agents (general + SDLC) | ☐ |
| ST-04 | Deploy with aggregation | `aiwg -deploy-agents --provider warp --as-warp-md --target test-agg` | `.warp/WARP.md` exists, contains all agents | ☐ |
| ST-05 | Dry-run mode | `aiwg -deploy-agents --provider warp --dry-run --target test-dry` | No `.warp/` directory created | ☐ |

#### Test Suite 2: Model Configuration

| Test ID | Test Case | Command | Expected Outcome | Pass/Fail |
|---------|-----------|---------|------------------|-----------|
| ST-06 | Default Warp models | `aiwg -deploy-agents --provider warp --mode general --target test-models-default` | Agents contain default Warp models (TBD from design doc) | ☐ |
| ST-07 | Custom reasoning model | `aiwg -deploy-agents --provider warp --reasoning-model custom-reasoning --mode general --target test-models-custom` | Agents with "opus" → "custom-reasoning" | ☐ |
| ST-08 | Custom coding model | `aiwg -deploy-agents --provider warp --coding-model custom-coding --mode general --target test-models-custom` | Agents with "sonnet" → "custom-coding" | ☐ |
| ST-09 | Custom efficiency model | `aiwg -deploy-agents --provider warp --efficiency-model custom-efficiency --mode general --target test-models-custom` | Agents with "haiku" → "custom-efficiency" | ☐ |

#### Test Suite 3: Backwards Compatibility

| Test ID | Test Case | Command | Expected Outcome | Pass/Fail |
|---------|-----------|---------|------------------|-----------|
| ST-10 | Claude unaffected | (1) Deploy Claude, (2) Deploy Warp | `.claude/agents/` unchanged after Warp deployment | ☐ |
| ST-11 | OpenAI unaffected | (1) Deploy OpenAI, (2) Deploy Warp | `.codex/agents/` unchanged after Warp deployment | ☐ |
| ST-12 | Multi-provider coexistence | Deploy all three providers to same project | `.claude/`, `.codex/`, `.warp/` all exist independently | ☐ |
| ST-13 | Existing project with no agents | Deploy Warp to fresh project | Success, no errors about missing directories | ☐ |

#### Test Suite 4: Error Handling

| Test ID | Test Case | Command | Expected Outcome | Pass/Fail |
|---------|-----------|---------|------------------|-----------|
| ST-14 | Invalid provider | `aiwg -deploy-agents --provider invalid` | Error message: "Unknown provider 'invalid'. Use: claude, openai, or warp" | ☐ |
| ST-15 | Missing target directory | `aiwg -deploy-agents --provider warp --target /nonexistent` | Error: "Target directory not found" or creates directory (acceptable both) | ☐ |
| ST-16 | No write permissions | `aiwg -deploy-agents --provider warp --target /read-only-dir` | Error: "Permission denied" with clear message | ☐ |
| ST-17 | Corrupted AIWG installation | (Simulate by deleting agents/ folder) | Error: "AIWG installation corrupt, run: aiwg -reinstall" | ☐ |

### Health Checks (Continuous Monitoring)

**Execute daily during Phase 2 (beta), weekly during Phase 3+ (GA).**

#### Health Check 1: Agent File Integrity

```bash
# Verify all expected agents are present in source repository
cd ~/.local/share/ai-writing-guide

# General agents
[ $(ls -1 agents/*.md | wc -l) -ge 3 ] || echo "ERROR: Missing general agents"

# SDLC agents
[ $(ls -1 agentic/code/frameworks/sdlc-complete/agents/*.md | wc -l) -ge 51 ] || echo "ERROR: Missing SDLC agents"

# No duplicate agent names
find agents agentic/code/frameworks/sdlc-complete/agents -name "*.md" | xargs basename -s .md | sort | uniq -d | \
  [ $(wc -l) -eq 0 ] || echo "ERROR: Duplicate agent names found"
```

**Alert Threshold:** 0 errors (any error triggers immediate investigation)

#### Health Check 2: Deployment Script Execution Time

```bash
# Time a standard SDLC deployment
time aiwg -deploy-agents --provider warp --mode sdlc --target /tmp/test-perf --dry-run
```

**Baseline:** <5 seconds for dry-run, <30 seconds for full deployment
**Alert Threshold:** >60 seconds (investigate performance regression)

#### Health Check 3: WARP.md Generation Validity

```bash
# Deploy with aggregation
aiwg -deploy-agents --provider warp --as-warp-md --target /tmp/test-warpmd

# Validate YAML frontmatter structure
grep -c "^---$" /tmp/test-warpmd/.warp/WARP.md | \
  [ $(cat) -ge 108 ] || echo "ERROR: WARP.md malformed (expected 54 agents * 2 frontmatter delimiters = 108)"

# Validate no empty sections
grep -Pzo "---\n---" /tmp/test-warpmd/.warp/WARP.md && echo "ERROR: Empty agent sections in WARP.md"
```

**Alert Threshold:** 0 errors

#### Health Check 4: Backwards Compatibility

```bash
# Deploy all providers sequentially
cd /tmp/test-compat
rm -rf .claude .codex .warp

aiwg -deploy-agents --provider claude --mode general --target .
aiwg -deploy-agents --provider openai --mode general --target .
aiwg -deploy-agents --provider warp --mode general --target .

# Verify independence
ls .claude/agents/*.md .codex/agents/*.md .warp/agents/*.md | wc -l | \
  [ $(cat) -eq 15 ] || echo "ERROR: Multi-provider deployment failed (expected 5 agents * 3 providers = 15 files)"
```

**Alert Threshold:** 0 errors

### Monitoring Dashboards (Phase 3 GA Onward)

**GitHub Insights:**

- **Deployment Issues**: Track GitHub Issues with label `provider:warp`
- **User Adoption**: Monitor `.warp/` directory searches in public repos (GitHub Code Search)
- **Error Rates**: Parse issue descriptions for common error messages

**Metrics to Track:**

| Metric | Data Source | Target/Baseline | Alert Condition |
|--------|-------------|-----------------|-----------------|
| Warp deployment issues | GitHub Issues (label: `provider:warp`) | <5 open issues | >20 open issues |
| Time-to-resolution (Warp issues) | GitHub Issues closed date - created date | <7 days median | >14 days median |
| Beta-to-GA issue reduction | Beta issues vs GA issues (same period) | 50% reduction | <30% reduction |
| Public repo adoption | GitHub Code Search: `path:.warp/WARP.md` | N/A (baseline) | Track trend |
| CLI error rates | User-reported errors per 1000 deployments (estimated from issues) | <1% | >5% |

**Dashboard Tools:**

- **GitHub Projects**: Board with "Warp Integration" project, columns: Triage / In Progress / Blocked / Resolved
- **Google Sheets**: Manual tracking of beta survey responses, issue resolution times

---

## 8. Rollback and Contingency

### Rollback Triggers

Rollback to previous version (pre-Warp) will be initiated if any of the following occur:

| Trigger ID | Condition | Severity | Decision Authority |
|------------|-----------|----------|-------------------|
| RB-01 | **Critical Bug**: Warp deployment corrupts existing Claude/OpenAI agents | P0 | Lead Maintainer (immediate) |
| RB-02 | **Security Vulnerability**: Warp integration introduces exploitable flaw | P0 | Security Lead + Lead Maintainer |
| RB-03 | **Breaking Change**: Warp deployment breaks core CLI functionality (e.g., `aiwg -deploy-agents` fails for all providers) | P0 | Lead Maintainer |
| RB-04 | **High Error Rate**: >20% of beta users report deployment failures | P1 | Release Manager + Lead Maintainer |
| RB-05 | **Data Loss**: Warp deployment deletes user files outside `.warp/` directory | P0 | Lead Maintainer (immediate) |
| RB-06 | **Performance Regression**: Deployment time increases >5x baseline (>150s for SDLC mode) | P2 | Performance Lead + Lead Maintainer |

**Severity Definitions:**

- **P0 (Critical)**: Immediate rollback required (within 2 hours of detection)
- **P1 (High)**: Rollback within 24 hours unless hotfix available
- **P2 (Medium)**: Rollback considered if no fix within 1 week

### Rollback Procedures

#### Procedure 1: Beta Branch Rollback (Phase 2)

**Scenario:** Critical issue detected during beta testing

**Steps:**

1. **Freeze Beta** (0-15 minutes):
   ```bash
   # Post announcement in beta Discussion thread
   echo "URGENT: Beta deployment temporarily paused due to [issue description]. Do NOT deploy Warp agents until notified."
   ```

2. **Revert Beta Branch** (15-30 minutes):
   ```bash
   cd ~/.local/share/ai-writing-guide
   git checkout beta

   # Identify last known good commit (pre-Warp merge)
   git log --oneline | grep "Merge.*warp-integration"  # Find merge commit
   MERGE_COMMIT="abc1234"
   LAST_GOOD_COMMIT="$(git rev-parse ${MERGE_COMMIT}^1)"  # Parent commit before merge

   # Hard reset beta branch
   git reset --hard $LAST_GOOD_COMMIT
   git push origin beta --force
   ```

3. **Notify Beta Users** (30-60 minutes):
   - **GitHub Discussion**: Post rollback announcement with workaround or ETA for fix
   - **Email/DM**: Direct message to all enrolled beta users
   - **Instructions**: "Run `aiwg -update` to revert to stable version"

4. **Fix Issue** (hours to days):
   - Create hotfix branch from last good commit
   - Apply fix, test thoroughly
   - Merge back to beta when validated

5. **Resume Beta** (after fix validated):
   - Post "Beta resumed" announcement
   - Tag new beta release (e.g., `v1.4.0-beta.2`)

**Expected Downtime:** 30-60 minutes for beta users (no impact to non-beta users)

#### Procedure 2: GA Rollback (Phase 3)

**Scenario:** Critical issue detected post-GA release

**Steps:**

1. **Emergency Announcement** (0-15 minutes):
   ```markdown
   # URGENT: v1.4.0 Rollback - Warp Integration Issue

   We've identified a critical issue with Warp deployment in v1.4.0 [link to issue].

   **Immediate Action Required:**
   - Do NOT run `aiwg -deploy-agents --provider warp` until further notice
   - Existing Claude/OpenAI deployments are UNAFFECTED
   - If you deployed Warp agents, see mitigation steps below

   **Mitigation:**
   ```bash
   # Rollback to v1.3.0 (last stable)
   aiwg -reinstall  # Will prompt for version, choose v1.3.0

   # Or manual rollback:
   cd ~/.local/share/ai-writing-guide
   git fetch --all
   git checkout v1.3.0
   ```

   **Status:** Hotfix in progress, ETA [timeframe]
   ```

2. **Revert Main Branch** (15-30 minutes):
   ```bash
   cd ~/.local/share/ai-writing-guide
   git checkout main

   # Revert the merge commit (preserves history)
   MERGE_COMMIT="abc1234"  # v1.4.0 merge commit
   git revert -m 1 $MERGE_COMMIT  # -m 1 keeps main's parent

   # Tag revert release
   git tag v1.4.1-rollback
   git push origin main
   git push origin v1.4.1-rollback
   ```

3. **Update Auto-Update Mechanism** (30-45 minutes):
   - Verify `aiwg -update` pulls `v1.4.1-rollback` (not `v1.4.0`)
   - Test: `aiwg -update && aiwg -version` should show rollback tag

4. **User Communication** (45-120 minutes):
   - **GitHub Release**: Publish `v1.4.1-rollback` with prominent warning
   - **README.md**: Add banner at top: "⚠️ v1.4.0 Warp support temporarily reverted due to [issue]. Use v1.3.0 or v1.4.1-rollback."
   - **Social Media**: Post rollback announcement on Twitter/X, link to GitHub issue

5. **Monitor Rollback Completion** (hours to days):
   - Track GitHub Issue comments for user confirmations
   - Monitor for new issues related to rollback (regression risks)

6. **Fix and Re-Release** (days to weeks):
   - Apply fix to `dev` branch
   - Restart beta testing (Phase 2) with fixed version
   - Re-release as `v1.4.2` or `v1.5.0` once validated

**Expected Downtime:** 1-2 hours for users who auto-update, immediate for users who manually update

#### Procedure 3: Partial Rollback (Feature Flag Disable)

**Scenario:** Warp integration has issues, but core AIWG functionality is unaffected

**Steps:**

1. **Disable Warp Provider** (0-30 minutes):
   ```javascript
   // In deploy-agents.mjs, add feature flag check
   const WARP_ENABLED = process.env.AIWG_ENABLE_WARP === 'true';

   function parseArgs() {
     // ...
     if (cfg.provider === 'warp' && !WARP_ENABLED) {
       console.error('Warp provider temporarily disabled due to known issues.');
       console.error('See: https://github.com/jmagly/ai-writing-guide/issues/XXX');
       process.exit(1);
     }
   }
   ```

2. **Release Hotfix** (30-60 minutes):
   - Tag as `v1.4.1` with feature flag disabled by default
   - Users who need Warp can enable via `export AIWG_ENABLE_WARP=true`

3. **Communication**:
   - GitHub Release notes: "Warp provider temporarily disabled (opt-in via env var) while we address [issue]"
   - Less disruptive than full rollback

**Expected Downtime:** None for non-Warp users, opt-in available for advanced users

### Contingency Plans

#### Contingency 1: WARP.md Format Incompatibility

**Risk:** Warp AI changes WARP.md format requirements between beta and GA

**Mitigation:**

- **Pre-GA**: Validate WARP.md format with Warp AI team (if possible)
- **Post-GA**: Maintain compatibility layer in `deploy-agents.mjs`:
  ```javascript
  function generateWarpMd(agents, format = 'v1') {
    if (format === 'v1') return generateWarpMdV1(agents);
    if (format === 'v2') return generateWarpMdV2(agents);  // Future format
    throw new Error(`Unsupported WARP.md format: ${format}`);
  }
  ```
- **Flag**: `--warp-format v1|v2` for users to specify format version

**Detection:** User reports in GitHub Issues ("Warp AI doesn't recognize agents")

**Response Time:** Hotfix within 48 hours to add format flag

#### Contingency 2: High Beta User Dropout

**Risk:** <5 beta users complete testing (insufficient validation)

**Mitigation:**

- **Week 1 (Day 10)**: If <5 active users, extend beta by 1 week
- **Week 2 (Day 17)**: If still <5 users, recruit from maintainer network (direct outreach)
- **Week 3 (Day 21)**: If <5 users, abort GA release → label as "experimental" feature

**Go/No-Go Decision:** Minimum 5 beta users with successful deployments required for GA

#### Contingency 3: Critical Security Vulnerability

**Risk:** Warp deployment introduces security flaw (e.g., path traversal, code injection)

**Mitigation:**

- **Immediate**: Full rollback (Procedure 2) within 2 hours
- **Short-term**: Security advisory published on GitHub Security tab
- **Long-term**: Security audit before re-release

**Communication:**

```markdown
# Security Advisory: Warp Integration Vulnerability (CVE-XXXX-XXXXX)

**Severity:** Critical (CVSS 9.x)
**Affected Versions:** v1.4.0
**Fixed In:** v1.4.2 (or reverted in v1.4.1-rollback)

**Description:**
[Details of vulnerability]

**Impact:**
[Potential damage, data exposure, etc.]

**Remediation:**
1. Immediately stop using `aiwg -deploy-agents --provider warp`
2. Update to v1.4.2 or rollback to v1.3.0
3. If Warp agents were deployed, delete `.warp/` directory and rescan for IOCs

**Credit:**
[Reporter name or anonymous]
```

#### Contingency 4: Warp AI Platform Deprecation

**Risk:** Warp AI discontinues sub-agent support or WARP.md format

**Mitigation:**

- **Long-term**: Mark Warp provider as "deprecated" in documentation
- **Grace Period**: Maintain Warp support for 6-12 months post-deprecation
- **Sunset Plan**: Remove Warp code in future major version (v2.0.0)

**Communication:**

- Prominent deprecation notice in README.md
- CLI warning when using `--provider warp`: "Warning: Warp provider is deprecated and will be removed in v2.0.0"

---

## 9. Communication Plan

### Stakeholder Notifications

#### Pre-Deployment (Phase 1)

| Audience | Message | Channel | Timing | Responsible |
|----------|---------|---------|--------|-------------|
| **Maintainers** | "Warp integration testing begins [date]" | Private Slack/Discord | Day -3 | Lead Maintainer |
| **Contributors** | "Upcoming beta release: Warp support" | GitHub Discussions (contributors-only) | Day -1 | Community Manager |

#### During Deployment (Phase 2)

| Audience | Message | Channel | Timing | Responsible |
|----------|---------|---------|--------|-------------|
| **Beta Users** | "Beta release available - opt-in instructions" | GitHub Discussions (public), email to enrolled users | Day 7 (beta start) | Community Manager |
| **Beta Users** | "Midpoint check-in: share your feedback" | Email, Discussion comment | Day 14 | Community Manager |
| **Beta Users** | "Final beta survey - help us prepare for GA" | Email, Discussion comment | Day 21 | Community Manager |
| **Public** | "Warp AI support beta underway - volunteers welcome" | Twitter/X, README.md banner | Day 10 | Community Manager |

#### Post-Deployment (Phase 3)

| Audience | Message | Channel | Timing | Responsible |
|----------|---------|---------|--------|-------------|
| **All Users** | "v1.4.0 released: Warp AI support now available" | GitHub Release, Discussion, Twitter/X, README.md | Day 21 (GA launch) | Community Manager |
| **Beta Users** | "Thank you for beta testing! Here's what changed based on your feedback" | Email, Discussion | Day 22 | Community Manager |
| **Public** | "Warp deployment guide and examples published" | Twitter/X, GitHub Discussion | Day 28 (Phase 4 complete) | Docs Lead |

#### Emergency Communications (Rollback Scenarios)

| Audience | Message | Channel | Timing | Responsible |
|----------|---------|---------|--------|-------------|
| **All Users** | "URGENT: v1.4.0 rollback due to critical issue" | GitHub Release (pinned), Discussion (pinned), Twitter/X | Within 1 hour of rollback decision | Lead Maintainer |
| **Beta Users** | "Beta paused - do not deploy Warp until notified" | Email, Discussion comment | Within 30 minutes of issue detection | Community Manager |

### Communication Templates

#### Template 1: Beta Announcement (Phase 2 Start)

**Subject:** [BETA] AI Writing Guide v1.4.0 - Warp AI Platform Support

**Body:**

```markdown
Hi AI Writing Guide community! 👋

We're excited to announce **beta support for Warp AI platform** in version 1.4.0! 🚀

## What's New

Deploy AIWG's 51 SDLC agents to Warp AI terminal with a single command:

```bash
aiwg -deploy-agents --provider warp
```

## Beta Opt-In

**Prerequisites:**
- Warp terminal installed ([download](https://www.warp.dev/))
- AIWG installation at `~/.local/share/ai-writing-guide`

**Installation:**

```bash
cd ~/.local/share/ai-writing-guide
git fetch --all
git checkout beta
git pull origin beta

aiwg -version  # Should show "beta" branch
```

**Deploy to Your Project:**

```bash
cd /path/to/your/project
aiwg -deploy-agents --provider warp --mode sdlc
```

## We Need Your Feedback!

As a beta tester, you're critical to ensuring Warp support is rock-solid for GA release. Please share:

- ✅ What worked well
- ❌ What broke or was confusing
- 💡 Ideas for improvement

**Feedback Channels:**
- GitHub Issues: https://github.com/jmagly/ai-writing-guide/issues (label: `provider:warp`)
- This Discussion thread (comment below)

**Check-In Survey:** We'll send a quick survey on [Day 10 date] to gather structured feedback.

## Beta Timeline

- **Week 1-2:** Deploy and test in your projects
- **Day 14:** Midpoint feedback session
- **Day 21:** Final survey and GA readiness review
- **Week 4:** General availability release (target)

## Known Limitations (Beta)

- Limited documentation and examples (coming in Phase 4)
- Warp AI must be enabled in terminal settings
- Beta branch requires manual checkout (not via `aiwg -update`)

Thank you for being an early adopter! Your testing will help thousands of future users. 🙏

Questions? Reply to this thread or open a GitHub Issue.

---

**Note:** Beta branch is stable but not recommended for production-critical projects. Test in development environments first.
```

#### Template 2: GA Release Announcement (Phase 3)

**Subject:** AI Writing Guide v1.4.0 Released - Warp AI Platform Support

**Body:**

```markdown
# 🎉 AI Writing Guide v1.4.0 is Here!

After successful beta testing with 15+ users, we're thrilled to announce **official support for Warp AI platform**! 🚀

## Quick Start

```bash
# Update to latest version
aiwg -update

# Deploy to Warp AI
aiwg -deploy-agents --provider warp
```

## What's New

### Warp AI Provider Support

- ✅ Deploy 51 SDLC agents to Warp terminal
- ✅ Aggregate to single `WARP.md` file with `--as-warp-md`
- ✅ Custom model overrides (`--reasoning-model`, etc.)
- ✅ Full backwards compatibility with Claude/OpenAI

### Example Commands

```bash
# Deploy all SDLC agents
aiwg -deploy-agents --provider warp --mode sdlc

# Aggregate to single file
aiwg -deploy-agents --provider warp --as-warp-md

# Custom models
aiwg -deploy-agents --provider warp --reasoning-model warp-custom
```

## Resources

- **Deployment Guide:** [docs/guides/warp-deployment.md](docs/guides/warp-deployment.md)
- **Example Project:** [examples/warp-project/](examples/warp-project/)
- **Release Notes:** https://github.com/jmagly/ai-writing-guide/releases/tag/v1.4.0
- **FAQ:** [README.md § Warp AI](README.md#warp-ai)

## Thank You Beta Testers! 🙏

Special thanks to our amazing beta cohort:
@user1, @user2, @user3, ... [list all beta users]

Your feedback shaped this release. Key improvements based on beta testing:
- Improved error messages for deployment conflicts
- Added `--as-warp-md` aggregation flag (by popular request)
- Enhanced documentation with troubleshooting section

## Migration Guide

### New Users

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash
aiwg -deploy-agents --provider warp
```

### Existing Users

```bash
aiwg -update
aiwg -version  # Should show v1.4.0
aiwg -deploy-agents --provider warp  # Does not affect Claude/OpenAI agents
```

## What's Next

- **Phase 4** (next week): Video tutorial and advanced usage guides
- **v1.5.0** (Q2 2025): TBD - share your ideas in Discussions!

## Feedback Welcome

Try Warp support and let us know what you think:
- ⭐ Star the repo if you find it useful
- 🐛 Report issues: https://github.com/jmagly/ai-writing-guide/issues
- 💬 Discuss: https://github.com/jmagly/ai-writing-guide/discussions

Happy coding with Warp AI! 🎉

---

**Compatibility:** Node.js >= 18.20.8, Git >= 2.20
**Breaking Changes:** None (fully backwards compatible)
```

#### Template 3: Rollback Notification (Emergency)

**Subject:** URGENT: AI Writing Guide v1.4.0 Rollback - Warp Integration Issue

**Body:**

```markdown
# ⚠️ URGENT: v1.4.0 Rollback Notice

We've identified a critical issue with Warp AI deployment in version 1.4.0:

**Issue:** [Brief description, e.g., "Warp deployment may overwrite existing Claude agents in rare cases"]

**GitHub Issue:** https://github.com/jmagly/ai-writing-guide/issues/XXX

## Immediate Action Required

### If You Have NOT Deployed Warp Agents Yet

✅ **No action needed.** Your installation is unaffected. Do NOT run `aiwg -deploy-agents --provider warp` until further notice.

### If You HAVE Deployed Warp Agents

⚠️ **Assess Impact:**

```bash
# Check if issue affected your project
ls .claude/agents .codex/agents .warp/agents  # Verify all expected directories exist

# If Claude/OpenAI agents are missing or corrupted:
git checkout HEAD -- .claude/ .codex/  # Restore from git (if committed)
```

❗ **Rollback to Stable Version:**

```bash
# Option 1: Automated reinstall to v1.3.0
aiwg -reinstall  # Will prompt for version selection, choose v1.3.0

# Option 2: Manual rollback
cd ~/.local/share/ai-writing-guide
git fetch --all
git checkout v1.3.0
aiwg -version  # Verify rollback
```

## Status Update

- **Fix in Progress:** ETA [timeframe, e.g., "24-48 hours"]
- **Root Cause:** [Brief technical explanation if known]
- **Re-Release Plan:** Fixed version will be re-tested in beta before GA

## We Apologize

This issue slipped through our testing process. We're deeply sorry for any disruption and are implementing additional safeguards:

- Enhanced backwards compatibility test suite
- Mandatory dry-run validation before each release
- Extended beta testing period for future multi-provider features

## Stay Updated

- **GitHub Issue:** Subscribe to https://github.com/jmagly/ai-writing-guide/issues/XXX for real-time updates
- **Discussion Thread:** https://github.com/jmagly/ai-writing-guide/discussions/XXX
- **Fixed Version Announcement:** We'll notify via GitHub Release and this Discussion thread

Thank you for your patience and understanding. 🙏

---

**Questions or Need Help?**
- Comment on the GitHub Issue above
- Email: [maintainer email if available]
- Discord/Slack: [community channel link]
```

---

## 10. Support Handover

### Training Materials

#### For Maintainers

**Document:** `docs/maintainer-guides/warp-integration-support-guide.md`

**Contents:**

1. **Overview**: Warp integration architecture, key files, decision rationale
2. **Common Issues and Resolutions**:
   - "Warp provider not recognized" → Check version, run `aiwg -update`
   - "WARP.md malformed" → Validate YAML frontmatter, check for empty sections
   - "Deployment conflicts with Claude" → Verify directory independence, check for bugs
3. **Debugging Workflow**:
   - Reproduce issue in clean test environment
   - Check deployment script logs (`deploy-agents.mjs` console output)
   - Validate agent file integrity (frontmatter, content structure)
4. **Escalation Path**:
   - P0 issues → Lead Maintainer (immediate Slack ping)
   - P1 issues → GitHub Issues triage within 24h
   - P2 issues → Add to backlog, address in next sprint
5. **Testing Checklist** (for verifying fixes):
   - Run all smoke tests (Section 7)
   - Deploy to multi-provider test project
   - Validate WARP.md with sample Warp AI project

**Delivery:** Published to private maintainer documentation repo (or internal wiki) by Day 28

#### For Beta Users (Knowledge Base)

**Document:** `docs/faq/warp-troubleshooting.md`

**Contents:**

1. **Installation Issues**
   - Q: "How do I opt into beta?"
     A: `cd ~/.local/share/ai-writing-guide && git checkout beta && git pull`
   - Q: "Beta branch not found"
     A: Run `git fetch --all` first, or wait for GA release

2. **Deployment Issues**
   - Q: "`.warp/` directory not created"
     A: Check write permissions, verify `--dry-run` flag not used
   - Q: "Agents have wrong model names"
     A: Use `--reasoning-model`, `--coding-model`, `--efficiency-model` overrides

3. **Warp AI Integration Issues**
   - Q: "Warp AI doesn't recognize agents"
     A: Verify Warp AI feature enabled in terminal settings, check WARP.md format
   - Q: "How do I use deployed agents in Warp?"
     A: Type `/project:agent-name` in Warp terminal (see AGENTS_USAGE.md)

4. **Backwards Compatibility Issues**
   - Q: "Warp deployment deleted my Claude agents"
     A: This is a critical bug - report immediately with steps to reproduce
   - Q: "Can I use Claude and Warp agents in the same project?"
     A: Yes, they're independent (`.claude/` vs `.warp/`)

**Delivery:** Published to GitHub Wiki by Day 21 (GA release)

### Documentation Updates

| Document | Section | Update Required | Status |
|----------|---------|-----------------|--------|
| `README.md` | Multi-Provider Support | Add Warp column to table | ☐ Phase 3 |
| `README.md` | FAQ | Add 3-5 Warp-specific FAQs | ☐ Phase 4 |
| `README.md` | Installation | No changes (already provider-agnostic) | ✅ N/A |
| `agents/openai-compat.md` | Rename to `multi-provider-compat.md`, add Warp section | ☐ Phase 3 |
| `docs/guides/warp-deployment.md` | Create new guide (see Section 5 Phase 4) | ☐ Phase 4 |
| `examples/warp-project/` | Create example project with WARP.md | ☐ Phase 4 |
| `tools/agents/deploy-agents.mjs` | Inline code comments for Warp logic | ☐ Phase 1 |

### SLA Definitions (Post-GA)

| Issue Priority | Response Time | Resolution Time | On-Call Required |
|----------------|---------------|-----------------|------------------|
| **P0 (Critical)** | 2 hours | 24 hours | Yes (maintainer rotation) |
| **P1 (High)** | 24 hours | 1 week | No |
| **P2 (Medium)** | 3 days | 4 weeks | No |
| **P3 (Low)** | 1 week | Best effort | No |

**P0 Criteria (Warp-specific):**

- Warp deployment corrupts existing Claude/OpenAI agents
- Security vulnerability in Warp integration
- Data loss or file system damage caused by Warp deployment

**P1 Criteria:**

- Warp deployment fails for >20% of users (based on issue reports)
- WARP.md format incompatible with Warp AI
- Major CLI functionality broken (e.g., `--as-warp-md` doesn't work)

**P2 Criteria:**

- Warp deployment succeeds but agents not recognized by Warp AI
- Error messages unclear or misleading
- Documentation gaps or inaccuracies

### On-Call Rotation (Phase 3 GA Onward)

**Schedule:**

- **Week 1-2 post-GA**: Lead Maintainer (primary), Release Manager (backup)
- **Week 3-4 post-GA**: Rotating maintainer (schedule TBD)
- **Week 5+**: Standard rotation (Warp issues merged into general support)

**On-Call Duties:**

- Monitor GitHub Issues with label `provider:warp`
- Respond to P0 issues within 2 hours (acknowledge + triage)
- Escalate security issues to Security Lead immediately
- Update status on critical issues every 4 hours until resolved

**Handoff Checklist (at end of on-call shift):**

- [ ] All P0 issues resolved or escalated
- [ ] All P1 issues triaged with assignee
- [ ] Incident log updated (if P0 occurred)
- [ ] Next on-call maintainer briefed (Slack DM)

---

## 11. Risk Management

### Deployment Risks

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy | Owner | Status |
|---------|-----------------|-------------|--------|---------------------|-------|--------|
| **DR-01** | Warp deployment corrupts existing Claude/OpenAI agents | Low | Critical | Comprehensive backwards compat testing (Section 7 ST-10 to ST-13); independent directory structure (`.warp/` vs `.claude/`) | Lead Maintainer | ☐ Mitigated |
| **DR-02** | WARP.md format incompatible with Warp AI terminal | Medium | High | Beta testing with real Warp AI users; maintain format version flag (`--warp-format`) | Docs Lead | ☐ In Progress |
| **DR-03** | Deployment script fails on Windows/non-Unix systems | Medium | Medium | Cross-platform testing (WSL, Git Bash, PowerShell); use Node.js path APIs (not bash-specific) | Dev Team | ☐ Mitigated |
| **DR-04** | High beta user dropout (insufficient validation) | Medium | High | Proactive recruitment (10-20 target users); incentives (contributor credit); extend beta if needed (Contingency 2) | Community Manager | ☐ Monitoring |
| **DR-05** | Performance regression (deployment time >5x baseline) | Low | Medium | Performance benchmarking (Section 7 Health Check 2); optimize file I/O in `deploy-agents.mjs` | Dev Team | ☐ Mitigated |
| **DR-06** | Security vulnerability in Warp deployment logic | Low | Critical | Security code review (SAST, manual review); penetration testing before GA | Security Lead | ☐ In Progress |
| **DR-07** | Documentation incomplete or unclear at GA | Medium | Medium | Phase 4 dedicated to docs; beta user feedback on docs clarity | Docs Lead | ☐ Scheduled (Phase 4) |
| **DR-08** | Warp AI deprecates sub-agent support post-GA | Low | High | Contingency 4 (deprecation plan); monitor Warp AI roadmap/announcements | Lead Maintainer | ☐ Monitoring |

### Risk Tracking

**Weekly Risk Review (Phase 2 Beta):**

- **Schedule:** Every Friday, 30-minute standup
- **Attendees:** Lead Maintainer, Release Manager, Community Manager, Docs Lead
- **Agenda:**
  1. Review risk status (any new risks or status changes)
  2. Triage beta user feedback for risk indicators
  3. Update mitigation strategies if needed
  4. Go/No-Go decision checkpoint (Day 21 for GA)

**Risk Escalation:**

- **Medium Probability + High Impact** → Escalate to Lead Maintainer (immediate action)
- **High Probability + Medium Impact** → Add to beta retrospective agenda
- **New P0 risk identified** → Pause deployment, convene emergency meeting

---

## 12. Approvals

### Required Sign-Offs

| Approval Gate | Approver | Criteria | Status | Date |
|---------------|----------|----------|--------|------|
| **Phase 1 Complete (Internal Testing)** | Lead Maintainer | All smoke tests passed (Section 7 ST-01 to ST-17); no P0 bugs | ☐ Pending | TBD |
| **Phase 2 Beta Release** | Release Manager | Phase 1 approved; beta branch tagged; beta announcement ready | ☐ Pending | TBD |
| **Phase 2 Complete (Beta Feedback)** | Lead Maintainer + Community Manager | ≥5 beta users with successful deployments; no critical blockers; feedback incorporated | ☐ Pending | TBD |
| **Phase 3 GA Release** | Lead Maintainer | Phase 2 approved; GA release notes published; README updated | ☐ Pending | TBD |
| **Phase 4 Complete (Documentation)** | Docs Lead | Deployment guide published; example project created; FAQ updated | ☐ Pending | TBD |
| **Security Review** | Security Lead | No critical vulnerabilities; threat model reviewed; SAST passed | ☐ Pending | TBD |

### Approval Workflow

1. **Pre-Phase 1**: Dev Team completes Warp integration PR → Code Review (2 maintainers) → Merge to `dev`
2. **Phase 1 → Phase 2**: Lead Maintainer reviews test results → Signs off via GitHub comment on tracking issue
3. **Phase 2 → Phase 3**: Community Manager compiles beta feedback → Lead Maintainer + Release Manager review → Go/No-Go decision (documented in retrospective notes)
4. **Phase 3 → Phase 4**: Release Manager tags `v1.4.0` → Docs Lead begins Phase 4 work
5. **Phase 4 Complete**: Docs Lead submits PR with documentation → Lead Maintainer reviews and merges

### Approval Documentation

**Location:** GitHub Project Board "Warp Integration Deployment"

**Artifacts:**

- **Phase 1**: Comment on GitHub Issue #XXX with test results summary and sign-off
- **Phase 2**: Beta retrospective notes (Google Doc or GitHub Discussion comment)
- **Phase 3**: GA release notes on GitHub Releases
- **Phase 4**: PR #XXX merged with documentation updates

**Audit Trail:**

- All approvals tracked in GitHub Issue comments (timestamped, attributed)
- Major decisions (Go/No-Go) documented in Discussion threads
- Release tags in git history serve as immutable approval record

---

## Appendices

### Appendix A: Phase 1 Test Results Template

```markdown
# Warp Integration - Phase 1 Test Results

**Test Date:** YYYY-MM-DD
**Tester:** [Maintainer Name]
**AIWG Version:** [Commit hash]
**Environment:** [OS, Node version, Git version]

## Smoke Test Results

| Test ID | Test Case | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| ST-01 | Deploy general agents | ☐ Pass ☐ Fail | [Notes if failed] |
| ST-02 | Deploy SDLC agents | ☐ Pass ☐ Fail | |
| ... | ... | ... | |
| ST-17 | Corrupted installation | ☐ Pass ☐ Fail | |

**Total:** X/17 passed (Y% pass rate)

## Critical Issues Identified

| Issue ID | Description | Severity | Fix Required |
|----------|-------------|----------|--------------|
| [e.g., WI-001] | [Description] | P0/P1/P2 | Yes/No |

## Recommendation

☐ **Approved for Phase 2 Beta**: All tests passed, no P0/P1 issues
☐ **Blocked**: Fix issues above and retest

**Sign-Off:**
- Tester: [Name, Date]
- Lead Maintainer: [Name, Date]
```

### Appendix B: Beta User Survey (Day 10)

```markdown
# Warp AI Beta Feedback Survey - Midpoint Check-In

Thank you for beta testing Warp AI support! Your feedback is invaluable.

## Deployment Experience

1. Did Warp agent deployment succeed on your first attempt?
   - [ ] Yes, no issues
   - [ ] Yes, but with minor issues (please describe below)
   - [ ] No, deployment failed (please describe below)

2. Which deployment mode did you use?
   - [ ] `--mode general`
   - [ ] `--mode sdlc`
   - [ ] `--mode both`

3. Did you use the `--as-warp-md` aggregation option?
   - [ ] Yes
   - [ ] No
   - [ ] I didn't know about this option

4. If yes to #3, how did WARP.md work with Warp AI terminal?
   - [ ] Worked perfectly
   - [ ] Minor issues (describe below)
   - [ ] Did not work (describe below)
   - [ ] N/A (didn't use aggregation)

## Integration Experience

5. How do deployed agents appear in Warp AI terminal?
   - [ ] Agents are recognized and functional
   - [ ] Agents are recognized but have minor issues
   - [ ] Agents are not recognized by Warp AI
   - [ ] I haven't tested in Warp AI yet

6. Did Warp deployment affect your existing Claude/OpenAI agents?
   - [ ] No impact (as expected)
   - [ ] Conflicts or issues (describe below)
   - [ ] I don't have existing Claude/OpenAI agents

## Issues Encountered

7. What issues or confusion did you encounter? (Free text)

8. What worked particularly well? (Free text)

## Recommendation

9. How likely are you to recommend Warp support to other AIWG users? (1-10 NPS)
   - [ ] 1 (Not at all likely)
   - [ ] ...
   - [ ] 10 (Extremely likely)

10. What would make Warp support more valuable for you? (Free text)

## Optional: Contact

If you're open to a quick 15-minute follow-up call, please share:
- **GitHub Username:** @yourusername
- **Preferred Contact:** [Email/Discord/Slack]

---

**Submit by:** [Day 10 date]
**Submission:** [Google Forms link or GitHub Discussion comment]
```

### Appendix C: CLI Help Text (Post-Warp)

```bash
$ aiwg -deploy-agents --help

Usage: aiwg -deploy-agents [options]

Deploy agents from AI Writing Guide to a target project.

Options:
  --source <path>          Source directory (default: ~/.local/share/ai-writing-guide)
  --target <path>          Target directory (default: current working directory)
  --mode <type>            Deployment mode: general, sdlc, or both (default: both)
  --provider <name>        Target provider: claude (default), openai, or warp
  --reasoning-model <name> Override model for reasoning tasks (e.g., opus → custom-reasoning)
  --coding-model <name>    Override model for coding tasks (e.g., sonnet → custom-coding)
  --efficiency-model <name> Override model for efficiency tasks (e.g., haiku → custom-efficiency)
  --as-agents-md           Aggregate to single AGENTS.md (OpenAI)
  --as-warp-md             Aggregate to single WARP.md (Warp AI)
  --dry-run                Show what would be deployed without writing files
  --force                  Overwrite existing files
  --help                   Show this help message

Providers:
  claude   - Deploy to .claude/agents/ (default)
  openai   - Deploy to .codex/agents/
  warp     - Deploy to .warp/agents/

Examples:
  # Deploy to Claude (default)
  aiwg -deploy-agents

  # Deploy to Warp AI
  aiwg -deploy-agents --provider warp

  # Deploy to Warp with aggregation
  aiwg -deploy-agents --provider warp --as-warp-md

  # Deploy to OpenAI with custom models
  aiwg -deploy-agents --provider openai --reasoning-model gpt-5.1 --coding-model gpt-5.1-codex

  # Dry-run to preview changes
  aiwg -deploy-agents --provider warp --dry-run

Multi-Provider Support:
  You can deploy to multiple providers in the same project. Each provider uses an independent directory:
  - Claude: .claude/agents/
  - OpenAI: .codex/agents/
  - Warp: .warp/agents/

  Example:
    aiwg -deploy-agents --provider claude
    aiwg -deploy-agents --provider warp  # Both coexist

For more information:
  - Documentation: https://github.com/jmagly/ai-writing-guide#multi-provider-support
  - Warp Deployment Guide: https://github.com/jmagly/ai-writing-guide/blob/main/docs/guides/warp-deployment.md
  - Report Issues: https://github.com/jmagly/ai-writing-guide/issues
```

---

## Document Control

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2025-10-17
**Next Review:** [Post-Phase 1 completion]

**Change Log:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | Claude (DevOps Engineer) | Initial deployment plan created from template |

**Approval Signatures:**

- [ ] Lead Maintainer: _________________ Date: _______
- [ ] Release Manager: _________________ Date: _______
- [ ] Security Lead: _________________ Date: _______
- [ ] Docs Lead: _________________ Date: _______

---

**End of Deployment Plan**
