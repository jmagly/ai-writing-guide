// Stat-only signal-walk used by warning.ts to decide whether the cwd looks
// like a project. Stat-only is required so detection stays under 50ms even
// in deep directories (NFR-PERF-01). Walk depth is bounded by
// MAX_PARENT_DEPTH (NFR-PERF-02).

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';
import { PROJECT_SIGNALS, CSPROJ_PATTERN, MAX_PARENT_DEPTH } from './signals.js';

export interface DetectionResult {
  found: boolean;
  signal: string | null;
  foundAt: string | null;
}

// Walk `start` and up to MAX_PARENT_DEPTH parents looking for any entry in
// PROJECT_SIGNALS, or any file matching CSPROJ_PATTERN. Returns on first
// hit so a project root in cwd short-circuits the walk.
export function detectProjectSignal(start: string): DetectionResult {
  let dir = start;
  for (let depth = 0; depth <= MAX_PARENT_DEPTH; depth++) {
    for (const signal of PROJECT_SIGNALS) {
      if (existsSync(join(dir, signal))) {
        return { found: true, signal, foundAt: dir };
      }
    }
    if (hasCsprojFile(dir)) {
      return { found: true, signal: '*.csproj', foundAt: dir };
    }
    const parent = parse(dir).dir;
    if (parent === dir) break;
    dir = parent;
  }
  return { found: false, signal: null, foundAt: null };
}

// True when `dir` directly contains at least one *.csproj file.
function hasCsprojFile(dir: string): boolean {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (CSPROJ_PATTERN.test(entry)) {
        const full = join(dir, entry);
        try {
          if (statSync(full).isFile()) return true;
        } catch {
          // Ignore stat failures for individual entries — keep walking.
        }
      }
    }
  } catch {
    // Unreadable dir is treated as "no signal here." Walk continues.
  }
  return false;
}

// True when `cwd` is one of the directories where we should prompt the
// user. $HOME, /, and /tmp are the canonical surprise-deploy locations.
// The check tolerates trailing separators on Windows.
export function isUnsuitableCwd(cwd: string, home: string): boolean {
  const normalized = stripTrailingSep(cwd);
  if (normalized === stripTrailingSep(home)) return true;
  if (normalized === '/') return true;
  if (normalized === '/tmp') return true;
  return false;
}

function stripTrailingSep(p: string): string {
  if (p.length > 1 && (p.endsWith('/') || p.endsWith('\\'))) {
    return p.slice(0, -1);
  }
  return p;
}
