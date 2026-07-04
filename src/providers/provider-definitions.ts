import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';
import type { Platform } from '../agents/types.js';
import {
  getProviderCapabilities,
  type DeployTarget,
  type ProviderStatus,
} from './capability-matrix.js';

export type ProviderSurface = {
  primary: string;
  compatibility: string[];
  precedence: string[];
  related: ProviderRelatedSurface[];
};

export type ProviderSurfaceRelationship = 'same-provider' | 'shared-adapter' | 'future-provider' | 'companion-standard';

export type ProviderSurfacePathMap = {
  rules: string[];
  skills: string[];
  agentsMd: string[];
  legacy: string[];
};

export type ProviderRelatedSurface = {
  id: string;
  displayName: string;
  relationship: ProviderSurfaceRelationship;
  deployable: boolean;
  aliases: string[];
  paths: ProviderSurfacePathMap;
  notes: string[];
};

export type ProviderDetection = {
  env: string[];
  process: string[];
  capabilityId: string;
  runtimeEnvPriority?: number;
};

export type ProviderArtifactPaths = Record<'agents' | 'commands' | 'skills' | 'rules' | 'behaviors', string | null>;
export type ProviderArtifactPathStrings = Record<'agents' | 'commands' | 'skills' | 'rules' | 'behaviors', string>;
export type ProviderContextDiscoveryPaths = Record<'agents' | 'skills' | 'rules' | 'behaviors', string | null>;
export type ProviderContextDiscoveryPathStrings = Record<'agents' | 'skills' | 'rules' | 'behaviors', string>;

export type ProviderContextFiles = {
  aiwgMd: boolean;
  agentsMd: boolean;
  claudeMdHook: boolean;
  hookFile: string | null;
  contextFile: string | null;
};

export type ProviderPaths = {
  deployTarget: DeployTarget;
  artifacts: ProviderArtifactPaths;
  kernelSkills: string | null;
  contextDiscovery: ProviderContextDiscoveryPaths;
  configFile: string | null;
  contextFiles: ProviderContextFiles;
};

export type ProviderSmithPaths = {
  agents: string | null;
  commands: string | null;
  skills: string | null;
  rules: string | null;
  fileExtension: '.md' | '.json';
  configFile: string | null;
  aggregated: boolean;
};

export type ProviderSkillNamespace = {
  deploymentGroup: 'deep-recursion' | 'one-level' | 'mcp-skip';
  pathType: 'project' | 'home-dir';
  skillsBaseDir: string;
  subdirLayout: boolean;
  maxNameLength?: number;
  maxDescriptionLength?: number;
  appendToDescription?: string;
};

export type ProviderAdapters = {
  agentFormat: string;
  hookBridge: string | null;
  mcpInjection: string | null;
  contextAggregation: string | null;
  ruleFormat: string | null;
};

export interface ProviderDefinition {
  id: Platform;
  displayName: string;
  aliases: string[];
  status: ProviderStatus;
  builtIn: boolean;
  surfaces: ProviderSurface;
  detection: ProviderDetection;
  paths: ProviderPaths;
  smithPaths: ProviderSmithPaths;
  skillNamespace: ProviderSkillNamespace;
  adapters: ProviderAdapters;
  capabilities: {
    matrixRef: string | null;
    nativeFeatures: Record<string, boolean>;
    emulation: Record<string, string | null>;
  };
}

const ArtifactPathsSchema = z.object({
  agents: z.string().nullable(),
  commands: z.string().nullable(),
  skills: z.string().nullable(),
  rules: z.string().nullable(),
  behaviors: z.string().nullable(),
});

