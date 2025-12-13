/**
 * Tests for MCPSmith Framework - MCP Definition
 *
 * Validates mcp-definition.yaml format, catalog, and tool specifications
 */

import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Types for MCP definition
interface DockerConfig {
  available: boolean;
  version?: string;
  daemon_running?: boolean;
}

interface NodeConfig {
  available: boolean;
  version?: string;
  npm_version?: string;
}

interface McpConfig {
  sdk_version: string;
  spec_version: string;
  transports: string[];
}

interface BaseImage {
  image: string;
  cached: boolean;
}

interface NetworkConfig {
  name: string;
  exists: boolean;
}

interface PortConfig {
  range_start: number;
  range_end: number;
}

interface McpDefinition {
  docker: DockerConfig;
  node: NodeConfig;
  mcp: McpConfig;
  base_images: Record<string, BaseImage>;
  network?: NetworkConfig;
  ports?: PortConfig;
}

// Types for MCP tool catalog
interface McpToolEntry {
  name: string;
  version: string;
  description: string;
  spec_path: string;
  implementation: string;
  image: string;
  status: 'available' | 'running' | 'stopped';
  container_id: string | null;
  tags: string[];
  capabilities: string[];
}

interface McpToolCatalog {
  version: string;
  last_updated: string;
  tools: McpToolEntry[];
  running_containers: string[];
  capability_index: Record<string, string>;
}

// Types for MCP tool specification
interface McpToolInput {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description: string;
}

interface McpToolOutput {
  name: string;
  type: string;
  description: string;
}

interface McpToolTest {
  name: string;
  input: Record<string, unknown>;
  expect_contains?: string;
  expect_error?: boolean;
}

interface McpToolDockerConfig {
  base_image: string;
  transport: 'stdio' | 'http';
  port?: number;
  dependencies: string[];
}

interface McpToolSpec {
  name: string;
  version: string;
  description: string;
  author?: string;
  created?: string;
  modified?: string;
  mcp: {
    tool_name: string;
    title: string;
    description: string;
  };
  inputs: McpToolInput[];
  outputs: McpToolOutput[];
  docker: McpToolDockerConfig;
  tests: McpToolTest[];
  tags: string[];
}

// Validator functions
function validateMcpDefinition(def: McpDefinition): string[] {
  const errors: string[] = [];

  // Docker validation
  if (!def.docker) {
    errors.push('Missing docker section');
  } else {
    if (typeof def.docker.available !== 'boolean') {
      errors.push('docker.available must be a boolean');
    }
    if (def.docker.available && !def.docker.version) {
      errors.push('docker.version required when docker is available');
    }
  }

  // Node validation
  if (!def.node) {
    errors.push('Missing node section');
  } else {
    if (typeof def.node.available !== 'boolean') {
      errors.push('node.available must be a boolean');
    }
    if (def.node.available && !def.node.version) {
      errors.push('node.version required when node is available');
    }
  }

  // MCP validation
  if (!def.mcp) {
    errors.push('Missing mcp section');
  } else {
    if (!def.mcp.sdk_version) errors.push('Missing mcp.sdk_version');
    if (!def.mcp.spec_version) errors.push('Missing mcp.spec_version');
    if (!Array.isArray(def.mcp.transports) || def.mcp.transports.length === 0) {
      errors.push('mcp.transports must be a non-empty array');
    } else {
      const validTransports = ['stdio', 'http', 'sse'];
      for (const transport of def.mcp.transports) {
        if (!validTransports.includes(transport)) {
          errors.push(`Invalid transport: ${transport}`);
        }
      }
    }
  }

  // Base images validation
  if (!def.base_images || typeof def.base_images !== 'object') {
    errors.push('Missing or invalid base_images section');
  } else {
    for (const [name, img] of Object.entries(def.base_images)) {
      if (!img.image) errors.push(`base_images.${name} missing image`);
      if (typeof img.cached !== 'boolean') {
        errors.push(`base_images.${name}.cached must be a boolean`);
      }
    }
  }

  // Ports validation (optional)
  if (def.ports) {
    if (typeof def.ports.range_start !== 'number') {
      errors.push('ports.range_start must be a number');
    }
    if (typeof def.ports.range_end !== 'number') {
      errors.push('ports.range_end must be a number');
    }
    if (def.ports.range_start >= def.ports.range_end) {
      errors.push('ports.range_start must be less than ports.range_end');
    }
  }

  return errors;
}

