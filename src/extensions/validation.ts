/**
 * Zod Validation Schemas for Extension Types
 *
 * Provides strict runtime validation for all extension types with helpful
 * error messages. Ensures extension manifests conform to the unified schema.
 *
 * @implements @.aiwg/requirements/use-cases/UC-003-extension-validation.md
 * @architecture @.aiwg/architecture/unified-extension-schema.md
 * @tests @test/unit/extensions/validation.test.ts
 * @version 1.0.0
 */

import { z } from 'zod';
import type {
  ExtensionType,
} from './types.js';

// ============================================
// Core Enums & Primitives
// ============================================

/**
 * Extension type discriminator
 */
export const ExtensionTypeSchema = z.enum([
  'agent',
  'command',
  'skill',
  'hook',
  'tool',
  'mcp-server',
  'framework',
  'addon',
  'template',
  'prompt',
]);

/**
 * Extension lifecycle status
 */
export const ExtensionStatusSchema = z.enum([
  'stable',
  'beta',
  'experimental',
  'deprecated',
  'archived',
]);

/**
 * Platform support level
 */
export const PlatformSupportSchema = z.enum([
  'full',
  'partial',
  'experimental',
  'none',
]);

/**
 * Hook lifecycle events
 */
export const HookEventSchema = z.enum([
  'pre-session',
  'post-session',
  'pre-command',
  'post-command',
  'pre-agent',
  'post-agent',
  'pre-write',
  'post-write',
  'pre-bash',
  'post-bash',
]);

// ============================================
// Shared Schemas
// ============================================

/**
 * Platform compatibility matrix
 */
export const PlatformCompatibilitySchema = z.object({
  claude: PlatformSupportSchema.optional(),
  factory: PlatformSupportSchema.optional(),
  cursor: PlatformSupportSchema.optional(),
  copilot: PlatformSupportSchema.optional(),
  windsurf: PlatformSupportSchema.optional(),
  codex: PlatformSupportSchema.optional(),
  opencode: PlatformSupportSchema.optional(),
  generic: PlatformSupportSchema.optional(),
}).refine(
  (data) => Object.values(data).some((val) => val !== undefined),
  { message: 'At least one platform must be specified' }
);

/**
 * Deployment configuration
 */
export const DeploymentConfigSchema = z.object({
  pathTemplate: z.string().min(1, 'Path template is required'),
  pathOverrides: z.record(z.string()).optional(),
  additionalFiles: z.array(z.string()).optional(),
  autoInstall: z.boolean().optional().default(false),
  core: z.boolean().optional().default(false),
});

/**
 * Deprecation information
 */
export const DeprecationSchema = z.object({
  date: z.string().datetime({ message: 'Date must be ISO 8601 format' }),
  successor: z.string().optional(),
  reason: z.string().min(1, 'Deprecation reason is required'),
});

/**
 * Installation state
 */
export const InstallationSchema = z.object({
  installedAt: z.string().datetime({ message: 'Install timestamp must be ISO 8601 format' }),
  installedFrom: z.enum(['builtin', 'registry', 'local', 'git']),
  installedPath: z.string().min(1),
  enabled: z.boolean(),
});

/**
 * Signature verification
 */
export const SignatureSchema = z.object({
  algorithm: z.enum(['pgp', 'ed25519']),
  value: z.string().min(1),
  publicKey: z.string().optional(),
});

// ============================================
// Type-Specific Metadata Schemas
// ============================================

/**
 * Agent-specific metadata
 */
export const AgentMetadataSchema = z.object({
  type: z.literal('agent'),
  role: z.string().min(1, 'Agent role is required'),
  model: z.object({
    tier: z.enum(['haiku', 'sonnet', 'opus']),
    override: z.string().optional(),
  }),
  tools: z.array(z.string()).min(1, 'At least one tool is required'),
  template: z.string().optional(),
  maxTools: z.number().int().positive().optional(),
  canDelegate: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  workflow: z.array(z.string()).optional(),
  expertise: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
});