const ProviderDefinitionSchema = z.object({
  id: z.enum([
    'claude',
    'codex',
    'copilot',
    'cursor',
    'factory',
    'hermes',
    'opencode',
    'openclaw',
    'openhuman',
    'warp',
    'windsurf',
    'generic',
  ]),
  displayName: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  status: z.enum(['stable', 'experimental', 'deprecated']),
  builtIn: z.boolean(),
  surfaces: z.object({
    primary: z.string().min(1),
    compatibility: z.array(z.string().min(1)),
    precedence: z.array(z.string().min(1)),
    related: z.array(z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      relationship: z.enum(['same-provider', 'shared-adapter', 'future-provider', 'companion-standard']),
      deployable: z.boolean(),
      aliases: z.array(z.string().min(1)),
      paths: z.object({
        rules: z.array(z.string().min(1)),
        skills: z.array(z.string().min(1)),
        agentsMd: z.array(z.string().min(1)),
        legacy: z.array(z.string().min(1)),
      }),
      notes: z.array(z.string().min(1)),
    })),
  }),
  detection: z.object({
    env: z.array(z.string().min(1)),
    process: z.array(z.string().min(1)),
    capabilityId: z.string().min(1),
    runtimeEnvPriority: z.number().int().positive().optional(),
  }),
  paths: z.object({
    deployTarget: z.enum(['project', 'home', 'mixed']),
    artifacts: ArtifactPathsSchema,
    kernelSkills: z.string().nullable(),
    contextDiscovery: z.object({
      agents: z.string().nullable(),
      skills: z.string().nullable(),
      rules: z.string().nullable(),
      behaviors: z.string().nullable(),
    }),
    configFile: z.string().nullable(),
    contextFiles: z.object({
      aiwgMd: z.boolean(),
      agentsMd: z.boolean(),
      claudeMdHook: z.boolean(),
      hookFile: z.string().nullable(),
      contextFile: z.string().nullable(),
    }),
  }),
  smithPaths: z.object({
    agents: z.string().nullable(),
    commands: z.string().nullable(),
    skills: z.string().nullable(),
    rules: z.string().nullable(),
    fileExtension: z.enum(['.md', '.json']),
    configFile: z.string().nullable(),
    aggregated: z.boolean(),
  }),
  skillNamespace: z.object({
    deploymentGroup: z.enum(['deep-recursion', 'one-level', 'mcp-skip']),
    pathType: z.enum(['project', 'home-dir']),
    skillsBaseDir: z.string().min(1),
    subdirLayout: z.boolean(),
    maxNameLength: z.number().int().positive().optional(),
    maxDescriptionLength: z.number().int().positive().optional(),
    appendToDescription: z.string().min(1).optional(),
  }),
  adapters: z.object({
    agentFormat: z.string().min(1),
    hookBridge: z.string().nullable(),
    mcpInjection: z.string().nullable(),
    contextAggregation: z.string().nullable(),
    ruleFormat: z.string().nullable(),
  }),
  capabilities: z.object({
    matrixRef: z.string().nullable(),
    nativeFeatures: z.record(z.boolean()),
    emulation: z.record(z.string().nullable()),
  }),
}) satisfies z.ZodType<ProviderDefinition>;

const PROVIDER_IDS: Platform[] = [
  'claude',
  'codex',
  'copilot',
  'cursor',
  'factory',
  'hermes',
  'opencode',
  'openclaw',
  'openhuman',
  'warp',
  'windsurf',
  'generic',
];

type BuiltInSeed = Omit<ProviderDefinition, 'displayName' | 'status' | 'paths' | 'capabilities'> & {
  displayName?: string;
  status?: ProviderStatus;
  paths: Omit<ProviderPaths, 'deployTarget' | 'contextDiscovery'> & {
    deployTarget?: DeployTarget;
    contextDiscovery?: ProviderContextDiscoveryPaths;
  };
  matrixRef: string | null;
};

