# Media/Marketing Kit (MMK) Framework - Quick Start

Build marketing campaigns with AI-assisted lifecycle: Strategy → Creation → Review → Publication → Analysis.

---

## Install & Deploy

### Option A: Claude Code Marketplace (Recommended)

Native Claude Code integration - no npm required:

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide

# Install marketing framework
/plugin install marketing@aiwg   # Full marketing framework
/plugin install utils@aiwg       # Core utilities (recommended)
/plugin install voice@aiwg       # Voice profiles (recommended)
```

> **No account required** - Plugin distribution is decentralized. No registry signup, no approval process.

### Option B: npm + CLI (Multi-Platform)

For CLI tools and deploying to other platforms:

```bash
npm install -g aiwg
```

Deploy to your project:

```bash
cd /path/to/your/project

# Deploy marketing framework:
aiwg use marketing
```

---

## After Installation

**1. Open in your AI platform**

```bash
claude .                   # Claude Code
cursor .                   # Cursor
droid .                    # Factory AI
```

**2. Integrate with platform context**

```text
/aiwg-setup-project
```

**3. Regenerate for intelligent integration**

```text
/aiwg-regenerate
```

`aiwg use` already wrote the project context, so natural-language command mapping ("run security review" → workflow) works right away via AIWG's Discover-First protocol. On an **existing project**, or to pull in the latest AIWG, run this to re-tailor the context to your codebase — optional on a brand-new project. See the [Regenerate Guide](#regenerate-guide) for details.

**4. You're ready.** See the [Intake Guide](#intake-guide) for starting marketing campaigns.

---

## Artifacts Location

All documents generated in `.aiwg/marketing/`:

```text
.aiwg/marketing/
├── intake/        # Campaign briefs
├── strategy/      # Audience, messaging
├── content/       # Calendars, copy
├── social/        # Social media plans
├── email/         # Email sequences
├── analytics/     # Performance reports
└── governance/    # Brand compliance
```

---

## Voice Profiles for Content

For consistent brand voice across marketing content:

```bash
aiwg use writing           # Add Voice Framework
```

**Built-in profiles**: `technical-authority`, `friendly-explainer`, `executive-brief`, `casual-conversational`

**Custom voices**: Create brand-specific voice profiles:

```text
"Create a voice profile from this sample blog post"
"Blend 70% friendly with 30% professional for our brand voice"
```
