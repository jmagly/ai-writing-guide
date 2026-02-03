/**
 * Command Extension Definitions
 *
 * Defines Extension objects for all CLI commands. Maps command handlers to the
 * unified Extension schema for discovery, semantic search, and help generation.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @architecture @.aiwg/architecture/unified-extension-schema.md
 * @source @src/cli/handlers/index.ts
 * @tests @test/unit/extensions/commands/definitions.test.ts
 * @issue #42
 */

import type { Extension, CommandMetadata } from '../types.js';

// ============================================
// Individual Command Definitions
// ============================================

// Maintenance Commands

export const helpCommand: Extension = {
  id: 'help',
  type: 'command',
  name: 'Help',
  description: 'Show all CLI commands, arguments, and usage examples',
  version: '1.0.0',
  capabilities: ['cli', 'help', 'documentation'],
  keywords: ['help', 'usage', 'commands', 'documentation'],
  category: 'maintenance',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: [],
  } satisfies CommandMetadata,
};

export const versionCommand: Extension = {
  id: 'version',
  type: 'command',
  name: 'Version',
  description: 'Show version and channel information',
  version: '1.0.0',
  capabilities: ['cli', 'version', 'info'],
  keywords: ['version', 'info', 'channel'],
  category: 'maintenance',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

export const doctorCommand: Extension = {
  id: 'doctor',
  type: 'command',
  name: 'Doctor',
  description: 'Check installation health and diagnose issues',
  version: '1.0.0',
  capabilities: ['cli', 'diagnostics', 'health-check'],
  keywords: ['doctor', 'health', 'diagnostics', 'troubleshooting'],
  category: 'maintenance',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

export const updateCommand: Extension = {
  id: 'update',
  type: 'command',
  name: 'Update',
  description: 'Check for and apply updates',
  version: '1.0.0',
  capabilities: ['cli', 'update', 'maintenance'],
  keywords: ['update', 'upgrade', 'maintenance'],
  category: 'maintenance',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Bash'],
  } satisfies CommandMetadata,
};

// Framework Management Commands

export const useCommand: Extension = {
  id: 'use',
  type: 'command',
  name: 'Use',
  description: 'Deploy SDLC, marketing, or writing framework to workspace',
  version: '1.0.0',
  capabilities: ['cli', 'framework', 'deployment'],
  keywords: ['framework', 'install', 'deploy', 'use'],
  category: 'framework',
  platforms: {
    claude: 'full',
    copilot: 'full',
    factory: 'full',
    cursor: 'full',
    windsurf: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<framework>',
    allowedTools: ['Read', 'Write', 'Bash', 'Glob'],
    executionSteps: [
      'Validate framework name',
      'Check dependencies',
      'Deploy framework files',
      'Register in framework registry',
      'Deploy platform-specific adaptations',
    ],
  } satisfies CommandMetadata,
};

export const listCommand: Extension = {
  id: 'list',
  type: 'command',
  name: 'List',
  description: 'List installed frameworks and addons',
  version: '1.0.0',
  capabilities: ['cli', 'framework', 'query'],
  keywords: ['list', 'frameworks', 'addons', 'installed'],
  category: 'framework',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

export const removeCommand: Extension = {
  id: 'remove',
  type: 'command',
  name: 'Remove',
  description: 'Remove a framework or addon',
  version: '1.0.0',
  capabilities: ['cli', 'framework', 'uninstall'],
  keywords: ['remove', 'uninstall', 'framework', 'addon'],
  category: 'framework',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<id>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

// Project Setup Commands

export const newCommand: Extension = {
  id: 'new',
  type: 'command',
  name: 'New Project',
  description: 'Scaffold new project with .aiwg/ directory and templates',
  version: '1.0.0',
  capabilities: ['cli', 'project', 'scaffolding'],
  keywords: ['new', 'project', 'create', 'init', 'scaffold'],
  category: 'project',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    allowedTools: ['Read', 'Write', 'Bash'],
    executionSteps: [
      'Create .aiwg/ directory structure',
      'Deploy SDLC templates',
      'Deploy agents',
      'Initialize framework registry',
    ],
  } satisfies CommandMetadata,
};

// Workspace Management Commands

export const statusCommand: Extension = {
  id: 'status',
  type: 'command',
  name: 'Status',
  description: 'Show workspace health, installed frameworks, and artifacts',
  version: '1.0.0',
  capabilities: ['cli', 'workspace', 'status'],
  keywords: ['status', 'workspace', 'health', 'info'],
  category: 'workspace',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

export const migrateWorkspaceCommand: Extension = {
  id: 'migrate-workspace',
  type: 'command',
  name: 'Migrate Workspace',
  description: 'Upgrade .aiwg/ structure to support multi-framework layout',
  version: '1.0.0',
  capabilities: ['cli', 'workspace', 'migration'],
  keywords: ['migrate', 'workspace', 'migration', 'upgrade'],
  category: 'workspace',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const rollbackWorkspaceCommand: Extension = {
  id: 'rollback-workspace',
  type: 'command',
  name: 'Rollback Workspace',
  description: 'Restore workspace to pre-migration state from backup',
  version: '1.0.0',
  capabilities: ['cli', 'workspace', 'rollback'],
  keywords: ['rollback', 'workspace', 'restore', 'backup'],
  category: 'workspace',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

// MCP Commands

export const mcpCommand: Extension = {
  id: 'mcp',
  type: 'command',
  name: 'MCP',
  description: 'MCP server operations (serve, install, info)',
  version: '1.0.0',
  capabilities: ['cli', 'mcp', 'server'],
  keywords: ['mcp', 'server', 'protocol'],
  category: 'mcp',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<subcommand>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

// Catalog Commands

export const catalogCommand: Extension = {
  id: 'catalog',
  type: 'command',
  name: 'Catalog',
  description: 'Model catalog operations (list, info, search)',
  version: '1.0.0',
  capabilities: ['cli', 'catalog', 'models'],
  keywords: ['catalog', 'models', 'search', 'info'],
  category: 'catalog',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<subcommand>',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

// Toolsmith Commands

export const runtimeInfoCommand: Extension = {
  id: 'runtime-info',
  type: 'command',
  name: 'Runtime Info',
  description: 'Display runtime environment, available tools, and capabilities',
  version: '1.0.0',
  capabilities: ['cli', 'toolsmith', 'discovery'],
  keywords: ['runtime', 'info', 'discovery', 'tools'],
  category: 'toolsmith',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

// Utility Commands

export const prefillCardsCommand: Extension = {
  id: 'prefill-cards',
  type: 'command',
  name: 'Prefill Cards',
  description: 'Auto-populate SDLC artifact metadata from team configuration',
  version: '1.0.0',
  capabilities: ['cli', 'sdlc', 'automation'],
  keywords: ['prefill', 'cards', 'sdlc', 'metadata'],
  category: 'utility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'transformation',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const contributeStartCommand: Extension = {
  id: 'contribute-start',
  type: 'command',
  name: 'Contribute Start',
  description: 'Initialize contribution with branch, issue tracking, and DCO',
  version: '1.0.0',
  capabilities: ['cli', 'contribution', 'workflow'],
  keywords: ['contribute', 'contribution', 'workflow'],
  category: 'utility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const validateMetadataCommand: Extension = {
  id: 'validate-metadata',
  type: 'command',
  name: 'Validate Metadata',
  description: 'Validate extension metadata against schema requirements',
  version: '1.0.0',
  capabilities: ['cli', 'validation', 'metadata'],
  keywords: ['validate', 'metadata', 'quality'],
  category: 'utility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

// Plugin Commands

export const installPluginCommand: Extension = {
  id: 'install-plugin',
  type: 'command',
  name: 'Install Plugin',
  description: 'Install Claude Code plugin',
  version: '1.0.0',
  capabilities: ['cli', 'plugin', 'install'],
  keywords: ['install', 'plugin', 'claude'],
  category: 'plugin',
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const uninstallPluginCommand: Extension = {
  id: 'uninstall-plugin',
  type: 'command',
  name: 'Uninstall Plugin',
  description: 'Uninstall Claude Code plugin',
  version: '1.0.0',
  capabilities: ['cli', 'plugin', 'uninstall'],
  keywords: ['uninstall', 'plugin', 'claude'],
  category: 'plugin',
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const pluginStatusCommand: Extension = {
  id: 'plugin-status',
  type: 'command',
  name: 'Plugin Status',
  description: 'Show Claude Code plugin status',
  version: '1.0.0',
  capabilities: ['cli', 'plugin', 'status'],
  keywords: ['status', 'plugin', 'claude'],
  category: 'plugin',
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

export const packagePluginCommand: Extension = {
  id: 'package-plugin',
  type: 'command',
  name: 'Package Plugin',
  description: 'Bundle plugin for Claude Code marketplace distribution',
  version: '1.0.0',
  capabilities: ['cli', 'plugin', 'packaging'],
  keywords: ['package', 'plugin', 'marketplace'],
  category: 'plugin',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const packageAllPluginsCommand: Extension = {
  id: 'package-all-plugins',
  type: 'command',
  name: 'Package All Plugins',
  description: 'Bundle all plugins for marketplace in batch operation',
  version: '1.0.0',
  capabilities: ['cli', 'plugin', 'packaging'],
  keywords: ['package', 'plugin', 'marketplace', 'all'],
  category: 'plugin',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

// Scaffolding Commands

export const addAgentCommand: Extension = {
  id: 'add-agent',
  type: 'command',
  name: 'Add Agent',
  description: 'Add agent to addon/framework',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'agent'],
  keywords: ['add', 'agent', 'scaffold', 'create'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const addCommandCommand: Extension = {
  id: 'add-command',
  type: 'command',
  name: 'Add Command',
  description: 'Add command to addon/framework',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'command'],
  keywords: ['add', 'command', 'scaffold', 'create'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const addSkillCommand: Extension = {
  id: 'add-skill',
  type: 'command',
  name: 'Add Skill',
  description: 'Add skill to addon/framework',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'skill'],
  keywords: ['add', 'skill', 'scaffold', 'create'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const addTemplateCommand: Extension = {
  id: 'add-template',
  type: 'command',
  name: 'Add Template',
  description: 'Add template to addon/framework',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'template'],
  keywords: ['add', 'template', 'scaffold', 'create'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const scaffoldAddonCommand: Extension = {
  id: 'scaffold-addon',
  type: 'command',
  name: 'Scaffold Addon',
  description: 'Create new addon package',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'addon'],
  keywords: ['scaffold', 'addon', 'create', 'package'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const scaffoldExtensionCommand: Extension = {
  id: 'scaffold-extension',
  type: 'command',
  name: 'Scaffold Extension',
  description: 'Create new extension package',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'extension'],
  keywords: ['scaffold', 'extension', 'create', 'package'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const scaffoldFrameworkCommand: Extension = {
  id: 'scaffold-framework',
  type: 'command',
  name: 'Scaffold Framework',
  description: 'Create new framework package',
  version: '1.0.0',
  capabilities: ['cli', 'scaffolding', 'framework'],
  keywords: ['scaffold', 'framework', 'create', 'package'],
  category: 'scaffolding',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<name>',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

// Ralph Commands

export const ralphCommand: Extension = {
  id: 'ralph',
  type: 'command',
  name: 'Ralph',
  description: 'Start Ralph task execution loop',
  version: '1.0.0',
  capabilities: ['cli', 'ralph', 'orchestration'],
  keywords: ['ralph', 'loop', 'task', 'orchestration'],
  category: 'ralph',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<task-description>',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const ralphStatusCommand: Extension = {
  id: 'ralph-status',
  type: 'command',
  name: 'Ralph Status',
  description: 'Show Ralph loop status',
  version: '1.0.0',
  capabilities: ['cli', 'ralph', 'status'],
  keywords: ['ralph', 'status', 'info'],
  category: 'ralph',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

export const ralphAbortCommand: Extension = {
  id: 'ralph-abort',
  type: 'command',
  name: 'Ralph Abort',
  description: 'Abort running Ralph loop',
  version: '1.0.0',
  capabilities: ['cli', 'ralph', 'control'],
  keywords: ['ralph', 'abort', 'stop', 'cancel'],
  category: 'ralph',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const ralphResumeCommand: Extension = {
  id: 'ralph-resume',
  type: 'command',
  name: 'Ralph Resume',
  description: 'Resume paused Ralph loop',
  version: '1.0.0',
  capabilities: ['cli', 'ralph', 'control'],
  keywords: ['ralph', 'resume', 'continue'],
  category: 'ralph',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: true,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

// Cost & Metrics Commands

export const costReportCommand: Extension = {
  id: 'cost-report',
  type: 'command',
  name: 'Cost Report',
  description: 'Generate token cost and spending report for workflows',
  version: '1.0.0',
  capabilities: ['cli', 'metrics', 'cost-tracking', 'reporting'],
  keywords: ['cost', 'report', 'tokens', 'spending', 'budget', 'metrics'],
  category: 'metrics',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

export const costHistoryCommand: Extension = {
  id: 'cost-history',
  type: 'command',
  name: 'Cost History',
  description: 'Show historical cost data across workflow sessions',
  version: '1.0.0',
  capabilities: ['cli', 'metrics', 'cost-tracking', 'history'],
  keywords: ['cost', 'history', 'trends', 'spending', 'budget'],
  category: 'metrics',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read'],
  } satisfies CommandMetadata,
};

export const metricsTokensCommand: Extension = {
  id: 'metrics-tokens',
  type: 'command',
  name: 'Metrics Tokens',
  description: 'Analyze token efficiency and compare to MetaGPT baseline',
  version: '1.0.0',
  capabilities: ['cli', 'metrics', 'token-efficiency', 'analysis'],
  keywords: ['metrics', 'tokens', 'efficiency', 'baseline', 'metagpt'],
  category: 'metrics',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

// Reproducibility Commands

export const executionModeCommand: Extension = {
  id: 'execution-mode',
  type: 'command',
  name: 'Execution Mode',
  description: 'Set reproducibility mode for deterministic workflow execution',
  version: '1.0.0',
  capabilities: ['cli', 'reproducibility', 'configuration', 'execution-mode'],
  keywords: ['execution', 'mode', 'strict', 'seeded', 'reproducibility', 'determinism'],
  category: 'reproducibility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<mode> [--seed <value>]',
    allowedTools: ['Read', 'Write'],
  } satisfies CommandMetadata,
};

export const snapshotCommand: Extension = {
  id: 'snapshot',
  type: 'command',
  name: 'Snapshot',
  description: 'Capture, list, or replay workflow execution snapshots',
  version: '1.0.0',
  capabilities: ['cli', 'reproducibility', 'snapshot', 'replay'],
  keywords: ['snapshot', 'replay', 'capture', 'execution', 'reproducibility'],
  category: 'reproducibility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<list|show|capture> [options]',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const checkpointCommand: Extension = {
  id: 'checkpoint',
  type: 'command',
  name: 'Checkpoint',
  description: 'Create, list, or restore workflow checkpoints for recovery',
  version: '1.0.0',
  capabilities: ['cli', 'reproducibility', 'checkpoint', 'recovery'],
  keywords: ['checkpoint', 'recovery', 'restore', 'state', 'reproducibility'],
  category: 'reproducibility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<list|recover|create> [options]',
    allowedTools: ['Read', 'Write', 'Bash'],
  } satisfies CommandMetadata,
};

export const reproducibilityValidateCommand: Extension = {
  id: 'reproducibility-validate',
  type: 'command',
  name: 'Reproducibility Validate',
  description: 'Verify workflow outputs match across multiple execution runs',
  version: '1.0.0',
  capabilities: ['cli', 'reproducibility', 'validation', 'compliance'],
  keywords: ['reproducibility', 'validate', 'verify', 'compare', 'compliance'],
  category: 'reproducibility',
  platforms: {
    claude: 'full',
    generic: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '<workflow-id> [--runs <count>] [--threshold <value>]',
    allowedTools: ['Read', 'Bash'],
  } satisfies CommandMetadata,
};

// ============================================
// Aggregated Exports
// ============================================

/**
 * All command definitions (40 total)
 *
 * Organized by category:
 * - Maintenance (4): help, version, doctor, update
 * - Framework (3): use, list, remove
 * - Project (1): new
 * - Workspace (3): status, migrate-workspace, rollback-workspace
 * - MCP (1): mcp
 * - Catalog (1): catalog
 * - Toolsmith (1): runtime-info
 * - Utility (3): prefill-cards, contribute-start, validate-metadata
 * - Plugin (5): install-plugin, uninstall-plugin, plugin-status, package-plugin, package-all-plugins
 * - Scaffolding (7): add-agent, add-command, add-skill, add-template, scaffold-addon, scaffold-extension, scaffold-framework
 * - Ralph (4): ralph, ralph-status, ralph-abort, ralph-resume
 * - Metrics (3): cost-report, cost-history, metrics-tokens
 * - Reproducibility (4): execution-mode, snapshot, checkpoint, reproducibility-validate
 */
export const commandDefinitions: Extension[] = [
  // Maintenance (4)
  helpCommand,
  versionCommand,
  doctorCommand,
  updateCommand,

  // Framework (3)
  useCommand,
  listCommand,
  removeCommand,

  // Project (1)
  newCommand,

  // Workspace (3)
  statusCommand,
  migrateWorkspaceCommand,
  rollbackWorkspaceCommand,

  // MCP (1)
  mcpCommand,

  // Catalog (1)
  catalogCommand,

  // Toolsmith (1)
  runtimeInfoCommand,

  // Utility (3)
  prefillCardsCommand,
  contributeStartCommand,
  validateMetadataCommand,

  // Plugin (5)
  installPluginCommand,
  uninstallPluginCommand,
  pluginStatusCommand,
  packagePluginCommand,
  packageAllPluginsCommand,

  // Scaffolding (7)
  addAgentCommand,
  addCommandCommand,
  addSkillCommand,
  addTemplateCommand,
  scaffoldAddonCommand,
  scaffoldExtensionCommand,
  scaffoldFrameworkCommand,

  // Ralph (4)
  ralphCommand,
  ralphStatusCommand,
  ralphAbortCommand,
  ralphResumeCommand,

  // Metrics (3)
  costReportCommand,
  costHistoryCommand,
  metricsTokensCommand,

  // Reproducibility (4)
  executionModeCommand,
  snapshotCommand,
  checkpointCommand,
  reproducibilityValidateCommand,
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get command definition by ID
 *
 * @param id - Command ID
 * @returns Command definition or undefined
 */
export function getCommandDefinition(id: string): Extension | undefined {
  return commandDefinitions.find((cmd) => cmd.id === id);
}

/**
 * Get command definitions by category
 *
 * @param category - Command category
 * @returns Array of matching command definitions
 */
export function getCommandsByCategory(category: string): Extension[] {
  return commandDefinitions.filter((cmd) => cmd.category === category);
}

/**
 * Get total command count
 *
 * @returns Total number of command definitions
 */
export function getCommandCount(): number {
  return commandDefinitions.length;
}

/**
 * Get all command IDs
 *
 * @returns Array of command IDs
 */
export function getCommandIds(): string[] {
  return commandDefinitions.map((cmd) => cmd.id);
}

/**
 * Search commands by keyword
 *
 * @param keyword - Keyword to search for
 * @returns Array of matching command definitions
 */
export function searchCommandsByKeyword(keyword: string): Extension[] {
  const lowercaseKeyword = keyword.toLowerCase();
  return commandDefinitions.filter((cmd) =>
    cmd.keywords.some((k) => k.toLowerCase().includes(lowercaseKeyword))
  );
}

/**
 * Search commands by capability
 *
 * @param capability - Capability to search for
 * @returns Array of matching command definitions
 */
export function searchCommandsByCapability(capability: string): Extension[] {
  const lowercaseCapability = capability.toLowerCase();
  return commandDefinitions.filter((cmd) =>
    cmd.capabilities.some((c) => c.toLowerCase().includes(lowercaseCapability))
  );
}
