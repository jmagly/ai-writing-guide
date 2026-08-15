import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export interface PackagedAgentSource {
  path: string;
  size: number;
  instructionHash: string;
}

export type PackagedAgentInventory = Map<string, PackagedAgentSource[]>;

export interface ManagedArtifactMarker {
  version: string;
  source: string;
}

const MANAGED_MARKER_RE = /(?:^|\n)(?:#|<!--)\s*aiwg:managed\s+v?([^\s]+)\s+([^\s>]+)(?:\s*-->)?/;

/** Normalize provider-specific deployed filenames to the source agent id. */
export function normalizeAgentArtifactName(filename: string): string {
  return path.basename(filename)
    .replace(/\.agent\.md$/i, '')
    .replace(/\.soul\.md$/i, '')
    .replace(/\.(?:md|mdc|toml)$/i, '');
}

export function parseManagedArtifactMarker(content: string): ManagedArtifactMarker | null {
  const match = MANAGED_MARKER_RE.exec(content);
  return match ? { version: match[1], source: match[2] } : null;
}

/** Extract the developer-instruction body from a canonical Markdown agent. */
export function extractAgentInstructionBody(content: string): string {
  if (!content.startsWith('---')) return content.trim();
  const withoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  return withoutFrontmatter.trim();
}

function instructionHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function extractDeployedInstructions(filename: string, content: string): string | null {
  if (!filename.toLowerCase().endsWith('.toml')) {
    return extractAgentInstructionBody(content);
  }
  const match = content.match(/^developer_instructions\s*=\s*(.+)$/m);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    return typeof value === 'string' ? value.trim() : null;
  } catch {
    return null;
  }
}

async function collectAgentSources(
  frameworkRoot: string,
  rootDir: string,
  inventory: PackagedAgentInventory,
  allMarkdownFiles: boolean,
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await collectAgentSources(frameworkRoot, absolute, inventory, allMarkdownFiles);
      return;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) return;
    if (!allMarkdownFiles && path.basename(rootDir) !== 'agents') return;

    let stat;
    let content;
    try {
      [stat, content] = await Promise.all([
        fs.stat(absolute),
        fs.readFile(absolute, 'utf8'),
      ]);
    } catch {
      return;
    }
    const name = normalizeAgentArtifactName(entry.name);
    const sources = inventory.get(name) ?? [];
    sources.push({
      path: path.relative(frameworkRoot, absolute),
      size: stat.size,
      instructionHash: instructionHash(extractAgentInstructionBody(content)),
    });
    inventory.set(name, sources);
  }));
}

/**
 * Inventory every packaged agent source that can contribute to provider output.
 * Framework, addon, and plugin agents live in named `agents/` directories;
 * root personas live recursively below `agentic/code/agents/`.
 */
export async function collectPackagedAgentInventory(
  frameworkRoot: string,
): Promise<PackagedAgentInventory> {
  const inventory: PackagedAgentInventory = new Map();
  const codeRoot = path.join(frameworkRoot, 'agentic', 'code');
  await Promise.all([
    collectAgentSources(frameworkRoot, path.join(codeRoot, 'frameworks'), inventory, false),
    collectAgentSources(frameworkRoot, path.join(codeRoot, 'addons'), inventory, false),
    collectAgentSources(frameworkRoot, path.join(codeRoot, 'plugins'), inventory, false),
    collectAgentSources(frameworkRoot, path.join(codeRoot, 'agents'), inventory, true),
  ]);
  return inventory;
}

export type OversizedAgentDiagnosis = 'current-package' | 'stale-deployment' | 'unmanaged-local';

/** Classify a deployed oversized file without assuming it came from the package. */
export function diagnoseOversizedAgent(
  filename: string,
  content: string,
  inventory: PackagedAgentInventory,
  ceilingBytes: number,
): OversizedAgentDiagnosis {
  const packaged = inventory.get(normalizeAgentArtifactName(filename)) ?? [];
  if (packaged.some((source) => source.size > ceilingBytes)) return 'current-package';

  const deployedInstructions = extractDeployedInstructions(filename, content);
  if (
    deployedInstructions !== null
    && packaged.some((source) => source.instructionHash === instructionHash(deployedInstructions))
  ) {
    return 'current-package';
  }

  const marker = parseManagedArtifactMarker(content);
  if (marker?.source === 'bundled') return 'stale-deployment';
  return 'unmanaged-local';
}
