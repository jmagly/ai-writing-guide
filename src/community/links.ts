import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

export interface CommunityChannel {
  id: string;
  name: string;
  url: string;
  cta: string;
}

export interface CommunityLinks {
  website: string;
  repository: {
    github: string;
    gitea?: string;
  };
  channels: CommunityChannel[];
  star_cta: {
    short: string;
    long: string;
  };
}

const EMPTY_LINKS: CommunityLinks = {
  website: '',
  repository: { github: '' },
  channels: [],
  star_cta: { short: '', long: '' },
};

function moduleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

export function communityDataPath(): string {
  return path.resolve(moduleDir(), '..', 'data', 'community.yaml');
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCommunityLinks(raw: unknown): string[] {
  const issues: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['community links must be an object'];
  }
  const data = raw as Record<string, unknown>;
  if (!isString(data.website)) issues.push('website must be a non-empty string');

  const repository = data.repository;
  if (!repository || typeof repository !== 'object' || Array.isArray(repository)) {
    issues.push('repository must be an object');
  } else if (!isString((repository as Record<string, unknown>).github)) {
    issues.push('repository.github must be a non-empty string');
  }

  if (!Array.isArray(data.channels)) {
    issues.push('channels must be an array');
  } else {
    for (const [index, channel] of data.channels.entries()) {
      if (!channel || typeof channel !== 'object' || Array.isArray(channel)) {
        issues.push(`channels[${index}] must be an object`);
        continue;
      }
      const ch = channel as Record<string, unknown>;
      for (const key of ['id', 'name', 'url', 'cta']) {
        if (!isString(ch[key])) issues.push(`channels[${index}].${key} must be a non-empty string`);
      }
    }
  }

  const starCta = data.star_cta;
  if (!starCta || typeof starCta !== 'object' || Array.isArray(starCta)) {
    issues.push('star_cta must be an object');
  } else {
    const cta = starCta as Record<string, unknown>;
    if (!isString(cta.short)) issues.push('star_cta.short must be a non-empty string');
    if (!isString(cta.long)) issues.push('star_cta.long must be a non-empty string');
  }
  return issues;
}

export function loadCommunityLinks(opts: { dataPath?: string; warn?: (message: string) => void } = {}): CommunityLinks {
  const dataPath = opts.dataPath ?? communityDataPath();
  try {
    if (!existsSync(dataPath)) {
      opts.warn?.(`Community links file not found: ${dataPath}`);
      return { ...EMPTY_LINKS, channels: [] };
    }
    const parsed = parse(readFileSync(dataPath, 'utf8'));
    const issues = validateCommunityLinks(parsed);
    if (issues.length > 0) {
      opts.warn?.(`Community links file is invalid: ${issues.join('; ')}`);
      return { ...EMPTY_LINKS, channels: [] };
    }
    return parsed as CommunityLinks;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    opts.warn?.(`Failed to load community links: ${msg}`);
    return { ...EMPTY_LINKS, channels: [] };
  }
}

export function compactUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function formatCommunityFooter(links = loadCommunityLinks()): string | null {
  const parts = [
    links.repository.github ? compactUrl(links.repository.github) : '',
    links.channels.find((ch) => ch.id === 'discord')?.url
      ? compactUrl(links.channels.find((ch) => ch.id === 'discord')!.url)
      : '',
    links.website ? compactUrl(links.website) : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Community: ${parts.join(' · ')}` : null;
}

export function formatStarNudge(links = loadCommunityLinks()): string | null {
  if (!links.star_cta.long) return null;
  return `${links.star_cta.long}\nHide this: aiwg config set --user community.nudges false`;
}

export function formatMilestoneCelebration(milestone: string, links = loadCommunityLinks()): string | null {
  const repo = links.repository.github ? compactUrl(links.repository.github) : '';
  const discord = links.channels.find((ch) => ch.id === 'discord')?.url ?? '';
  const discordCompact = discord ? compactUrl(discord) : '';
  if (!repo && !discordCompact) return null;

  const titles: Record<string, string> = {
    first_deploy: 'First AIWG deploy complete.',
    first_phase_transition: 'First phase transition complete.',
    first_release: 'First release complete.',
    first_production_deploy: 'First production deploy complete.',
  };
  const lines = [titles[milestone] ?? 'AIWG milestone complete.'];
  if (repo) lines.push(`If AIWG helped get you here, a star at ${repo} helps others find it.`);
  if (discordCompact) lines.push(`Share what you built: ${discordCompact}`);
  lines.push('Hide future nudges: aiwg config set --user community.nudges false');
  return lines.join('\n');
}
