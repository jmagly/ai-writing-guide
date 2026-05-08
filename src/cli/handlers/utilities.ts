/**
 * Utility Command Handlers
 *
 * Handlers for utility commands including card prefilling, contribution workflow,
 * metadata validation, health diagnostics, and update checking.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @tests @test/unit/cli/handlers/utilities.test.ts
 * @issue #33, #342
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';
import { forceUpdateCheck } from '../../update/checker.mjs';
import { useHandler as useFrameworkHandler } from './use.js';
import {
  checkCollisions,
} from '../../smiths/skillsmith/collision-detector.js';

/**
 * Maps framework registry IDs (e.g. 'sdlc-complete') to `aiwg use` names (e.g. 'sdlc').
 */
const REGISTRY_ID_TO_USE_NAME: Record<string, string> = {
  'sdlc-complete': 'sdlc',
  'media-marketing-kit': 'marketing',
  'media-curator': 'media-curator',
  'research-complete': 'research',
  'forensics-complete': 'forensics',
};

interface FrameworkRegistry {
  version: string;
  created: string;
  frameworks: Array<{
    id: string;
    installed: string;
    version: string;
  }>;
}

/**
 * Read the installed frameworks from the on-disk registry.
 */
function readFrameworkRegistry(cwd: string): FrameworkRegistry | null {
  const registryPath = path.join(cwd, '.aiwg', 'frameworks', 'registry.json');
  if (!fs.existsSync(registryPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Handler for prefill-cards command
 *
 * Prefills kanban cards with template data for project planning.
 *
 * Usage:
 *   aiwg -prefill-cards
 *   aiwg --prefill-cards
 *   aiwg -prefill-cards --board <board-name>
 */
export const prefillCardsHandler: CommandHandler = {
  id: 'prefill-cards',
  name: 'Prefill Cards',
  description: 'Prefill kanban cards with template data',
  category: 'utility',
  aliases: ['-prefill-cards', '--prefill-cards'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cards/prefill-cards.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for contribute-start command
 *
 * Starts a contribution workflow with issue tracking and branching.
 *
 * Usage:
 *   aiwg -contribute-start
 *   aiwg --contribute-start
 *   aiwg -contribute-start --issue <issue-number>
 */
export const contributeStartHandler: CommandHandler = {
  id: 'contribute-start',
  name: 'Start Contribution',
  description: 'Start a contribution workflow',
  category: 'utility',
  aliases: ['-contribute-start', '--contribute-start'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/contrib/start-contribution.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for validate-metadata command
 *
 * Validates metadata across framework components and artifacts.
 *
 * Usage:
 *   aiwg -validate-metadata
 *   aiwg --validate-metadata
 *   aiwg -validate-metadata --strict
 */
/** Namespace field regex for SKILL.md frontmatter */
const NAMESPACE_RE = /^namespace:\s*(\S+)/m;

/** Description field regex (single-line + multi-line `>` and `|` block scalars) */
const DESCRIPTION_RE = /^description:\s*([>|]?)\s*\n?([\s\S]*?)(?=\n\w+:|\n---|$)/m;

/**
 * Count complete sentences in a description string. A sentence is delimited
 * by `.`, `?`, or `!` followed by whitespace or end-of-string.
 *
 * Per the oz-skills two-sentence discipline (PUW-030 / #1131): skills
 * should describe themselves in 1-2 sentences. Longer descriptions are
 * generally a sign that the skill is doing too much (god-session) or that
 * detail belongs in the body, not the frontmatter. Lint-only — does not
 * block deploy.
 */
function countSentences(s: string): number {
  if (!s) return 0;
  const trimmed = s.trim();
  if (trimmed.length === 0) return 0;
  const matches = trimmed.match(/[.!?]+(?:\s|$)/g);
  if (!matches) return 1; // No terminator — treat as one bare sentence
  // Trailing terminator counted; if no trailing terminator, the unterminated
  // text is also a sentence.
  const endsWithTerminator = /[.!?][)\]"'\s]*$/.test(trimmed);
  return matches.length + (endsWithTerminator ? 0 : 1);
}

/**
 * Scan source SKILL.md files in `agentic/code/` for namespace issues:
 * - Missing `namespace: aiwg`
 * - Slug (`aiwg-{name}`) that would shadow an AIWG CLI command
 *
 * Returns lines suitable for console output, or empty array if clean.
 */
async function scanSourceNamespaceIssues(frameworkRoot: string): Promise<string[]> {
  const issues: string[] = [];
  const sourceRoot = path.join(frameworkRoot, 'agentic/code');

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.name === 'SKILL.md') {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          const nsMatch = content.match(NAMESPACE_RE);
          if (!nsMatch) {
            const rel = path.relative(frameworkRoot, full);
            issues.push(`  WARN  missing namespace field: ${rel}`);
          }
          // PUW-030 (#1131) — two-sentence skill description discipline.
          // Lint-only. We extract the description block (handles single-line
          // and YAML block scalars) and count sentence terminators.
          const fmEnd = content.indexOf('\n---', 4);
          const fm = fmEnd > 0 ? content.slice(0, fmEnd) : content;
          const descMatch = fm.match(DESCRIPTION_RE);
          if (descMatch) {
            const desc = (descMatch[2] || '').trim().replace(/\n+/g, ' ');
            const sentenceCount = countSentences(desc);
            if (sentenceCount > 3) {
              const rel = path.relative(frameworkRoot, full);
              issues.push(`  WARN  description too long (${sentenceCount} sentences; oz-skills convention is 1-2): ${rel}`);
            }
          }
        } catch {
          // unreadable
        }
      }
    }
  }

  await walk(sourceRoot);
  return issues;
}

/**
 * Scan every `<framework>/<kind>/contributor.md` under `agentic/code/` and
 * validate its frontmatter against the registered schema for its kind.
 * Returns a list of human-readable issue lines for output, plus a count of
 * problems found. Per ADR-023 §Schema validation, malformed contributors
 * fail strict validation.
 */
async function scanContributorIssues(
  frameworkRoot: string
): Promise<{ lines: string[]; count: number }> {
  // Lazy-imported so the validate-metadata path stays fast when there are
  // no contributors yet; also avoids an upfront dep load when zod is unused.
  const [{ parseFrontmatter }, { validateContributor, getRegisteredKinds }] = await Promise.all([
    import('../../artifacts/index-builder.js'),
    import('../../contributors/validation.js'),
  ]);

  const kinds = new Set(getRegisteredKinds());
  const sourceRoot = path.join(frameworkRoot, 'agentic/code');
  const lines: string[] = [];
  let count = 0;

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.name === 'contributor.md') {
        // Only validate if the parent directory name is a registered kind.
        // Avoids treating unrelated files named `contributor.md` as contributors.
        const parent = path.basename(path.dirname(full));
        if (!kinds.has(parent)) continue;

        try {
          const content = fs.readFileSync(full, 'utf-8');
          const { data } = parseFrontmatter(content);
          const validation = validateContributor(data);
          if (!validation.ok) {
            const rel = path.relative(frameworkRoot, full);
            lines.push(`  ERROR  ${rel}`);
            for (const err of validation.errors) {
              lines.push(`         ${err}`);
            }
            count++;
          }
        } catch (err) {
          const rel = path.relative(frameworkRoot, full);
          lines.push(`  ERROR  ${rel}: ${(err as Error).message}`);
          count++;
        }
      }
    }
  }

  await walk(sourceRoot);
  return { lines, count };
}

