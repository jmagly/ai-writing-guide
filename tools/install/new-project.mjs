#!/usr/bin/env node
/**
 * New Project Scaffolder
 *
 * Create a minimal project structure with intake templates and a README tailored to the
 * AI Writing Guide framework. Intended to be invoked via alias `aiwg-new` and run in the
 * target project directory.
 *
 * Usage:
 *   node tools/install/new-project.mjs [--name <project-name>] [--no-agents]
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let name = path.basename(process.cwd());
  let withAgents = true; // deploy agents by default
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name' && args[i + 1]) name = args[++i];
    else if (a === '--no-agents') withAgents = false;
  }
  return { name, withAgents };
}

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function copyFile(src, dest) {
  if (fs.existsSync(dest)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

(function main() {
  const { name, withAgents } = parseArgs();
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');

  const intakeSrc = path.join(repoRoot, 'docs', 'sdlc', 'templates', 'intake');
  const destIntake = path.resolve(process.cwd(), 'docs', 'sdlc', 'intake');
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
      `This project uses the AI Writing Guide SDLC framework. Start by filling the intake forms:\n\n` +
      `- docs/sdlc/intake/project-intake.md\n` +
      `- docs/sdlc/intake/solution-profile.md\n` +
      `- docs/sdlc/intake/option-matrix.md\n\n` +
      `Once complete, kick off the flow with:\n\n` +
      \`\`\`bash\n# copy shared agents into .claude/agents (auto-run by aiwg-new)\naiwg-deploy-agents\n\n# start Concept → Inception with orchestrator/commands\n# refer to docs/sdlc/flows and docs/commands/sdlc\n\`\`\`\n`;
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log(`created README.md`);
  }

  // Deploy agents by default (can be disabled with --no-agents)
  if (withAgents) {
    const deployPath = path.join(repoRoot, 'tools', 'agents', 'deploy-agents.mjs');
    if (fs.existsSync(deployPath)) {
      const { spawnSync } = await import('node:child_process');
      const res = spawnSync('node', [deployPath], { stdio: 'inherit' });
      if (res.status !== 0) {
        console.warn('Agent deployment returned non-zero status');
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
          '.vscode/'
        ].join('\n') + '\n';
        fs.writeFileSync(gi, gitignore, 'utf8');
        console.log('created .gitignore');
      }
      console.log('Initialized git repository on branch main.');
      console.log('Next: fill intake docs, then run: git add . && git commit -m "chore: initial scaffold"');
    } catch (e) {
      console.warn('git initialization skipped or failed:', e.message);
    }
  }

  console.log(`Scaffold complete. Files created: ${created}`);
})();
