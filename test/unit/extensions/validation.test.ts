/**
 * Unit Tests for Extension Validation Schemas
 *
 * Tests Zod schemas for all extension types with valid and invalid cases.
 *
 * @source @src/extensions/validation.ts
 * @architecture @.aiwg/architecture/unified-extension-schema.md
 * @requirement @.aiwg/requirements/use-cases/UC-003-extension-validation.md
 */

import { describe, it, expect } from 'vitest';
import {
  validateExtension,
  isValidExtension,
  validateExtensionStrict,
  validateExtensionMetadata,
  formatValidationErrors,
  isExtensionType,
  ExtensionSchema,
  AgentMetadataSchema,
  CommandMetadataSchema,
  SkillMetadataSchema,
  PlatformCompatibilitySchema,
  DeploymentConfigSchema,
} from '../../../src/extensions/validation.js';
import type { Extension } from '../../../src/extensions/types.js';
import { ZodError } from 'zod';

// ============================================
// Test Fixtures
// ============================================

const validAgentExtension: Extension = {
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Designs RESTful APIs with OpenAPI specifications',
  version: '1.0.0',
  capabilities: ['api-design', 'openapi', 'rest'],
  keywords: ['api', 'design', 'openapi', 'rest'],
  category: 'sdlc/architecture',
  platforms: {
    claude: 'full',
    cursor: 'partial',
  },
  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
    core: true,
  },
  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: {
      tier: 'sonnet',
    },
    tools: ['Read', 'Write', 'Grep'],
    template: 'complex',
    maxTools: 10,
    canDelegate: false,
    readOnly: false,
  },
  author: 'AIWG Contributors',
  license: 'MIT',
};

const validCommandExtension: Extension = {
  id: 'mention-wire',
  type: 'command',
  name: 'Mention Wire',
  description: 'Wire @-mention traceability across artifacts',
  version: '2026.1.5',
  capabilities: ['traceability', 'validation'],
  keywords: ['traceability', 'mention', 'validation'],
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
  },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '[pattern]',
    allowedTools: ['Read', 'Write', 'Grep', 'Glob'],
    model: 'sonnet',
  },
};

const validSkillExtension: Extension = {
  id: 'status-check',
  type: 'skill',
  name: 'Status Check',
  description: 'Check current project status and next steps',
  version: '1.0.0',
  capabilities: ['status', 'navigation'],
  keywords: ['status', 'sdlc', 'navigation'],
  platforms: {
    claude: 'full',
    cursor: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/skills/{id}.md',
  },
  metadata: {
    type: 'skill',
    triggerPhrases: ["what's next?", 'project status', 'where are we?'],
    autoTrigger: false,
    tools: ['Read', 'Grep'],
  },
};

// ============================================
// Platform Compatibility Tests
// ============================================

