import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  auditThemeRotation,
  initializeDesignWorkspace,
  rankThemeCandidates,
  recordDesignTemplate,
  recordThemeSelection,
  selectSampleMode,
  themeSimilarity
} from '../../../agentic/code/frameworks/media-marketing-kit/skills/theme-manager/scripts/theme-manager.mjs';

const REPO_ROOT = resolve(__dirname, '../../..');

describe('design theme manager', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'aiwg-theme-manager-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('initializes the design artifact layout and an empty registry', async () => {
    const { registryPath } = await initializeDesignWorkspace(projectRoot);
    const registry = JSON.parse(await readFile(registryPath, 'utf8'));
    expect(registry.schemaVersion).toBe('1.0.0');
    expect(registry.themes).toEqual([]);
    expect(registry.templates).toEqual([]);
    expect(registry.usageHistory).toEqual([]);
  });

  it('persists structural templates separately from themes', async () => {
    await recordDesignTemplate(projectRoot, designTemplate());
    const root = join(projectRoot, '.aiwg', 'design');
    const json = JSON.parse(await readFile(join(root, 'templates', 'web-hero.json'), 'utf8'));
    const markdown = await readFile(join(root, 'templates', 'web-hero.md'), 'utf8');
    const registry = JSON.parse(await readFile(join(root, 'registries', 'theme-registry.json'), 'utf8'));
    expect(json.themeId).toBe('signal-garden');
    expect(markdown).toContain('## Content slots');
    expect(registry.templates).toHaveLength(1);
    expect(registry.themes).toHaveLength(0);
  });

  it('persists machine-readable and human-readable selection artifacts', async () => {
    await recordThemeSelection(projectRoot, selectedTheme());
    const root = join(projectRoot, '.aiwg', 'design');
    const json = JSON.parse(await readFile(join(root, 'themes', 'signal-garden.json'), 'utf8'));
    const markdown = await readFile(join(root, 'themes', 'signal-garden.md'), 'utf8');
    const registry = JSON.parse(await readFile(join(root, 'registries', 'theme-registry.json'), 'utf8'));
    expect(json.status).toBe('selected');
    expect(markdown).toContain('# Signal Garden');
    expect(registry.usageHistory).toHaveLength(1);
    expect(registry.usageHistory[0].snapshot.motifs).toContain('signal nodes');
  });

  it('detects repetition and rewards genuinely distinct candidates', () => {
    const history = [{
      themeId: 'recent-orb',
      usedAt: '2026-07-01T00:00:00Z',
      snapshot: {
        motifs: ['gradient orb', 'glow'],
        palette: ['violet', 'navy'],
        typographyTags: ['geometric sans'],
        imageryTags: ['3d abstract']
      }
    }];
    const repeated = {
      id: 'repeat', motifs: ['gradient orb', 'glow'], palette: ['violet', 'navy'],
      typographyTags: ['geometric sans'], imageryTags: ['3d abstract'],
      scores: baseScores()
    };
    const distinct = {
      id: 'distinct', motifs: ['paper cut grid'], palette: ['rust', 'cream'],
      typographyTags: ['editorial serif'], imageryTags: ['documentary photography'],
      scores: baseScores()
    };
    expect(themeSimilarity(repeated, history[0].snapshot)).toBe(1);
    expect(auditThemeRotation(repeated, history).passes).toBe(false);
    expect(auditThemeRotation(distinct, history).passes).toBe(true);
    expect(rankThemeCandidates([repeated, distinct], history)[0].id).toBe('distinct');
  });

  it('provides a useful specification-only fallback when image generation is absent', () => {
    const fallback = selectSampleMode({ imageGeneration: false });
    expect(fallback.mode).toBe('specification-only');
    expect(fallback.requiredOutputs).toEqual(expect.arrayContaining(['production-prompt', 'layout-specification']));
    expect(fallback.disclosure).toContain('unavailable');
    expect(selectSampleMode({ imageGeneration: true }).requiredOutputs).toContain('generated-sample');
  });

  it('validates separate theme and structural template records', async () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
    const themeSchema = JSON.parse(await readFile(join(REPO_ROOT, 'agentic/code/frameworks/media-marketing-kit/schemas/theme.schema.json'), 'utf8'));
    const templateSchema = JSON.parse(await readFile(join(REPO_ROOT, 'agentic/code/frameworks/media-marketing-kit/schemas/design-template.schema.json'), 'utf8'));
    expect(ajv.compile(themeSchema)(selectedTheme())).toBe(true);
    expect(ajv.compile(templateSchema)(designTemplate())).toBe(true);
  });

  it('declares all required discovery phrases and design flows', async () => {
    const skill = await readFile(join(REPO_ROOT, 'agentic/code/frameworks/media-marketing-kit/skills/theme-manager/SKILL.md'), 'utf8');
    for (const phrase of ['pick a visual theme', 'create five hero directions', 'manage design templates', 'stop repeating the same aesthetic']) {
      expect(skill).toContain(phrase);
    }
    const flows = await readFile(join(REPO_ROOT, 'agentic/code/frameworks/media-marketing-kit/flows/design-operations.md'), 'utf8');
    for (const flow of ['theme-from-brand', 'template-from-theme', 'refresh-existing-theme', 'campaign-visual-direction', 'web-hero', 'landing-page-visual-system', 'social-asset-family', 'presentation-theme', 'report-publication-theme', 'design-review', 'theme-rotation', 'archive-theme']) {
      expect(flows).toContain(`\`${flow}\``);
    }
  });
});

function baseScores() {
  return { brandFit: 0.8, audienceFit: 0.8, channelFit: 0.8, accessibility: 0.8, productionFeasibility: 0.8 };
}

function selectedTheme() {
  return {
    schemaVersion: '1.0.0',
    id: 'signal-garden',
    version: '1.0.0',
    name: 'Signal Garden',
    owner: 'design-ops',
    status: 'selected',
    channels: ['web', 'social'],
    visualLanguage: 'Modular botanical signal forms show measured growth.',
    motifs: ['modular stems', 'signal nodes'],
    palette: ['navy', 'green', 'cream'],
    typographyTags: ['humanist sans'],
    imageryTags: ['diagrammatic botanical'],
    approvalState: 'pending-qa',
    selectionRationale: 'Distinct from recent abstract gradient work.'
  };
}

function designTemplate() {
  return {
    schemaVersion: '1.0.0', id: 'web-hero', version: '1.0.0', name: 'Web Hero', owner: 'design-ops',
    status: 'draft', themeId: 'signal-garden', channels: ['web'],
    contentSlots: [{ id: 'headline', purpose: 'Primary message', required: true }],
    layout: { grid: '12 column', responsiveRules: ['stack below 768px'], safeZones: ['64px text inset'] },
    exports: { formats: ['AVIF', 'WebP'], colorMode: 'RGB', resolutionDpi: 96, bleed: null, namingConvention: '{theme}-{variant}' },
    approvalState: 'pending'
  };
}
