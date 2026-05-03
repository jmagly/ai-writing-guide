/**
 * Project-Local Bundle Scaffolding
 *
 * Creates a complete `.aiwg/<type>/<name>/` bundle with a valid manifest,
 * a starter artifact (skill or rule), and a README that includes the
 * identical-form portability reminder.
 *
 * The output is byte-identical-shaped to upstream addon directories so
 * `aiwg promote` can graduate it without any rewrite.
 *
 * @design @.aiwg/architecture/adr-identical-form-portability.md (#1038)
 * @implements #1050
 */

import { mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import type { ProjectLocalType } from './manifest.js';

export type StarterKind = 'skill' | 'rule' | 'agent' | 'minimal';

export interface ScaffoldOptions {
  /** Bundle directory type. */
  type: ProjectLocalType;
  /** Bundle id (kebab-case, no leading/trailing hyphen). */
  name: string;
  /** Free-text human description. */
  description?: string;
  /** What starter artifact to drop in. Defaults to 'skill' for addon/extension; 'minimal' otherwise. */
  starter?: StarterKind;
  /** Project root. Defaults to process.cwd(). */
  projectDir?: string;
  /** Refuse to overwrite an existing bundle. Default true. */
  refuseOnExists?: boolean;
}

export interface ScaffoldResult {
  /** Absolute path to the new bundle. */
  bundlePath: string;
  /** Files created (relative to bundle). */
  filesCreated: string[];
  /** True when nothing was written because the bundle already exists. */
  alreadyExists: boolean;
}

const TYPE_TO_DIR: Record<ProjectLocalType, string> = {
  extension: 'extensions',
  addon: 'addons',
  framework: 'frameworks',
  plugin: 'plugins',
};

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function buildManifest(opts: ScaffoldOptions): Record<string, unknown> {
  const { type, name, description = `Project-local ${type} '${name}'` } = opts;
  const base: Record<string, unknown> = {
    id: name,
    type,
    name,
    version: '0.1.0',
    description,
    manifestVersion: '1',
    platforms: { claude: 'full' },
    keywords: [type, 'project-local'],
    deployment: { pathTemplate: '.{platform}/skills/{id}.md' },
  };
  if (type === 'addon') {
    base['addonConfig'] = { entry: { skills: 'skills/' } };
  } else if (type === 'framework') {
    base['frameworkConfig'] = { path: 'src/' };
  } else if (type === 'plugin') {
    base['pluginConfig'] = { payloadType: 'addon', payloadPath: 'payload/' };
  }
  return base;
}

function readme(opts: ScaffoldOptions): string {
  const { type, name, description = '' } = opts;
  return `# ${name}

${description || `Project-local ${type} bundle.`}

## What this is

A project-local AIWG ${type} living under \`.aiwg/${TYPE_TO_DIR[type]}/${name}/\`.
Discovered automatically by \`aiwg use\` and deployed alongside upstream
artifacts.

## Layout

\`\`\`
.aiwg/${TYPE_TO_DIR[type]}/${name}/
├── manifest.json          # Bundle metadata (validated by aiwg)
├── README.md              # This file
└── ${type === 'framework' ? 'src/' : type === 'plugin' ? 'payload/' : 'skills/ or rules/'}
\`\`\`

## Usage

Deploy to your configured providers:
\`\`\`bash
aiwg use ${name}
\`\`\`

Inspect health:
\`\`\`bash
aiwg doctor --project-local
\`\`\`

Remove (preserves source under \`.aiwg/\`):
\`\`\`bash
aiwg remove ${name}
\`\`\`

## Identical-form portability

This directory is shaped **byte-identical** to upstream
\`agentic/code/addons/${name}/\`. To graduate, run:

\`\`\`bash
aiwg promote ${name} --dry-run     # preview
aiwg promote ${name}                # copy to upstream
aiwg promote ${name} --to corpus ~/my-corpus/   # or to a private corpus
\`\`\`

Keep this directory shaped like upstream so \`aiwg promote\` works.

## Customization tips

- Edit \`manifest.json\` to set a real \`description\`, bump \`version\` to
  \`1.0.0\` when stable, and add platforms beyond \`claude\` if needed.
- Add new artifacts under \`skills/\`, \`rules/\`, \`agents/\`, or \`commands/\`
  per AIWG conventions.
- Use \`@\`-references for cross-artifact links: \`@$AIWG_ROOT/...\` for
  upstream paths, \`@.aiwg/...\` for project-local references (note: the
  latter will block promotion unless \`--force\` is passed).

## See also

- \`docs/customization/project-local-quickstart.md\` — first bundle in 5 minutes
- \`docs/customization/project-local-lifecycle.md\` — full lifecycle reference
- \`docs/customization/extensions-vs-addons-vs-frameworks-vs-plugins.md\` — pick the right type
`;
}

const STARTER_SKILL = (name: string) => `---
name: ${name}-skill
description: Starter skill for the ${name} project-local bundle. Customize this.
---

# ${name}-skill

Replace this body with the workflow your skill performs.

## When to use

Describe the trigger conditions for this skill.

## Steps

1. Step one
2. Step two

<!-- TIP: keep front-matter \`name\` matching the file basename for predictable -->
<!-- TIP: deploy paths and traceability with the SKILL.md frontmatter schema. -->
`;

const STARTER_RULE = (name: string) => `---
id: ${name}-rule
---

# ${name}-rule

Describe the rule. Keep it concise — rules are loaded into every relevant
agent context, so terseness pays off.

## Why

Explain the motivation. Future-you will thank you.

## How to apply

State when this rule fires and what action it requires.
`;

const STARTER_AGENT = (name: string) => `---
name: ${name}-agent
description: Starter agent for the ${name} project-local bundle.
model: sonnet
---

# ${name}-agent

You are a specialist for [domain]. Customize this body with the agent's
focus, allowed tools, and termination conditions.
`;

export async function scaffoldProjectLocalBundle(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const refuseOnExists = options.refuseOnExists ?? true;

  if (!NAME_REGEX.test(options.name)) {
    throw new Error(
      `Invalid bundle name '${options.name}': must be kebab-case (a-z, 0-9, '-'), no leading/trailing hyphen.`,
    );
  }

  const dirName = TYPE_TO_DIR[options.type];
  const bundlePath = join(projectDir, '.aiwg', dirName, options.name);

  // Refuse to overwrite
  try {
    await stat(bundlePath);
    if (refuseOnExists) {
      return { bundlePath, filesCreated: [], alreadyExists: true };
    }
  } catch {
    // Doesn't exist — good
  }

  await mkdir(bundlePath, { recursive: true });
  const filesCreated: string[] = [];

  // Pick starter
  const starter: StarterKind =
    options.starter ?? (options.type === 'framework' || options.type === 'plugin' ? 'minimal' : 'skill');

  // manifest.json
  const manifest = buildManifest(options);
  await writeFile(
    join(bundlePath, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8',
  );
  filesCreated.push('manifest.json');

  // README.md
  await writeFile(join(bundlePath, 'README.md'), readme(options), 'utf-8');
  filesCreated.push('README.md');

  // Starter artifact
  if (starter === 'skill') {
    const skillDir = join(bundlePath, 'skills', `${options.name}-skill`);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), STARTER_SKILL(options.name), 'utf-8');
    filesCreated.push(`skills/${options.name}-skill/SKILL.md`);
  } else if (starter === 'rule') {
    const rulesDir = join(bundlePath, 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, `${options.name}.md`), STARTER_RULE(options.name), 'utf-8');
    filesCreated.push(`rules/${options.name}.md`);
  } else if (starter === 'agent') {
    const agentsDir = join(bundlePath, 'agents');
    await mkdir(agentsDir, { recursive: true });
    await writeFile(join(agentsDir, `${options.name}.md`), STARTER_AGENT(options.name), 'utf-8');
    filesCreated.push(`agents/${options.name}.md`);
  }
  // 'minimal' = no starter artifact (operator fills it in)

  // Type-specific stub directories
  if (options.type === 'framework') {
    await mkdir(join(bundlePath, 'src'), { recursive: true });
    await writeFile(
      join(bundlePath, 'src', '.gitkeep'),
      '# Framework source files go here\n',
      'utf-8',
    );
    filesCreated.push('src/.gitkeep');
  }
  if (options.type === 'plugin') {
    await mkdir(join(bundlePath, 'payload'), { recursive: true });
    await writeFile(
      join(bundlePath, 'payload', '.gitkeep'),
      '# Plugin payload files go here\n',
      'utf-8',
    );
    filesCreated.push('payload/.gitkeep');
  }

  return { bundlePath, filesCreated, alreadyExists: false };
}
