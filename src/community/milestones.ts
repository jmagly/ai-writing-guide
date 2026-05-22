import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { formatMilestoneCelebration } from './links.js';
import { shouldShowNudge } from './nudge-policy.js';

export type CommunityMilestone =
  | 'first_deploy'
  | 'first_phase_transition'
  | 'first_release'
  | 'first_production_deploy';

export function milestoneStatePath(projectDir: string): string {
  return path.join(projectDir, '.aiwg', '.milestones.json');
}

function readMilestones(projectDir: string): Record<string, string | null> {
  const statePath = milestoneStatePath(projectDir);
  if (!existsSync(statePath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string | null>
      : {};
  } catch {
    return {};
  }
}

export function recordMilestone(projectDir: string, milestone: CommunityMilestone, now = new Date()): boolean {
  const state = readMilestones(projectDir);
  if (state[milestone]) return false;
  state[milestone] = now.toISOString();
  const statePath = milestoneStatePath(projectDir);
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
  return true;
}

export function maybeCelebrateMilestone(projectDir: string, milestone: CommunityMilestone): boolean {
  if (!shouldShowNudge('milestone')) return false;
  const isFirst = recordMilestone(projectDir, milestone);
  if (!isFirst) return false;
  const message = formatMilestoneCelebration(milestone);
  if (!message) return false;
  console.log('');
  console.log(message);
  return true;
}