const BUILT_IN_SEEDS: BuiltInSeed[] = [
  {
    id: 'claude',
    displayName: 'Claude Code',
    aliases: ['claude-code'],
    builtIn: true,
    surfaces: { primary: 'claude-code', compatibility: ['claude'], precedence: ['.claude/', 'CLAUDE.md'], related: [] },
    detection: {
      env: ['CLAUDE_CODE_VERSION', 'ANTHROPIC_API_KEY'],
      process: ['claude-code', 'claude'],
      capabilityId: 'claude-code',
      runtimeEnvPriority: 100,
    },
    paths: {
      artifacts: {
        agents: '.claude/agents',
        commands: '.claude/commands',
        skills: '.claude/.aiwg/skills',
        rules: '.claude/rules',
        behaviors: '.claude/hooks',
      },
      kernelSkills: '.claude/skills',
      configFile: 'CLAUDE.md',
      contextFiles: { aiwgMd: true, agentsMd: false, claudeMdHook: true, hookFile: null, contextFile: 'CLAUDE.md' },
    },
    smithPaths: {
      agents: '.claude/agents',
      commands: '.claude/commands',
      skills: '.claude/skills',
      rules: '.claude/rules',
      fileExtension: '.md',
      configFile: 'CLAUDE.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.claude/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'claude-markdown',
      hookBridge: null,
      mcpInjection: 'claude-code',
      contextAggregation: 'claude-hook',
      ruleFormat: 'markdown',
    },
    matrixRef: 'claude-code',
  },
  {
    id: 'codex',
    aliases: ['openai'],
    builtIn: true,
    surfaces: { primary: 'codex', compatibility: ['openai'], precedence: ['.agents/skills/', '.codex/'], related: [] },
    detection: {
      env: ['CODEX_SANDBOX', 'CODEX_HOME', 'CODEX_API_KEY', 'OPENAI_API_KEY'],
      process: ['@openai/codex', 'codex'],
      capabilityId: 'codex',
      runtimeEnvPriority: 10,
    },
    paths: {
      artifacts: {
        agents: '.codex/agents',
        commands: '.codex/commands',
        skills: '.codex/.aiwg/skills',
        rules: '.codex/rules',
        behaviors: '.codex/rules',
      },
      kernelSkills: '.agents/skills',
      contextDiscovery: {
        agents: '.codex/agents',
        skills: '.agents/skills',
        rules: '.codex/rules',
        behaviors: null,
      },
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: '.codex/agents',
      commands: '.codex/commands',
      skills: '.codex/skills',
      rules: '.codex/rules',
      fileExtension: '.md',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'home-dir',
      skillsBaseDir: '.codex/skills',
      maxNameLength: 100,
      maxDescriptionLength: 500,
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'codex-markdown',
      hookBridge: 'codex',
      mcpInjection: 'codex',
      contextAggregation: 'agents-md',
      ruleFormat: 'markdown',
    },
    matrixRef: 'codex',
  },
  {
    id: 'copilot',
    aliases: ['github-copilot'],
    builtIn: true,
    surfaces: { primary: 'copilot', compatibility: ['github-copilot'], precedence: ['.github/'], related: [] },
    detection: {
      env: ['COPILOT_AGENT', 'GITHUB_COPILOT_TOKEN'],
      process: ['copilot'],
      capabilityId: 'copilot',
      runtimeEnvPriority: 50,
    },
    paths: {
      artifacts: {
        agents: '.github/agents',
        commands: '.github/commands',
        skills: '.github/.aiwg/skills',
        rules: '.github/copilot-rules',
        behaviors: '.github/copilot-rules',
      },
      kernelSkills: '.github/skills',
      contextDiscovery: {
        agents: '.github/agents',
        skills: '.github/.aiwg/skills',
        rules: '.github/instructions',
        behaviors: null,
      },
      configFile: 'copilot-instructions.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: '.github/agents',
      commands: '.github/agents',
      skills: '.github/skills',
      rules: '.github/copilot-rules',
      fileExtension: '.md',
      configFile: 'copilot-instructions.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.github/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'copilot-markdown',
      hookBridge: 'copilot',
      mcpInjection: null,
      contextAggregation: 'agents-md',
      ruleFormat: 'markdown',
    },
    matrixRef: 'copilot',
  },
  {
    id: 'cursor',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'cursor', compatibility: [], precedence: ['AGENTS.md', '.cursor/rules/'], related: [] },
    detection: {
      env: ['CURSOR_TRACE_ID', 'CURSOR_VERSION'],
      process: ['cursor'],
      capabilityId: 'cursor',
      runtimeEnvPriority: 20,
    },
    paths: {
      artifacts: {
        agents: '.cursor/agents',
        commands: '.cursor/commands',
        skills: '.cursor/.aiwg/skills',
        rules: '.cursor/rules',
        behaviors: '.cursor/rules',
      },
      kernelSkills: '.cursor/skills',
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: '.cursor/agents',
      commands: '.cursor/commands',
      skills: '.cursor/skills',
      rules: '.cursor/rules',
      fileExtension: '.json',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.cursor/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'cursor-json',
      hookBridge: null,
      mcpInjection: 'cursor',
      contextAggregation: 'agents-md',
      ruleFormat: 'mdc',
    },
    matrixRef: 'cursor',
  },
  {
    id: 'factory',
    aliases: ['factory-ai'],
    builtIn: true,
    surfaces: { primary: 'factory', compatibility: ['factory-ai'], precedence: ['.factory/', 'AGENTS.md'], related: [] },
    detection: {
      env: ['FACTORY_AGENT_ID'],
      process: ['factory'],
      capabilityId: 'factory',
      runtimeEnvPriority: 80,
    },
    paths: {
      artifacts: {
        agents: '.factory/droids',
        commands: '.factory/commands',
        skills: '.factory/.aiwg/skills',
        rules: '.factory/rules',
        behaviors: '.factory/rules',
      },
      kernelSkills: '.factory/skills',
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: '.factory/droids',
      commands: '.factory/commands',
      skills: '.factory/skills',
      rules: '.factory/rules',
      fileExtension: '.md',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.factory/skills',
      appendToDescription: 'Use when relevant to the task.',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'factory-droid',
      hookBridge: 'factory',
      mcpInjection: 'factory',
      contextAggregation: 'agents-md',
      ruleFormat: 'markdown',
    },
    matrixRef: 'factory',
  },
  {
    id: 'hermes',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'hermes', compatibility: [], precedence: ['AGENTS.md', '.hermes.md', '~/.hermes/skills/'], related: [] },
    detection: {
      env: [],
      process: ['hermes'],
      capabilityId: 'hermes',
    },
    paths: {
      artifacts: {
        agents: null,
        commands: null,
        skills: '~/.hermes/.aiwg/skills',
        rules: null,
        behaviors: null,
      },
      kernelSkills: '~/.hermes/skills',
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: '.hermes.md', contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: null,
      commands: null,
      skills: '~/.hermes/skills',
      rules: null,
      fileExtension: '.md',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'mcp-skip',
      pathType: 'home-dir',
      skillsBaseDir: '.hermes/skills',
      subdirLayout: false,
    },
    adapters: {
      agentFormat: 'agents-md',
      hookBridge: 'hermes',
      mcpInjection: null,
      contextAggregation: 'agents-md',
      ruleFormat: 'agents-md-section',
    },
    matrixRef: 'hermes',
  },
  {
    id: 'opencode',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'opencode', compatibility: [], precedence: ['.opencode/', 'AGENTS.md'], related: [] },
    detection: {
      env: ['OPENCODE_VERSION'],
      process: ['opencode'],
      capabilityId: 'opencode',
      runtimeEnvPriority: 90,
    },
    paths: {
      artifacts: {
        agents: '.opencode/agent',
        commands: '.opencode/command',
        skills: '.opencode/.aiwg/skill',
        rules: '.opencode/rule',
        behaviors: '.opencode/rule',
      },
      kernelSkills: '.opencode/skill',
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: null,
      commands: '.opencode/command',
      skills: '.opencode/skill',
      rules: '.opencode/rule',
      fileExtension: '.md',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.opencode/skill',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'opencode-markdown',
      hookBridge: null,
      mcpInjection: 'opencode',
      contextAggregation: 'agents-md',
      ruleFormat: 'markdown',
    },
    matrixRef: 'opencode',
  },
  {
    id: 'openclaw',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'openclaw', compatibility: [], precedence: ['~/.openclaw/'], related: [] },
    detection: {
      env: ['OPENCLAW_VERSION'],
      process: ['openclaw'],
      capabilityId: 'openclaw',
      runtimeEnvPriority: 60,
    },
    paths: {
      deployTarget: 'home',
      artifacts: {
        agents: '~/.openclaw/agents',
        commands: '~/.openclaw/commands',
        skills: '~/.openclaw/.aiwg/skills',
        rules: '~/.openclaw/rules',
        behaviors: '~/.openclaw/behaviors',
      },
      kernelSkills: '~/.openclaw/skills/aiwg',
      configFile: 'AGENTS.md',
      contextFiles: { aiwgMd: false, agentsMd: false, claudeMdHook: false, hookFile: null, contextFile: '~/.openclaw/config.yaml' },
    },
    smithPaths: {
      agents: '~/.openclaw/agents',
      commands: '~/.openclaw/commands',
      skills: '~/.openclaw/skills',
      rules: '~/.openclaw/rules',
      fileExtension: '.md',
      configFile: 'AGENTS.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'home-dir',
      skillsBaseDir: '.openclaw/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'openclaw-markdown',
      hookBridge: null,
      mcpInjection: null,
      contextAggregation: null,
      ruleFormat: 'markdown',
    },
    matrixRef: 'openclaw',
  },
  {
    id: 'openhuman',
    aliases: ['tinyhumansai'],
    builtIn: true,
    surfaces: { primary: 'openhuman', compatibility: ['tinyhumansai'], precedence: ['~/.openhuman/skills/', 'AGENTS.md'], related: [] },
    detection: {
      env: ['OPENHUMAN_HOME', 'OPENHUMAN_CORE_TOKEN'],
      process: ['openhuman'],
      capabilityId: 'openhuman',
      runtimeEnvPriority: 70,
    },
    paths: {
      deployTarget: 'mixed',
      artifacts: {
        agents: null,
        commands: null,
        skills: '~/.openhuman/.aiwg/skills',
        rules: '~/.openhuman/.aiwg/rules',
        behaviors: null,
      },
      kernelSkills: '~/.openhuman/skills',
      contextDiscovery: {
        agents: '.agents/agents',
        skills: '~/.openhuman/.aiwg/skills',
        rules: '~/.openhuman/.aiwg/rules',
        behaviors: null,
      },
      configFile: null,
      contextFiles: { aiwgMd: false, agentsMd: false, claudeMdHook: false, hookFile: null, contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: null,
      commands: null,
      skills: '~/.openhuman/skills',
      rules: '~/.openhuman/.aiwg/rules',
      fileExtension: '.md',
      configFile: null,
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'home-dir',
      skillsBaseDir: '.openhuman/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'openhuman-agents-md',
      hookBridge: null,
      mcpInjection: null,
      contextAggregation: 'agents-md',
      ruleFormat: 'agents-md-section',
    },
    matrixRef: 'openhuman',
  },
  {
    id: 'warp',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'warp', compatibility: [], precedence: ['WARP.md', '.warp/'], related: [] },
    detection: {
      env: ['WARP_SESSION_ID', 'WARP_TERMINAL'],
      process: ['warp'],
      capabilityId: 'warp',
      runtimeEnvPriority: 40,
    },
    paths: {
      artifacts: {
        agents: '.warp/agents',
        commands: '.warp/commands',
        skills: '.warp/.aiwg/skills',
        rules: '.warp/rules',
        behaviors: null,
      },
      kernelSkills: '.warp/skills',
      configFile: 'WARP.md',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: 'AIWG-warp.md', contextFile: 'WARP.md' },
    },
    smithPaths: {
      agents: '.warp/agents',
      commands: '.warp/commands',
      skills: '.warp/skills',
      rules: '.warp/rules',
      fileExtension: '.md',
      configFile: 'WARP.md',
      aggregated: true,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: '.warp/skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'warp-markdown',
      hookBridge: null,
      mcpInjection: 'warp',
      contextAggregation: 'warp-md',
      ruleFormat: 'markdown',
    },
    matrixRef: 'warp',
  },
  {
    id: 'windsurf',
    aliases: ['devin-desktop', 'devin-local', 'cascade'],
    builtIn: true,
    surfaces: {
      primary: 'windsurf',
      compatibility: ['devin-desktop', 'devin-local', 'cascade'],
      precedence: ['.devin/rules/', '.windsurf/rules/', 'AGENTS.md', '.windsurfrules'],
      related: [
        {
          id: 'devin-desktop',
          displayName: 'Devin Desktop',
          relationship: 'same-provider',
          deployable: true,
          aliases: ['windsurf', 'cascade'],
          paths: {
            rules: ['.devin/rules/*.md', '.windsurf/rules/*.md'],
            skills: [],
            agentsMd: ['AGENTS.md', 'agents.md'],
            legacy: ['.windsurfrules'],
          },
          notes: [
            'Devin Desktop is the renamed Windsurf local IDE surface; --provider windsurf remains the deployable compatibility id.',
            '.devin/rules is preferred by Devin Desktop, but AIWG keeps .devin/ as ignored local provider output and currently emits the compatibility surface through .windsurf/ plus AGENTS.md.',
          ],
        },
        {
          id: 'devin-cli',
          displayName: 'Devin CLI',
          relationship: 'future-provider',
          deployable: false,
          aliases: [],
          paths: {
            rules: ['AGENTS.md', 'AGENTS.local.md', 'AGENT.md', '.windsurfrules', 'CLAUDE.md'],
            skills: ['.devin/skills/<skill-name>/SKILL.md', '.windsurf/skills/<skill-name>/SKILL.md'],
            agentsMd: ['AGENTS.md'],
            legacy: ['.windsurfrules'],
          },
          notes: [
            'Devin CLI has distinct rules and skills surfaces and should not normalize to windsurf until a dedicated provider behavior issue adds writer support.',
          ],
        },
        {
          id: 'devin-product-skills',
          displayName: 'Devin Product Skills',
          relationship: 'companion-standard',
          deployable: false,
          aliases: [],
          paths: {
            rules: [],
            skills: ['.agents/skills/<skill-name>/SKILL.md'],
            agentsMd: [],
            legacy: [],
          },
          notes: [
            'Devin product skills use the Agent Skills layout and are recorded here as a readable surface, not as current AIWG windsurf deploy output.',
          ],
        },
      ],
    },
    detection: {
      env: ['WINDSURF_VERSION'],
      process: ['windsurf'],
      capabilityId: 'windsurf',
      runtimeEnvPriority: 30,
    },
    paths: {
      artifacts: {
        agents: '.windsurf/agents',
        commands: '.windsurf/workflows',
        skills: '.windsurf/.aiwg/skills',
        rules: '.windsurf/rules',
        behaviors: '.windsurf/rules',
      },
      kernelSkills: '.windsurf/skills',
      configFile: '.windsurfrules',
      contextFiles: { aiwgMd: true, agentsMd: true, claudeMdHook: false, hookFile: 'AIWG-windsurf.md', contextFile: 'AGENTS.md' },
    },
    smithPaths: {
      agents: '.windsurf/agents',
      commands: '.windsurf/workflows',
      skills: '.windsurf/skills',
      rules: '.windsurf/rules',
      fileExtension: '.md',
      configFile: '.windsurfrules',
      aggregated: true,
    },
    skillNamespace: {
      deploymentGroup: 'one-level',
      pathType: 'project',
      skillsBaseDir: '.windsurf/skills',
      subdirLayout: false,
    },
    adapters: {
      agentFormat: 'windsurf-markdown',
      hookBridge: null,
      mcpInjection: 'windsurf',
      contextAggregation: 'agents-md',
      ruleFormat: 'windsurf-rule',
    },
    matrixRef: 'windsurf',
  },
  {
    id: 'generic',
    displayName: 'Generic',
    status: 'stable',
    aliases: [],
    builtIn: true,
    surfaces: { primary: 'generic', compatibility: [], precedence: ['agents/', 'skills/', 'rules/'], related: [] },
    detection: {
      env: [],
      process: [],
      capabilityId: 'generic',
    },
    paths: {
      deployTarget: 'project',
      artifacts: {
        agents: 'agents',
        commands: 'commands',
        skills: 'skills',
        rules: 'rules',
        behaviors: null,
      },
      kernelSkills: null,
      configFile: 'README.md',
      contextFiles: { aiwgMd: false, agentsMd: false, claudeMdHook: false, hookFile: null, contextFile: 'README.md' },
    },
    smithPaths: {
      agents: 'agents',
      commands: 'commands',
      skills: 'skills',
      rules: 'rules',
      fileExtension: '.md',
      configFile: 'README.md',
      aggregated: false,
    },
    skillNamespace: {
      deploymentGroup: 'deep-recursion',
      pathType: 'project',
      skillsBaseDir: 'skills',
      subdirLayout: true,
    },
    adapters: {
      agentFormat: 'generic-markdown',
      hookBridge: null,
      mcpInjection: null,
      contextAggregation: null,
      ruleFormat: 'markdown',
    },
    matrixRef: null,
  },
];

