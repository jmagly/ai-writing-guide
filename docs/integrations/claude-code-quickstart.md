# Claude Code Quick Start

---

## Install & Deploy

### Option A: Plugin (Recommended)

Native Claude Code integration - no npm required:

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide 
# Install the frameworks you need
/plugin install sdlc@aiwg        # Full SDLC framework
/plugin install marketing@aiwg   # Full marketing framework
/plugin install utils@aiwg       # Core utilities
/plugin install voice@aiwg       # Voice profiles
```

> **No account required** - Plugin distribution is decentralized. No registry signup, no approval process - just add and install from any git repository.

### Option B: npm + CLI

For CLI tools and multi-platform deployment:

```bash
# Install CLI
npm install -g aiwg

# Deploy to your project
cd /path/to/your/project
aiwg use sdlc
```

---

## After Installation

**1. Open your project in Claude Code**

```bash
claude .
```

**2. Integrate with platform context**

```text
/aiwg-setup-project
```

**3. Regenerate for natural language support**

```text
/aiwg-regenerate-claude
```

This enables natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly.

**4. You're ready.** See the [Intake Guide](../intake-guide.md) for starting projects.

---

## What Gets Created

```text
.claude/
├── agents/      # SDLC agents
├── commands/    # Workflow commands
└── skills/      # Voice and utility skills

CLAUDE.md        # Project context
.aiwg/           # SDLC artifacts
```

---

## Troubleshooting

### Plugin Issues

**Marketplace not loading?**

```bash
# Verify marketplace was added
/plugin marketplace list

# Re-add if missing
/plugin marketplace add jmagly/ai-writing-guide ```

**Plugin installation fails?**

```bash
# Check available plugins
/plugin search @aiwg

# Verify plugin exists
/plugin info sdlc@aiwg
```

**Files not found after installation?**

Plugins are copied to a cache directory. If you see missing file errors:

```bash
# Reinstall the plugin
/plugin uninstall sdlc@aiwg
/plugin install sdlc@aiwg
```

**Update plugins to latest version?**

```bash
# Update marketplace catalog
/plugin marketplace update

# Reinstall for latest
/plugin uninstall sdlc@aiwg
/plugin install sdlc@aiwg
```

### General Issues

**Natural language not working?**

```text
/aiwg-regenerate-claude
```

**Commands/agents missing?**

```bash
# npm method
aiwg use sdlc

# or reinstall plugin
/plugin install sdlc@aiwg
```

**Check installation:**

```bash
aiwg -version
```

---

## Available Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| `sdlc@aiwg` | Full SDLC framework | `/plugin install sdlc@aiwg` |
| `marketing@aiwg` | Full marketing framework | `/plugin install marketing@aiwg` |
| `utils@aiwg` | Core utilities, regenerate commands | `/plugin install utils@aiwg` |
| `voice@aiwg` | Voice profiles for consistent writing | `/plugin install voice@aiwg` |
| `writing@aiwg` | AI pattern detection, validation | `/plugin install writing@aiwg` |
| `hooks@aiwg` | Workflow tracing, observability | `/plugin install hooks@aiwg` |
