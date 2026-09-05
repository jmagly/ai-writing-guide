import path from 'node:path';
import YAML from 'yaml';
function parse(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  return match ? { metadata: YAML.parse(match[1]) || {}, body: match[2] } : { metadata: {}, body: content };
}
const render = (metadata, body) => `---\n${YAML.stringify(metadata)}---\n\n${body.trim()}\n`;
function diagnostic(opts, message) { opts.diagnostics?.push(message); if (!opts.quiet) console.warn(`OMP: ${message}`); }
export function mapModel(model, config = {}) {
  if (!model || model === 'inherit') return undefined;
  const mapped = config.omp?.[model]?.model || config.omp?.[model];
  if (typeof mapped === 'string') return mapped;
  if (['opus', 'sonnet', 'haiku', 'reasoning', 'coding', 'efficiency', 'heavy', 'medium', 'light'].includes(model)) return undefined;
  return model;
}
const toolMap = { Read: 'read', Write: 'write', Edit: 'edit', MultiEdit: 'edit', Bash: 'bash', Grep: 'grep', Glob: 'glob', WebSearch: 'web_search', Task: 'task', TodoWrite: 'todo' };
const nativeTools = new Set(['read','security_scan','bash','edit','ast_grep','ast_edit','ask','debug','eval','github','glob','grep','lsp','checkpoint','rewind','task','hub','todo','web_search','write','memory_edit','retain','recall','reflect','learn','manage_skill','think','yield','goal']);
const array = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
export function transformAgent(src, content, opts = {}) {
  const { metadata: m, body } = parse(content);
  const agentName = m.name ?? path.basename(src, '.md');
  if (typeof agentName !== 'string' || !agentName.trim()) throw new Error('OMP agent name must be a nonempty string');
  const out = { name: agentName.trim(), description: String(m.description || `AIWG ${path.basename(src, '.md')} agent`) };
  if (['main','sub'].includes(out.name.toLowerCase())) throw new Error(`OMP reserves agent name ${out.name}`);
  const tools = array(m.tools).flatMap(tool => {
    const mapped = toolMap[tool] || (nativeTools.has(tool) ? tool : undefined);
    if (!mapped) diagnostic(opts, `${out.name}: unsupported tool ${tool}; omitted (degraded)`);
    return mapped ? [mapped] : [];
  });
  // OMP treats empty spawns as undefined; remove task unless explicit delegation is configured.
  out.spawns = m.spawns === '*' ? '*' : array(m.spawns);
  out.tools = [...new Set(tools)].filter(tool => tool !== 'task' || out.spawns === '*' || out.spawns.length > 0);
  if (m.model) {
    const models = array(m.model).flatMap(model => { const mapped = mapModel(model, opts.modelsConfig || opts.modelConfig || {}); if (!mapped && model !== 'inherit') diagnostic(opts, `${out.name}: unmapped model role ${model}; inherits session model (degraded)`); return mapped ? [mapped] : []; });
    if (models.length) out.model = models.length === 1 ? models[0] : models;
  }
  for (const key of ['thinkingLevel', 'blocking', 'output', 'autoloadSkills', 'readSummarize', 'prewalk', 'advisor']) if (m[key] !== undefined) out[key] = m[key];
  if (!out.thinkingLevel && m.thinking) out.thinkingLevel = m.thinking;
  return render(out, body);
}