export const validateMetadataHandler: CommandHandler = {
  id: 'validate-metadata',
  name: 'Validate Metadata',
  description: 'Validate metadata across components',
  category: 'utility',
  aliases: ['-validate-metadata', '--validate-metadata'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    // Run the core metadata validation script
    const result = await runner.run('tools/cli/validate-metadata.mjs', ctx.args, {
      cwd: ctx.cwd,
    });

    // Append namespace validation: scan source SKILL.md files
    try {
      const issues = await scanSourceNamespaceIssues(frameworkRoot);
      if (issues.length > 0) {
        console.log('\n── Namespace validation ──');
        console.log(`  ${issues.length} skill(s) missing namespace field:`);
        // Show first 20 to avoid flooding output
        issues.slice(0, 20).forEach(l => console.log(l));
        if (issues.length > 20) {
          console.log(`  ... and ${issues.length - 20} more`);
        }
        // Non-zero exit only in strict mode
        if (ctx.args.includes('--strict') && result.exitCode === 0) {
          return { exitCode: 1, message: `Namespace validation failed: ${issues.length} skill(s) missing namespace field` };
        }
      } else {
        console.log('\n── Namespace validation: all skills have namespace field ✓');
      }
    } catch {
      // Namespace scan is non-fatal
    }

    // Append contributor validation: walk source contributor.md files and
    // validate their frontmatter against the kind's zod schema (ADR-023).
    try {
      const { lines, count } = await scanContributorIssues(frameworkRoot);
      if (count > 0) {
        console.log('\n── Contributor validation ──');
        console.log(`  ${count} contributor file(s) failed schema validation:`);
        lines.slice(0, 40).forEach(l => console.log(l));
        if (lines.length > 40) {
          console.log(`  ... and ${lines.length - 40} more lines`);
        }
        // Strict mode escalates to a non-zero exit so CI catches drift.
        if (ctx.args.includes('--strict') && result.exitCode === 0) {
          return {
            exitCode: 1,
            message: `Contributor validation failed: ${count} file(s) violated schema`,
          };
        }
      } else {
        console.log('\n── Contributor validation: all contributor.md files conform to schema ✓');
      }
    } catch {
      // Contributor scan is non-fatal — never break validate-metadata if zod
      // import or filesystem walk hits an unexpected condition.
    }

    return result;
  },
};

