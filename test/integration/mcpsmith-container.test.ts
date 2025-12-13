/**
 * MCPSmith Container Integration Test
 *
 * This test actually builds and runs Docker containers with MCP servers.
 * SKIPPED BY DEFAULT - only runs when MCPSMITH_INTEGRATION=1 is set.
 *
 * Run manually with:
 *   MCPSMITH_INTEGRATION=1 npx vitest run test/integration/mcpsmith-container.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SKIP_INTEGRATION = !process.env.MCPSMITH_INTEGRATION;
const TEST_TOOL_NAME = 'echo-test';
const TEST_IMAGE_NAME = `aiwg-mcp/${TEST_TOOL_NAME}:test`;
const TEST_DIR = path.join(process.cwd(), '.aiwg/smiths/mcpsmith/implementations', TEST_TOOL_NAME);

// Helper to run container with single message and get response
function runMcpCommand(message: object): string {
  const result = execSync(
    `echo '${JSON.stringify(message)}' | docker run -i --rm ${TEST_IMAGE_NAME}`,
    { encoding: 'utf8', timeout: 15000 }
  );
  return result.trim();
}

describe.skipIf(SKIP_INTEGRATION)('MCPSmith Container Integration', () => {
  beforeAll(() => {
    // Check Docker is available
    try {
      execSync('docker info', { stdio: 'pipe' });
    } catch {
      throw new Error('Docker is not running. Start Docker and try again.');
    }

    // Create test tool implementation directory
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Write package.json
    fs.writeFileSync(
      path.join(TEST_DIR, 'package.json'),
      JSON.stringify(
        {
          name: `aiwg-mcp-${TEST_TOOL_NAME}`,
          version: '1.0.0',
          description: 'Test MCP tool for integration testing',
          type: 'module',
          main: 'index.mjs',
          dependencies: {
            '@modelcontextprotocol/sdk': '^1.24.0',
            zod: '^3.22.0',
          },
        },
        null,
        2
      )
    );

    // Write index.mjs with correct imports
    fs.writeFileSync(
      path.join(TEST_DIR, 'index.mjs'),
      `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: '${TEST_TOOL_NAME}',
  version: '1.0.0'
});

const inputSchema = z.object({
  message: z.string()
});

server.registerTool(
  'echo',
  {
    title: 'Echo',
    description: 'Echoes back the input message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' }
      },
      required: ['message']
    }
  },
  async (params) => {
    const validated = inputSchema.parse(params);
    return {
      content: [{ type: 'text', text: \`Echo: \${validated.message}\` }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
`
    );

    // Write Dockerfile
    fs.writeFileSync(
      path.join(TEST_DIR, 'Dockerfile'),
      `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY . .
CMD ["node", "index.mjs"]
`
    );

    // Build the image
    console.log('Building test container...');
    execSync(`docker build -t ${TEST_IMAGE_NAME} ${TEST_DIR}`, {
      stdio: 'inherit',
    });
  });

  afterAll(() => {
    // Cleanup: remove test image
    try {
      execSync(`docker rmi ${TEST_IMAGE_NAME}`, { stdio: 'pipe' });
    } catch {
      // Ignore if image doesn't exist
    }

    // Remove test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should build a Docker image successfully', () => {
    const result = execSync(`docker image ls ${TEST_IMAGE_NAME} --format '{{.Repository}}:{{.Tag}}'`, {
      encoding: 'utf8',
    });
    expect(result.trim()).toBe(TEST_IMAGE_NAME);
  });

  it('should respond to MCP initialize request', () => {
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    };

    const result = runMcpCommand(initMessage);
    const response = JSON.parse(result);

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();
    expect(response.result.serverInfo.name).toBe(TEST_TOOL_NAME);
    expect(response.result.capabilities.tools).toBeDefined();
  });

  it('should have tools capability in initialize response', () => {
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    };

    const result = runMcpCommand(initMessage);
    const response = JSON.parse(result);

    expect(response.result.capabilities).toHaveProperty('tools');
  });

  it('should return correct protocol version', () => {
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    };

    const result = runMcpCommand(initMessage);
    const response = JSON.parse(result);

    expect(response.result.protocolVersion).toBe('2024-11-05');
  });
});
