/**
 * Tests for Smithing Framework - System Definition
 *
 * Validates system-definition.yaml format and content
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Types for system definition
interface CommandEntry {
  name: string;
  path: string;
  version?: string;
  tested: boolean;
  capabilities: string[];
}

interface CommandCategory {
  description: string;
  commands: CommandEntry[];
}

interface SystemDefinition {
  platform: {
    os: string;
    distribution?: string;
    kernel?: string;
    shell: string;
    shell_version?: string;
    architecture: string;
  };
  environment: {
    home: string;
    path_dirs: string[];
    temp_dir: string;
  };
  categories: Record<string, CommandCategory>;
}

// Validator functions
function validateSystemDefinition(def: SystemDefinition): string[] {
  const errors: string[] = [];

  // Platform validation
  if (!def.platform) {
    errors.push('Missing platform section');
  } else {
    if (!def.platform.os) errors.push('Missing platform.os');
    if (!def.platform.shell) errors.push('Missing platform.shell');
    if (!def.platform.architecture) errors.push('Missing platform.architecture');
    if (!['linux', 'darwin', 'windows'].includes(def.platform.os?.toLowerCase())) {
      errors.push(`Invalid platform.os: ${def.platform.os}`);
    }
    if (!['x86_64', 'arm64', 'aarch64', 'i686'].includes(def.platform.architecture?.toLowerCase())) {
      errors.push(`Unexpected platform.architecture: ${def.platform.architecture}`);
    }
  }

  // Environment validation
  if (!def.environment) {
    errors.push('Missing environment section');
  } else {
    if (!def.environment.home) errors.push('Missing environment.home');
    if (!def.environment.path_dirs || !Array.isArray(def.environment.path_dirs)) {
      errors.push('Missing or invalid environment.path_dirs');
    }
    if (!def.environment.temp_dir) errors.push('Missing environment.temp_dir');
  }

  // Categories validation
  if (!def.categories || typeof def.categories !== 'object') {
    errors.push('Missing or invalid categories section');
  } else {
    for (const [catName, category] of Object.entries(def.categories)) {
      if (!category.description) {
        errors.push(`Missing description for category: ${catName}`);
      }
      if (!category.commands || !Array.isArray(category.commands)) {
        errors.push(`Missing or invalid commands for category: ${catName}`);
        continue;
      }
      for (const cmd of category.commands) {
        if (!cmd.name) errors.push(`Missing command name in ${catName}`);
        if (!cmd.path) errors.push(`Missing path for command ${cmd.name} in ${catName}`);
        if (typeof cmd.tested !== 'boolean') {
          errors.push(`Missing tested flag for command ${cmd.name} in ${catName}`);
        }
        if (!cmd.capabilities || !Array.isArray(cmd.capabilities)) {
          errors.push(`Missing or invalid capabilities for command ${cmd.name} in ${catName}`);
        }
      }
    }
  }

  return errors;
}

function validateCommandAvailability(cmd: CommandEntry): boolean {
  // Check if command exists on the system
  try {
    const result = require('child_process').execSync(`command -v ${cmd.name}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

describe('SystemDefinition', () => {
  describe('Schema Validation', () => {
    it('should validate a complete system definition', () => {
      const validDef: SystemDefinition = {
        platform: {
          os: 'linux',
          distribution: 'Ubuntu 24.04',
          kernel: '5.15.0',
          shell: '/bin/bash',
          shell_version: '5.2.21',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin', '/bin'],
          temp_dir: '/tmp',
        },
        categories: {
          'file-ops': {
            description: 'File operations',
            commands: [
              {
                name: 'find',
                path: '/usr/bin/find',
                version: '4.9.0',
                tested: true,
                capabilities: ['recursive search', 'pattern matching'],
              },
            ],
          },
        },
      };

      const errors = validateSystemDefinition(validDef);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing platform section', () => {
      const invalidDef = {
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {},
      } as SystemDefinition;

      const errors = validateSystemDefinition(invalidDef);
      expect(errors).toContain('Missing platform section');
    });

    it('should reject missing platform.os', () => {
      const invalidDef: SystemDefinition = {
        platform: {
          os: '',
          shell: '/bin/bash',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {},
      };

      const errors = validateSystemDefinition(invalidDef);
      expect(errors.some((e) => e.includes('platform.os'))).toBe(true);
    });

    it('should reject invalid platform.os value', () => {
      const invalidDef: SystemDefinition = {
        platform: {
          os: 'freebsd',
          shell: '/bin/bash',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {},
      };

      const errors = validateSystemDefinition(invalidDef);
      expect(errors.some((e) => e.includes('Invalid platform.os'))).toBe(true);
    });

    it('should validate command entries', () => {
      const defWithInvalidCommand: SystemDefinition = {
        platform: {
          os: 'linux',
          shell: '/bin/bash',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {
          'file-ops': {
            description: 'File operations',
            commands: [
              {
                name: '',
                path: '/usr/bin/find',
                tested: true,
                capabilities: ['search'],
              },
            ],
          },
        },
      };

      const errors = validateSystemDefinition(defWithInvalidCommand);
      expect(errors.some((e) => e.includes('Missing command name'))).toBe(true);
    });

    it('should require capabilities for each command', () => {
      const defWithNoCapabilities: SystemDefinition = {
        platform: {
          os: 'linux',
          shell: '/bin/bash',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {
          'file-ops': {
            description: 'File operations',
            commands: [
              {
                name: 'find',
                path: '/usr/bin/find',
                tested: true,
                capabilities: [],
              },
            ],
          },
        },
      };

      // Empty array is technically valid, but we could add a warning
      const errors = validateSystemDefinition(defWithNoCapabilities);
      expect(errors).toHaveLength(0); // Empty capabilities allowed
    });
  });

  describe('Required Categories', () => {
    const requiredCategories = [
      'file-ops',
      'text-processing',
      'hashing',
      'compression',
      'network',
      'process',
      'json',
    ];

    it('should support all required categories', () => {
      const fullDef: SystemDefinition = {
        platform: {
          os: 'linux',
          shell: '/bin/bash',
          architecture: 'x86_64',
        },
        environment: {
          home: '/home/user',
          path_dirs: ['/usr/bin'],
          temp_dir: '/tmp',
        },
        categories: {},
      };

      // Add all required categories
      for (const cat of requiredCategories) {
        fullDef.categories[cat] = {
          description: `${cat} category`,
          commands: [
            {
              name: 'test-cmd',
              path: '/usr/bin/test-cmd',
              tested: true,
              capabilities: ['test'],
            },
          ],
        };
      }

      const errors = validateSystemDefinition(fullDef);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Real System Definition', () => {
    const sysDefPath = path.join(
      process.cwd(),
      '.aiwg/smiths/system-definition.yaml'
    );

    it('should load the actual system definition if it exists', () => {
      if (!fs.existsSync(sysDefPath)) {
        console.log('Skipping: system-definition.yaml not found');
        return;
      }

      const content = fs.readFileSync(sysDefPath, 'utf8');
      const def = yaml.load(content) as SystemDefinition;

      const errors = validateSystemDefinition(def);
      expect(errors).toHaveLength(0);
    });

    it('should have at least one command per category if it exists', () => {
      if (!fs.existsSync(sysDefPath)) {
        console.log('Skipping: system-definition.yaml not found');
        return;
      }

      const content = fs.readFileSync(sysDefPath, 'utf8');
      const def = yaml.load(content) as SystemDefinition;

      for (const [catName, category] of Object.entries(def.categories)) {
        expect(category.commands.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('ToolCatalog', () => {
  interface ToolEntry {
    name: string;
    version: string;
    description: string;
    path: string;
    script: string;
    tags: string[];
    capabilities: string[];
  }

  interface ToolCatalog {
    version: string;
    last_updated: string;
    tools: ToolEntry[];
    capability_index: Record<string, string>;
  }

  function validateToolCatalog(catalog: ToolCatalog): string[] {
    const errors: string[] = [];

    if (!catalog.version) errors.push('Missing catalog version');
    if (!catalog.last_updated) errors.push('Missing last_updated timestamp');
    if (!Array.isArray(catalog.tools)) errors.push('tools must be an array');

    for (const tool of catalog.tools || []) {
      if (!tool.name) errors.push('Tool missing name');
      if (!tool.version) errors.push(`Tool ${tool.name} missing version`);
      if (!tool.description) errors.push(`Tool ${tool.name} missing description`);
      if (!tool.path) errors.push(`Tool ${tool.name} missing path`);
      if (!tool.script) errors.push(`Tool ${tool.name} missing script`);
      if (!Array.isArray(tool.tags)) errors.push(`Tool ${tool.name} has invalid tags`);
      if (!Array.isArray(tool.capabilities)) {
        errors.push(`Tool ${tool.name} has invalid capabilities`);
      }
    }

    return errors;
  }

  describe('Schema Validation', () => {
    it('should validate an empty catalog', () => {
      const emptyCatalog: ToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [],
        capability_index: {},
      };

      const errors = validateToolCatalog(emptyCatalog);
      expect(errors).toHaveLength(0);
    });

    it('should validate a catalog with tools', () => {
      const catalog: ToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [
          {
            name: 'find-duplicates',
            version: '1.0.0',
            description: 'Find duplicate files by hash',
            path: 'tools/find-duplicates.yaml',
            script: 'scripts/find-duplicates.sh',
            tags: ['duplicates', 'files', 'hash'],
            capabilities: ['Find duplicate files', 'Compare by hash'],
          },
        ],
        capability_index: {
          'find duplicates': 'find-duplicates',
          'duplicate files': 'find-duplicates',
        },
      };

      const errors = validateToolCatalog(catalog);
      expect(errors).toHaveLength(0);
    });

    it('should reject tools with missing fields', () => {
      const invalidCatalog: ToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [
          {
            name: 'incomplete-tool',
            version: '',
            description: '',
            path: '',
            script: '',
            tags: [],
            capabilities: [],
          },
        ],
        capability_index: {},
      };

      const errors = validateToolCatalog(invalidCatalog);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real Catalog', () => {
    const catalogPath = path.join(
      process.cwd(),
      '.aiwg/smiths/toolsmith/catalog.yaml'
    );

    it('should load the actual catalog if it exists', () => {
      if (!fs.existsSync(catalogPath)) {
        console.log('Skipping: catalog.yaml not found');
        return;
      }

      const content = fs.readFileSync(catalogPath, 'utf8');
      const catalog = yaml.load(content) as ToolCatalog;

      const errors = validateToolCatalog(catalog);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('ToolSpecification', () => {
  interface ToolInput {
    name: string;
    type: string;
    required: boolean;
    default?: string;
    description: string;
  }

  interface ToolOutput {
    name: string;
    type: string;
    description: string;
  }

  interface ToolTest {
    name: string;
    setup?: string;
    command: string;
    expect_exit_code?: number;
    expect_contains?: string;
    expect_stderr_contains?: string;
    cleanup?: string;
  }

  interface ToolSpecification {
    name: string;
    version: string;
    description: string;
    author: string;
    created: string;
    modified: string;
    requirements: {
      commands: string[];
      min_versions?: Record<string, string>;
    };
    inputs: ToolInput[];
    outputs: ToolOutput[];
    script_path?: string;
    script?: string;
    tests: ToolTest[];
    examples: { description: string; command: string }[];
    tags: string[];
  }

  function validateToolSpec(spec: ToolSpecification): string[] {
    const errors: string[] = [];

    if (!spec.name) errors.push('Missing tool name');
    if (!spec.version) errors.push('Missing tool version');
    if (!spec.description) errors.push('Missing tool description');
    if (!spec.requirements?.commands?.length) {
      errors.push('Missing required commands');
    }
    if (!spec.tests?.length) errors.push('Tool must have at least one test');
    if (!spec.tags?.length) errors.push('Tool must have at least one tag');

    for (const test of spec.tests || []) {
      if (!test.name) errors.push('Test missing name');
      if (!test.command) errors.push(`Test ${test.name} missing command`);
    }

    return errors;
  }

  describe('Schema Validation', () => {
    it('should validate a complete tool specification', () => {
      const validSpec: ToolSpecification = {
        name: 'find-duplicates',
        version: '1.0.0',
        description: 'Find duplicate files by content hash',
        author: 'toolsmith-dynamic',
        created: '2025-12-13',
        modified: '2025-12-13',
        requirements: {
          commands: ['find', 'md5sum', 'sort', 'awk'],
        },
        inputs: [
          {
            name: 'directory',
            type: 'path',
            required: true,
            description: 'Directory to search',
          },
        ],
        outputs: [
          {
            name: 'duplicates',
            type: 'text',
            description: 'List of duplicate groups',
          },
        ],
        script_path: '../scripts/find-duplicates.sh',
        tests: [
          {
            name: 'Basic test',
            command: './find-duplicates.sh /tmp',
            expect_exit_code: 0,
          },
        ],
        examples: [
          {
            description: 'Find duplicates in home',
            command: 'find-duplicates.sh ~',
          },
        ],
        tags: ['duplicates', 'files', 'hash'],
      };

      const errors = validateToolSpec(validSpec);
      expect(errors).toHaveLength(0);
    });

    it('should require at least one test', () => {
      const specNoTests: ToolSpecification = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'A test tool',
        author: 'test',
        created: '2025-12-13',
        modified: '2025-12-13',
        requirements: { commands: ['echo'] },
        inputs: [],
        outputs: [],
        tests: [],
        examples: [],
        tags: ['test'],
      };

      const errors = validateToolSpec(specNoTests);
      expect(errors.some((e) => e.includes('at least one test'))).toBe(true);
    });

    it('should require tags for catalog matching', () => {
      const specNoTags: ToolSpecification = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'A test tool',
        author: 'test',
        created: '2025-12-13',
        modified: '2025-12-13',
        requirements: { commands: ['echo'] },
        inputs: [],
        outputs: [],
        tests: [{ name: 'test', command: './test.sh' }],
        examples: [],
        tags: [],
      };

      const errors = validateToolSpec(specNoTags);
      expect(errors.some((e) => e.includes('at least one tag'))).toBe(true);
    });
  });
});
