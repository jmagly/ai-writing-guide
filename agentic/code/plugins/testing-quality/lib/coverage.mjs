import path from 'node:path';
import { relativePath } from './workspace.mjs';

const metrics = ['lines','statements','functions','branches'];
function filename(value, root) {
  if (typeof value !== 'string') throw new Error('Coverage file needs a path');
  return relativePath(path.isAbsolute(value) ? path.relative(root,value).split(path.sep).join('/') : value);
}
function counter(values) {
  if (!Array.isArray(values) || values.some(v => !Number.isInteger(v) || v < 0)) throw new Error('Coverage hits must be nonnegative integers');
  return {covered:values.filter(v => v > 0).length,total:values.length};
}
function pair(value) {
  if (!value || !Number.isInteger(value.covered) || !Number.isInteger(value.total) || value.covered < 0 || value.total < value.covered) throw new Error('Invalid coverage numerator/denominator');
  return {covered:value.covered,total:value.total};
}
function location(value) {
  const point = p => p && Number.isInteger(p.line) && p.line > 0 && Number.isInteger(p.column) && p.column >= 0;
  if (!value || !point(value.start) || !point(value.end) || value.end.line < value.start.line || (value.end.line === value.start.line && value.end.column < value.start.column)) throw new Error('Invalid Istanbul source location');
}
/** Full Istanbul maps or an explicitly scoped canonical counter report. No percent-only import. */
export function normalizeCoverage(raw,{format,root,inventory,provider,version}) {
  const errors = [], files = [];
  try {
    const report = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (format === 'canonical') {
      if (report?.complete !== true || !Array.isArray(report.files)) throw new Error('Canonical coverage requires complete:true and files');
      for (const file of report.files) files.push({path:filename(file.path,root),metrics:Object.fromEntries(metrics.map(m => [m,file.metrics?.[m] == null ? null : pair(file.metrics[m])]))});
    } else if (format === 'istanbul') {
      if (!report || typeof report !== 'object' || Array.isArray(report)) throw new Error('Expected an Istanbul file map');
      for (const [key,file] of Object.entries(report)) {
        if (!file || !file.statementMap || !file.fnMap || !file.branchMap || !file.s || !file.f || !file.b) throw new Error('Incomplete Istanbul maps');
        if (filename(key,root) !== filename(file.path,root)) throw new Error('Istanbul map key and source path disagree');
        for (const [map,hits] of [[file.statementMap,file.s],[file.fnMap,file.f],[file.branchMap,file.b]]) if (Object.keys(map).sort().join('\0') !== Object.keys(hits).sort().join('\0')) throw new Error('Istanbul location and hit keys disagree');
        const lines = new Map();
        for (const [id,hit] of Object.entries(file.s)) {
          location(file.statementMap[id]);
          const line = file.statementMap[id]?.start?.line;
          if (!Number.isInteger(line) || line < 1) throw new Error('Invalid Istanbul source location');
          lines.set(line,Math.max(lines.get(line) ?? 0,hit));
        }
        for (const fn of Object.values(file.fnMap)) { location(fn.decl); location(fn.loc); }
        for (const [id,hits] of Object.entries(file.b)) {
          if (!Array.isArray(hits) || hits.length !== file.branchMap[id]?.locations?.length) throw new Error('Istanbul branch locations and hits disagree');
          location(file.branchMap[id].loc); file.branchMap[id].locations.forEach(location);
        }
        files.push({path:filename(file.path ?? key,root),metrics:{lines:counter([...lines.values()]),statements:counter(Object.values(file.s)),functions:counter(Object.values(file.f)),branches:counter(Object.values(file.b).flat())}});
      }
    } else throw new Error(`Unsupported coverage adapter: ${format}`);
  } catch (error) { errors.push({code:'INVALID_COVERAGE',message:error.message}); }
  const seen = new Set();
  for (const f of files) { if (seen.has(f.path)) errors.push({code:'DUPLICATE_COVERAGE_FILE',message:f.path}); seen.add(f.path); }
  const source = inventory.spec.files.filter(f => f.isSource).map(f => f.path);
  const missingFiles = source.filter(f => !seen.has(f));
  const extraFiles = files.filter(f => !source.includes(f.path)).map(f => f.path);
  const scoped = files.filter(f => source.includes(f.path));
  const totals = Object.fromEntries(metrics.map(metric => {
    const known = scoped.length > 0 && scoped.every(f => f.metrics[metric] !== null);
    return [metric, known ? scoped.reduce((sum,f) => ({covered:sum.covered+f.metrics[metric].covered,total:sum.total+f.metrics[metric].total}),{covered:0,total:0}) : null];
  }));
  if (!files.length) errors.push({code:'EMPTY_COVERAGE',message:'No file-level coverage records'});
  return {provider,version,format,scope:{root,sourceFiles:source,missingFiles,extraFiles},files,totals,complete:errors.length === 0 && missingFiles.length === 0,errors};
}