function validateMcpToolCatalog(catalog: McpToolCatalog): string[] {
  const errors: string[] = [];

  if (!catalog.version) errors.push('Missing catalog version');
  if (!catalog.last_updated) errors.push('Missing last_updated timestamp');
  if (!Array.isArray(catalog.tools)) errors.push('tools must be an array');
  if (!Array.isArray(catalog.running_containers)) {
    errors.push('running_containers must be an array');
  }

  for (const tool of catalog.tools || []) {
    if (!tool.name) errors.push('Tool missing name');
    if (!tool.version) errors.push(`Tool ${tool.name} missing version`);
    if (!tool.description) errors.push(`Tool ${tool.name} missing description`);
    if (!tool.image) errors.push(`Tool ${tool.name} missing image`);
    if (!['available', 'running', 'stopped'].includes(tool.status)) {
      errors.push(`Tool ${tool.name} has invalid status: ${tool.status}`);
    }
    if (!Array.isArray(tool.tags)) {
      errors.push(`Tool ${tool.name} has invalid tags`);
    }
    if (!Array.isArray(tool.capabilities)) {
      errors.push(`Tool ${tool.name} has invalid capabilities`);
    }
  }

  return errors;
}

function validateMcpToolSpec(spec: McpToolSpec): string[] {
  const errors: string[] = [];

  if (!spec.name) errors.push('Missing tool name');
  if (!spec.version) errors.push('Missing tool version');
  if (!spec.description) errors.push('Missing tool description');

  // MCP section validation
  if (!spec.mcp) {
    errors.push('Missing mcp section');
  } else {
    if (!spec.mcp.tool_name) errors.push('Missing mcp.tool_name');
    if (!spec.mcp.title) errors.push('Missing mcp.title');
    if (!spec.mcp.description) errors.push('Missing mcp.description');
  }

  // Docker section validation
  if (!spec.docker) {
    errors.push('Missing docker section');
  } else {
    if (!spec.docker.base_image) errors.push('Missing docker.base_image');
    if (!['stdio', 'http'].includes(spec.docker.transport)) {
      errors.push(`Invalid docker.transport: ${spec.docker.transport}`);
    }
    if (!Array.isArray(spec.docker.dependencies)) {
      errors.push('docker.dependencies must be an array');
    }
  }

  // Tests validation
  if (!spec.tests?.length) {
    errors.push('Tool must have at least one test');
  } else {
    for (const test of spec.tests) {
      if (!test.name) errors.push('Test missing name');
      if (!test.input || typeof test.input !== 'object') {
        errors.push(`Test ${test.name} missing or invalid input`);
      }
    }
  }

  // Tags validation
  if (!spec.tags?.length) {
    errors.push('Tool must have at least one tag');
  }

  return errors;
}

