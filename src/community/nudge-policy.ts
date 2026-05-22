import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { parseYamlSimple } from '../config/user-config.js';

export type NudgeContext = 'intake' | 'discovery-footer' | 'milestone';

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT_KEYS: Record<Exclude<NudgeContext, 'milestone'>, string> = {
  intake: 'intake-shown',
  'discovery-footer': 'footer-shown',
};

const CONTEXT_TTL_MS: Record<Exclude<NudgeContext, 'milestone'>, number> = {
  intake: 90 * DAY_MS,
  'discovery-footer': 7 * DAY_MS,
};

export function userAiwgDir(): string {
  return process.env.AIWG_CONFIG ? path.resolve(process.env.AIWG_CONFIG) : path.join(os.homedir(), '.aiwg');
}

export function nudgeStatePath(): string {
  return path.join(userAiwgDir(), '.nudge-state.json');
}

function envSuppresses(): boolean {
  const noNudge = process.env.AIWG_NO_NUDGE?.toLowerCase();
  if (noNudge === '1' || noNudge === 'true' || noNudge === 'yes') return true;
  if (process.env.CI?.toLowerCase() === 'true' || process.env.CI === '1') return true;
  return false;
}

function userConfigSuppresses(): boolean {
  const configPath = path.join(userAiwgDir(), 'config.yaml');
  if (!existsSync(configPath)) return false;
  try {
    const parsed = parseYamlSimple(readFileSync(configPath, 'utf8'));
    const community = parsed.community;
    return Boolean(
      community &&
      typeof community === 'object' &&
      !Array.isArray(community) &&
      (community as Record<string, unknown>).nudges === false,
    );
  } catch {
    return false;
  }
}

function stdoutIsTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

function readState(): Record<string, string> {
  const statePath = nudgeStatePath();
  if (!existsSync(statePath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

function isWithinThrottle(key: string, ttlMs: number, now: Date): boolean {
  const state = readState();
  const raw = state[key];
  if (!raw) return false;
  const then = new Date(raw);
  if (Number.isNaN(then.getTime())) return false;
  return now.getTime() - then.getTime() < ttlMs;
}

export function shouldShowNudge(ctx: NudgeContext, opts: { now?: Date; requireTty?: boolean } = {}): boolean {
  if (envSuppresses()) return false;
  if (userConfigSuppresses()) return false;
  if (opts.requireTty ?? true) {
    if (!stdoutIsTty()) return false;
  }
  if (ctx === 'milestone') return true;

  const key = CONTEXT_KEYS[ctx];
  const ttlMs = CONTEXT_TTL_MS[ctx];
  return !isWithinThrottle(key, ttlMs, opts.now ?? new Date());
}

export function markNudgeShown(ctx: Exclude<NudgeContext, 'milestone'>, opts: { now?: Date } = {}): void {
  const statePath = nudgeStatePath();
  const state = readState();
  state[CONTEXT_KEYS[ctx]] = (opts.now ?? new Date()).toISOString();
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