/**
 * Command argument definition
 */
export const CommandArgumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
  type: z.enum(['string', 'number', 'boolean']),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  position: z.number().int().nonnegative().optional(),
});

/**
 * Command option definition
 */
export const CommandOptionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['string', 'boolean', 'number', 'array']),
  default: z.union([z.string(), z.boolean(), z.number()]).optional(),
  short: z.string().length(1).optional(),
  long: z.string().min(2).optional(),
});

/**
 * Command-specific metadata
 */
export const CommandMetadataSchema = z.object({
  type: z.literal('command'),
  template: z.enum(['utility', 'transformation', 'orchestration']),
  arguments: z.array(CommandArgumentSchema).optional(),
  options: z.array(CommandOptionSchema).optional(),
  argumentHint: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  model: z.string().optional(),
  executionSteps: z.array(z.string()).optional(),
  successCriteria: z.array(z.string()).optional(),
});

/**
 * Skill reference material
 */
export const SkillReferenceSchema = z.object({
  filename: z.string().min(1),
  description: z.string().min(1),
  path: z.string().min(1),
});

/**
 * Skill-specific metadata
 */
export const SkillMetadataSchema = z.object({
  type: z.literal('skill'),
  triggerPhrases: z.array(z.string()).min(1, 'At least one trigger phrase is required'),
  autoTrigger: z.boolean().optional().default(false),
  autoTriggerConditions: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  references: z.array(SkillReferenceSchema).optional(),
  inputRequirements: z.array(z.string()).optional(),
  outputFormat: z.string().optional(),
});

/**
 * Hook-specific metadata
 */
export const HookMetadataSchema = z.object({
  type: z.literal('hook'),
  event: HookEventSchema,
  priority: z.number().int().optional().default(100),
  canModify: z.boolean().optional().default(false),
  canBlock: z.boolean().optional().default(false),
  configSchema: z.record(z.unknown()).optional(),
});

/**
 * Tool-specific metadata
 */
export const ToolMetadataSchema = z.object({
  type: z.literal('tool'),
  category: z.enum(['core', 'languages', 'utilities', 'custom']),
  executable: z.string().min(1, 'Executable path is required'),
  verificationStatus: z.enum(['verified', 'unverified']).optional(),
  lastVerified: z.string().datetime().optional(),
  manPage: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  relatedTools: z.array(z.string()).optional(),
  platformNotes: z.record(z.string()).optional(),
  installHint: z.string().optional(),
});

/**
 * MCP tool summary
 */
export const MCPToolSummarySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  dangerous: z.boolean(),
});

/**
 * MCP Server-specific metadata
 */
export const MCPServerMetadataSchema = z.object({
  type: z.literal('mcp-server'),
  mcpVersion: z.string().min(1, 'MCP version is required'),
  transport: z.enum(['stdio', 'http']),
  port: z.number().int().positive().optional(),
  capabilities: z.object({
    tools: z.boolean(),
    resources: z.boolean(),
    prompts: z.boolean(),
    sampling: z.boolean(),
    logging: z.boolean(),
  }),
  sourceType: z.enum(['cli', 'api', 'catalog', 'nl', 'extension']),
  sourceCommand: z.string().optional(),
  sourceBaseUrl: z.string().url().optional(),
  workingDirectory: z.string().optional(),
  environment: z.record(z.string()).optional(),
  tools: z.array(MCPToolSummarySchema).optional(),
  resources: z.array(z.string()).optional(),
  prompts: z.array(z.string()).optional(),
});

/**
 * Framework-specific metadata
 */
export const FrameworkMetadataSchema = z.object({
  type: z.literal('framework'),
  domain: z.string().min(1, 'Framework domain is required'),
  includes: z.object({
    agents: z.array(z.string()).optional(),
    commands: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    hooks: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
    prompts: z.array(z.string()).optional(),
  }),
  configSchema: z.record(z.unknown()).optional(),
  defaultConfig: z.record(z.unknown()).optional(),
});