describe('McpDefinition', () => {
  describe('Schema Validation', () => {
    it('should validate a complete MCP definition', () => {
      const validDef: McpDefinition = {
        docker: {
          available: true,
          version: '24.0.7',
          daemon_running: true,
        },
        node: {
          available: true,
          version: '20.10.0',
          npm_version: '10.2.0',
        },
        mcp: {
          sdk_version: '1.24.0',
          spec_version: '2025-11-25',
          transports: ['stdio'],
        },
        base_images: {
          node_alpine: {
            image: 'node:20-alpine',
            cached: true,
          },
        },
        network: {
          name: 'aiwg-mcp-network',
          exists: false,
        },
        ports: {
          range_start: 9100,
          range_end: 9199,
        },
      };

      const errors = validateMcpDefinition(validDef);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing docker section', () => {
      const invalidDef = {
        node: { available: true, version: '20.10.0' },
        mcp: { sdk_version: '1.24.0', spec_version: '2025-11-25', transports: ['stdio'] },
        base_images: {},
      } as McpDefinition;

      const errors = validateMcpDefinition(invalidDef);
      expect(errors).toContain('Missing docker section');
    });

    it('should require docker.version when docker is available', () => {
      const invalidDef: McpDefinition = {
        docker: { available: true },
        node: { available: true, version: '20.10.0' },
        mcp: { sdk_version: '1.24.0', spec_version: '2025-11-25', transports: ['stdio'] },
        base_images: { node: { image: 'node:20-alpine', cached: true } },
      };

      const errors = validateMcpDefinition(invalidDef);
      expect(errors).toContain('docker.version required when docker is available');
    });

    it('should reject invalid transport types', () => {
      const invalidDef: McpDefinition = {
        docker: { available: true, version: '24.0.0' },
        node: { available: true, version: '20.10.0' },
        mcp: { sdk_version: '1.24.0', spec_version: '2025-11-25', transports: ['websocket'] },
        base_images: { node: { image: 'node:20-alpine', cached: true } },
      };

      const errors = validateMcpDefinition(invalidDef);
      expect(errors.some((e) => e.includes('Invalid transport'))).toBe(true);
    });

    it('should reject invalid port range', () => {
      const invalidDef: McpDefinition = {
        docker: { available: true, version: '24.0.0' },
        node: { available: true, version: '20.10.0' },
        mcp: { sdk_version: '1.24.0', spec_version: '2025-11-25', transports: ['stdio'] },
        base_images: { node: { image: 'node:20-alpine', cached: true } },
        ports: { range_start: 9199, range_end: 9100 },
      };

      const errors = validateMcpDefinition(invalidDef);
      expect(errors).toContain('ports.range_start must be less than ports.range_end');
    });

    it('should allow definition without docker available', () => {
      const defWithoutDocker: McpDefinition = {
        docker: { available: false },
        node: { available: true, version: '20.10.0' },
        mcp: { sdk_version: '1.24.0', spec_version: '2025-11-25', transports: ['stdio'] },
        base_images: {},
      };

      const errors = validateMcpDefinition(defWithoutDocker);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Real MCP Definition', () => {
    const mcpDefPath = path.join(
      process.cwd(),
      '.aiwg/smiths/mcp-definition.yaml'
    );

    it('should load the actual MCP definition if it exists', () => {
      if (!fs.existsSync(mcpDefPath)) {
        console.log('Skipping: mcp-definition.yaml not found');
        return;
      }

      const content = fs.readFileSync(mcpDefPath, 'utf8');
      const def = yaml.load(content) as McpDefinition;

      const errors = validateMcpDefinition(def);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('McpToolCatalog', () => {
  describe('Schema Validation', () => {
    it('should validate an empty catalog', () => {
      const emptyCatalog: McpToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [],
        running_containers: [],
        capability_index: {},
      };

      const errors = validateMcpToolCatalog(emptyCatalog);
      expect(errors).toHaveLength(0);
    });

    it('should validate a catalog with tools', () => {
      const catalog: McpToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [
          {
            name: 'json-fetcher',
            version: '1.0.0',
            description: 'Fetches JSON from URLs',
            spec_path: 'tools/json-fetcher.yaml',
            implementation: 'implementations/json-fetcher/',
            image: 'aiwg-mcp/json-fetcher:1.0.0',
            status: 'available',
            container_id: null,
            tags: ['http', 'json', 'fetch'],
            capabilities: ['Fetch JSON from URL', 'Parse JSON responses'],
          },
        ],
        running_containers: [],
        capability_index: {
          'fetch json': 'json-fetcher',
          'get json from url': 'json-fetcher',
        },
      };

      const errors = validateMcpToolCatalog(catalog);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid tool status', () => {
      const invalidCatalog: McpToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [
          {
            name: 'test-tool',
            version: '1.0.0',
            description: 'Test',
            spec_path: 'tools/test.yaml',
            implementation: 'implementations/test/',
            image: 'aiwg-mcp/test:1.0.0',
            status: 'invalid' as 'available',
            container_id: null,
            tags: ['test'],
            capabilities: ['test'],
          },
        ],
        running_containers: [],
        capability_index: {},
      };

      const errors = validateMcpToolCatalog(invalidCatalog);
      expect(errors.some((e) => e.includes('invalid status'))).toBe(true);
    });

    it('should reject tools with missing required fields', () => {
      const invalidCatalog: McpToolCatalog = {
        version: '1.0.0',
        last_updated: '2025-12-13',
        tools: [
          {
            name: 'incomplete-tool',
            version: '',
            description: '',
            spec_path: '',
            implementation: '',
            image: '',
            status: 'available',
            container_id: null,
            tags: [],
            capabilities: [],
          },
        ],
        running_containers: [],
        capability_index: {},
      };

      const errors = validateMcpToolCatalog(invalidCatalog);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real Catalog', () => {
    const catalogPath = path.join(
      process.cwd(),
      '.aiwg/smiths/mcpsmith/catalog.yaml'
    );

    it('should load the actual catalog if it exists', () => {
      if (!fs.existsSync(catalogPath)) {
        console.log('Skipping: mcpsmith catalog.yaml not found');
        return;
      }

      const content = fs.readFileSync(catalogPath, 'utf8');
      const catalog = yaml.load(content) as McpToolCatalog;

      const errors = validateMcpToolCatalog(catalog);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('McpToolSpecification', () => {
  describe('Schema Validation', () => {
    it('should validate a complete tool specification', () => {
      const validSpec: McpToolSpec = {
        name: 'json-fetcher',
        version: '1.0.0',
        description: 'Fetches and parses JSON from URLs',
        author: 'mcpsmith',
        created: '2025-12-13',
        modified: '2025-12-13',
        mcp: {
          tool_name: 'fetch-json',
          title: 'JSON Fetcher',
          description: 'Fetches JSON data from a URL and returns parsed content',
        },
        inputs: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'URL to fetch JSON from',
          },
          {
            name: 'headers',
            type: 'object',
            required: false,
            description: 'Optional HTTP headers',
          },
        ],
        outputs: [
          {
            name: 'data',
            type: 'json',
            description: 'Parsed JSON data',
          },
        ],
        docker: {
          base_image: 'node:20-alpine',
          transport: 'stdio',
          dependencies: ['node-fetch'],
        },
        tests: [
          {
            name: 'Basic fetch',
            input: { url: 'https://jsonplaceholder.typicode.com/posts/1' },
            expect_contains: 'userId',
          },
        ],
        tags: ['http', 'json', 'fetch', 'api'],
      };

      const errors = validateMcpToolSpec(validSpec);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing MCP section', () => {
      const invalidSpec = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test',
        docker: {
          base_image: 'node:20-alpine',
          transport: 'stdio',
          dependencies: [],
        },
        inputs: [],
        outputs: [],
        tests: [{ name: 'test', input: {} }],
        tags: ['test'],
      } as McpToolSpec;

      const errors = validateMcpToolSpec(invalidSpec);
      expect(errors).toContain('Missing mcp section');
    });

    it('should reject invalid transport', () => {
      const invalidSpec: McpToolSpec = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test',
        mcp: { tool_name: 'test', title: 'Test', description: 'Test' },
        docker: {
          base_image: 'node:20-alpine',
          transport: 'websocket' as 'stdio',
          dependencies: [],
        },
        inputs: [],
        outputs: [],
        tests: [{ name: 'test', input: {} }],
        tags: ['test'],
      };

      const errors = validateMcpToolSpec(invalidSpec);
      expect(errors.some((e) => e.includes('Invalid docker.transport'))).toBe(true);
    });

    it('should require at least one test', () => {
      const specNoTests: McpToolSpec = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test',
        mcp: { tool_name: 'test', title: 'Test', description: 'Test' },
        docker: {
          base_image: 'node:20-alpine',
          transport: 'stdio',
          dependencies: [],
        },
        inputs: [],
        outputs: [],
        tests: [],
        tags: ['test'],
      };

      const errors = validateMcpToolSpec(specNoTests);
      expect(errors.some((e) => e.includes('at least one test'))).toBe(true);
    });

    it('should require at least one tag', () => {
      const specNoTags: McpToolSpec = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test',
        mcp: { tool_name: 'test', title: 'Test', description: 'Test' },
        docker: {
          base_image: 'node:20-alpine',
          transport: 'stdio',
          dependencies: [],
        },
        inputs: [],
        outputs: [],
        tests: [{ name: 'test', input: {} }],
        tags: [],
      };

      const errors = validateMcpToolSpec(specNoTags);
      expect(errors.some((e) => e.includes('at least one tag'))).toBe(true);
    });

    it('should validate test entries have name and input', () => {
      const specBadTests: McpToolSpec = {
        name: 'test-tool',
        version: '1.0.0',
        description: 'Test',
        mcp: { tool_name: 'test', title: 'Test', description: 'Test' },
        docker: {
          base_image: 'node:20-alpine',
          transport: 'stdio',
          dependencies: [],
        },
        inputs: [],
        outputs: [],
        tests: [{ name: '', input: {} }],
        tags: ['test'],
      };

      const errors = validateMcpToolSpec(specBadTests);
      expect(errors.some((e) => e.includes('Test missing name'))).toBe(true);
    });
  });
});

describe('Template Files', () => {
  const templatesDir = path.join(
    process.cwd(),
    '.aiwg/smiths/mcpsmith/templates'
  );

  describe('Dockerfile.template', () => {
    it('should exist and contain required placeholders', () => {
      const templatePath = path.join(templatesDir, 'Dockerfile.template');
      if (!fs.existsSync(templatePath)) {
        console.log('Skipping: Dockerfile.template not found');
        return;
      }

      const content = fs.readFileSync(templatePath, 'utf8');
      expect(content).toContain('{{BASE_IMAGE}}');
      expect(content).toContain('WORKDIR');
      expect(content).toContain('npm');
      expect(content).toContain('index.mjs');
    });
  });

  describe('index.mjs.template', () => {
    it('should exist and contain required placeholders', () => {
      const templatePath = path.join(templatesDir, 'index.mjs.template');
      if (!fs.existsSync(templatePath)) {
        console.log('Skipping: index.mjs.template not found');
        return;
      }

      const content = fs.readFileSync(templatePath, 'utf8');
      expect(content).toContain('{{TOOL_NAME}}');
      expect(content).toContain('{{VERSION}}');
      expect(content).toContain('{{DESCRIPTION}}');
      expect(content).toContain('McpServer');
      expect(content).toContain('StdioServerTransport');
      expect(content).toContain('registerTool');
    });
  });

  describe('package.json.template', () => {
    it('should exist and contain required placeholders', () => {
      const templatePath = path.join(templatesDir, 'package.json.template');
      if (!fs.existsSync(templatePath)) {
        console.log('Skipping: package.json.template not found');
        return;
      }

      const content = fs.readFileSync(templatePath, 'utf8');
      expect(content).toContain('{{TOOL_NAME}}');
      expect(content).toContain('{{VERSION}}');
      expect(content).toContain('@modelcontextprotocol/sdk');
      expect(content).toContain('zod');
    });
  });
});