let cachedRegistry: Map<Platform, ProviderDefinition> | null = null;

function buildDefinition(seed: BuiltInSeed): ProviderDefinition {
  const capabilities = seed.matrixRef ? getProviderCapabilities(seed.matrixRef) : undefined;
  const contextDiscovery = seed.paths.contextDiscovery ?? {
    agents: seed.paths.artifacts.agents,
    skills: seed.paths.artifacts.skills,
    rules: seed.paths.artifacts.rules,
    behaviors: null,
  };
  const definition: ProviderDefinition = {
    ...seed,
    displayName: seed.displayName ?? capabilities?.display_name ?? seed.id,
    status: seed.status ?? capabilities?.status ?? 'experimental',
    paths: {
      ...seed.paths,
      deployTarget: seed.paths.deployTarget ?? capabilities?.deploy_target ?? 'project',
      contextDiscovery,
    },
    capabilities: {
      matrixRef: seed.matrixRef,
      nativeFeatures: capabilities?.native_features ?? {},
      emulation: capabilities?.emulation ?? {},
    },
  };
  return ProviderDefinitionSchema.parse(definition);
}

function assertNoDuplicateAliases(definitions: ProviderDefinition[]): void {
  const seen = new Map<string, Platform>();
  for (const definition of definitions) {
    for (const candidate of [definition.id, ...definition.aliases]) {
      const normalized = candidate.toLowerCase();
      const existing = seen.get(normalized);
      if (existing && existing !== definition.id) {
        throw new Error(`Provider alias "${candidate}" is declared by both ${existing} and ${definition.id}`);
      }
      seen.set(normalized, definition.id);
    }
  }
}

