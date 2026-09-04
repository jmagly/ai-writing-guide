/** OMP native deployment, verified against 18.1.10 (5964a0f). */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import { resolveOmpPaths } from '../../../src/providers/omp-paths.mjs';
import { collectFrameworkArtifacts, getAddonFiles, isKernelSkill, listMdFiles, listSkillDirs, normalizeDeploymentMode, resolveAiwgRoot } from './base.mjs';
export const name = 'omp';
export const aliases = ['oh-my-pi'];
export const paths = { agents: '.omp/agents', commands: '.omp/prompts', skills: '.agents/skills', rules: '.omp/rules' };
export const kernelSkillsPath = '.agents/skills';
export const support = { agents: 'native', commands: 'native', skills: 'native', rules: 'native' };
export const capabilities = { skills: true, rules: true, yamlFormat: true, aggregatedOutput: false, homeDirectoryDeploy: false, parallelCommandAndSkillSurfaces: true };
const hash = value => createHash('sha256').update(value).digest('hex');
function parse(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  return match ? { metadata: YAML.parse(match[1]) || {}, body: match[2] } : { metadata: {}, body: content };
}
const render = (metadata, body) => `---\n${YAML.stringify(metadata)}---\n\n${body.trim()}\n`;
function diagnostic(opts, message) { opts.diagnostics?.push(message); if (!opts.quiet) console.warn(`OMP: ${message}`); }
import { transformAgent, mapModel } from '../../../src/providers/omp-agent.mjs';
export { transformAgent, mapModel };
const array = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
export function transformCommand(src, content, opts = {}) {
  const { metadata: m, body } = parse(content);
  const metadata = { description: String(m.description || `AIWG ${path.basename(src, '.md')} prompt`) };
  if (m['argument-hint']) metadata['argument-hint'] = m['argument-hint'];
  for (const key of Object.keys(m)) if (!['description','argument-hint','name','platforms','allowed-tools','model'].includes(key)) diagnostic(opts, `prompt ${path.basename(src)}: metadata ${key} omitted`);
  const normalized = body.replace(/\$\{(ARGUMENTS|@|\d+)\}/g, (_, name) => `$${name}`);
  return render(metadata, normalized + (m['argument-hint'] && !/\$(?:ARGUMENTS|@|\d+)/.test(normalized) ? '\n\nInvocation arguments: $@' : ''));
}
export function transformRule(src, content) {
  const { metadata: m, body } = parse(content);
  const out = { description: String(m.description || path.basename(src, '.md')) };
  for (const key of ['enabled','globs','alwaysApply','condition','astCondition','scope','agents','interruptMode']) if (m[key] !== undefined) out[key] = m[key];
  if (out.globs === undefined && m.paths) out.globs = array(m.paths);
  return render(out, body);
}
function roots(target, opts = {}) {
  const resolved = resolveOmpPaths({ cwd: target, env: opts.env, home: opts.home });
  const user = opts.global || opts.user || opts.scope === 'user';
  return { native: user ? resolved.agentDir : path.join(target, '.omp'), agents: user ? resolved.resourceDirs.agents : path.join(target, '.omp/agents'), kernel: user ? path.join(resolved.agentDir, 'skills') : path.join(target, kernelSkillsPath) };
}
function assertNoSymlink(destination) {
  let current = path.resolve(destination);
  while (true) {
    try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`OMP preserves symlink destination: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
}
function readReceipt(dir) {
  const filename = path.join(dir, '.aiwg-manifest.json');
  assertNoSymlink(filename);
  if (!fs.existsSync(filename)) return { managed: {} };
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch { throw new Error(`OMP preserves malformed receipt: ${filename}`); }
  if (!parsed || !parsed.managed || typeof parsed.managed !== 'object' || Array.isArray(parsed.managed)
    || Object.values(parsed.managed).some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
    throw new Error(`OMP preserves malformed receipt: ${filename}`);
  }
  return parsed;
}
/** Reconcile only the named standard skill's unchanged OMP-owned files. */
function removeStandardSkillCopy(destination, opts) {
  if (!fs.existsSync(destination)) return 0;
  assertNoSymlink(destination);
  const plans = [];
  function plan(dir) {
    const receipt = readReceipt(dir);
    const files = [];
    for (const [filename, entry] of Object.entries(receipt.managed)) {
      if (path.basename(filename) !== filename || entry.provider !== 'omp' || entry.transformation !== 'omp-skill') continue;
      const file = path.join(dir, filename);
      if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile()) continue;
      if (entry.hash === `sha256:${hash(fs.readFileSync(file))}`) files.push(filename);
      else diagnostic(opts, `preserved modified standard skill file ${file}`);
    }
    plans.push({ dir, receipt, files });
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory()) plan(path.join(dir, entry.name));
  }
  plan(destination);
  const count = plans.reduce((sum, item) => sum + item.files.length, 0);
  if (opts.dryRun) return count;
  for (const { dir, receipt, files } of plans.reverse()) {
    for (const filename of files) { fs.unlinkSync(path.join(dir, filename)); delete receipt.managed[filename]; }
    if (files.length) {
      const receiptPath = path.join(dir, '.aiwg-manifest.json');
      if (Object.keys(receipt.managed).length) fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      else fs.unlinkSync(receiptPath);
    }
    // Directory ownership is not recorded; leave empty directories intact.
  }
  return count;
}
/** Per-file hash receipts preserve operator creations and subsequent edits, including --force. */
function writeOwned(dest, content, source, opts = {}, transformation = 'identity') {
  assertNoSymlink(dest);
  const dir = path.dirname(dest); const receiptPath = path.join(dir, '.aiwg-manifest.json');
  const receipt = readReceipt(dir);
  const base = path.basename(dest); const prior = receipt.managed[base];
  if (fs.existsSync(dest)) {
    const current = fs.readFileSync(dest);
    if (current.equals(Buffer.from(content))) return 0;
    if (!prior || prior.provider !== 'omp' || prior.hash !== `sha256:${hash(current)}`) { diagnostic(opts, `preserved operator file ${dest}`); return 0; }
  }
  if (opts.dryRun) return 1;
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(dest, content);
  receipt.managed[base] = { hash: `sha256:${hash(content)}`, source, provider: name, transformation, version: opts.deployVersion || 'unknown', ...(opts.diagnostics?.length ? { degraded: true, diagnostics: [...opts.diagnostics] } : {}) };
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`); return 1;
}
export function deploySkillSupportAsset(source, destination, opts = {}) {
  return writeOwned(destination, fs.readFileSync(source), source, opts, 'omp-skill');
}
function deployType(files, target, opts, type, transform) {
  let count = 0; const seen = new Set();
  for (const src of files) {
    const basename = path.basename(src);
    if (seen.has(basename)) throw new Error(`OMP ${type} collision: ${basename}`);
    seen.add(basename);
    const diagnostics = [];
    const transformed = transform(src, fs.readFileSync(src, 'utf8'), { ...opts, diagnostics });
    opts.diagnostics?.push(...diagnostics);
    count += writeOwned(path.join(type === 'agents' ? roots(target, opts).agents : path.join(roots(target, opts).native, type), basename), transformed, src, { ...opts, diagnostics }, `omp-${type}`);
  }
  return count;
}
export const deployAgents = (files, target, opts = {}) => deployType(files, target, opts, 'agents', transformAgent);
export const deployCommands = (files, target, opts = {}) => deployType(files, target, opts, 'prompts', transformCommand);
export const deployRules = (files, target, opts = {}) => deployType(files, target, opts, 'rules', transformRule);
export function deploySkills(dirs, target, opts = {}) {
  let count = 0; const seen = new Map(); const root = roots(target, opts);
  for (const dir of [...new Set(dirs)]) {
    const base = path.basename(dir); const previous = seen.get(base);
    if (previous && previous !== dir) throw new Error(`OMP skill collision: ${base} (${previous}, ${dir})`);
    seen.set(base, dir);
    if (!isKernelSkill(dir) && !opts.copyStandardSkills) {
      const removed = removeStandardSkillCopy(path.join(root.kernel, base), opts);
      if (removed && !opts.quiet) console.log(`OMP: ${opts.dryRun ? 'would remove' : 'removed'} ${removed} unchanged standard skill files for ${base}`);
      continue;
    }
    // Exactly one native level, sharing kernel directory for both modes avoids double discovery.
    const dest = path.join(root.kernel, base);
    function copy(current, relative = '') {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const src = path.join(current, entry.name); const rel = path.join(relative, entry.name);
        if (entry.isDirectory()) copy(src, rel);
        else if (entry.isFile()) count += writeOwned(path.join(dest, rel), fs.readFileSync(src), src, opts, 'omp-skill');
      }
    }
    copy(dir);
  }
  return count;
}
export function createAgentsMd(target, srcRoot, dryRun = false) {
  const dest = path.join(target, '.omp/AGENTS.md');
  const start = '<!-- AIWG:omp-bootstrap:start -->'; const end = '<!-- AIWG:omp-bootstrap:end -->';
  const block = `${start}\n@../WORKSPACE.md\n@../AIWG.md\n${end}`;
  assertNoSymlink(dest);
  const receipt = readReceipt(path.dirname(dest));
  const current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  const starts = current.split(start).length - 1; const ends = current.split(end).length - 1;
  if (starts !== ends || starts > 1 || (starts && current.indexOf(start) > current.indexOf(end))) throw new Error(`OMP preserves malformed bootstrap markers: ${dest}`);
  const content = current.includes(start) && current.includes(end) ? current.slice(0, current.indexOf(start)) + block + current.slice(current.indexOf(end) + end.length) : `${current}${current ? '\n\n' : ''}${block}\n`;
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (content !== current) fs.writeFileSync(dest, content);
    const receiptPath = path.join(path.dirname(dest), '.aiwg-manifest.json');
    // Block ownership must never claim the operator's complete context file.
    receipt.managed['AGENTS.md'] = { blockHash: `sha256:${hash(block)}`, source: 'omp-bootstrap', provider: 'omp', transformation: 'managed-block' };
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
}
/** Remove only unchanged OMP receipt entries and the native bootstrap block. */
export function uninstall(target, opts = {}) {
  let removed = 0;
  const root = roots(target, opts);
  const context = path.join(root.native, 'AGENTS.md');
  assertNoSymlink(context);
  const contextReceipt = readReceipt(root.native).managed['AGENTS.md'];
  const contextPrior = fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : '';
  const contextStart = '<!-- AIWG:omp-bootstrap:start -->'; const contextEnd = '<!-- AIWG:omp-bootstrap:end -->';
  const starts = contextPrior.split(contextStart).length - 1; const ends = contextPrior.split(contextEnd).length - 1;
  if (starts !== ends || starts > 1 || (starts && contextPrior.indexOf(contextStart) > contextPrior.indexOf(contextEnd))) throw new Error(`OMP preserves malformed bootstrap markers: ${context}`);
  const contextBlock = contextPrior.match(/<!-- AIWG:omp-bootstrap:start -->[\s\S]*?<!-- AIWG:omp-bootstrap:end -->/)?.[0];
  function clean(dir) {
    if (!fs.existsSync(dir)) return;
    assertNoSymlink(dir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory() && !entry.isSymbolicLink()) clean(path.join(dir, entry.name));
    const receiptPath = path.join(dir, '.aiwg-manifest.json');
    if (!fs.existsSync(receiptPath)) return;
    const receipt = readReceipt(dir);
    for (const [name, entry] of Object.entries(receipt.managed || {})) {
      if (entry.provider !== 'omp' || path.basename(name) !== name) continue;
      const file = path.join(dir, name);
      if (fs.existsSync(file) && !fs.lstatSync(file).isSymbolicLink() && fs.lstatSync(file).isFile() && entry.hash === `sha256:${hash(fs.readFileSync(file))}`) {
        removed++; if (!opts.dryRun) { fs.unlinkSync(file); delete receipt.managed[name]; }
      }
    }
    if (!opts.dryRun) {
      if (Object.keys(receipt.managed).length) fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      else fs.unlinkSync(receiptPath);
    }
  }
  clean(root.native); if (!root.agents.startsWith(`${root.native}${path.sep}`)) clean(root.agents); if (root.kernel !== path.join(root.native, 'skills')) clean(root.kernel);
  if (contextBlock && contextReceipt?.provider === 'omp' && contextReceipt.blockHash === `sha256:${hash(contextBlock)}` && !opts.dryRun) {
    const next = contextPrior.replace(`${contextBlock}\n`, '').replace(contextBlock, '');
    if (next.trim()) fs.writeFileSync(context, next); else fs.unlinkSync(context);
    const receipt = readReceipt(root.native); delete receipt.managed['AGENTS.md'];
    const receiptPath = path.join(root.native, '.aiwg-manifest.json');
    if (Object.keys(receipt.managed).length) fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    else if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath);
  }
  return removed;
}
export const extensionBridge = 'agentic/code/providers/omp/aiwg-bridge.ts';
export function deployExtensionBridge(target, opts = {}) {
  const src = path.join(resolveAiwgRoot(opts.srcRoot) || opts.srcRoot, extensionBridge);
  return writeOwned(path.join(roots(target, opts).native, 'extensions/aiwg-bridge.ts'), fs.readFileSync(src, 'utf8'), src, opts, 'omp-extension');
}
export async function postDeploy(target, opts) {
  if (opts.createAgentsMd || (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly)) createAgentsMd(target, opts.srcRoot, opts.dryRun);
}
export const getFileExtension = () => '.md';
export async function deploy(opts) {
  const mode = normalizeDeploymentMode(opts.mode);
  const include = { includeAgents: true, includeCommands: opts.deployCommands || opts.commandsOnly, includeSkills: opts.deploySkills || opts.skillsOnly, includeRules: opts.deployRules || opts.rulesOnly };
  const directSource = ['agents', 'commands', 'skills', 'rules'].some(type => fs.existsSync(path.join(opts.srcRoot, type)));
  const framework = directSource ? {
    agents: listMdFiles(path.join(opts.srcRoot, 'agents')),
    commands: include.includeCommands ? listMdFiles(path.join(opts.srcRoot, 'commands')) : [],
    skills: include.includeSkills ? listSkillDirs(path.join(opts.srcRoot, 'skills')) : [],
    rules: include.includeRules ? listMdFiles(path.join(opts.srcRoot, 'rules')) : [],
  } : collectFrameworkArtifacts(opts.srcRoot, mode, include);
  const addon = !directSource && ['general','sdlc','both','all'].includes(mode) ? getAddonFiles(opts.srcRoot, include) : { agents: [], commands: [], skills: [], rules: [] };
  const selected = type => {
    const frameworkNames = new Set(framework[type].map(file => path.basename(file)));
    const addonByName = new Map();
    for (const file of [...addon[type]].sort()) {
      const basename = path.basename(file);
      if (frameworkNames.has(basename)) continue;
      if (addonByName.has(basename)) { diagnostic(opts, `bundled ${type} duplicate ${basename}; keeping ${addonByName.get(basename)}`); continue; }
      addonByName.set(basename, file);
    }
    return [...new Set([...addonByName.values(), ...framework[type]])];
  };
  let count = 0;
  if (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly) count += deployAgents(selected('agents'), opts.target, opts);
  if (include.includeCommands && !opts.skillsOnly && !opts.rulesOnly) count += deployCommands(selected('commands'), opts.target, opts);
  if (include.includeSkills && !opts.commandsOnly && !opts.rulesOnly) count += deploySkills(selected('skills'), opts.target, opts);
  if (include.includeRules && !opts.commandsOnly && !opts.skillsOnly) count += deployRules(selected('rules'), opts.target, opts);
  if (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly) count += deployExtensionBridge(opts.target, opts);
  await postDeploy(opts.target, opts); return count;
}
export default { name, aliases, paths, kernelSkillsPath, support, capabilities, mapModel, transformAgent, transformCommand, transformRule, deployAgents, deployCommands, deploySkills, deployRules, deployExtensionBridge, createAgentsMd, postDeploy, getFileExtension, deploy, uninstall };
