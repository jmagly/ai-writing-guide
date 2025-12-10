/**
 * AIWG MCP Server
 *
 * Model Context Protocol server exposing AIWG capabilities.
 * Follows MCP 2025-11-25 specification.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve AIWG root directory
const AIWG_ROOT = process.env.AIWG_ROOT ||
  path.join(process.env.HOME || '', '.local/share/ai-writing-guide');

// Framework paths
const FRAMEWORKS = {
  'sdlc-complete': path.join(AIWG_ROOT, 'agentic/code/frameworks/sdlc-complete'),
  'media-marketing-kit': path.join(AIWG_ROOT, 'agentic/code/frameworks/media-marketing-kit')
};

/**
 * Create and configure the AIWG MCP Server
 */
export function createServer() {
  const server = new McpServer({
    name: 'aiwg',
    version: '1.0.0'
  });

  // ============================================
  // TOOLS
  // ============================================

  // Tool: workflow-run
  server.registerTool('workflow-run', {
    title: 'Run AIWG Workflow',
    description: 'Execute an AIWG workflow (phase transitions, reviews, artifact generation)',
    inputSchema: {
      prompt: z.string().describe('Natural language workflow request or command name'),
      guidance: z.string().optional().describe('Strategic guidance to influence execution'),
      framework: z.enum(['sdlc-complete', 'media-marketing-kit', 'auto']).default('auto')
        .describe('Framework to use (auto-detected from prompt if not specified)'),
      project_dir: z.string().default('.').describe('Project directory path'),
      dry_run: z.boolean().default(false).describe('Show what would be executed without running')
    }
  }, async ({ prompt, guidance, framework, project_dir, dry_run }) => {
    try {
      // Detect framework from prompt if auto
      const detectedFramework = framework === 'auto'
        ? detectFramework(prompt)
        : framework;

      // Parse workflow from prompt
      const workflow = parseWorkflow(prompt);

      if (dry_run) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'dry_run',
              detected_framework: detectedFramework,
              detected_workflow: workflow,
              prompt,
              guidance,
              project_dir,
              message: 'Workflow would be executed with these parameters'
            }, null, 2)
          }]
        };
      }

      // For now, return workflow detection info
      // Full implementation will integrate with AIWG CLI
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'ready',
            framework: detectedFramework,
            workflow,
            prompt,
            guidance,
            project_dir,
            message: 'Workflow parsed. Full execution requires AIWG CLI integration.'
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  });

  // Tool: artifact-read
  server.registerTool('artifact-read', {
    title: 'Read AIWG Artifact',
    description: 'Read artifact from .aiwg/ directory',
    inputSchema: {
      path: z.string().describe('Path relative to .aiwg/ (e.g., "requirements/UC-001.md")'),
      project_dir: z.string().default('.').describe('Project directory path')
    }
  }, async ({ path: artifactPath, project_dir }) => {
    try {
      const fullPath = path.join(project_dir, '.aiwg', artifactPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading artifact: ${error.message}`
        }],
        isError: true
      };
    }
  });

  // Tool: artifact-write
  server.registerTool('artifact-write', {
    title: 'Write AIWG Artifact',
    description: 'Write artifact to .aiwg/ directory',
    inputSchema: {
      path: z.string().describe('Path relative to .aiwg/'),
      content: z.string().describe('Artifact content'),
      project_dir: z.string().default('.').describe('Project directory path')
    }
  }, async ({ path: artifactPath, content, project_dir }) => {
    try {
      const fullPath = path.join(project_dir, '.aiwg', artifactPath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            path: fullPath,
            message: 'Artifact written successfully'
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error writing artifact: ${error.message}`
        }],
        isError: true
      };
    }
  });

  // Tool: template-render
  server.registerTool('template-render', {
    title: 'Render AIWG Template',
    description: 'Render AIWG template with provided variables',
    inputSchema: {
      template: z.string().describe('Template path (e.g., "sdlc/intake/project-intake-template.md")'),
      variables: z.record(z.string()).optional().describe('Template variable substitutions')
    }
  }, async ({ template, variables = {} }) => {
    try {
      // Determine framework and template path
      const [framework, ...pathParts] = template.split('/');
      const frameworkPath = FRAMEWORKS[framework] || FRAMEWORKS['sdlc-complete'];
      const templatePath = path.join(frameworkPath, 'templates', ...pathParts);

      // Read template
      let content = await fs.readFile(templatePath, 'utf-8');

      // Simple variable substitution
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
      }

      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error rendering template: ${error.message}`
        }],
        isError: true
      };
    }
  });

  // Tool: agent-list
  server.registerTool('agent-list', {
    title: 'List AIWG Agents',
    description: 'List available AIWG agents',
    inputSchema: {
      framework: z.enum(['sdlc-complete', 'media-marketing-kit', 'all']).default('all')
        .describe('Framework to list agents from'),
      category: z.string().optional().describe('Filter by category (e.g., "security", "testing")')
    }
  }, async ({ framework, category }) => {
    try {
      const agents = [];

      const frameworksToSearch = framework === 'all'
        ? Object.keys(FRAMEWORKS)
        : [framework];

      for (const fw of frameworksToSearch) {
        const agentDir = path.join(FRAMEWORKS[fw], 'agents');
        try {
          const files = await fs.readdir(agentDir);
          for (const file of files) {
            if (file.endsWith('.md') && !file.startsWith('README')) {
              const agentName = file.replace('.md', '');
              if (!category || agentName.includes(category)) {
                agents.push({
                  name: agentName,
                  framework: fw,
                  path: `aiwg://agents/${fw}/${agentName}`
                });
              }
            }
          }
        } catch {
          // Framework directory might not exist
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: agents.length,
            agents
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing agents: ${error.message}`
        }],
        isError: true
      };
    }
  });

  // ============================================
  // RESOURCES
  // ============================================

  // Resource: prompts catalog
  server.registerResource(
    'prompts-catalog',
    'aiwg://prompts/catalog',
    {
      title: 'AIWG Prompts Catalog',
      description: 'List of all available AIWG prompt templates',
      mimeType: 'application/json'
    },
    async () => {
      const promptsDir = path.join(AIWG_ROOT, 'agentic/code/addons/aiwg-utils/prompts');
      const catalog = await scanDirectory(promptsDir, 'prompts');
      return {
        contents: [{
          uri: 'aiwg://prompts/catalog',
          text: JSON.stringify(catalog, null, 2)
        }]
      };
    }
  );

  // Resource: templates catalog
  server.registerResource(
    'templates-catalog',
    'aiwg://templates/catalog',
    {
      title: 'AIWG Templates Catalog',
      description: 'List of all available AIWG document templates',
      mimeType: 'application/json'
    },
    async () => {
      const catalogs = {};
      for (const [fw, fwPath] of Object.entries(FRAMEWORKS)) {
        const templatesDir = path.join(fwPath, 'templates');
        try {
          catalogs[fw] = await scanDirectory(templatesDir, 'templates');
        } catch {
          catalogs[fw] = [];
        }
      }
      return {
        contents: [{
          uri: 'aiwg://templates/catalog',
          text: JSON.stringify(catalogs, null, 2)
        }]
      };
    }
  );

  // Resource: agents catalog
  server.registerResource(
    'agents-catalog',
    'aiwg://agents/catalog',
    {
      title: 'AIWG Agents Catalog',
      description: 'List of all available AIWG agents',
      mimeType: 'application/json'
    },
    async () => {
      const catalogs = {};
      for (const [fw, fwPath] of Object.entries(FRAMEWORKS)) {
        const agentsDir = path.join(fwPath, 'agents');
        try {
          catalogs[fw] = await scanDirectory(agentsDir, 'agents');
        } catch {
          catalogs[fw] = [];
        }
      }
      return {
        contents: [{
          uri: 'aiwg://agents/catalog',
          text: JSON.stringify(catalogs, null, 2)
        }]
      };
    }
  );

  // Dynamic resource: specific prompt
  server.registerResource(
    'prompt',
    new ResourceTemplate('aiwg://prompts/{category}/{name}', { list: undefined }),
    {
      title: 'AIWG Prompt',
      description: 'Retrieve specific AIWG prompt template'
    },
    async (uri, { category, name }) => {
      const promptPath = path.join(
        AIWG_ROOT,
        'agentic/code/addons/aiwg-utils/prompts',
        category,
        `${name}.md`
      );
      try {
        const content = await fs.readFile(promptPath, 'utf-8');
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch {
        return {
          contents: [{
            uri: uri.href,
            text: `Prompt not found: ${category}/${name}`
          }]
        };
      }
    }
  );

  // Dynamic resource: specific template
  server.registerResource(
    'template',
    new ResourceTemplate('aiwg://templates/{framework}/{category}/{name}', { list: undefined }),
    {
      title: 'AIWG Template',
      description: 'Retrieve specific AIWG template'
    },
    async (uri, { framework, category, name }) => {
      const templatePath = path.join(
        FRAMEWORKS[framework] || FRAMEWORKS['sdlc-complete'],
        'templates',
        category,
        `${name}.md`
      );
      try {
        const content = await fs.readFile(templatePath, 'utf-8');
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch {
        return {
          contents: [{
            uri: uri.href,
            text: `Template not found: ${framework}/${category}/${name}`
          }]
        };
      }
    }
  );

  // Dynamic resource: specific agent
  server.registerResource(
    'agent',
    new ResourceTemplate('aiwg://agents/{framework}/{name}', { list: undefined }),
    {
      title: 'AIWG Agent',
      description: 'Retrieve specific AIWG agent definition'
    },
    async (uri, { framework, name }) => {
      const agentPath = path.join(
        FRAMEWORKS[framework] || FRAMEWORKS['sdlc-complete'],
        'agents',
        `${name}.md`
      );
      try {
        const content = await fs.readFile(agentPath, 'utf-8');
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch {
        return {
          contents: [{
            uri: uri.href,
            text: `Agent not found: ${framework}/${name}`
          }]
        };
      }
    }
  );

  // ============================================
  // PROMPTS (MCP Prompt Templates)
  // ============================================

  // Prompt: decompose-task
  server.registerPrompt(
    'decompose-task',
    {
      title: 'Task Decomposition',
      description: 'Break down complex task into manageable subtasks (≤7 for cognitive limit)',
      argsSchema: {
        task: z.string().describe('Complex task to decompose'),
        max_subtasks: z.string().default('7').describe('Maximum subtasks (cognitive limit)')
      }
    },
    ({ task, max_subtasks }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `## Task Decomposition Request

Break down the following task into ${max_subtasks} or fewer concrete, actionable subtasks.

**Task**: ${task}

**Guidelines**:
1. Each subtask should be independently executable
2. Subtasks should have clear completion criteria
3. Order by logical dependency (prerequisites first)
4. Identify which subtasks can run in parallel
5. Flag any subtasks that require user input

**Output Format**:
For each subtask, provide:
- ID: Sequential identifier
- Description: Clear action statement
- Dependencies: List of prerequisite subtask IDs
- Parallelizable: Yes/No
- Requires Input: Yes/No (if Yes, specify what)`
        }
      }]
    })
  );

  // Prompt: parallel-execution
  server.registerPrompt(
    'parallel-execution',
    {
      title: 'Parallel Execution Guide',
      description: 'Identify and coordinate parallelizable work items',
      argsSchema: {
        tasks: z.string().describe('List of tasks to analyze for parallelization')
      }
    },
    ({ tasks }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `## Parallel Execution Analysis

Analyze the following tasks and identify which can be executed in parallel.

**Tasks**:
${tasks}

**Analysis Required**:
1. **Dependency Graph**: Map task dependencies
2. **Parallel Groups**: Group tasks that can run simultaneously
3. **Critical Path**: Identify the longest sequential chain
4. **Resource Conflicts**: Flag tasks that compete for same resources
5. **Coordination Points**: Where parallel streams must synchronize

**Output**: Provide an execution plan with parallel lanes and sync points.`
        }
      }]
    })
  );

  // Prompt: recovery-protocol
  server.registerPrompt(
    'recovery-protocol',
    {
      title: 'Recovery Protocol',
      description: 'Structured error recovery using PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE',
      argsSchema: {
        error: z.string().describe('Error message or description'),
        context: z.string().optional().describe('Additional context about what was being attempted')
      }
    },
    ({ error, context }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `## Recovery Protocol

An error has occurred. Follow the structured recovery protocol.

**Error**: ${error}
${context ? `**Context**: ${context}` : ''}

**Protocol**:

### 1. PAUSE
Stop execution and preserve current state.
- What was the exact operation being performed?
- What state needs to be preserved?

### 2. DIAGNOSE
Analyze the error and classify it:
- **Syntax Error**: Fix formatting/structure
- **Schema Mismatch**: Re-inspect target (Rule 4: Grounding)
- **Logic Error**: Decompose further
- **Loop Detected**: Change approach entirely
- **External Failure**: Network, API, or resource issue

### 3. ADAPT
Choose a recovery strategy:
- Simple retry (transient failures)
- Modified approach (logic issues)
- Alternative path (blocked resources)
- Partial completion (scope reduction)

### 4. RETRY
Execute adapted approach (max 3 attempts).
Track what was tried and outcomes.

### 5. ESCALATE
If retry fails, prepare structured escalation:
- What was attempted
- What failed
- Current state
- Recommended next steps
- Human decision required`
        }
      }]
    })
  );

  return server;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Detect framework from prompt keywords
 */
function detectFramework(prompt) {
  const lower = prompt.toLowerCase();

  // Marketing keywords
  const marketingKeywords = ['campaign', 'marketing', 'brand', 'content', 'social', 'seo', 'analytics'];
  if (marketingKeywords.some(kw => lower.includes(kw))) {
    return 'media-marketing-kit';
  }

  // Default to SDLC
  return 'sdlc-complete';
}

/**
 * Parse workflow command from natural language prompt
 */
function parseWorkflow(prompt) {
  const lower = prompt.toLowerCase();

  // Phase transitions
  if (lower.includes('transition') || lower.includes('move to')) {
    if (lower.includes('elaboration')) return 'flow-inception-to-elaboration';
    if (lower.includes('construction')) return 'flow-elaboration-to-construction';
    if (lower.includes('transition')) return 'flow-construction-to-transition';
  }

  // Reviews
  if (lower.includes('security review') || lower.includes('security audit')) {
    return 'flow-security-review-cycle';
  }
  if (lower.includes('architecture') && (lower.includes('review') || lower.includes('evolve'))) {
    return 'flow-architecture-evolution';
  }
  if (lower.includes('test') && (lower.includes('run') || lower.includes('execute'))) {
    return 'flow-test-strategy-execution';
  }

  // Deployment
  if (lower.includes('deploy') && lower.includes('production')) {
    return 'flow-deploy-to-production';
  }

  // Status
  if (lower.includes('status') || lower.includes('where are we')) {
    return 'project-status';
  }

  // Gate check
  if (lower.includes('gate') || lower.includes('ready')) {
    return 'flow-gate-check';
  }

  // Default: return as potential command name
  return prompt.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/**
 * Scan directory for files
 */
async function scanDirectory(dir, type) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subResults = await scanDirectory(path.join(dir, entry.name), type);
        results.push(...subResults.map(r => ({
          ...r,
          category: entry.name
        })));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({
          name: entry.name.replace('.md', ''),
          path: path.join(dir, entry.name),
          uri: `aiwg://${type}/${entry.name.replace('.md', '')}`
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();

  console.error('[AIWG MCP] Starting server...');
  await server.connect(transport);
  console.error('[AIWG MCP] Server connected via stdio transport');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[AIWG MCP] Shutting down...');
    await server.close();
    process.exit(0);
  });
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch(error => {
    console.error('[AIWG MCP] Fatal error:', error);
    process.exit(1);
  });
}
