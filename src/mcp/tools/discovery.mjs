/**
 * AIWG MCP Discovery Tools
 *
 * Bridges the post-#1212 discoverability surface (`aiwg discover`,
 * `aiwg show`) into MCP. Adds 8 new tools:
 *
 *   - discover          (cross-type ranked search)
 *   - skill-list        (enumerate canonical skill corpus)
 *   - skill-show        (fetch SKILL.md body)
 *   - command-list      (enumerate CLI commands)
 *   - command-show      (fetch command definition)
 *   - rule-list         (enumerate rules)
 *   - rule-show         (fetch rule body)
 *   - agent-show        (fetch agent definition; agent-list pre-exists)
 *   - template-list     (enumerate templates)
 *   - template-show     (fetch raw template body)
 *
 * All are global-allowed (#1311) — work without a project root.
 *
 * @architecture @.aiwg/architecture/sketch-hermes-mcp-parity.md
 * @issues #1311 (scope split), #1313 (discover + pairs), #1320 (rule-list/show)
 */

import { z } from 'zod';
import { runAiwgCli, mcpError, mcpJson, AIWG_ROOT } from '../helpers.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Register discovery tools on the MCP server.
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerDiscoveryTools(server) {
  // ============================================================
  // discover — cross-type semantic search
  // ============================================================
  server.registerTool('discover', {
    title: 'Discover AIWG Capabilities',
    description: 'Semantic search across AIWG operational assets: skills, agents, commands, rules, flows, templates, and behaviors. Returns ranked candidates with capability summaries. Mirrors `aiwg discover --json`.',
    inputSchema: {
      phrase: z.string().describe('Natural-language capability description (e.g. "create intake form")'),
      type: z.enum(['skill', 'agent', 'command', 'rule', 'flow', 'template', 'behavior']).optional().describe('Restrict to one artifact type'),
      limit: z.number().int().min(1).max(50).default(5).describe('Maximum results (default 5)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ phrase, type, limit }) => {
    try {
      const args = ['discover', phrase, '--json', '--limit', String(limit ?? 5)];
      if (type) args.push('--type', type);
      const { stdout, stderr, code } = await runAiwgCli(args);
      if (code !== 0) {
        return mcpError(`aiwg discover failed (exit ${code}): ${stderr}`);
      }
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`discover: ${err.message}`);
    }
  });

  // ============================================================
  // skill-list / skill-show
  // ============================================================
  server.registerTool('skill-list', {
    title: 'List AIWG Skills',
    description: 'Enumerate available AIWG skills from the canonical corpus. Optional filter by name pattern.',
    inputSchema: {
      filter: z.string().optional().describe('Substring or glob filter on skill name'),
      limit: z.number().int().min(1).max(500).default(50).describe('Maximum results'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ filter, limit }) => {
    try {
      const args = ['discover', filter || '', '--type', 'skill', '--json', '--limit', String(limit ?? 50)];
      const { stdout, code, stderr } = await runAiwgCli(args);
      if (code !== 0) return mcpError(`skill-list failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`skill-list: ${err.message}`);
    }
  });

  server.registerTool('skill-show', {
    title: 'Show AIWG Skill',
    description: 'Fetch the full body of an AIWG SKILL.md by name. Returns path + content envelope.',
    inputSchema: {
      name: z.string().describe('Skill name (slug; e.g. "intake-wizard")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ name }) => {
    try {
      const { stdout, code, stderr } = await runAiwgCli(['show', 'skill', name, '--json']);
      if (code !== 0) return mcpError(`skill-show failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`skill-show: ${err.message}`);
    }
  });

  // ============================================================
  // command-list / command-show
  // ============================================================
  server.registerTool('command-list', {
    title: 'List AIWG CLI Commands',
    description: 'Enumerate available `aiwg <command>` CLI commands. The allow-list for `command-run`.',
    inputSchema: {
      filter: z.string().optional().describe('Substring filter on command name'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ filter }) => {
    try {
      const args = ['discover', filter || '', '--type', 'command', '--json', '--limit', '200'];
      const { stdout, code, stderr } = await runAiwgCli(args);
      if (code !== 0) return mcpError(`command-list failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`command-list: ${err.message}`);
    }
  });

  server.registerTool('command-show', {
    title: 'Show AIWG CLI Command Definition',
    description: 'Fetch the full spec/help text for a specific `aiwg` CLI command.',
    inputSchema: {
      name: z.string().describe('Command name (e.g. "use", "discover", "ralph")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ name }) => {
    try {
      const { stdout, code, stderr } = await runAiwgCli(['show', 'command', name, '--json']);
      if (code !== 0) return mcpError(`command-show failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`command-show: ${err.message}`);
    }
  });

  // ============================================================
  // rule-list / rule-show  (#1320)
  // ============================================================
  server.registerTool('rule-list', {
    title: 'List AIWG Rules',
    description: 'Enumerate AIWG enforcement rules (e.g. skill-discovery, no-attribution, anti-laziness, citation-policy). Top-7 CRITICAL/HIGH rules are inlined into Hermes AGENTS.md priming (skill-discovery added #1347); this tool reaches the rest.',
    inputSchema: {
      filter: z.string().optional().describe('Substring filter on rule name'),
      limit: z.number().int().min(1).max(200).default(50),
    },
    annotations: { readOnlyHint: true },
  }, async ({ filter, limit }) => {
    try {
      const args = ['discover', filter || '', '--type', 'rule', '--json', '--limit', String(limit ?? 50)];
      const { stdout, code, stderr } = await runAiwgCli(args);
      if (code !== 0) return mcpError(`rule-list failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`rule-list: ${err.message}`);
    }
  });

  server.registerTool('rule-show', {
    title: 'Show AIWG Rule',
    description: 'Fetch the full body of a specific AIWG rule by name.',
    inputSchema: {
      name: z.string().describe('Rule name (e.g. "no-attribution", "anti-laziness")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ name }) => {
    try {
      const { stdout, code, stderr } = await runAiwgCli(['show', 'rule', name, '--json']);
      if (code !== 0) return mcpError(`rule-show failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`rule-show: ${err.message}`);
    }
  });

  // ============================================================
  // agent-show  (agent-list pre-exists in server.mjs)
  // ============================================================
  server.registerTool('agent-show', {
    title: 'Show AIWG Agent Definition',
    description: 'Fetch the full agent definition (system prompt + frontmatter) by name.',
    inputSchema: {
      name: z.string().describe('Agent name (e.g. "test-engineer", "security-auditor")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ name }) => {
    try {
      const { stdout, code, stderr } = await runAiwgCli(['show', 'agent', name, '--json']);
      if (code !== 0) return mcpError(`agent-show failed: ${stderr}`);
      return mcpJson(stdout);
    } catch (err) {
      return mcpError(`agent-show: ${err.message}`);
    }
  });

  // ============================================================
  // template-list / template-show  (template-render pre-exists)
  // ============================================================
  server.registerTool('template-list', {
    title: 'List AIWG Templates',
    description: 'Enumerate AIWG document templates from the canonical corpus.',
    inputSchema: {
      framework: z.string().optional().describe('Restrict to one framework (e.g. "sdlc-complete")'),
      filter: z.string().optional().describe('Substring filter on template name'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ framework, filter }) => {
    try {
      const results = await scanTemplates(AIWG_ROOT, { framework, filter });
      return mcpJson({ count: results.length, templates: results });
    } catch (err) {
      return mcpError(`template-list: ${err.message}`);
    }
  });

  server.registerTool('template-show', {
    title: 'Show AIWG Template Body',
    description: 'Fetch the raw body of a template (un-rendered). For variable substitution use `template-render`.',
    inputSchema: {
      template: z.string().describe('Template path (e.g. "sdlc-complete/analysis-design/adr-template.md")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ template }) => {
    try {
      // Allow caller to pass either a corpus-relative path or just the template filename
      const candidates = [
        path.join(AIWG_ROOT, 'agentic/code/frameworks', template),
        path.join(AIWG_ROOT, 'agentic/code/frameworks/sdlc-complete/templates', template),
        path.resolve(template),
      ];
      for (const c of candidates) {
        try {
          // Anti-traversal: ensure resolved path stays inside AIWG_ROOT
          const resolved = path.resolve(c);
          if (!resolved.startsWith(path.resolve(AIWG_ROOT))) continue;
          const content = await fs.readFile(resolved, 'utf-8');
          return mcpJson({ path: resolved, content });
        } catch {
          // try next
        }
      }
      return mcpError(`template not found: ${template}`);
    } catch (err) {
      return mcpError(`template-show: ${err.message}`);
    }
  });
}

/**
 * Enumerate templates by walking the canonical corpus.
 * Restricted to the AIWG_ROOT subtree (no .aiwg/ project artifacts).
 */
async function scanTemplates(aiwgRoot, { framework, filter } = {}) {
  const results = [];
  const root = path.join(aiwgRoot, 'agentic/code/frameworks');
  let frameworks = [];
  try {
    frameworks = (await fs.readdir(root, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    return results;
  }
  for (const fw of frameworks) {
    if (framework && fw !== framework) continue;
    const tplRoot = path.join(root, fw, 'templates');
    await walkTemplates(tplRoot, tplRoot, fw, results, filter);
  }
  return results;
}

async function walkTemplates(base, dir, framework, out, filter) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkTemplates(base, full, framework, out, filter);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const rel = path.relative(base, full);
      const name = entry.name.replace(/\.md$/, '');
      if (filter && !name.includes(filter) && !rel.includes(filter)) continue;
      out.push({ framework, name, relativePath: rel, path: full });
    }
  }
}
