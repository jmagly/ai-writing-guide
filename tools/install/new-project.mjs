#!/usr/bin/env node
/**
 * New Project Scaffolder
 *
 * Create a minimal project structure with intake templates, settings.json configuration,
 * and a README tailored to the AI Writing Guide framework. Intended to be invoked via
 * alias `aiwg-new` and run in the target project directory.
 *
 * Features:
 * - Copies SDLC intake templates
 * - Creates/updates .claude/settings.json with SDLC documentation access
 * - Optionally deploys agents
 * - Initializes git repository
 *
 * Usage:
 *   node tools/install/new-project.mjs [--name <project-name>] [--no-agents] [--provider <claude|openai>]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

function parseArgs() {
  const args = process.argv.slice(2);
  let name = path.basename(process.cwd());
  let withAgents = true; // deploy agents by default
  let provider = 'claude';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name' && args[i + 1]) name = args[++i];
    else if (a === '--no-agents') withAgents = false;
    else if (a === '--provider' && args[i + 1]) provider = String(args[++i]).toLowerCase();
  }
  return { name, withAgents, provider };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function copyFile(src, dest) {
  if (fs.existsSync(dest)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * Detect AIWG installation path
 * Tries multiple strategies:
 * 1. Check if we're running from the installed location
 * 2. Check standard install location (~/.local/share/ai-writing-guide)
 * 3. Use repo root if running from source
 */
function detectAiwgPath(repoRoot) {
  // Standard install location
  const stdInstall = path.join(os.homedir(), '.local', 'share', 'ai-writing-guide');
  if (fs.existsSync(path.join(stdInstall, 'agentic', 'code', 'frameworks', 'sdlc-complete'))) {
    return stdInstall;
  }
  // Running from source
  if (fs.existsSync(path.join(repoRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete'))) {
    return repoRoot;
  }
  // Fallback to repo root
  return repoRoot;
}

/**
 * Create or update .claude/settings.json with SDLC documentation access
 */
function createOrUpdateSettings(aiwgPath, provider) {
  const settingsDir = path.resolve(process.cwd(), '.claude');
  const settingsPath = path.join(settingsDir, 'settings.json');

  ensureDir(settingsDir);

  // SDLC documentation path
  const sdlcDocsPath = path.join(aiwgPath, 'agentic', 'code', 'frameworks', 'sdlc-complete');

  let settings = {};

  // Read existing settings if present
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(content);
      console.log('Updating existing .claude/settings.json');
    } catch (e) {
      console.warn('Could not parse existing settings.json, creating new one');
      settings = {};
    }
  } else {
    console.log('Creating .claude/settings.json');
  }

  // Ensure permissions object exists
  if (!settings.permissions) {
    settings.permissions = {};
  }

  // Add SDLC documentation read access to allow list
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  // Add SDLC documentation path if not already present
  const sdlcReadPermission = `Read(${sdlcDocsPath}/**)`;
  if (!settings.permissions.allow.includes(sdlcReadPermission)) {
    settings.permissions.allow.push(sdlcReadPermission);
  }

  // Add current project read access (best practice)
  const projectReadPermission = `Read(${process.cwd()}/**)`;
  if (!settings.permissions.allow.includes(projectReadPermission)) {
    settings.permissions.allow.push(projectReadPermission);
  }

  // Add helpful default permissions for SDLC workflows
  const defaultPermissions = [
    'Bash(git:*)',           // Git operations
    'Bash(npm:*)',           // NPM operations
    'Bash(node:*)',          // Node operations
    'Write(./**)',           // Write to project files
    'Glob',                  // File pattern matching
    'Grep'                   // Content search
  ];

  for (const perm of defaultPermissions) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
    }
  }

  // Add recommended denials for security
  if (!settings.permissions.deny) {
    settings.permissions.deny = [];
  }

  const defaultDenials = [
    'Read(./.env)',
    'Read(./secrets/**)',
    'Read(./**/.env)',
    'Bash(rm:-rf)',
    'Bash(curl:*)',
    'WebFetch'
  ];

  for (const deny of defaultDenials) {
    if (!settings.permissions.deny.includes(deny)) {
      settings.permissions.deny.push(deny);
    }
  }

  // Write updated settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  return settingsPath;
}