export function listProviderDefinitions(): ProviderDefinition[] {
  if (!cachedRegistry) {
    const definitions = BUILT_IN_SEEDS.map(buildDefinition);
    assertNoDuplicateAliases(definitions);
    cachedRegistry = new Map(definitions.map((definition) => [definition.id, definition]));
  }
  return PROVIDER_IDS.map((id) => {
    const definition = cachedRegistry?.get(id);
    if (!definition) throw new Error(`Missing provider definition for ${id}`);
    return definition;
  });
}

export function loadProviderDefinitionRegistry(): ReadonlyMap<Platform, ProviderDefinition> {
  listProviderDefinitions();
  return cachedRegistry as ReadonlyMap<Platform, ProviderDefinition>;
}

export function getProviderDefinition(provider: string | null | undefined): ProviderDefinition | undefined {
  const normalized = normalizeProviderDefinitionId(provider);
  if (!normalized) return undefined;
  return loadProviderDefinitionRegistry().get(normalized);
}

export function expandProviderHomePath(providerPath: string | null): string {
  if (!providerPath) return '';
  if (providerPath === '~') return homedir();
  if (providerPath.startsWith('~/')) return join(homedir(), providerPath.slice(2));
  return providerPath;
}

export function getProviderArtifactPathStrings(provider: string | null | undefined): ProviderArtifactPathStrings | undefined {
  const definition = getProviderDefinition(provider);
  if (!definition) return undefined;
  return {
    agents: expandProviderHomePath(definition.paths.artifacts.agents),
    commands: expandProviderHomePath(definition.paths.artifacts.commands),
    skills: expandProviderHomePath(definition.paths.artifacts.skills),
    rules: expandProviderHomePath(definition.paths.artifacts.rules),
    behaviors: expandProviderHomePath(definition.paths.artifacts.behaviors),
  };
}

