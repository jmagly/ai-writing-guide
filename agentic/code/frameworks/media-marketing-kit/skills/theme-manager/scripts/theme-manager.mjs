#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DESIGN_DIRECTORIES = [
  'themes', 'templates', 'samples', 'decisions', 'registries', 'reviews'
];

const REGISTRY_VERSION = '1.0.0';

export function resolveDesignRoot(projectRoot = process.cwd()) {
  return path.join(projectRoot, '.aiwg', 'design');
}

export async function initializeDesignWorkspace(projectRoot = process.cwd()) {
  const root = resolveDesignRoot(projectRoot);
  await Promise.all(DESIGN_DIRECTORIES.map((directory) => mkdir(path.join(root, directory), { recursive: true })));
  const registryPath = path.join(root, 'registries', 'theme-registry.json');
  if (!existsSync(registryPath)) {
    await writeJson(registryPath, {
      schemaVersion: REGISTRY_VERSION,
      updatedAt: new Date().toISOString(),
      themes: [],
      templates: [],
      usageHistory: []
    });
  }
  return { root, registryPath };
}

export function selectSampleMode(capabilities = {}) {
  const imageGeneration = capabilities.imageGeneration === true;
  return {
    mode: imageGeneration ? 'image-generation' : 'specification-only',
    canGenerateImages: imageGeneration,
    requiredOutputs: imageGeneration
      ? ['visual-sample-spec', 'generated-sample', 'generation-metadata']
      : ['visual-sample-spec', 'production-prompt', 'layout-specification'],
    disclosure: imageGeneration
      ? 'Image generation is available; samples remain concepts until brand, accessibility, licensing, and technical QA pass.'
      : 'Image generation is unavailable; production-grade prompts and layout specifications will be produced instead.'
  };
}

function normalizeTerms(values = []) {
  return new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / union.size;
}

export function themeSimilarity(candidate, priorTheme) {
  const motif = jaccard(normalizeTerms(candidate.motifs), normalizeTerms(priorTheme.motifs));
  const palette = jaccard(normalizeTerms(candidate.palette), normalizeTerms(priorTheme.palette));
  const typography = jaccard(normalizeTerms(candidate.typographyTags), normalizeTerms(priorTheme.typographyTags));
  const imagery = jaccard(normalizeTerms(candidate.imageryTags), normalizeTerms(priorTheme.imageryTags));
  return Number((motif * 0.4 + palette * 0.25 + typography * 0.15 + imagery * 0.2).toFixed(4));
}

export function auditThemeRotation(candidate, usageHistory = [], options = {}) {
  const windowSize = options.windowSize ?? 6;
  const threshold = options.threshold ?? 0.55;
  const recent = usageHistory.slice(-windowSize);
  const comparisons = recent.map((entry) => ({
    themeId: entry.themeId,
    usedAt: entry.usedAt,
    similarity: themeSimilarity(candidate, entry.snapshot ?? entry)
  })).sort((a, b) => b.similarity - a.similarity);
  const maximumSimilarity = comparisons[0]?.similarity ?? 0;
  return {
    passes: maximumSimilarity < threshold,
    threshold,
    windowSize,
    maximumSimilarity,
    mostSimilarThemeId: comparisons[0]?.themeId ?? null,
    comparisons,
    guidance: maximumSimilarity < threshold
      ? 'Candidate is sufficiently distinct from recent themes.'
      : 'Revise the dominant motif, palette family, imagery treatment, or typography direction before selection.'
  };
}

export function rankThemeCandidates(candidates, usageHistory = [], weights = {}) {
  const resolvedWeights = {
    brandFit: 0.25,
    audienceFit: 0.2,
    channelFit: 0.15,
    accessibility: 0.15,
    productionFeasibility: 0.1,
    distinctiveness: 0.15,
    ...weights
  };
  return candidates.map((candidate) => {
    const rotation = auditThemeRotation(candidate, usageHistory);
    const distinctiveness = 1 - rotation.maximumSimilarity;
    const dimensions = { ...candidate.scores, distinctiveness };
    const score = Object.entries(resolvedWeights).reduce(
      (total, [key, weight]) => total + (Number(dimensions[key] ?? 0) * weight), 0
    );
    return { ...candidate, rotation, weightedScore: Number(score.toFixed(4)) };
  }).sort((a, b) => b.weightedScore - a.weightedScore);
}

export async function loadThemeRegistry(projectRoot = process.cwd()) {
  const { registryPath } = await initializeDesignWorkspace(projectRoot);
  return JSON.parse(await readFile(registryPath, 'utf8'));
}

