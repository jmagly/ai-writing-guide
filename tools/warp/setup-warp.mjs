#!/usr/bin/env node
/**
 * Setup Warp - Intelligent WARP.md Merge Tool
 *
 * Mirrors the proven pattern from aiwg-setup-project and aiwg-update-claude.
 * Aggregates all AIWG agents and commands into a single WARP.md file for Warp Terminal.
 *
 * Usage:
 *   node tools/warp/setup-warp.mjs [options]
 *
 * Options:
 *   --target <path>    Target directory (default: cwd)
 *   --mode <type>      Mode: general, sdlc, or both (default: both)
 *   --update           Update mode (fail if no WARP.md exists)
 *   --dry-run          Preview changes without writing
 *   --force            Overwrite WARP.md (discard user content)
 *
 * Modes:
 *   general  - Deploy only general-purpose agents and commands
 *   sdlc     - Deploy only SDLC Complete framework agents and commands
 *   both     - Deploy everything (default)
 */

import fs from 'fs';
import path from 'path';

// AIWG-managed section headings (will be replaced on update)
const AIWG_MANAGED_SECTIONS = [
  'AIWG SDLC Framework',
  'AIWG SDLC Framework',
  'SDLC Agents',
  'SDLC Commands',
  'Platform Compatibility',
  'Core Orchestrator',
  'Core Platform Orchestrator',
  'Natural Language',
  'Natural Language Command Translation',
  'Phase Overview',
  'Quick Start',
  'Common Patterns',
  'Troubleshooting',
  'Resources'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    target: process.cwd(),
    mode: 'both',
    update: false,
    dryRun: false,
    force: false
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--update') cfg.update = true;
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
  }
  return cfg;
}

/**
 * Resolve AIWG installation path
 * Priority: $AIWG_ROOT -> ~/.local/share/ai-writing-guide -> /usr/local/share/ai-writing-guide
 */
function resolveAIWGRoot() {
  const candidates = [
    process.env.AIWG_ROOT,
    path.join(process.env.HOME || '', '.local', 'share', 'ai-writing-guide'),
    '/usr/local/share/ai-writing-guide',
    // Development fallback (repo root)
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const testPath = path.join(candidate, 'agentic', 'code', 'frameworks', 'sdlc-complete');
    if (fs.existsSync(testPath)) {
      return candidate;
    }
  }

  throw new Error(
    'AIWG installation not found. Please install AIWG first:\n' +
    '  curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash\n\n' +
    'Or set AIWG_ROOT environment variable if installed elsewhere.'
  );
}

/**
 * Parse markdown into sections based on ## headings
 */
function parseMarkdownSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^##\s+(.+)$/);

    if (match) {
      // New section found
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: match[1].trim(),
        startLine: i,
        lines: [line]
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      // Before first ## heading (document header)
      if (sections.length === 0) {
        sections.push({
          heading: '__HEADER__',
          startLine: 0,
          lines: [line]
        });
      } else {
        sections[sections.length - 1].lines.push(line);
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Check if a section heading is AIWG-managed (will be replaced)
 */
function isAIWGManagedSection(heading) {
  if (heading === '__HEADER__') return false;
  return AIWG_MANAGED_SECTIONS.some(managed =>
    heading.toLowerCase().includes(managed.toLowerCase())
  );
}

/**
 * List markdown files in a directory (non-recursive)
 */
function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'DEVELOPMENT_GUIDE.md'];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !defaultExcluded.includes(e.name))
    .map((e) => path.join(dir, e.name));
}

/**
 * Transform agent markdown file to WARP.md section format
 */
function transformAgentToSection(agentPath) {
  const content = fs.readFileSync(agentPath, 'utf8');
  const name = path.basename(agentPath, '.md');

  // Extract frontmatter and body
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;

  const [, frontmatter, body] = fmMatch;

  // Parse frontmatter
  const fm = {};
  frontmatter.split('\n').forEach(line => {
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (match) {
      fm[match[1]] = match[2].trim();
    }
  });

  // Extract description and tools
  const description = fm.description || '';
  const tools = fm['allowed-tools'] || '';

  // Format as WARP.md section
  let section = `### ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n`;
  if (tools) {
    section += `**Tools**: ${tools}\n\n`;
  }
  if (description) {
    section += `**Purpose**: ${description}\n\n`;
  }

  // Add body content (strip excessive blank lines)
  const cleanBody = body.trim().replace(/\n{3,}/g, '\n\n');
  if (cleanBody) {
    section += cleanBody + '\n';
  }

  return section;
}