/**
 * #1156 Phase 1 — Validate the per-user registry at `~/.aiwg/installed.json`.
 *
 * Checks each registered framework+provider deploy:
 *   - Registry entry parses correctly
 *   - Recorded artifact entries (Cycle 3 mirrors) still exist on disk
 *   - Per-artifact-type counts match the actual entry-name list length
 *   - Pre-Cycle-3 entries (no `entries` snapshot) are surfaced as "limited
 *     drift detection" rather than failures
 *
 * Returns exit 1 when drift is detected, exit 0 otherwise. Output is plain
 * text suitable for terminal consumption.
 */
async function runUserScopeDoctor(verbose: boolean): Promise<HandlerResult> {
  const { readUserRegistry, userRegistryPath } = await import('../../config/user-registry.js');
  const { USER_SCOPE_PATHS } = await import('../scope-resolver.js');
  const fsp2 = await import('node:fs/promises');
  const path2 = await import('node:path');

  const registry = await readUserRegistry();
  const frameworks = Object.entries(registry.installed);
  const lines: string[] = [];
  lines.push('');
  lines.push('── User-scope registry validation ──');
  lines.push(`Registry path: ${userRegistryPath()}`);
  lines.push('');

  if (frameworks.length === 0) {
    lines.push('No frameworks deployed at user scope. Run `aiwg use <fw> --scope user` to install.');
    return { exitCode: 0, message: lines.join('\n') + '\n' };
  }

  let driftCount = 0;
  let limitedCount = 0;

  for (const [name, entry] of frameworks) {
    lines.push(`▸ ${name}  v${entry.version}  [${entry.source}]`);
    for (const [provider, providerDeployRaw] of Object.entries(entry.deployedTo)) {
      // Cast through unknown for the optional `entries` snapshot.
      const providerDeploy = providerDeployRaw as unknown as {
        agents: number; commands: number; skills: number; rules: number;
        entries?: { agents?: string[]; commands?: string[]; skills?: string[]; rules?: string[]; behaviors?: string[] };
      };
      const userPaths = USER_SCOPE_PATHS[provider];
      if (!userPaths) {
        lines.push(`    ${provider}: ⚠ no user-scope path map registered for this provider`);
        driftCount++;
        continue;
      }

      const recorded = providerDeploy.entries;
      if (!recorded) {
        lines.push(`    ${provider}: ⚠ pre-Cycle-3 entry — no per-artifact manifest, drift detection limited`);
        lines.push(`               counts: agents=${providerDeploy.agents} commands=${providerDeploy.commands} skills=${providerDeploy.skills} rules=${providerDeploy.rules}`);
        limitedCount++;
        continue;
      }

      // Walk the recorded entry names and check each one exists on disk.
      const checks: Array<[string, string, string[] | undefined, number]> = [
        ['agents', userPaths.agents, recorded.agents, providerDeploy.agents],
        ['commands', userPaths.commands, recorded.commands, providerDeploy.commands],
        ['skills', userPaths.skills, recorded.skills, providerDeploy.skills],
        ['rules', userPaths.rules, recorded.rules, providerDeploy.rules],
      ];

      const issues: string[] = [];
      for (const [type, dir, names, expectedCount] of checks) {
        if (!dir || !names) continue;
        let present = 0;
        const missing: string[] = [];
        for (const n of names) {
          const target = path2.join(dir, n);
          const stat = await fsp2.stat(target).catch(() => null);
          if (stat) present++;
          else missing.push(n);
        }
        if (names.length !== expectedCount) {
          issues.push(`count drift on ${type}: registry says ${expectedCount}, manifest lists ${names.length}`);
        }
        if (missing.length > 0) {
          issues.push(`${type}: ${missing.length}/${names.length} entries missing from ${dir}`);
          if (verbose) {
            for (const m of missing) issues.push(`    missing: ${path2.join(dir, m)}`);
          }
        } else if (verbose) {
          issues.push(`${type}: ${present}/${names.length} present at ${dir}`);
        }
      }

      if (issues.length === 0) {
        lines.push(`    ${provider}: ✓ all recorded artifacts present`);
      } else {
        const hasMissing = issues.some(i => i.includes('missing') || i.includes('drift'));
        const marker = hasMissing ? '✗' : 'ℹ';
        lines.push(`    ${provider}: ${marker}`);
        for (const i of issues) lines.push(`        ${i}`);
        if (hasMissing) driftCount++;
      }
    }
  }

  lines.push('');
  lines.push('═'.repeat(60));
  lines.push(`Frameworks: ${frameworks.length}   Drift: ${driftCount}   Limited (pre-Cycle-3): ${limitedCount}`);
  if (driftCount > 0) {
    lines.push('');
    lines.push('Drift detected. To repair, re-run `aiwg use <framework> --scope user --provider <p>`.');
    lines.push('To remove a stale registry entry, run `aiwg remove <framework> --scope user`.');
  }

  return {
    exitCode: driftCount > 0 ? 1 : 0,
    message: lines.join('\n') + '\n',
  };
}

