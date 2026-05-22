import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { compactUrl, formatCommunityFooter, loadCommunityLinks, validateCommunityLinks } from '../../../src/community/links.js';

let tempDir: string | null = null;

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('community links', () => {
  it('loads and formats the shipped community links', () => {
    const links = loadCommunityLinks();
    expect(validateCommunityLinks(links)).toEqual([]);
    expect(formatCommunityFooter(links)).toBe('Community: github.com/jmagly/aiwg · discord.gg/BuAusFMxdA · aiwg.io');
  });

  it('returns empty links for malformed data without throwing', () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'aiwg-links-'));
    const dataPath = path.join(tempDir, 'community.yaml');
    writeFileSync(dataPath, `website: 123\nchannels: nope\n`, 'utf8');
    const warnings: string[] = [];
    const links = loadCommunityLinks({ dataPath, warn: (message) => warnings.push(message) });
    expect(links.channels).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('compacts URLs for CLI footer output', () => {
    expect(compactUrl('https://aiwg.io/')).toBe('aiwg.io');
  });
});