(function main() {
  const { name, withAgents, provider } = parseArgs();
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');

  // Detect AIWG installation path
  const aiwgPath = detectAiwgPath(repoRoot);
  console.log(`Using AIWG installation at: ${aiwgPath}`);

  // Create/update .claude/settings.json with SDLC documentation access
  const settingsPath = createOrUpdateSettings(aiwgPath, provider);
  console.log(`Settings configured: ${settingsPath}`);

  const intakeSrc = path.join(aiwgPath, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'intake');
  const destIntake = path.resolve(process.cwd(), 'intake');
  ensureDir(destIntake);

  const mapping = [
    { src: 'project-intake-template.md', dest: 'project-intake.md' },
    { src: 'solution-profile-template.md', dest: 'solution-profile.md' },
    { src: 'option-matrix-template.md', dest: 'option-matrix.md' }
  ];
  let created = 0;
  for (const m of mapping) {
    const s = path.join(intakeSrc, m.src);
    const d = path.join(destIntake, m.dest);
    if (fs.existsSync(s)) {
      if (copyFile(s, d)) {
        console.log(`created ${path.relative(process.cwd(), d)}`);
        created++;
      } else {
        console.log(`exists  ${path.relative(process.cwd(), d)}`);
      }
    }
  }

  const readmePath = path.resolve(process.cwd(), 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readme = `# ${name}\n\n` +
      `This project uses the AI Writing Guide SDLC Complete framework.\n\n` +
      `## Getting Started\n\n` +
      `### 1. Fill Intake Forms\n\n` +
      `Start by completing the intake forms in the \`intake/\` directory:\n\n` +
      `- \`intake/project-intake.md\` - Project overview, stakeholders, constraints\n` +
      `- \`intake/solution-profile.md\` - Technical requirements, architecture preferences\n` +
      `- \`intake/option-matrix.md\` - Solution alternatives and evaluation criteria\n\n` +
      `### 2. Agents and Commands\n\n` +
      `SDLC agents and commands are automatically deployed to \`.claude/agents/\` and \`.claude/commands/\`.\n\n` +
      `Access to SDLC framework documentation is configured in \`.claude/settings.json\`.\n\n` +
      `### 3. Start SDLC Flow\n\n` +
      `Once intake forms are complete, kick off the Concept → Inception flow:\n\n` +
      \`\`\`bash\n# Start Inception phase with automated validation\n/project:flow-concept-to-inception .\n\n# Or use the intake-start command\n/project:intake-start intake/\n\n# Check available flow commands\nls .claude/commands/flow-*.md\n\`\`\`\n\n` +
      `### 4. SDLC Framework Documentation\n\n` +
      `Claude Code agents have read access to the complete SDLC framework documentation at:\n\n` +
      `\`${aiwgPath}/agentic/code/frameworks/sdlc-complete/\`\n\n` +
      `This includes templates, flows, add-ons, and artifacts for all SDLC phases.\n\n` +
      `## Framework Components\n\n` +
      `- **Agents** (51): Specialized SDLC role agents (Requirements Analyst, Security Gatekeeper, etc.)\n` +
      `- **Commands** (24+): Flow orchestration and workflow commands\n` +
      `- **Templates**: Intake, requirements, architecture, test, security, deployment\n` +
      `- **Flows**: Phase-based workflows (Inception → Elaboration → Construction → Transition)\n` +
      `- **Add-ons**: GDPR compliance, legal frameworks\n\n` +
      `## Key Commands\n\n` +
      `- \`/project:flow-concept-to-inception\` - Execute Inception phase\n` +
      `- \`/project:flow-discovery-track\` - Continuous requirements refinement\n` +
      `- \`/project:flow-delivery-track\` - Test-driven implementation\n` +
      `- \`/project:flow-iteration-dual-track\` - Synchronize Discovery and Delivery\n` +
      `- \`/project:flow-gate-check\` - Validate phase gates\n` +
      `- \`/project:flow-handoff-checklist\` - Phase transition validation\n\n` +
      `For more information, see the [SDLC Complete Framework documentation](${aiwgPath}/agentic/code/frameworks/sdlc-complete/README.md).\n`;
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log(`created README.md`);
  }

  // Deploy agents and commands by default (can be disabled with --no-agents)
  if (withAgents) {
    const deployPath = path.join(aiwgPath, 'tools', 'agents', 'deploy-agents.mjs');
    if (fs.existsSync(deployPath)) {
      const { spawnSync } = await import('node:child_process');

      // Deploy agents
      const agentArgs = ['--provider', provider, '--mode', 'sdlc'];
      if (provider === 'openai') agentArgs.push('--as-agents-md');
      console.log('Deploying SDLC agents...');
      const agentRes = spawnSync('node', [deployPath, ...agentArgs], { stdio: 'inherit' });
      if (agentRes.status !== 0) {
        console.warn('Agent deployment returned non-zero status');
      }

      // Deploy commands (SDLC flow commands)
      console.log('Deploying SDLC commands...');
      const cmdArgs = ['--deploy-commands', '--provider', provider, '--mode', 'sdlc'];
      const cmdRes = spawnSync('node', [deployPath, ...cmdArgs], { stdio: 'inherit' });
      if (cmdRes.status !== 0) {
        console.warn('Command deployment returned non-zero status');
      }
    }
  }

  // Initialize git repository if not present
  if (!fs.existsSync(path.resolve(process.cwd(), '.git'))) {
    try {
      const { spawnSync } = await import('node:child_process');
      let r = spawnSync('git', ['init', '-b', 'main'], { stdio: 'inherit' });
      if (r.status !== 0) {
        // fallback for older git
        spawnSync('git', ['init'], { stdio: 'inherit' });
        spawnSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { stdio: 'inherit' });
      }
      const gi = path.resolve(process.cwd(), '.gitignore');
      if (!fs.existsSync(gi)) {
        const gitignore = [
          'node_modules/',
          'dist/',
          'build/',
          '.env',
          '.DS_Store',
          'coverage/',
          '.idea/',
          '.vscode/',
          '.claude/settings.local.json'  // Personal Claude Code settings (not shared)
        ].join('\n') + '\n';
        fs.writeFileSync(gi, gitignore, 'utf8');
        console.log('created .gitignore');
      }
      console.log('Initialized git repository on branch main.');
      console.log('Next steps:');
      console.log('  1. Fill intake forms: intake/project-intake.md, intake/solution-profile.md, intake/option-matrix.md');
      console.log('  2. Start SDLC flow: /project:flow-concept-to-inception .');
      console.log('  3. Commit: git add . && git commit -m "chore: initial scaffold"');
    } catch (e) {
      console.warn('git initialization skipped or failed:', e.message);
    }
  }

  console.log('\n=== Scaffold Complete ===');
  console.log(`Project: ${name}`);
  console.log(`Provider: ${provider}`);
  console.log(`Intake templates: ${created} files created in intake/`);
  console.log(`Settings: .claude/settings.json configured with SDLC documentation access`);
  console.log(`SDLC Framework: ${aiwgPath}/agentic/code/frameworks/sdlc-complete/`);
  if (withAgents) {
    console.log(`Agents deployed: .claude/agents/`);
    console.log(`Commands deployed: .claude/commands/`);
  }
  console.log('\nReady to start! Fill intake forms and run: /project:flow-concept-to-inception .');
})();