export async function recordThemeSelection(projectRoot, selection) {
  requireFields(selection, ['id', 'name', 'owner', 'channels', 'motifs', 'palette']);
  const { root, registryPath } = await initializeDesignWorkspace(projectRoot);
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const selectedAt = selection.selectedAt ?? new Date().toISOString();
  const theme = {
    schemaVersion: REGISTRY_VERSION,
    version: selection.version ?? '1.0.0',
    status: selection.status ?? 'selected',
    approvalState: selection.approvalState ?? 'pending-qa',
    ...selection,
    selectedAt
  };
  const existing = registry.themes.findIndex((entry) => entry.id === theme.id);
  if (existing >= 0) registry.themes[existing] = theme;
  else registry.themes.push(theme);
  registry.usageHistory.push({
    themeId: theme.id,
    usedAt: selectedAt,
    channels: theme.channels,
    project: theme.project ?? null,
    snapshot: pickSnapshot(theme)
  });
  registry.updatedAt = new Date().toISOString();
  await writeJson(registryPath, registry);
  await writeJson(path.join(root, 'themes', `${safeId(theme.id)}.json`), theme);
  await writeFile(path.join(root, 'themes', `${safeId(theme.id)}.md`), renderThemeCard(theme), 'utf8');
  await writeJson(path.join(root, 'decisions', `${safeId(theme.id)}-selection.json`), {
    themeId: theme.id,
    selectedAt,
    selectedBy: selection.selectedBy ?? theme.owner,
    rationale: selection.selectionRationale ?? '',
    alternatives: selection.alternatives ?? [],
    researchReferences: selection.researchReferences ?? []
  });
  return { theme, registryPath };
}

export async function recordDesignTemplate(projectRoot, designTemplate) {
  requireFields(designTemplate, ['id', 'name', 'owner', 'channels', 'contentSlots', 'layout', 'exports']);
  const { root, registryPath } = await initializeDesignWorkspace(projectRoot);
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  registry.templates ??= [];
  const record = {
    schemaVersion: REGISTRY_VERSION,
    version: designTemplate.version ?? '1.0.0',
    status: designTemplate.status ?? 'draft',
    approvalState: designTemplate.approvalState ?? 'pending',
    ...designTemplate,
    updatedAt: new Date().toISOString()
  };
  const existing = registry.templates.findIndex((entry) => entry.id === record.id);
  if (existing >= 0) registry.templates[existing] = record;
  else registry.templates.push(record);
  registry.updatedAt = record.updatedAt;
  await writeJson(registryPath, registry);
  await writeJson(path.join(root, 'templates', `${safeId(record.id)}.json`), record);
  await writeFile(path.join(root, 'templates', `${safeId(record.id)}.md`), renderTemplateCard(record), 'utf8');
  return { template: record, registryPath };
}

function pickSnapshot(theme) {
  return {
    motifs: theme.motifs ?? [],
    palette: theme.palette ?? [],
    typographyTags: theme.typographyTags ?? [],
    imageryTags: theme.imageryTags ?? []
  };
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function requireFields(value, fields) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null || value[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderThemeCard(theme) {
  return `# ${theme.name}\n\n- ID: \`${theme.id}\`\n- Version: ${theme.version}\n- Status: ${theme.status}\n- Owner: ${theme.owner}\n- Approval: ${theme.approvalState}\n- Channels: ${theme.channels.join(', ')}\n\n## Visual language\n\n${theme.visualLanguage ?? 'Not recorded.'}\n\n## Motifs\n\n${theme.motifs.map((item) => `- ${item}`).join('\n')}\n\n## Palette\n\n${theme.palette.map((item) => `- ${item}`).join('\n')}\n\n## Selection rationale\n\n${theme.selectionRationale ?? 'Not recorded.'}\n\n## Accessibility and usage boundaries\n\n${theme.accessibilityNotes ?? 'Pending accessibility review.'}\n\n${theme.usageBoundaries ?? 'No additional boundaries recorded.'}\n`;
}

function renderTemplateCard(template) {
  const slots = template.contentSlots.map((slot) => `- ${slot.id}: ${slot.purpose}${slot.required ? ' (required)' : ''}`).join('\n');
  return `# ${template.name}\n\n- ID: \`${template.id}\`\n- Version: ${template.version}\n- Status: ${template.status}\n- Owner: ${template.owner}\n- Theme: ${template.themeId ?? 'unlinked'}\n- Channels: ${template.channels.join(', ')}\n\n## Content slots\n\n${slots}\n\n## Layout\n\n- Grid: ${template.layout.grid}\n- Responsive rules: ${(template.layout.responsiveRules ?? []).join('; ')}\n- Safe zones: ${(template.layout.safeZones ?? []).join('; ')}\n\n## Exports\n\n- Formats: ${template.exports.formats.join(', ')}\n- Naming: ${template.exports.namingConvention}\n`;
}

async function main(argv) {
  const [command, inputPath, projectRoot = process.cwd()] = argv;
  if (command === 'init') {
    console.log(JSON.stringify(await initializeDesignWorkspace(inputPath ?? projectRoot), null, 2));
    return;
  }
  if (command === 'record' && inputPath) {
    const selection = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
    console.log(JSON.stringify(await recordThemeSelection(projectRoot, selection), null, 2));
    return;
  }
  if (command === 'record-template' && inputPath) {
    const designTemplate = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
    console.log(JSON.stringify(await recordDesignTemplate(projectRoot, designTemplate), null, 2));
    return;
  }
  if (command === 'audit' && inputPath) {
    const candidate = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
    const registry = await loadThemeRegistry(projectRoot);
    console.log(JSON.stringify(auditThemeRotation(candidate, registry.usageHistory), null, 2));
    return;
  }
  throw new Error('Usage: theme-manager.mjs init [project-root] | record <selection.json> [project-root] | record-template <template.json> [project-root] | audit <candidate.json> [project-root]');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
