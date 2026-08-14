import { homedir } from 'os';
import { resolve } from 'path';

const MCP_INJECTION_DEFINITIONS = [
  {
    id: 'claude',
    aliases: ['claude-code'],
    mcp: {
      providerId: 'claude-code',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'standard',
      serversKey: 'mcpServers',
      configPath: { scope: 'project', path: '.claude/settings.local.json' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'cursor',
    aliases: [],
    mcp: {
      providerId: 'cursor',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'standard',
      serversKey: 'mcpServers',
      configPath: { scope: 'project', path: '.cursor/mcp.json' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'factory',
    aliases: ['factory-ai'],
    mcp: {
      providerId: 'factory',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'factory',
      serversKey: 'mcpServers',
      configPath: { scope: 'home', path: '.factory/mcp.json' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'codex',
    aliases: ['openai'],
    mcp: {
      providerId: 'codex',
      acceptedProviderIds: ['openai'],
      includeInSupportedProviders: true,
      configFormat: 'toml',
      serverConfigFormat: 'toml',
      serversKey: null,
      configPath: { scope: 'home', path: '.codex/config.toml' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'opencode',
    aliases: [],
    mcp: {
      providerId: 'opencode',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'opencode',
      serversKey: 'mcp',
      configPath: { scope: 'project', path: 'opencode.json' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'windsurf',
    aliases: ['devin', 'devin-desktop', 'devin-local', 'cascade'],
    mcp: {
      providerId: 'windsurf',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'standard',
      serversKey: 'mcpServers',
      configPath: { scope: 'home', path: '.codeium/windsurf/mcp_config.json' },
      supportsEphemeral: true,
    },
  },
  {
    id: 'warp',
    aliases: [],
    mcp: {
      providerId: 'warp',
      includeInSupportedProviders: true,
      configFormat: 'json',
      serverConfigFormat: 'standard',
      serversKey: 'mcpServers',
      configPath: { scope: 'home', path: '.warp/mcp.json' },
      supportsEphemeral: false,
      unsupportedReason: 'Warp configures MCP servers via its UI only. No file-based ephemeral config is available.',
    },
  },
];

function allMcpProviderIds(definition) {
  return [
    definition.id,
    ...definition.aliases,
    definition.mcp.providerId,
    ...(definition.mcp.acceptedProviderIds || []),
  ];
}

export function listRuntimeProviderDefinitions() {
  return MCP_INJECTION_DEFINITIONS.map((definition) => ({
    ...definition,
    aliases: [...definition.aliases],
    mcp: {
      ...definition.mcp,
      acceptedProviderIds: [...(definition.mcp.acceptedProviderIds || [])],
      configPath: { ...definition.mcp.configPath },
    },
  }));
}

export function normalizeRuntimeProviderId(provider) {
  const candidate = provider?.trim().toLowerCase();
  if (!candidate) return null;

  for (const definition of MCP_INJECTION_DEFINITIONS) {
    if (allMcpProviderIds(definition).includes(candidate)) {
      return definition.mcp.providerId;
    }
  }

  return null;
}

export function getMcpInjectionDefinition(provider) {
  const normalized = normalizeRuntimeProviderId(provider);
  if (!normalized) return undefined;

  return MCP_INJECTION_DEFINITIONS
    .map((definition) => definition.mcp)
    .find((definition) => definition.providerId === normalized);
}

export function listMcpInjectProviderIds() {
  return MCP_INJECTION_DEFINITIONS
    .map((definition) => definition.mcp)
    .filter((definition) => definition.includeInSupportedProviders)
    .map((definition) => definition.providerId);
}

export function resolveMcpConfigPath(provider, projectDir = '.') {
  const definition = getMcpInjectionDefinition(provider);
  if (!definition) return '';

  const base = definition.configPath.scope === 'home'
    ? (process.env.HOME || process.env.USERPROFILE || homedir())
    : projectDir;

  return resolve(base, definition.configPath.path);
}
