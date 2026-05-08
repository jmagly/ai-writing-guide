#!/usr/bin/env node

/**
 * @file package-plugins.mjs
 * @description Package AIWG components as Claude Code plugins
 * @implements @.aiwg/architecture/decisions/ADR-016-claude-code-plugin-distribution.md
 *
 * Usage:
 *   node tools/plugin/package-plugins.mjs --all              # Package all plugins
 *   node tools/plugin/package-plugins.mjs --plugin aiwg-sdlc # Package specific plugin
 *   node tools/plugin/package-plugins.mjs --clean            # Clean plugins directory
 *   node tools/plugin/package-plugins.mjs --dry-run          # Show what would be copied
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const PLUGINS_DIR = path.join(ROOT_DIR, 'plugins');

// Plugin configurations
const PLUGIN_CONFIGS = {
  'sdlc': {
    name: 'sdlc',
    displayName: 'AIWG SDLC Complete',
    version: '2024.12.4',
    description: 'Complete SDLC framework with 180+ specialized agents for software development lifecycle management.',
    sources: {
      agents: 'agentic/code/frameworks/sdlc-complete/agents',
      commands: 'agentic/code/frameworks/sdlc-complete/commands',
      skills: 'agentic/code/frameworks/sdlc-complete/skills'
    },
    readme: `# AIWG SDLC Complete

Complete Software Development Lifecycle framework with 180+ specialized agents.

## Features

- **58 Specialized Agents**: Architecture, security, testing, deployment, and more
- **Phase-Based Workflows**: Inception → Elaboration → Construction → Transition
- **Security Reviews**: Automated threat modeling and security gates
- **Testing Orchestration**: Multi-level test strategy execution
- **Deployment Automation**: Release planning and deployment workflows

## Quick Start

\`\`\`bash
# Check project status
/project-status

# Start SDLC workflow
"transition to elaboration"

# Run security review
"run security review"
\`\`\`

## Agents

Key agents include:
- \`architecture-designer\` - System architecture and ADRs
- \`security-architect\` - Threat modeling and security gates
- \`test-engineer\` - Test strategy and automation
- \`devops-engineer\` - CI/CD and deployment

## Documentation

- Full guide: https://docs.aiwg.io/sdlc
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'marketing': {
    name: 'marketing',
    displayName: 'AIWG Marketing Kit',
    version: '2024.12.4',
    description: 'Marketing automation framework with 37 specialized agents for campaign management.',
    sources: {
      agents: 'agentic/code/frameworks/media-marketing-kit/agents',
      commands: 'agentic/code/frameworks/media-marketing-kit/commands',
      skills: 'agentic/code/frameworks/media-marketing-kit/skills'
    },
    readme: `# AIWG Marketing Kit

Marketing automation framework with 37 specialized agents.

## Features

- **37 Marketing Agents**: Campaign, content, brand, social media specialists
- **Full Campaign Lifecycle**: Strategy → Creation → Review → Publication → Analysis
- **Brand Compliance**: Automated brand voice and guideline enforcement
- **Analytics Integration**: Campaign performance tracking

## Quick Start

\`\`\`bash
# Start marketing intake
/marketing-intake-wizard

# Create campaign brief
/creative-brief

# Review brand compliance
/brand-review
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/marketing
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'voice': {
    name: 'voice',
    displayName: 'AIWG Voice Framework',
    version: '1.0.0',
    description: 'Voice profile system for consistent, authentic writing.',
    sources: {
      skills: 'agentic/code/addons/voice-framework/skills'
    },
    extraCopy: [
      { from: 'agentic/code/addons/voice-framework/voices', to: 'voices' }
    ],
    readme: `# AIWG Voice Framework

Voice profile system for consistent, authentic writing.

## Built-in Profiles

- **technical-authority**: Direct, precise, confident
- **friendly-explainer**: Approachable, encouraging
- **executive-brief**: Concise, outcome-focused
- **casual-conversational**: Relaxed, personal

## Skills

- \`voice-apply\`: Apply a voice profile to content
- \`voice-create\`: Generate new voice from description
- \`voice-blend\`: Combine multiple profiles
- \`voice-analyze\`: Analyze content's voice characteristics

## Quick Start

\`\`\`bash
# Apply voice to content
"write this in technical-authority voice"

# Create custom voice
"create a voice for API docs - precise, no-nonsense"

# Blend voices
"blend 70% technical with 30% friendly"
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/voice
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'writing': {
    name: 'writing',
    displayName: 'AIWG Writing Quality',
    version: '1.0.0',
    description: 'Writing quality validation and AI pattern detection.',
    sources: {
      agents: 'agentic/code/addons/writing-quality/agents',
      skills: 'agentic/code/addons/writing-quality/skills'
    },
    readme: `# AIWG Writing Quality

Writing quality validation and AI pattern detection.

## Features

- **AI Pattern Detection**: Identify AI-generated writing patterns
- **Authenticity Enhancement**: Suggestions for more authentic voice
- **Writing Validation**: Check against AIWG principles

## Agents

- \`writing-validator\`: Validates content for voice consistency and authenticity
- \`prompt-optimizer\`: Enhances prompts using AIWG principles
- \`content-diversifier\`: Generates varied examples and perspectives

## Quick Start

\`\`\`bash
# Validate content
/writing-validator "path/to/content.md"

# Detect AI patterns
"check this content for AI patterns"
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/writing
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'utils': {
    name: 'utils',
    displayName: 'AIWG Utilities',
    version: '1.5.0',
    description: 'Core AIWG utilities for context regeneration and workspace management.',
    sources: {
      agents: 'agentic/code/addons/aiwg-utils/agents',
      commands: 'agentic/code/addons/aiwg-utils/commands',
      skills: 'agentic/code/addons/aiwg-utils/skills'
    },
    readme: `# AIWG Utilities

Core AIWG utilities for context regeneration and workspace management.

## Features

- **Context Regeneration**: Update CLAUDE.md, WARP.md, AGENTS.md
- **Workspace Management**: Prune, realign, reset workspaces
- **Development Kit**: Scaffold new addons, agents, commands, skills
- **@-Mention Traceability**: Wire, validate, and report on @-mentions

## Commands

- \`/aiwg-regenerate\`: Regenerate platform context files
- \`/workspace-realign\`: Reorganize .aiwg/ documentation
- \`/devkit-create-*\`: Scaffold new components
- \`/mention-wire\`: Inject @-mentions for traceability

## Quick Start

\`\`\`bash
# Regenerate context
/aiwg-regenerate

# Create new agent
/devkit-create-agent "my-new-agent"

# Check @-mention traceability
/mention-validate
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/utils
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'codex-sdlc': {
    name: 'codex-sdlc',
    displayName: 'AIWG SDLC for Codex',
    pluginType: 'codex',
    description: 'Complete SDLC framework packaged as a Codex plugin with skills, agents, and marketplace entry.',
    sources: {
      skills: 'agentic/code/frameworks/sdlc-complete/skills'
    },
    readme: `# AIWG SDLC for Codex

AIWG SDLC framework packaged as a Codex plugin.

## Installation

\`\`\`bash
# Generate the plugin bundle
aiwg use sdlc --provider codex --as-plugin

# Or package directly
node tools/plugin/package-plugins.mjs --plugin codex-sdlc
\`\`\`

Then install in Codex via the \`/plugins\` command or the repo marketplace.

## Documentation

- Full guide: https://docs.aiwg.io/sdlc
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'forensics': {
    name: 'forensics',
    displayName: 'AIWG Forensics Complete',
    version: '2026.5.0',
    description: 'Digital forensics and incident response framework with 14 specialized agents covering target profiling, evidence acquisition, log/memory/container/cloud analysis, IOC extraction, and reporting.',
    sources: {
      agents: 'agentic/code/frameworks/forensics-complete/agents',
      commands: 'agentic/code/frameworks/forensics-complete/commands',
      skills: 'agentic/code/frameworks/forensics-complete/skills'
    },
    readme: `# AIWG Forensics Complete

Digital forensics and incident response framework with 14 specialized agents.

## Features

- **Triage & Acquisition**: RFC 3227 volatility-order capture, chain of custody, hash verification
- **Multi-Domain Analysis**: Logs, memory (Volatility 3), containers (Docker/K8s), cloud (AWS/Azure/GCP)
- **Threat Hunting**: Sigma rule application, IOC extraction in STIX 2.1 format
- **Reporting**: Executive summaries, technical findings, MITRE ATT&CK mapping, remediation plans

## Quick Start

\`\`\`bash
# Full investigation workflow
/forensics-investigate

# Quick triage
/forensics-triage

# Build target profile
/forensics-profile

# Generate forensic report
/forensics-report
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/forensics
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'security-engineering': {
    name: 'security-engineering',
    displayName: 'AIWG Security Engineering',
    version: '2026.5.0',
    description: 'Applied security framework for cryptographic primitive selection, chain-of-trust design, authentication factor analysis, supply-chain trust, and physical-threat modeling. Complements OWASP-style application audits.',
    sources: {
      agents: 'agentic/code/frameworks/security-engineering/agents',
      commands: 'agentic/code/frameworks/security-engineering/commands',
      skills: 'agentic/code/frameworks/security-engineering/skills'
    },
    readme: `# AIWG Security Engineering

Applied security engineering framework for cryptographic primitive selection, chain-of-trust integrity, and physical-threat modeling.

## Features

- **Applied Cryptography Review**: AEAD selection, KDF correctness, key separation, openssl flag verification
- **Chain-of-Trust Design**: Bootstrap integrity, signing key custody, measured boot
- **Authentication Factor Design**: have/know/are mapping, coercion-resistance, FIDO2 PIN/UV policy
- **Supply-Chain Trust**: Beyond CVE/SBOM — pinning depth, reproducible builds, firmware version locking
- **Physical Threat Modeling**: Evil-maid, DMA, hostile peripherals, cold-boot, side-channel

## Agents

- \`applied-cryptographer\` - Crypto primitive selection and KDF correctness
- \`secure-bootstrap-reviewer\` - Chain-of-trust integrity

## Quick Start

\`\`\`bash
# Crypto primitive selection
/crypto-primitive-selection

# Chain-of-trust design
/chain-of-trust-design

# Auth factor design
/auth-factor-design
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/security-engineering
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'research': {
    name: 'research',
    displayName: 'AIWG Research Complete',
    version: '2026.5.0',
    description: 'Research workflow framework with 9 specialized agents for discovery, acquisition, synthesis, citation management, GRADE quality assessment, and OAIS-compliant archival.',
    sources: {
      agents: 'agentic/code/frameworks/research-complete/agents',
      commands: 'agentic/code/frameworks/research-complete/commands',
      skills: 'agentic/code/frameworks/research-complete/skills'
    },
    readme: `# AIWG Research Complete

Research workflow framework with 9 specialized agents for academic and technical research.

## Features

- **Discovery**: Multi-database search, gap detection, reproducible search strategies
- **Acquisition**: PDF download, metadata extraction, provenance tracking
- **Synthesis**: Literature notes, structured summaries, citation networks
- **Quality (GRADE)**: Source quality assessment, FAIR compliance, hedging enforcement
- **Archival (OAIS)**: Long-term preservation, integrity verification, version control
- **Citation Management**: 9,000+ styles, reference verification, hallucination detection

## Quick Start

\`\`\`bash
# Discover sources
/research-discover

# Run full pipeline
/research-workflow

# Verify citations
/verify-citations

# Generate corpus snapshot
/corpus-snapshot
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/research
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'media-curator': {
    name: 'media-curator',
    displayName: 'AIWG Media Curator',
    version: '2026.5.0',
    description: 'Media archive management framework with 7 specialized agents for source discovery, acquisition (yt-dlp / Internet Archive / Bandcamp), quality assessment, metadata tagging, and provenance tracking.',
    sources: {
      agents: 'agentic/code/frameworks/media-curator/agents',
      commands: 'agentic/code/frameworks/media-curator/commands',
      skills: 'agentic/code/frameworks/media-curator/skills'
    },
    readme: `# AIWG Media Curator

Media archive management framework with 7 specialized agents.

## Features

- **Discography Analysis**: Era identification, catalog structure
- **Source Discovery**: Multi-platform ranking (YouTube, Internet Archive, Bandcamp)
- **Acquisition**: yt-dlp patterns, archive download, format selection
- **Quality Filtering**: Audio/video quality scoring, accept/reject thresholds
- **Metadata Curation**: opustags / ffmpeg patterns, cover art embedding
- **Provenance Tracking**: W3C PROV-O derivation chains
- **Export**: Plex / Jellyfin / MPD / archival formats

## Quick Start

\`\`\`bash
# Full curation workflow
/curate

# Acquire from sources
/acquire

# Tag a collection
/tag-collection

# Verify archive integrity
/verify-archive
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/media-curator
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'ops': {
    name: 'ops',
    displayName: 'AIWG Ops Complete',
    version: '2026.5.0',
    description: 'Operational infrastructure framework with 12 specialized agents covering incident response, runbook execution, fleet inventory, certificate lifecycle, and disaster recovery planning.',
    sources: {
      agents: 'agentic/code/frameworks/ops-complete/agents',
      commands: 'agentic/code/frameworks/ops-complete/commands',
      skills: 'agentic/code/frameworks/ops-complete/skills'
    },
    readme: `# AIWG Ops Complete

Operational infrastructure framework with 12 specialized agents for sysops, devops, and itops workflows.

## Features

- **Fleet Inventory**: Reconcile hosts, services, network resources
- **Runbook Execution**: Step-by-step with verification gates and audit trails
- **Incident Response**: Triage, escalation, post-mortem
- **Certificate Lifecycle**: Issuance, renewal, revocation, expiry monitoring
- **Disaster Recovery**: Topology-aware runbook generation with RTO budgets
- **Identity & Secrets**: IdP audits, OpenBao/Vault operations, key rotation
- **Stream Health**: Transcoder, output, service availability monitoring

## Quick Start

\`\`\`bash
# Manage ops workspaces
/ops

# Execute a runbook
/ops-run

# Health check fleet
/ops-status
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/ops
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'knowledge-base': {
    name: 'knowledge-base',
    displayName: 'AIWG Knowledge Base',
    version: '2026.5.0',
    description: 'Knowledge-base / wiki framework with skills for ingestion, query, and lint. Build a structured, citable corpus with cross-references and concept pages.',
    sources: {
      skills: 'agentic/code/frameworks/knowledge-base/skills'
    },
    readme: `# AIWG Knowledge Base

Knowledge-base / wiki framework for structured corpus authoring.

## Features

- **Source Ingestion**: URL, file, or freeform note → entity + concept pages
- **Query**: Search the local KB, synthesize answers with inline citations
- **Health & Lint**: Orphan page detection, broken wiki-links, stale claims, index regeneration

## Skills

- \`kb-ingest\`: Ingest a source into the knowledge base
- \`kb-health\`: Lint and health-check the KB

## Quick Start

\`\`\`bash
# Ingest a source
/kb-ingest "https://example.com/article"

# Health check
/kb-health
\`\`\`

## Documentation

- Full guide: https://docs.aiwg.io/knowledge-base
- Discord: https://discord.gg/BuAusFMxdA
`
  },

  'hooks': {
    name: 'hooks',
    displayName: 'AIWG Hooks',
    version: '1.0.0',
    description: 'Claude Code hooks for workflow tracing and observability.',
    sources: {
      hooks: 'agentic/code/addons/aiwg-hooks/hooks'
    },
    extraCopy: [
      { from: 'agentic/code/addons/aiwg-hooks/scripts', to: 'scripts' }
    ],
    readme: `# AIWG Hooks

Claude Code hooks for workflow tracing and observability.

## Features

- **Workflow Tracing**: Capture multi-agent workflow traces
- **JSONL Output**: Streaming data for analysis
- **Session Management**: Track session state across interactions
- **Timeline Visualization**: Understand workflow execution

## Hooks

- \`SessionStart\`: Initialize tracing on session start
- \`PostToolUse\`: Capture tool execution results
- \`AgentComplete\`: Record agent completion status

## Quick Start

Install the plugin and hooks are automatically active.

Traces are written to \`.aiwg/traces/\` in JSONL format.

## Documentation

- Full guide: https://docs.aiwg.io/hooks
- Discord: https://discord.gg/BuAusFMxdA
`
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    plugin: null,
    clean: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--plugin':
      case '-p':
        options.plugin = args[++i];
        break;
      case '--provider':
        options.provider = args[++i];
        break;
      case '--clean':
      case '-c':
        options.clean = true;
        break;
      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
AIWG Plugin Packager

Usage:
  node tools/plugin/package-plugins.mjs [options]

Options:
  --all, -a             Package all plugins
  --plugin, -p NAME     Package specific plugin
  --provider NAME       Package for a specific provider
                        (claude, codex, cursor, factory, openclaw, all)
                        Default: claude
  --clean, -c           Clean plugins directory before packaging
  --dry-run, -n         Show what would be done without writing
  --help, -h            Show this help message

Examples:
  node tools/plugin/package-plugins.mjs --all
  node tools/plugin/package-plugins.mjs --plugin sdlc
  node tools/plugin/package-plugins.mjs --all --provider codex
  node tools/plugin/package-plugins.mjs --plugin sdlc --provider cursor
  node tools/plugin/package-plugins.mjs --all --provider all --clean
`);
        process.exit(0);
    }
  }

  return options;
}

// Copy directory recursively
function copyDir(src, dest, dryRun = false, filter = null) {
  const srcPath = path.join(ROOT_DIR, src);

  if (!fs.existsSync(srcPath)) {
    console.log(`  ⚠️  Source not found: ${src}`);
    return 0;
  }

  if (!dryRun) {
    fs.mkdirSync(dest, { recursive: true });
  }

  let copied = 0;
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcFile = path.join(srcPath, entry.name);
    const destFile = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copied += copyDir(path.join(src, entry.name), destFile, dryRun, filter);
    } else {
      // Apply filter if provided
      if (filter) {
        const baseName = path.basename(entry.name, '.md');
        if (!filter.includes(baseName)) {
          continue;
        }
      }

      if (dryRun) {
        console.log(`    Would copy: ${entry.name}`);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
      copied++;
    }
  }

  return copied;
}

// Clean plugin directory (except .claude-plugin)
function cleanPlugin(pluginDir) {
  if (!fs.existsSync(pluginDir)) return;

  const entries = fs.readdirSync(pluginDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.claude-plugin') continue;

    const fullPath = path.join(pluginDir, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

// Package a single plugin
function packagePlugin(name, config, options) {
  console.log(`\n📦 Packaging ${config.displayName}...`);

  const pluginDir = path.join(PLUGINS_DIR, name);

  if (options.clean) {
    console.log('  🧹 Cleaning existing files...');
    if (!options.dryRun) {
      cleanPlugin(pluginDir);
    }
  }

  // Copy sources
  for (const [type, srcPath] of Object.entries(config.sources || {})) {
    const destPath = path.join(pluginDir, type);
    console.log(`  📁 Copying ${type}...`);

    const filter = type === 'agents' && config.agentFilter ? config.agentFilter : null;
    const count = copyDir(srcPath, destPath, options.dryRun, filter);
    console.log(`     ${count} files`);
  }

  // Copy extra files
  for (const extra of config.extraCopy || []) {
    const destPath = path.join(pluginDir, extra.to);
    console.log(`  📁 Copying ${extra.to}...`);
    const count = copyDir(extra.from, destPath, options.dryRun);
    console.log(`     ${count} files`);
  }

  // Write README
  if (config.readme && !options.dryRun) {
    const readmePath = path.join(pluginDir, 'README.md');
    fs.writeFileSync(readmePath, config.readme);
    console.log('  📄 Created README.md');
  }

  console.log(`  ✅ ${config.displayName} packaged successfully`);
}

// Package a Codex-format plugin (generates .codex-plugin/plugin.json + marketplace.json)
async function packageCodexPlugin(name, config, options) {
  console.log(`\n📦 Packaging ${config.displayName} (Codex plugin format)...`);

  const { generatePluginBundle } = await import(
    path.join(ROOT_DIR, 'tools/agents/providers/codex.mjs')
  );

  generatePluginBundle(ROOT_DIR, {
    dryRun: options.dryRun,
    srcRoot: ROOT_DIR
  });

  // Copy sources into the plugin directory for self-containment
  const pluginDir = path.join(PLUGINS_DIR, name);
  for (const [type, srcPath] of Object.entries(config.sources || {})) {
    const destPath = path.join(pluginDir, type);
    console.log(`  📁 Copying ${type}...`);
    const count = copyDir(srcPath, destPath, options.dryRun);
    console.log(`     ${count} files`);
  }

  // Write README
  if (config.readme && !options.dryRun) {
    const readmePath = path.join(pluginDir, 'README.md');
    fs.writeFileSync(readmePath, config.readme);
    console.log('  📄 Created README.md');
  }

  console.log(`  ✅ ${config.displayName} packaged successfully`);
}

// Package a plugin for a generic provider that exposes generatePluginBundle().
// Used for cursor, factory, openclaw. The provider's generator writes the
// manifest (e.g. .cursor-plugin/plugin.json, .factory-plugin/plugin.json,
// clawhub.json) and this function copies the framework sources alongside.
async function packageProviderPlugin(name, config, options, provider) {
  console.log(`\n📦 Packaging ${config.displayName} (${provider} plugin format)...`);

  const providerModule = await import(
    path.join(ROOT_DIR, `tools/agents/providers/${provider}.mjs`)
  );

  if (typeof providerModule.generatePluginBundle !== 'function') {
    throw new Error(`Provider '${provider}' does not export generatePluginBundle()`);
  }

  const pluginDir = path.join(PLUGINS_DIR, name);

  providerModule.generatePluginBundle(pluginDir, {
    dryRun: options.dryRun,
    srcRoot: ROOT_DIR,
    name: `aiwg-${name}`,
    description: config.description,
  });

  // Copy sources into the plugin directory
  for (const [type, srcPath] of Object.entries(config.sources || {})) {
    const destPath = path.join(pluginDir, type);
    console.log(`  📁 Copying ${type}...`);
    const count = copyDir(srcPath, destPath, options.dryRun);
    console.log(`     ${count} files`);
  }

  // Write README
  if (config.readme && !options.dryRun) {
    const readmePath = path.join(pluginDir, 'README.md');
    fs.writeFileSync(readmePath, config.readme);
    console.log('  📄 Created README.md');
  }

  console.log(`  ✅ ${config.displayName} packaged successfully (${provider})`);
}

// Write a root Codex marketplace.json that aggregates all plugins with
// Codex pluginType. This is the project-level manifest Codex looks for
// when it opens the project.
function writeCodexMarketplaceManifest(options) {
  const codexPlugins = Object.entries(PLUGIN_CONFIGS)
    .filter(([, config]) => config.pluginType === 'codex' || config.supportsCodex !== false)
    .map(([pluginName, config]) => ({
      name: pluginName,
      source: { source: 'local', path: `./plugins/${pluginName}` },
      policy: {
        installation: 'AVAILABLE',
        authentication: 'ON_INSTALL',
      },
      category: config.category || 'Productivity',
      description: config.description,
    }));

  const manifest = {
    name: 'aiwg',
    interface: { displayName: 'AIWG Framework' },
    plugins: codexPlugins,
  };

  const manifestDir = path.join(ROOT_DIR, '.agents', 'plugins');
  const manifestPath = path.join(manifestDir, 'marketplace.json');

  if (options.dryRun) {
    console.log(`\n[dry-run] Would write Codex marketplace: ${manifestPath}`);
    console.log(`  ${codexPlugins.length} plugins`);
    return;
  }

  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`\n✓ Wrote Codex project marketplace: ${manifestPath} (${codexPlugins.length} plugins)`);
}

// Main function
async function main() {
  const options = parseArgs();

  if (!options.all && !options.plugin) {
    console.log('Please specify --all or --plugin NAME');
    console.log('Use --help for more information');
    process.exit(1);
  }

  console.log('🚀 AIWG Plugin Packager');
  console.log(`   Root: ${ROOT_DIR}`);
  console.log(`   Output: ${PLUGINS_DIR}`);

  if (options.dryRun) {
    console.log('   Mode: DRY RUN (no files will be changed)');
  }

  // Resolve provider selection
  const PROVIDER_PLUGIN_FORMATS = ['claude', 'codex', 'cursor', 'factory', 'openclaw'];
  const requestedProvider = options.provider || 'claude';
  let providersToRun;

  if (requestedProvider === 'all') {
    providersToRun = PROVIDER_PLUGIN_FORMATS;
  } else if (PROVIDER_PLUGIN_FORMATS.includes(requestedProvider)) {
    providersToRun = [requestedProvider];
  } else {
    console.error(`Unknown provider: ${requestedProvider}`);
    console.log(`Available providers: ${PROVIDER_PLUGIN_FORMATS.join(', ')}, all`);
    process.exit(1);
  }

  console.log(`   Providers: ${providersToRun.join(', ')}`);

  // Determine which plugins to package
  const pluginsToPackage = options.plugin
    ? [[options.plugin, PLUGIN_CONFIGS[options.plugin]]].filter(([, c]) => c)
    : Object.entries(PLUGIN_CONFIGS);

  if (options.plugin && !PLUGIN_CONFIGS[options.plugin]) {
    console.error(`Unknown plugin: ${options.plugin}`);
    console.log(`Available plugins: ${Object.keys(PLUGIN_CONFIGS).join(', ')}`);
    process.exit(1);
  }

  // Package for each (provider, plugin) combination
  for (const provider of providersToRun) {
    for (const [name, config] of pluginsToPackage) {
      // Respect the legacy pluginType flag when selecting defaults:
      // if pluginType is set and provider is 'claude' (default), skip this
      // plugin for claude and route it to its declared pluginType instead.
      const effectiveProvider =
        provider === 'claude' && config.pluginType ? config.pluginType : provider;

      if (effectiveProvider === 'claude') {
        packagePlugin(name, config, options);
      } else if (effectiveProvider === 'codex') {
        await packageCodexPlugin(name, config, options);
      } else {
        // cursor, factory, openclaw — generic provider plugin bundle
        await packageProviderPlugin(name, config, options, effectiveProvider);
      }
    }

    // After packaging for Codex, also write the root marketplace.json
    if (provider === 'codex' || (provider === 'claude' && pluginsToPackage.some(([, c]) => c.pluginType === 'codex'))) {
      writeCodexMarketplaceManifest(options);
    }
  }

  console.log('\n✨ Done!');
  console.log('\nTo test locally:');
  console.log('  /plugin marketplace add ./plugins         # Claude Code');
  console.log('  /plugin install sdlc@aiwg');
  console.log('\nFor other providers:');
  console.log('  aiwg use sdlc --provider codex            # Codex (reads .agents/plugins/marketplace.json)');
  console.log('  aiwg use sdlc --provider cursor           # Cursor (manual install from .cursor-plugin/)');
  console.log('  aiwg use sdlc --provider factory          # Factory (git-URL install from .factory-plugin/)');
  console.log('  aiwg use sdlc --provider openclaw         # OpenClaw (ClawHub publish pending)');
}

main().catch(console.error);
