#!/usr/bin/env node

/**
 * Simple AIWG MCP Server Test
 *
 * Tests the server by spawning it and sending JSON-RPC messages via stdio.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let messageId = 1;

function createMessage(method, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('AIWG MCP Server Simple Test');
  console.log('='.repeat(60));
  console.log('');

  // Spawn the server
  const server = spawn('node', [path.join(__dirname, 'server.mjs')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses = [];
  let rl = readline.createInterface({ input: server.stdout });

  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      responses.push(msg);
    } catch (e) {
      // Not JSON, might be a log message
    }
  });

  server.stderr.on('data', (data) => {
    console.log('[Server]', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  const tests = [];
  let passed = 0;
  let failed = 0;

  async function sendAndWait(method, params = {}, timeout = 5000) {
    const msg = createMessage(method, params);
    const id = messageId - 1;

    server.stdin.write(msg + '\n');

    // Wait for response with matching ID
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const response = responses.find(r => r.id === id);
      if (response) {
        responses = responses.filter(r => r.id !== id);
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for response to ${method}`);
  }

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  // Initialize the connection
  await test('Initialize connection', async () => {
    const response = await sendAndWait('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }
    if (!response.result.serverInfo) {
      throw new Error('No serverInfo in response');
    }
    console.log(`  Server: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
  });

  // Send initialized notification
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  // List tools
  await test('List tools', async () => {
    const response = await sendAndWait('tools/list', {});
    if (response.error) {
      throw new Error(response.error.message);
    }
    const tools = response.result.tools;
    if (!tools || tools.length === 0) {
      throw new Error('No tools returned');
    }
    console.log(`  Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
  });

  // List resources
  await test('List resources', async () => {
    const response = await sendAndWait('resources/list', {});
    if (response.error) {
      throw new Error(response.error.message);
    }
    const resources = response.result.resources;
    console.log(`  Found ${resources?.length || 0} resources`);
  });

  // List prompts
  await test('List prompts', async () => {
    const response = await sendAndWait('prompts/list', {});
    if (response.error) {
      throw new Error(response.error.message);
    }
    const prompts = response.result.prompts;
    if (!prompts || prompts.length === 0) {
      throw new Error('No prompts returned');
    }
    console.log(`  Found ${prompts.length} prompts: ${prompts.map(p => p.name).join(', ')}`);
  });

  // Call workflow-run tool (dry run)
  await test('Call workflow-run tool', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'workflow-run',
      arguments: {
        prompt: 'transition to elaboration',
        dry_run: true
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const content = response.result.content[0].text;
    const parsed = JSON.parse(content);
    if (parsed.status !== 'dry_run') {
      throw new Error(`Expected dry_run status, got ${parsed.status}`);
    }
    console.log(`  Workflow detected: ${parsed.detected_workflow}`);
  });

  // Call agent-list tool
  await test('Call agent-list tool', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'agent-list',
      arguments: {
        framework: 'all'
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const content = response.result.content[0].text;
    const parsed = JSON.parse(content);
    console.log(`  Found ${parsed.count} agents`);
  });

  // Test artifact-write and artifact-read
  await test('Write and read artifact', async () => {
    const testContent = `# Test Artifact\nCreated: ${new Date().toISOString()}`;

    // Write
    const writeResponse = await sendAndWait('tools/call', {
      name: 'artifact-write',
      arguments: {
        path: 'working/mcp-test-artifact.md',
        content: testContent,
        project_dir: '.'
      }
    });
    if (writeResponse.error) {
      throw new Error(writeResponse.error.message);
    }
    const writeResult = JSON.parse(writeResponse.result.content[0].text);
    if (writeResult.status !== 'success') {
      throw new Error('Write failed');
    }

    // Read back
    const readResponse = await sendAndWait('tools/call', {
      name: 'artifact-read',
      arguments: {
        path: 'working/mcp-test-artifact.md',
        project_dir: '.'
      }
    });
    if (readResponse.error) {
      throw new Error(readResponse.error.message);
    }
    const readContent = readResponse.result.content[0].text;
    if (!readContent.includes('Test Artifact')) {
      throw new Error('Read content does not match');
    }
    console.log('  Write and read successful');
  });

  // Test reading from test fixture project
  await test('Read artifact from test project', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'artifact-read',
      arguments: {
        path: 'requirements/UC-001-create-task.md',
        project_dir: 'test/fixtures/mcp-test-project'
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const content = response.result.content[0].text;
    if (!content.includes('UC-001: Create Task')) {
      throw new Error('Expected UC-001 content');
    }
    console.log('  Read UC-001 from test project');
  });

  // Test workflow detection with test project
  await test('Workflow with test project context', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'workflow-run',
      arguments: {
        prompt: 'run security review',
        project_dir: 'test/fixtures/mcp-test-project',
        dry_run: true
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const result = JSON.parse(response.result.content[0].text);
    if (result.detected_workflow !== 'flow-security-review-cycle') {
      throw new Error(`Expected security review workflow, got ${result.detected_workflow}`);
    }
    console.log(`  Workflow: ${result.detected_workflow}`);
  });

  // Test integrated prompts for complex workflow
  await test('Complex workflow includes integrated prompts', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'workflow-run',
      arguments: {
        prompt: 'transition to elaboration',
        dry_run: true
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const result = JSON.parse(response.result.content[0].text);

    // Check workflow info is included
    if (!result.workflow_info) {
      throw new Error('Missing workflow_info');
    }
    if (!result.workflow_info.isComplex) {
      throw new Error('Expected complex workflow');
    }
    if (result.workflow_info.steps !== 5) {
      throw new Error(`Expected 5 steps, got ${result.workflow_info.steps}`);
    }

    // Check integrated prompts
    if (!result.integrated_prompts || result.integrated_prompts.length === 0) {
      throw new Error('Missing integrated_prompts');
    }

    const decomposePrompt = result.integrated_prompts.find(p => p.name === 'decompose-task');
    if (!decomposePrompt || !decomposePrompt.applied) {
      throw new Error('decompose-task prompt not applied for complex workflow');
    }

    const parallelPrompt = result.integrated_prompts.find(p => p.name === 'parallel-execution');
    if (!parallelPrompt || !parallelPrompt.applied) {
      throw new Error('parallel-execution prompt not applied for multi-step workflow');
    }

    const recoveryPrompt = result.integrated_prompts.find(p => p.name === 'recovery-protocol');
    if (!recoveryPrompt) {
      throw new Error('recovery-protocol prompt not available');
    }

    console.log(`  Workflow: ${result.detected_workflow}`);
    console.log(`  Steps: ${result.workflow_info.steps}, Complex: ${result.workflow_info.isComplex}`);
    console.log(`  Integrated prompts: ${result.integrated_prompts.map(p => p.name).join(', ')}`);
  });

  // Test simple workflow has fewer prompts
  await test('Simple workflow skips decomposition', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'workflow-run',
      arguments: {
        prompt: 'project status',
        dry_run: true
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const result = JSON.parse(response.result.content[0].text);

    // Check workflow is not complex
    if (result.workflow_info.isComplex) {
      throw new Error('project-status should not be complex');
    }

    // decompose-task should not be applied for simple workflows
    const decomposePrompt = result.integrated_prompts.find(p => p.name === 'decompose-task');
    if (decomposePrompt) {
      throw new Error('decompose-task should not be applied for simple workflow');
    }

    console.log(`  Workflow: ${result.detected_workflow}`);
    console.log(`  Steps: ${result.workflow_info.steps}, Complex: ${result.workflow_info.isComplex}`);
  });

  // Test skip_decomposition flag
  await test('Skip decomposition flag works', async () => {
    const response = await sendAndWait('tools/call', {
      name: 'workflow-run',
      arguments: {
        prompt: 'transition to elaboration',
        dry_run: true,
        skip_decomposition: true
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const result = JSON.parse(response.result.content[0].text);

    // decompose-task should not be applied when skip_decomposition is true
    const decomposePrompt = result.integrated_prompts.find(p => p.name === 'decompose-task');
    if (decomposePrompt) {
      throw new Error('decompose-task should be skipped when skip_decomposition=true');
    }

    // parallel-execution should still be applied
    const parallelPrompt = result.integrated_prompts.find(p => p.name === 'parallel-execution');
    if (!parallelPrompt || !parallelPrompt.applied) {
      throw new Error('parallel-execution should still be applied');
    }

    console.log(`  Skip decomposition honored, parallel-execution still applied`);
  });

  // Get decompose-task prompt
  await test('Get decompose-task prompt', async () => {
    const response = await sendAndWait('prompts/get', {
      name: 'decompose-task',
      arguments: {
        task: 'Build authentication system',
        max_subtasks: '5'  // MCP passes all args as strings
      }
    });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const messages = response.result.messages;
    if (!messages || messages.length === 0) {
      throw new Error('No messages returned');
    }
    console.log(`  Prompt has ${messages.length} messages`);
  });

  // Cleanup
  server.kill();

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
