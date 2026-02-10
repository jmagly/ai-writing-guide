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
    description: 'Complete SDLC framework with 58 specialized agents for software development lifecycle management.',
    sources: {
      agents: 'agentic/code/frameworks/sdlc-complete/agents',
      commands: 'agentic/code/frameworks/sdlc-complete/commands',
      skills: 'agentic/code/frameworks/sdlc-complete/skills'
    },
    readme: `# AIWG SDLC Complete

Complete Software Development Lifecycle framework with 58 specialized agents.

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
  --all, -a          Package all plugins
  --plugin, -p NAME  Package specific plugin
  --clean, -c        Clean plugins directory before packaging
  --dry-run, -n      Show what would be copied without copying
  --help, -h         Show this help message

Examples:
  node tools/plugin/package-plugins.mjs --all
  node tools/plugin/package-plugins.mjs --plugin aiwg-sdlc
  node tools/plugin/package-plugins.mjs --all --clean
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

  if (options.all) {
    for (const [name, config] of Object.entries(PLUGIN_CONFIGS)) {
      packagePlugin(name, config, options);
    }
  } else if (options.plugin) {
    const config = PLUGIN_CONFIGS[options.plugin];
    if (!config) {
      console.error(`Unknown plugin: ${options.plugin}`);
      console.log(`Available plugins: ${Object.keys(PLUGIN_CONFIGS).join(', ')}`);
      process.exit(1);
    }
    packagePlugin(options.plugin, config, options);
  }

  console.log('\n✨ Done!');
  console.log('\nTo test locally:');
  console.log('  /plugin marketplace add ./plugins');
  console.log('  /plugin install sdlc@aiwg');
}

main().catch(console.error);