/**
 * Addon-specific metadata
 */
export const AddonMetadataSchema = z.object({
  type: z.literal('addon'),
  entry: z.object({
    agents: z.string().optional(),
    commands: z.string().optional(),
    skills: z.string().optional(),
    hooks: z.string().optional(),
    templates: z.string().optional(),
    prompts: z.string().optional(),
  }),
  provides: z.object({
    agents: z.array(z.string()).optional(),
    commands: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    hooks: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
    prompts: z.array(z.string()).optional(),
  }),
});

/**
 * Template variable definition
 */
export const TemplateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean(),
  default: z.unknown().optional(),
});

/**
 * Template-specific metadata
 */
export const TemplateMetadataSchema = z.object({
  type: z.literal('template'),
  format: z.string().min(1, 'Template format is required'),
  variables: z.array(TemplateVariableSchema).optional(),
  sections: z.array(z.string()).optional(),
  targetArtifact: z.string().optional(),
});

/**
 * Prompt-specific metadata
 */
export const PromptMetadataSchema = z.object({
  type: z.literal('prompt'),
  category: z.string().min(1, 'Prompt category is required'),
  purpose: z.string().min(1, 'Prompt purpose is required'),
  useWhen: z.array(z.string()).min(1, 'At least one use-when condition is required'),
  variables: z.array(z.string()).optional(),
  requiredContext: z.array(z.string()).optional(),
});

/**
 * Union of all type-specific metadata schemas
 */
export const ExtensionMetadataSchema = z.discriminatedUnion('type', [
  AgentMetadataSchema,
  CommandMetadataSchema,
  SkillMetadataSchema,
  HookMetadataSchema,
  ToolMetadataSchema,
  MCPServerMetadataSchema,
  FrameworkMetadataSchema,
  AddonMetadataSchema,
  TemplateMetadataSchema,
  PromptMetadataSchema,
]);

// ============================================
// Base Extension Schema
// ============================================

/**
 * Complete extension schema
 *
 * Validates all required and optional fields according to the unified schema.
 */
export const ExtensionSchema = z.object({
  // Core Identity
  id: z.string().regex(
    /^[a-z][a-z0-9-]*$/,
    'ID must be kebab-case (lowercase, hyphens only)'
  ),
  type: ExtensionTypeSchema,
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  version: z.string().regex(
    /^\d+\.\d+\.\d+/,
    'Version must be semver or CalVer format (e.g., 1.0.0 or 2026.1.5)'
  ),

  // Discovery & Classification
  capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  category: z.string().optional(),

  // Platform & Deployment
  platforms: PlatformCompatibilitySchema,
  deployment: DeploymentConfigSchema,

  // Dependencies & Requirements
  requires: z.array(z.string()).optional(),
  recommends: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),
  systemDependencies: z.record(z.string()).optional(),

  // Metadata & Documentation
  author: z.string().optional(),
  license: z.string().optional(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  bugs: z.string().url().optional(),
  documentation: z.record(z.string()).optional(),
  researchCompliance: z.record(z.array(z.string())).optional(),

  // Type-Specific Data
  metadata: ExtensionMetadataSchema,

  // Lifecycle & Status
  status: ExtensionStatusSchema.optional().default('stable'),
  deprecation: DeprecationSchema.optional(),
  installation: InstallationSchema.optional(),

  // Validation & Quality
  checksum: z.string().optional(),
  signature: SignatureSchema.optional(),
}).refine(
  (data) => data.type === data.metadata.type,
  { message: 'Extension type must match metadata type' }
);

// ============================================
// Type Inference
// ============================================

/**
 * Inferred Extension type from schema
 */
export type ValidatedExtension = z.infer<typeof ExtensionSchema>;

/**
 * Inferred metadata types
 */