/**
 * Transform command markdown file to WARP.md section format
 */
function transformCommandToSection(commandPath) {
  const content = fs.readFileSync(commandPath, 'utf8');
  const name = path.basename(commandPath, '.md');

  // Extract frontmatter and body
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return null;

  const [, frontmatter, body] = fmMatch;

  // Parse frontmatter
  const fm = {};
  frontmatter.split('\n').forEach(line => {
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (match) {
      fm[match[1]] = match[2].trim();
    }
  });

  // Extract description
  const description = fm.description || '';

  // Format as WARP.md section
  let section = `### /${name}\n\n`;
  if (description) {
    section += `**Purpose**: ${description}\n\n`;
  }

  // Add usage/parameters section if present in body
  const cleanBody = body.trim().replace(/\n{3,}/g, '\n\n');
  if (cleanBody) {
    // Extract first paragraph or two for context
    const paragraphs = cleanBody.split('\n\n');
    const preview = paragraphs.slice(0, 2).join('\n\n');
    section += preview + '\n';
  }

  return section;
}

/**
 * Generate AIWG content section (aggregate agents and commands)
 */
function generateAIWGContent(aiwgRoot, mode) {
  const timestamp = new Date().toISOString();
  let content = '';

  // Add marker comments
  content += '<!-- AIWG SDLC Framework (auto-updated) -->\n';
  content += `<!-- Last updated: ${timestamp} -->\n\n`;
  content += '---\n\n';

  // Add framework overview
  content += '## AIWG SDLC Framework\n\n';
  content += `**AIWG Installation**: ${aiwgRoot}\n\n`;
  content += 'This project uses the **AIWG SDLC framework** for software development lifecycle management.\n\n';
  content += '### What is AIWG?\n\n';
  content += 'AIWG provides:\n\n';
  content += '- **58+ specialized agents** covering all lifecycle phases (Inception → Elaboration → Construction → Transition → Production)\n';
  content += '- **42+ commands** for project management, security, testing, deployment, and traceability\n';
  content += '- **100+ templates** for requirements, architecture, testing, security, deployment artifacts\n';
  content += '- **Phase-based workflows** with gate criteria and milestone tracking\n';
  content += '- **Multi-agent orchestration** patterns for collaborative artifact generation\n\n';

  // Aggregate agents
  content += '---\n\n';
  content += '## SDLC Agents (Specialized Roles)\n\n';

  const agentPaths = [];
  if (mode === 'general' || mode === 'both') {
    const generalAgents = path.join(aiwgRoot, 'agents');
    if (fs.existsSync(generalAgents)) {
      agentPaths.push(...listMdFiles(generalAgents));
    }
  }

  // Addon agents (dynamically discovered)
  const addonsRoot = path.join(aiwgRoot, 'agentic', 'code', 'addons');
  if (fs.existsSync(addonsRoot)) {
    const addonDirs = fs.readdirSync(addonsRoot, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(addonsRoot, e.name, 'agents'));

    for (const addonAgentsDir of addonDirs) {
      if (fs.existsSync(addonAgentsDir)) {
        agentPaths.push(...listMdFiles(addonAgentsDir));
      }
    }
  }

  if (mode === 'sdlc' || mode === 'both') {
    const sdlcAgents = path.join(aiwgRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    if (fs.existsSync(sdlcAgents)) {
      agentPaths.push(...listMdFiles(sdlcAgents));
    }
  }

  for (const agentPath of agentPaths) {
    const section = transformAgentToSection(agentPath);
    if (section) {
      content += section + '\n';
    }
  }

  // Aggregate commands
  content += '---\n\n';
  content += '## SDLC Commands (Workflows)\n\n';

  const commandPaths = [];
  if (mode === 'general' || mode === 'both') {
    const generalCommands = path.join(aiwgRoot, 'commands');
    if (fs.existsSync(generalCommands)) {
      commandPaths.push(...listMdFiles(generalCommands));
    }
  }

  // Addon commands (dynamically discovered)
  if (fs.existsSync(addonsRoot)) {
    const addonCommandDirs = fs.readdirSync(addonsRoot, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(addonsRoot, e.name, 'commands'));

    for (const addonCommandsDir of addonCommandDirs) {
      if (fs.existsSync(addonCommandsDir)) {
        commandPaths.push(...listMdFiles(addonCommandsDir));
      }
    }
  }

  if (mode === 'sdlc' || mode === 'both') {
    const sdlcCommands = path.join(aiwgRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
    if (fs.existsSync(sdlcCommands)) {
      commandPaths.push(...listMdFiles(sdlcCommands));
    }
  }

  for (const commandPath of commandPaths) {
    const section = transformCommandToSection(commandPath);
    if (section) {
      content += section + '\n';
    }
  }

  // Add natural language section
  content += '---\n\n';
  content += '## Natural Language Command Translation\n\n';
  content += 'You can use natural language to trigger SDLC workflows. Examples:\n\n';
  content += '**Phase Transitions**:\n';
  content += '- "Let\'s transition to Elaboration"\n';
  content += '- "Move to Construction"\n';
  content += '- "Ready to deploy"\n\n';
  content += '**Review Cycles**:\n';
  content += '- "Run security review"\n';
  content += '- "Execute test suite"\n';
  content += '- "Check compliance"\n\n';
  content += '**Artifact Generation**:\n';
  content += '- "Create architecture baseline"\n';
  content += '- "Generate SAD"\n';
  content += '- "Build test plan"\n\n';
  content += '**Status Checks**:\n';
  content += '- "Where are we?"\n';
  content += '- "Can we transition?"\n';
  content += '- "Check project health"\n\n';

  // Add resources
  content += '---\n\n';
  content += '## Resources\n\n';
  content += `- **AIWG Framework**: ${aiwgRoot}/agentic/code/frameworks/sdlc-complete/README.md\n`;
  content += `- **Template Library**: ${aiwgRoot}/agentic/code/frameworks/sdlc-complete/templates/\n`;
  content += `- **Agent Catalog**: ${aiwgRoot}/agentic/code/frameworks/sdlc-complete/agents/\n`;
  content += `- **Natural Language Guide**: ${aiwgRoot}/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md\n`;
  content += '- **Warp Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules\n\n';

  return content;
}

/**
 * Merge WARP.md intelligently (preserve user content, replace AIWG sections)
 */
function mergeWarpMd(existingContent, aiwgContent, force) {
  if (!existingContent || force) {
    // No existing content or force mode - use AIWG content directly
    return '# Project Context\n\n' +
           '<!-- Add your project-specific context above this line -->\n\n' +
           aiwgContent;
  }

  // Parse existing content
  const sections = parseMarkdownSections(existingContent);

  // Separate user sections from AIWG sections
  const userSections = sections.filter(s => !isAIWGManagedSection(s.heading));
  const preservedUserContent = userSections.map(s => s.lines.join('\n')).join('\n');

  // Merge: user content first, then AIWG content
  return preservedUserContent.trim() + '\n\n' + aiwgContent;
}

/**
 * Create backup of existing WARP.md
 */
function createBackup(warpMdPath) {
  if (!fs.existsSync(warpMdPath)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${warpMdPath}.backup-${timestamp}`;
  fs.copyFileSync(warpMdPath, backupPath);
  return backupPath;
}

/**
 * Validate WARP.md structure
 */
function validateWarpMd(warpMdPath) {
  if (!fs.existsSync(warpMdPath)) {
    return {
      valid: false,
      errors: ['WARP.md not found']
    };
  }

  const content = fs.readFileSync(warpMdPath, 'utf8');
  const errors = [];
  const warnings = [];

  // Check for AIWG section
  if (!content.includes('## AIWG')) {
    errors.push('Missing AIWG section');
  }

  // Check for agents
  const agentCount = (content.match(/^### /gm) || []).length;
  if (agentCount < 10) {
    warnings.push(`Only ${agentCount} agents found (expected 58+)`);
  }

  // Check for commands
  const commandCount = (content.match(/^### \//gm) || []).length;
  if (commandCount < 10) {
    warnings.push(`Only ${commandCount} commands found (expected 42+)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    agentCount,
    commandCount
  };
}

/**
 * Main execution
 */
(function main() {
  try {
    const cfg = parseArgs();
    const { target, mode, update, dryRun, force } = cfg;

    console.log('');
    console.log('=======================================================================');
    console.log('Warp Terminal Setup');
    console.log('=======================================================================');
    console.log('');

    // Step 1: Resolve AIWG installation
    console.log('[1/7] Resolving AIWG installation...');
    const aiwgRoot = resolveAIWGRoot();
    console.log(`✓ AIWG installation: ${aiwgRoot}`);
    console.log('');

    // Step 2: Check existing WARP.md
    console.log('[2/7] Checking existing WARP.md...');
    const warpMdPath = path.join(target, 'WARP.md');
    const existingContent = fs.existsSync(warpMdPath)
      ? fs.readFileSync(warpMdPath, 'utf8')
      : null;

    if (update && !existingContent) {
      console.error('❌ Error: Update mode requires existing WARP.md');
      console.error('   Use setup mode (without --update) for first-time setup');
      process.exit(1);
    }

    if (existingContent) {
      const hasAIWG = existingContent.includes('## AIWG');
      console.log(`✓ Found existing WARP.md (${hasAIWG ? 'with' : 'without'} AIWG section)`);
    } else {
      console.log('ℹ No existing WARP.md found (will create new)');
    }
    console.log('');

    // Step 3: Generate AIWG content
    console.log('[3/7] Generating AIWG content...');
    const aiwgContent = generateAIWGContent(aiwgRoot, mode);
    console.log(`✓ Generated AIWG content (mode: ${mode})`);
    console.log('');

    // Step 4: Create backup (if updating existing)
    if (existingContent && !dryRun) {
      console.log('[4/7] Creating backup...');
      const backupPath = createBackup(warpMdPath);
      if (backupPath) {
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
      }
    } else {
      console.log('[4/7] Creating backup...');
      console.log('ℹ Skipped (no existing file or dry-run mode)');
    }
    console.log('');

    // Step 5: Merge content
    console.log('[5/7] Merging content...');
    const finalContent = mergeWarpMd(existingContent, aiwgContent, force);
    if (force && existingContent) {
      console.log('⚠️  Force mode: User content discarded');
    } else if (existingContent) {
      console.log('✓ User content preserved');
    }
    console.log('');

    // Step 6: Write WARP.md
    console.log('[6/7] Writing WARP.md...');
    if (dryRun) {
      console.log('[dry-run] Would write WARP.md');
      console.log('');
      console.log('Preview (first 500 chars):');
      console.log(finalContent.substring(0, 500) + '...');
    } else {
      fs.writeFileSync(warpMdPath, finalContent, 'utf8');
      console.log(`✓ WARP.md ${existingContent ? 'updated' : 'created'}: ${warpMdPath}`);
    }
    console.log('');

    // Step 7: Validate
    console.log('[7/7] Validating setup...');
    if (!dryRun) {
      const validation = validateWarpMd(warpMdPath);
      if (validation.valid) {
        console.log('✓ WARP.md structure valid');
        console.log(`✓ Agents: ${validation.agentCount}`);
        console.log(`✓ Commands: ${validation.commandCount}`);
        if (validation.warnings.length > 0) {
          console.log('');
          validation.warnings.forEach(w => console.log(`⚠️  ${w}`));
        }
      } else {
        console.log('❌ Validation errors:');
        validation.errors.forEach(e => console.log(`   - ${e}`));
      }
    } else {
      console.log('[dry-run] Validation skipped');
    }
    console.log('');

    // Success message
    console.log('=======================================================================');
    console.log('Warp Setup Complete ✓');
    console.log('=======================================================================');
    console.log('');
    console.log('Next Steps:');
    console.log('');
    console.log('1. Open project in Warp Terminal:');
    console.log(`   cd ${target}`);
    console.log('');
    console.log('2. Warp will automatically load WARP.md');
    console.log('   Or manually trigger: warp /init');
    console.log('');
    console.log('3. Test natural language commands:');
    console.log('   - "Let\'s transition to Elaboration"');
    console.log('   - "Run security review"');
    console.log('   - "Where are we?"');
    console.log('');
    console.log('Resources:');
    console.log(`- AIWG Framework: ${aiwgRoot}/agentic/code/frameworks/sdlc-complete/README.md`);
    console.log('- Warp Docs: https://docs.warp.dev/knowledge-and-collaboration/rules');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
})();