export function getProviderContextDiscoveryPathStrings(
  provider: string | null | undefined
): ProviderContextDiscoveryPathStrings | undefined {
  const definition = getProviderDefinition(provider);
  if (!definition) return undefined;
  return {
    agents: expandProviderHomePath(definition.paths.contextDiscovery.agents),
    skills: expandProviderHomePath(definition.paths.contextDiscovery.skills),
    rules: expandProviderHomePath(definition.paths.contextDiscovery.rules),
    behaviors: expandProviderHomePath(definition.paths.contextDiscovery.behaviors),
  };
}

export function getProviderKernelSkillPath(provider: string | null | undefined): string {
  const definition = getProviderDefinition(provider);
  return expandProviderHomePath(definition?.paths.kernelSkills ?? null);
}

export function resolveProviderPathValue(providerPath: string | null, projectPath: string): string {
  const expandedPath = expandProviderHomePath(providerPath);
  if (!expandedPath) return '';
  if (expandedPath.startsWith('/')) return expandedPath;
  return join(projectPath, expandedPath);
}

export function normalizeProviderDefinitionId(provider: string | null | undefined): Platform | null {
  const normalized = provider?.trim().toLowerCase();
  if (!normalized) return null;
  for (const definition of listProviderDefinitions()) {
    if (definition.id === normalized || definition.aliases.includes(normalized)) return definition.id;
  }
  return null;
}

export function validateProviderDefinitionRegistry(): ProviderDefinition[] {
  return listProviderDefinitions();
}