describe('PlatformCompatibilitySchema', () => {
  it('accepts valid platform compatibility', () => {
    const valid = {
      claude: 'full' as const,
      cursor: 'partial' as const,
      copilot: 'experimental' as const,
    };
    expect(PlatformCompatibilitySchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one platform', () => {
    const result = PlatformCompatibilitySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid support levels', () => {
    const invalid = {
      claude: 'invalid-level',
    };
    const result = PlatformCompatibilitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts single platform', () => {
    const valid = {
      claude: 'full' as const,
    };
    expect(PlatformCompatibilitySchema.safeParse(valid).success).toBe(true);
  });
});

// ============================================
// Deployment Config Tests
// ============================================

describe('DeploymentConfigSchema', () => {
  it('accepts valid deployment config', () => {
    const valid = {
      pathTemplate: '.{platform}/agents/{id}.md',
      pathOverrides: {
        claude: '.claude/agents/custom.md',
      },
      additionalFiles: ['references/patterns.md'],
      autoInstall: true,
      core: true,
    };
    expect(DeploymentConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('requires pathTemplate', () => {
    const result = DeploymentConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty pathTemplate', () => {
    const result = DeploymentConfigSchema.safeParse({ pathTemplate: '' });
    expect(result.success).toBe(false);
  });

  it('sets default values', () => {
    const result = DeploymentConfigSchema.parse({
      pathTemplate: '.{platform}/agents/{id}.md',
    });
    expect(result.autoInstall).toBe(false);
    expect(result.core).toBe(false);
  });
});

// ============================================
// Agent Metadata Tests
// ============================================

describe('AgentMetadataSchema', () => {
  it('accepts valid agent metadata', () => {
    const valid = {
      type: 'agent' as const,
      role: 'API Designer',
      model: {
        tier: 'sonnet' as const,
      },
      tools: ['Read', 'Write'],
    };
    expect(AgentMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one tool', () => {
    const invalid = {
      type: 'agent' as const,
      role: 'API Designer',
      model: { tier: 'sonnet' as const },
      tools: [],
    };
    const result = AgentMetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts model override', () => {
    const valid = {
      type: 'agent' as const,
      role: 'API Designer',
      model: {
        tier: 'sonnet' as const,
        override: 'claude-opus-4-5-20251101',
      },
      tools: ['Read'],
    };
    expect(AgentMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid model tier', () => {
    const invalid = {
      type: 'agent' as const,
      role: 'API Designer',
      model: { tier: 'invalid' },
      tools: ['Read'],
    };
    const result = AgentMetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const valid = {
      type: 'agent' as const,
      role: 'API Designer',
      model: { tier: 'sonnet' as const },
      tools: ['Read'],
      maxTools: 10,
      canDelegate: true,
      readOnly: false,
      workflow: ['step1', 'step2'],
      expertise: ['apis', 'openapi'],
      responsibilities: ['design', 'document'],
    };
    expect(AgentMetadataSchema.safeParse(valid).success).toBe(true);
  });
});

// ============================================
// Command Metadata Tests
// ============================================

describe('CommandMetadataSchema', () => {
  it('accepts valid command metadata', () => {
    const valid = {
      type: 'command' as const,
      template: 'utility' as const,
    };
    expect(CommandMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts command with arguments', () => {
    const valid = {
      type: 'command' as const,
      template: 'utility' as const,
      arguments: [
        {
          name: 'file',
          description: 'Input file',
          required: true,
          type: 'string' as const,
          position: 0,
        },
      ],
    };
    expect(CommandMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts command with options', () => {
    const valid = {
      type: 'command' as const,
      template: 'utility' as const,
      options: [
        {
          name: 'verbose',
          description: 'Verbose output',
          type: 'boolean' as const,
          short: 'v',
          long: 'verbose',
        },
      ],
    };
    expect(CommandMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid template type', () => {
    const invalid = {
      type: 'command' as const,
      template: 'invalid',
    };
    const result = CommandMetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects short option with multiple characters', () => {
    const invalid = {
      type: 'command' as const,
      template: 'utility' as const,
      options: [
        {
          name: 'verbose',
          description: 'Verbose output',
          type: 'boolean' as const,
          short: 'vb', // Should be single character
        },
      ],
    };
    const result = CommandMetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================
// Skill Metadata Tests
// ============================================

describe('SkillMetadataSchema', () => {
  it('accepts valid skill metadata', () => {
    const valid = {
      type: 'skill' as const,
      triggerPhrases: ["what's next?", 'status'],
    };
    expect(SkillMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one trigger phrase', () => {
    const invalid = {
      type: 'skill' as const,
      triggerPhrases: [],
    };
    const result = SkillMetadataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('sets default autoTrigger', () => {
    const result = SkillMetadataSchema.parse({
      type: 'skill' as const,
      triggerPhrases: ['status'],
    });
    expect(result.autoTrigger).toBe(false);
  });

  it('accepts all optional fields', () => {
    const valid = {
      type: 'skill' as const,
      triggerPhrases: ['status'],
      autoTrigger: true,
      autoTriggerConditions: ['phase === "implementation"'],
      tools: ['Read', 'Grep'],
      references: [
        {
          filename: 'status.md',
          description: 'Status guide',
          path: 'docs/status.md',
        },
      ],
      inputRequirements: ['current phase'],
      outputFormat: 'markdown table',
    };
    expect(SkillMetadataSchema.safeParse(valid).success).toBe(true);
  });
});

// ============================================
// Full Extension Tests
// ============================================

describe('ExtensionSchema', () => {
  it('accepts valid agent extension', () => {
    const result = ExtensionSchema.safeParse(validAgentExtension);
    expect(result.success).toBe(true);
  });

  it('accepts valid command extension', () => {
    const result = ExtensionSchema.safeParse(validCommandExtension);
    expect(result.success).toBe(true);
  });

  it('accepts valid skill extension', () => {
    const result = ExtensionSchema.safeParse(validSkillExtension);
    expect(result.success).toBe(true);
  });

  it('requires valid ID format (kebab-case)', () => {
    const invalid = {
      ...validAgentExtension,
      id: 'InvalidID', // Not kebab-case
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires ID to start with lowercase letter', () => {
    const invalid = {
      ...validAgentExtension,
      id: '1-invalid', // Starts with number
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires valid version format', () => {
    const invalid = {
      ...validAgentExtension,
      version: 'v1.0', // Invalid format
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts CalVer format', () => {
    const valid = {
      ...validCommandExtension,
      version: '2026.1.5',
    };
    const result = ExtensionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('requires at least one capability', () => {
    const invalid = {
      ...validAgentExtension,
      capabilities: [],
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires at least one keyword', () => {
    const invalid = {
      ...validAgentExtension,
      keywords: [],
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates type matches metadata type', () => {
    const invalid = {
      ...validAgentExtension,
      type: 'command' as const, // Mismatch
      metadata: {
        type: 'agent' as const,
        role: 'API Designer',
        model: { tier: 'sonnet' as const },
        tools: ['Read'],
      },
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates URL fields', () => {
    const invalid = {
      ...validAgentExtension,
      repository: 'not-a-url',
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts all optional metadata fields', () => {
    const valid: Extension = {
      ...validAgentExtension,
      author: 'John Magly',
      license: 'Apache-2.0',
      repository: 'https://github.com/jmagly/ai-writing-guide',
      homepage: 'https://aiwg.io',
      bugs: 'https://github.com/jmagly/ai-writing-guide/issues',
      documentation: {
        readme: 'README.md',
        guide: 'docs/guide.md',
      },
      status: 'stable',
      requires: ['aiwg-utils'],
      recommends: ['voice-framework'],
      conflicts: ['legacy-agent'],
      systemDependencies: {
        'gh': '>=2.0.0',
      },
    };
    const result = ExtensionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('sets default status to stable', () => {
    const result = ExtensionSchema.parse(validAgentExtension);
    expect(result.status).toBe('stable');
  });

  it('accepts deprecation metadata', () => {
    const valid = {
      ...validAgentExtension,
      status: 'deprecated' as const,
      deprecation: {
        date: '2026-01-13T12:00:00Z',
        successor: 'api-designer-v2',
        reason: 'Replaced by improved version',
      },
    };
    const result = ExtensionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('requires ISO 8601 date in deprecation', () => {
    const invalid = {
      ...validAgentExtension,
      deprecation: {
        date: '2026-01-13', // Missing time
        reason: 'Deprecated',
      },
    };
    const result = ExtensionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts installation state', () => {
    const valid = {
      ...validAgentExtension,
      installation: {
        installedAt: '2026-01-13T12:00:00Z',
        installedFrom: 'registry' as const,
        installedPath: '/home/user/.aiwg/extensions/api-designer',
        enabled: true,
      },
    };
    const result = ExtensionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts signature metadata', () => {
    const valid = {
      ...validAgentExtension,
      checksum: 'sha256:abc123...',
      signature: {
        algorithm: 'pgp' as const,
        value: 'signature-data',
        publicKey: 'public-key-data',
      },
    };
    const result = ExtensionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

// ============================================
// Validation Function Tests
// ============================================

describe('validateExtension', () => {
  it('returns success for valid extension', () => {
    const result = validateExtension(validAgentExtension);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('api-designer');
      expect(result.data.type).toBe('agent');
    }
  });

  it('returns errors for invalid extension', () => {
    const invalid = {
      ...validAgentExtension,
      id: 'Invalid-ID',
      version: 'invalid',
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeInstanceOf(ZodError);
      expect(result.errors.issues.length).toBeGreaterThan(0);
    }
  });

  it('handles completely invalid data', () => {
    const result = validateExtension({ invalid: 'data' });
    expect(result.success).toBe(false);
  });

  it('handles null and undefined', () => {
    expect(validateExtension(null).success).toBe(false);
    expect(validateExtension(undefined).success).toBe(false);
  });
});

describe('isValidExtension', () => {
  it('returns true for valid extension', () => {
    expect(isValidExtension(validAgentExtension)).toBe(true);
    expect(isValidExtension(validCommandExtension)).toBe(true);
    expect(isValidExtension(validSkillExtension)).toBe(true);
  });

  it('returns false for invalid extension', () => {
    const invalid = { ...validAgentExtension, id: 'Invalid-ID' };
    expect(isValidExtension(invalid)).toBe(false);
  });

  it('acts as type guard', () => {
    const data: unknown = validAgentExtension;
    if (isValidExtension(data)) {
      // TypeScript should know data is ValidatedExtension
      expect(data.id).toBe('api-designer');
      expect(data.name).toBe('API Designer');
    }
  });
});

describe('validateExtensionStrict', () => {
  it('returns validated data for valid extension', () => {
    const result = validateExtensionStrict(validAgentExtension);
    expect(result.id).toBe('api-designer');
    expect(result.type).toBe('agent');
  });

  it('throws ZodError for invalid extension', () => {
    const invalid = { ...validAgentExtension, id: 'Invalid-ID' };
    expect(() => validateExtensionStrict(invalid)).toThrow(ZodError);
  });
});

describe('validateExtensionMetadata', () => {
  it('validates agent metadata', () => {
    const result = validateExtensionMetadata(validAgentExtension.metadata);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.type).toBe('agent');
    }
  });

  it('validates command metadata', () => {
    const result = validateExtensionMetadata(validCommandExtension.metadata);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.type).toBe('command');
    }
  });

  it('rejects invalid metadata', () => {
    const result = validateExtensionMetadata({ type: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('formatValidationErrors', () => {
  it('formats errors with field paths', () => {
    const result = validateExtension({
      ...validAgentExtension,
      id: 'Invalid-ID',
      version: 'invalid',
    });

    if (!result.success) {
      const messages = formatValidationErrors(result.errors);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some(msg => msg.includes('id'))).toBe(true);
      expect(messages.some(msg => msg.includes('version'))).toBe(true);
    }
  });

  it('includes error messages', () => {
    const result = validateExtension({
      ...validAgentExtension,
      capabilities: [],
    });

    if (!result.success) {
      const messages = formatValidationErrors(result.errors);
      expect(messages.some(msg => msg.includes('capability'))).toBe(true);
    }
  });
});

describe('isExtensionType', () => {
  it('returns true for matching type', () => {
    const validated = validateExtensionStrict(validAgentExtension);
    expect(isExtensionType(validated, 'agent')).toBe(true);
  });

  it('returns false for non-matching type', () => {
    const validated = validateExtensionStrict(validAgentExtension);
    expect(isExtensionType(validated, 'command')).toBe(false);
  });

  it('validates type consistency', () => {
    const validated = validateExtensionStrict(validCommandExtension);
    expect(isExtensionType(validated, 'command')).toBe(true);
    expect(isExtensionType(validated, 'agent')).toBe(false);
  });
});

// ============================================
// Edge Cases & Error Conditions
// ============================================

describe('Edge Cases', () => {
  it('handles empty strings in required fields', () => {
    const invalid = {
      ...validAgentExtension,
      name: '',
      description: '',
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });

  it('handles negative numbers where positive required', () => {
    const invalid = {
      ...validAgentExtension,
      metadata: {
        ...validAgentExtension.metadata,
        maxTools: -1,
      },
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });

  it('handles malformed URLs', () => {
    const invalid = {
      ...validAgentExtension,
      repository: 'not a url',
      homepage: 'also not a url',
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });

  it('requires type consistency across extension', () => {
    const invalid = {
      ...validAgentExtension,
      type: 'agent' as const,
      metadata: {
        type: 'command' as const, // Mismatch
        template: 'utility' as const,
      },
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });

  it('validates platform compatibility has at least one platform', () => {
    const invalid = {
      ...validAgentExtension,
      platforms: {}, // Empty
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });

  it('validates pathTemplate is not empty', () => {
    const invalid = {
      ...validAgentExtension,
      deployment: {
        pathTemplate: '', // Empty
      },
    };
    const result = validateExtension(invalid);
    expect(result.success).toBe(false);
  });
});