export type ValidatedAgentMetadata = z.infer<typeof AgentMetadataSchema>;
export type ValidatedCommandMetadata = z.infer<typeof CommandMetadataSchema>;
export type ValidatedSkillMetadata = z.infer<typeof SkillMetadataSchema>;
export type ValidatedHookMetadata = z.infer<typeof HookMetadataSchema>;
export type ValidatedToolMetadata = z.infer<typeof ToolMetadataSchema>;
export type ValidatedMCPServerMetadata = z.infer<typeof MCPServerMetadataSchema>;
export type ValidatedFrameworkMetadata = z.infer<typeof FrameworkMetadataSchema>;
export type ValidatedAddonMetadata = z.infer<typeof AddonMetadataSchema>;
export type ValidatedTemplateMetadata = z.infer<typeof TemplateMetadataSchema>;
export type ValidatedPromptMetadata = z.infer<typeof PromptMetadataSchema>;

// ============================================
// Validation Functions
// ============================================

/**
 * Validation result for successful validations
 */
export interface ValidationSuccess {
  success: true;
  data: ValidatedExtension;
}

/**
 * Validation result for failed validations
 */
export interface ValidationFailure {
  success: false;
  errors: z.ZodError;
}

/**
 * Combined validation result type
 */
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validate an extension manifest
 *
 * @param data - Unknown data to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * const result = validateExtension(data);
 * if (result.success) {
 *   console.log('Valid extension:', result.data.name);
 * } else {
 *   console.error('Validation errors:', result.errors.format());
 * }
 * ```
 */
export function validateExtension(data: unknown): ValidationResult {
  const result = ExtensionSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error,
    };
  }
}

/**
 * Type guard to check if data is a valid extension
 *
 * @param data - Unknown data to check
 * @returns True if data is a valid extension
 *
 * @example
 * ```typescript
 * if (isValidExtension(data)) {
 *   // TypeScript knows data is ValidatedExtension here
 *   console.log(data.name);
 * }
 * ```
 */
export function isValidExtension(data: unknown): data is ValidatedExtension {
  return ExtensionSchema.safeParse(data).success;
}

/**
 * Validate and throw on error
 *
 * Use this when you want validation errors to propagate as exceptions.
 *
 * @param data - Unknown data to validate
 * @returns Validated extension data
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const extension = validateExtensionStrict(data);
 *   console.log('Valid extension:', extension.name);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Validation failed:', error.format());
 *   }
 * }
 * ```
 */
export function validateExtensionStrict(data: unknown): ValidatedExtension {
  return ExtensionSchema.parse(data);
}

/**
 * Validate extension metadata only
 *
 * Useful for validating type-specific metadata in isolation.
 *
 * @param data - Unknown metadata to validate
 * @returns Validation result
 */
export function validateExtensionMetadata(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ExtensionMetadataSchema>;
  errors?: z.ZodError;
} {
  const result = ExtensionMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Format validation errors for display
 *
 * Converts Zod errors into human-readable messages.
 *
 * @param errors - Zod validation errors
 * @returns Formatted error messages
 *
 * @example
 * ```typescript
 * const result = validateExtension(data);
 * if (!result.success) {
 *   const messages = formatValidationErrors(result.errors);
 *   console.error('Validation failed:\n' + messages.join('\n'));
 * }
 * ```
 */
export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}

/**
 * Check if extension matches expected type
 *
 * Type-safe way to validate extension type before accessing type-specific fields.
 *
 * @param extension - Validated extension
 * @param type - Expected extension type
 * @returns True if extension matches type
 *
 * @example
 * ```typescript
 * if (isExtensionType(extension, 'agent')) {
 *   // TypeScript narrows metadata to AgentMetadata
 *   console.log(extension.metadata.role);
 * }
 * ```
 */
export function isExtensionType<T extends ExtensionType>(
  extension: ValidatedExtension,
  type: T
): boolean {
  return extension.type === type && extension.metadata.type === type;
}
