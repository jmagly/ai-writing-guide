import { glob } from 'glob';
import path from 'node:path';
import { recordTypeForEntry, stableRecordId } from './browser-export.js';
import type { MetadataEntry } from './types.js';

export type RoutableCapabilityType = 'agent' | 'skill' | 'rule' | 'workflow';

export interface ResolvedRoutableCapability {
  type: RoutableCapabilityType;
  id: string;
  name: string;
  source: {
    path: string;
    scope: 'packaged';
    provenance: 'corpus';
  };
}

export class CapabilityResolutionError extends Error {
  constructor(
    message: string,
    readonly kind: 'missing' | 'ambiguous' | 'type-mismatch',
  ) {
    super(message);
    this.name = 'CapabilityResolutionError';
  }
}

interface Candidate {
  type: RoutableCapabilityType;
  name: string;
  relativePath: string;
  stableId: string;
  priority: number;
}

const PATTERNS: Record<RoutableCapabilityType, string[]> = {
  agent: ['agentic/code/{frameworks,addons,extensions,plugins}/**/agents/*.md'],
  skill: [
    'agentic/code/{frameworks,addons,extensions,plugins}/**/skills/*/SKILL.md',
    'agentic/code/{frameworks,addons,extensions,plugins}/**/skills/*.{md,yaml,yml}',
  ],
  rule: ['agentic/code/{frameworks,addons,extensions,plugins}/**/rules/*.{md,yaml,yml}'],
  workflow: [
    'agentic/code/{frameworks,addons,extensions,plugins}/**/flows/*.playbook.{yaml,yml}',
    'agentic/code/{frameworks,addons,extensions,plugins}/**/workflows/*.{md,yaml,yml}',
  ],
};

function candidateName(type: RoutableCapabilityType, file: string): string {
  if (type === 'skill' && path.basename(file) === 'SKILL.md') return path.basename(path.dirname(file));
  return path.basename(file).replace(/\.playbook\.(?:yaml|yml)$/i, '').replace(/\.(?:md|yaml|yml)$/i, '');
}

function candidatePriority(relativePath: string): number {
  if (relativePath.includes('/plugins/')) return 3;
  if (relativePath.includes('/extensions/')) return 2;
  if (relativePath.includes('/addons/')) return 1;
  return 0;
}

function stableId(type: RoutableCapabilityType, relativePath: string): string {
  const entry = {
    path: relativePath,
    type: type === 'workflow' ? 'flow' : type,
  } as MetadataEntry;
  return stableRecordId(recordTypeForEntry(entry, 'v2'), relativePath);
}

async function collectCandidates(frameworkRoot: string): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  for (const type of Object.keys(PATTERNS) as RoutableCapabilityType[]) {
    const files = await glob(PATTERNS[type], {
      cwd: frameworkRoot,
      nodir: true,
      dot: true,
      posix: true,
    });
    for (const relativePath of files) candidates.push({
      type,
      name: candidateName(type, relativePath),
      relativePath,
      stableId: stableId(type, relativePath),
      priority: candidatePriority(relativePath),
    });
  }
  return candidates;
}

export async function resolveRoutableCapability(
  frameworkRoot: string,
  type: RoutableCapabilityType,
  requested: string,
): Promise<ResolvedRoutableCapability> {
  const needle = requested.trim();
  const candidates = await collectCandidates(frameworkRoot);
  const exact = candidates.filter(candidate => candidate.type === type
    && (candidate.name === needle || candidate.stableId === needle));
  if (exact.length === 0) {
    const otherTypes = [...new Set(candidates
      .filter(candidate => candidate.name === needle || candidate.stableId === needle)
      .map(candidate => candidate.type))];
    if (otherTypes.length > 0) throw new CapabilityResolutionError(
      `Capability ${needle} exists as ${otherTypes.join(', ')}, not ${type}.`,
      'type-mismatch',
    );
    throw new CapabilityResolutionError(`No ${type} capability found for ${needle}.`, 'missing');
  }

  const bestPriority = Math.min(...exact.map(candidate => candidate.priority));
  const preferred = exact.filter(candidate => candidate.priority === bestPriority);
  if (preferred.length > 1) throw new CapabilityResolutionError(
    `Capability ${needle} is ambiguous for ${type}: ${preferred.map(item => item.relativePath).join(', ')}`,
    'ambiguous',
  );
  const selected = preferred[0];
  return {
    type,
    id: selected.stableId,
    name: selected.name,
    source: {
      path: selected.relativePath,
      scope: 'packaged',
      provenance: 'corpus',
    },
  };
}