/**
 * Handler for doctor command
 *
 * Runs health diagnostics on the AIWG installation and workspace.
 *
 * Usage:
 *   aiwg doctor
 *   aiwg -doctor
 *   aiwg --doctor
 *   aiwg doctor --verbose
 *   aiwg doctor --scope user      # validate ~/.aiwg/installed.json
 */
export const doctorHandler: CommandHandler = {
  id: 'doctor',
  name: 'Doctor',
  description: 'Run health diagnostics',
  category: 'maintenance',
  aliases: ['-doctor', '--doctor'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    // #1156 Phase 1 — `aiwg doctor --scope user` / `aiwg doctor --user`
    // validates the per-user registry (~/.aiwg/installed.json) without
    // running the project-scope diagnostics. Operators need this to verify
    // their user-scope deployments from any cwd, including shells with no
    // project at all.
    const userScopeRequested =
      ctx.args.includes('--user') ||
      (ctx.args.includes('--scope') && ctx.args[ctx.args.indexOf('--scope') + 1] === 'user');
    if (userScopeRequested) {
      return await runUserScopeDoctor(ctx.args.includes('--verbose') || ctx.args.includes('-v'));
    }

    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    // Run core doctor diagnostics
    const result = await runner.run('tools/cli/doctor.mjs', ctx.args, { cwd: ctx.cwd });

    // Surface feedback escape hatch when doctor finds issues
    if (result.exitCode !== 0) {
      console.log(`
── Recovery options ──
  aiwg session --no-repair    — launch anyway (skip auto-repair)
  aiwg sync                   — sync to latest and redeploy
  aiwg feedback --type bug    — report this issue to GitHub
`);
    }

    // Append collision scan: check deployed skills dir for bad-state collisions
    // (platform built-ins and AIWG CLI command shadows)
    try {
      const projectDir = ctx.cwd || process.cwd();
      const skillsDir = path.join(projectDir, '.claude', 'skills');
      let deployedSkillNames: string[] = [];
      try {
        const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
        deployedSkillNames = entries.filter(e => e.isDirectory()).map(e => e.name);
      } catch {
        // No .claude/skills — nothing to check
      }

      if (deployedSkillNames.length > 0) {
        const collisions = await checkCollisions({
          platform: 'claude',
          projectPath: projectDir,
          skillNames: deployedSkillNames,
          namespace: 'aiwg',
          skillsBaseDir: skillsDir,
        });
        const errorAndWarn = collisions.filter(r => r.severity === 'error' || r.severity === 'warn');
        if (errorAndWarn.length > 0) {
          // In doctor context we report stale skills, not deployment blocks.
          // Re-running `aiwg use` will auto-clean aiwg-owned stale skills.
          console.log('\n── Skill collision scan ──');
          console.log('');
          console.log('⚠ Stale skills detected (names collide with Claude built-ins):');
          for (const r of errorAndWarn) {
            console.log(`  ✗ ${r.skillName}: ${r.reason}`);
          }
          console.log('');
          console.log('  Fix: run `aiwg use <framework>` to redeploy and auto-clean stale skill directories.');
        }
      }
    } catch {
      // Collision scan is non-fatal for doctor
    }

    // #1037 / #1049 — Project-local artifacts section: per-type counts,
    // validation errors, shadows, denylist violations, drift detection,
    // and provider deployment matrix. Replaces the older inline shadow
    // scan with the richer section spec'd by design-doctor-log-promote.md.
    try {
      const projectDir = ctx.cwd || process.cwd();
      const fr = await getFrameworkRoot();
      const { readAiwgConfig } = await import('../../config/aiwg-config.js');
      const config = await readAiwgConfig(projectDir);
      const { buildProjectLocalDoctorSection } = await import(
        '../../extensions/project-local-doctor.js'
      );
      const onlyProjectLocal = ctx.args.includes('--project-local');
      const quiet = ctx.args.includes('--quiet');
      const section = await buildProjectLocalDoctorSection({
        projectDir, frameworkRoot: fr, config, quiet,
      });
      if (section.output) {
        console.log(section.output);
      }
      // When --project-local is requested as the only output and the rest
      // of doctor printed nothing project-local-specific, fold result exit
      // into our own findings.
      if (onlyProjectLocal && section.hasFailures) {
        return { exitCode: 1, message: '' };
      }
    } catch {
      // Project-local section is non-fatal for doctor
    }

    return result;
  },
};

