/**
 * Codex `agents/openai.yaml` UI sidecar tests (PUW-028 / #1129).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as yaml from 'js-yaml';
import {
  buildSidecarPayload,
  renderSidecarYaml,
  emitCodexSidecar,
} from '../../../src/smiths/skillsmith/codex-sidecar.js';
import { AIWG_BRAND_DEFAULTS } from '../../../src/smiths/context-pipeline/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-codex-sidecar-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('buildSidecarPayload', () => {
  it('builds payload from frontmatter name + description', () => {
    const payload = buildSidecarPayload(
      { name: 'address-issues', description: 'Issue-driven AL orchestrator' },
      'address-issues',
    );
    expect(payload).not.toBeNull();
    expect(payload!.display_name).toBe('address-issues');
    expect(payload!.default_prompt).toBe('Issue-driven AL orchestrator');
    expect(payload!.icon).toBe(AIWG_BRAND_DEFAULTS.icon);
    expect(payload!.brand_color).toBe(AIWG_BRAND_DEFAULTS.brandColor);
  });

  it('falls back to folder name when frontmatter has no name', () => {
    const payload = buildSidecarPayload(
      { description: 'Some skill' },
      'fallback-folder',
    );
    expect(payload!.display_name).toBe('fallback-folder');
  });

  it('builds a default prompt when description is missing', () => {
    const payload = buildSidecarPayload({ name: 'foo' }, 'foo');
    expect(payload!.default_prompt).toBe('Run the foo skill.');
  });

  it('sanitizes default_prompt against prompt-injection vectors', () => {
    const payload = buildSidecarPayload(
      { name: 'tricky', description: 'Has `backticks` and a code fence ```injection```' },
      'tricky',
    );
    // Sanitizer rejects backticks; default_prompt falls back to "Run the tricky skill."
    expect(payload!.default_prompt).toBe('Run the tricky skill.');
  });

  it('returns null when there is no usable identity at all', () => {
    expect(buildSidecarPayload({}, '')).toBeNull();
  });
});

describe('renderSidecarYaml', () => {
  it('emits YAML with sorted keys', () => {
    const yamlText = renderSidecarYaml({
      display_name: 'foo',
      icon: 'aiwg',
      brand_color: '#0B5FFF',
      default_prompt: 'Run foo.',
    });
    // Sorted keys: brand_color, default_prompt, display_name, icon
    const lines = yamlText.split('\n').filter((l) => l.includes(':'));
    const keys = lines.map((l) => l.split(':')[0].trim());
    expect(keys).toEqual(['brand_color', 'default_prompt', 'display_name', 'icon']);
  });

  it('round-trips through js-yaml parse', () => {
    const original = {
      display_name: 'foo',
      icon: 'aiwg',
      brand_color: '#0B5FFF',
      default_prompt: 'Run foo.',
    };
    const yamlText = renderSidecarYaml(original);
    const parsed = yaml.load(yamlText);
    expect(parsed).toEqual(original);
  });
});

describe('emitCodexSidecar', () => {
  it('writes agents/openai.yaml inside the skill folder', async () => {
    const skillFolder = path.join(tmpDir, 'foo');
    await fs.mkdir(skillFolder, { recursive: true });
    const sidecarPath = await emitCodexSidecar(skillFolder, {
      name: 'foo',
      description: 'A foo skill',
    });
    expect(sidecarPath).toBe(path.join(skillFolder, 'agents', 'openai.yaml'));

    const content = await fs.readFile(sidecarPath!, 'utf8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    expect(parsed.display_name).toBe('foo');
    expect(parsed.default_prompt).toBe('A foo skill');
    expect(parsed.icon).toBe(AIWG_BRAND_DEFAULTS.icon);
  });

  it('uses folder name when frontmatter is empty', async () => {
    const skillFolder = path.join(tmpDir, 'no-frontmatter-skill');
    await fs.mkdir(skillFolder, { recursive: true });
    const sidecarPath = await emitCodexSidecar(skillFolder, {});
    expect(sidecarPath).not.toBeNull();
    const content = await fs.readFile(sidecarPath!, 'utf8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    expect(parsed.display_name).toBe('no-frontmatter-skill');
    expect(parsed.default_prompt).toBe('Run the no-frontmatter-skill skill.');
  });

  it('overwrites an existing sidecar idempotently', async () => {
    const skillFolder = path.join(tmpDir, 'foo');
    await fs.mkdir(path.join(skillFolder, 'agents'), { recursive: true });
    await fs.writeFile(
      path.join(skillFolder, 'agents', 'openai.yaml'),
      'old: content\n',
      'utf8',
    );

    await emitCodexSidecar(skillFolder, {
      name: 'foo',
      description: 'fresh',
    });

    const content = await fs.readFile(
      path.join(skillFolder, 'agents', 'openai.yaml'),
      'utf8',
    );
    expect(content).not.toContain('old: content');
    expect(content).toContain('display_name');
    expect(content).toContain('foo');
  });
});
