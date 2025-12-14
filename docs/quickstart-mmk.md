# Media/Marketing Kit (MMK) Framework - Quick Start

Build marketing campaigns with AI-assisted lifecycle: Strategy → Creation → Review → Publication → Analysis.

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy marketing framework:
aiwg use marketing
```

**3. Open in your AI platform**

```bash
claude .                   # Claude Code
cursor .                   # Cursor
droid .                    # Factory AI
```

**4. Integrate with platform context**

```text
/aiwg-setup-project
```

**5. Regenerate for intelligent integration**

```text
/aiwg-regenerate-claude
```

This step is critical - it enables natural language command mapping and deep integration. Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**6. You're ready.** See the [Intake Guide](#intake-guide) for starting marketing campaigns.

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