/**
 * Handler for update command
 *
 * Updates AIWG and re-deploys installed frameworks/addons.
 * - Checks for npm/git updates first
 * - Reads .aiwg/frameworks/registry.json to detect installed items
 * - Re-deploys only those (preserving the user's current selection)
 * - Use --all to deploy everything (equivalent to `aiwg use all`)
 *
 * Usage:
 *   aiwg update                        # Update + re-deploy installed frameworks
 *   aiwg update --all                  # Update + deploy everything
 *   aiwg update --dry-run              # Show what would be updated
 *   aiwg update --provider <name>      # Pass through provider to deployment
 *   aiwg update --skip-check           # Skip npm/git update check, only re-deploy
 *
 * @issue #342
 */
export const updateHandler: CommandHandler = {
  id: 'update',
  name: 'Update',
  description: 'Update AIWG and re-deploy installed frameworks',
  category: 'maintenance',
  aliases: ['-update', '--update'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const args = ctx.args;
    const deployAll = args.includes('--all');
    const dryRun = args.includes('--dry-run');
    const skipCheck = args.includes('--skip-check');

    // Extract --provider value if present
    const providerIdx = args.findIndex(a => a === '--provider' || a === '--platform');
    const providerArgs = providerIdx >= 0 && args[providerIdx + 1]
      ? ['--provider', args[providerIdx + 1]]
      : [];

    // Step 1: Check for package updates (unless --skip-check)
    if (!skipCheck) {
      try {
        console.log('Checking for AIWG updates...\n');
        await forceUpdateCheck();
      } catch (error) {
        console.error(`Warning: Update check failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log('Continuing with re-deployment...\n');
      }
    }

    // Step 2: Determine what to re-deploy
    if (deployAll) {
      // --all: deploy everything (equivalent to `aiwg use all`)
      const frameworks = ['all'];
      if (dryRun) {
        console.log('Dry run: Would re-deploy all frameworks and addons');
        return { exitCode: 0 };
      }

      console.log('Re-deploying all frameworks and addons...\n');
      const result = await useFrameworkHandler.execute({
        ...ctx,
        args: [...frameworks, ...providerArgs],
      });
      return result;
    }

    // Read registry to determine installed frameworks
    const registry = readFrameworkRegistry(ctx.cwd);
    if (!registry || registry.frameworks.length === 0) {
      console.log('No frameworks found in .aiwg/frameworks/registry.json');
      console.log('');
      console.log('To deploy a framework first, run:');
      console.log('  aiwg use sdlc');
      console.log('  aiwg use marketing');
      console.log('  aiwg use all');
      return { exitCode: 0 };
    }

    // Map registry IDs to framework use-names
    const installedFrameworks: string[] = [];
    const unmapped: string[] = [];

    for (const fw of registry.frameworks) {
      const useName = REGISTRY_ID_TO_USE_NAME[fw.id];
      if (useName) {
        installedFrameworks.push(useName);
      } else {
        unmapped.push(fw.id);
      }
    }

    if (installedFrameworks.length === 0) {
      console.log('No recognized frameworks in registry');
      if (unmapped.length > 0) {
        console.log(`Unrecognized entries: ${unmapped.join(', ')}`);
      }
      return { exitCode: 0 };
    }

    // Report what will be updated
    console.log(`Installed frameworks: ${installedFrameworks.join(', ')}`);
    if (unmapped.length > 0) {
      console.log(`Skipping unrecognized: ${unmapped.join(', ')}`);
    }
    console.log('');

    if (dryRun) {
      console.log('Dry run: Would re-deploy the following frameworks:');
      for (const fw of installedFrameworks) {
        console.log(`  - ${fw}`);
      }
      return { exitCode: 0 };
    }

    // Step 3: Re-deploy each installed framework
    const results: Array<{ framework: string; exitCode: number }> = [];

    for (const fw of installedFrameworks) {
      console.log(`Re-deploying ${fw}...`);
      const result = await useFrameworkHandler.execute({
        ...ctx,
        args: [fw, ...providerArgs],
      });
      results.push({ framework: fw, exitCode: result.exitCode });

      if (result.exitCode !== 0) {
        console.error(`Warning: Failed to re-deploy ${fw}`);
      }
    }

    // Step 4: Report summary
    console.log('');
    console.log('Update Summary:');
    const succeeded = results.filter(r => r.exitCode === 0);
    const failed = results.filter(r => r.exitCode !== 0);

    for (const r of results) {
      const status = r.exitCode === 0 ? 'updated' : 'FAILED';
      console.log(`  ${r.framework}: ${status}`);
    }

    console.log('');
    console.log(`Updated: ${succeeded.length}/${results.length}`);

    return {
      exitCode: failed.length > 0 ? 1 : 0,
      message: failed.length > 0
        ? `Some frameworks failed to update: ${failed.map(f => f.framework).join(', ')}`
        : `Successfully updated ${succeeded.length} framework(s)`,
    };
  },
};

/**
 * All utility handlers
 */
export const utilityHandlers: CommandHandler[] = [
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,
  doctorHandler,
  updateHandler,
];
