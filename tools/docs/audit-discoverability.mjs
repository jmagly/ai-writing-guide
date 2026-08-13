#!/usr/bin/env node

import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOCS_DISCOVERABILITY_SCHEMA = 'aiwg.docs-discoverability/v1';
export const DOCS_DISCOVERABILITY_REPORT_SCHEMA = 'aiwg.docs-discoverability-report/v1';
const STATUSES = ['pass', 'fail', 'warn', 'not-applicable'];

function parseArgs(argv) {
  const options = { root: process.cwd(), graph: '', output: '', json: false, failOnFindings: true, now: new Date() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root' && argv[index + 1]) options.root = path.resolve(argv[++index]);
    else if (arg === '--graph' && argv[index + 1]) options.graph = argv[++index];
    else if (arg === '--out' && argv[index + 1]) options.output = path.resolve(argv[++index]);
    else if (arg === '--json') options.json = true;
    else if (arg === '--no-fail') options.failOnFindings = false;
    else if (arg === '--now' && argv[index + 1]) options.now = new Date(argv[++index]);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  options.graph = path.resolve(options.root, options.graph || 'docs-discoverability.json');
  if (Number.isNaN(options.now.getTime())) throw new Error('--now must be an ISO-8601 date');
  return options;
}

function normalizeUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return null;
    const pathname = url.pathname.replace(/\/index\.html$/, '/');
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  } catch { return null; }
}

async function optionalText(filename) {
  try { return await readFile(filename, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function linksFrom(content, baseUrl) {
  if (!content) return [];
  const values = [
    ...[...content.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]),
    ...[...content.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)].map(match => match[1]),
  ];
  return [...new Set(values.map(value => normalizeUrl(value, baseUrl)).filter(Boolean))];
}

function visibleText(content) {
  return (content || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`#*_>[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(content) {
  return new Set(visibleText(content).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
}

function jaccard(left, right) {
  if (!left.size && !right.size) return 1;
  const intersection = [...left].filter(token => right.has(token)).length;
  return intersection / (left.size + right.size - intersection);
}

function robotsDisallows(content) {
  const disallows = [];
  let applies = false;
  for (const raw of (content || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (key?.trim().toLowerCase() === 'user-agent') applies = value === '*';
    if (applies && key?.trim().toLowerCase() === 'disallow' && value) disallows.push(value);
  }
  return disallows;
}

function sitemapUrls(content, baseUrl) {
  return new Set([...((content || '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))]
    .map(match => normalizeUrl(match[1].trim(), baseUrl)).filter(Boolean));
}

function canonicalUrl(content) {
  const tag = (content || '').match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i)?.[0]
    || (content || '').match(/<link\b(?=[^>]*\bhref\s*=)[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i)?.[0];
  return tag?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || null;
}

function noindex(content) {
  return [...((content || '').matchAll(/<meta\b[^>]*\bname\s*=\s*["']robots["'][^>]*>/gi))]
    .some(match => /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(match[0]));
}

function structuredData(content) {
  const blocks = [...((content || '').matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))];
  if (!blocks.length) return { present: false, valid: false };
  return { present: true, valid: blocks.every(block => { try { JSON.parse(block[1]); return true; } catch { return false; } }) };
}

function aggregate(statuses) {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  if (statuses.includes('pass')) return 'pass';
  return 'not-applicable';
}

function finding(code, status, domain, page, message) {
  return { code, status, domain, url_class: page?.urlClass || null, url: page?.url || null, message };
}

function validateGraph(graph) {
  if (graph.schema !== DOCS_DISCOVERABILITY_SCHEMA || typeof graph.baseUrl !== 'string' || !Array.isArray(graph.pages) || !graph.pages.length) {
    throw new Error(`Source graph must use ${DOCS_DISCOVERABILITY_SCHEMA} with baseUrl and pages`);
  }
  const urls = new Set();
  for (const page of graph.pages) {
    if (!page.url || !page.urlClass || !page.html || !page.markdown || !page.expected || urls.has(page.url)
      || typeof page.expected.crawl !== 'boolean' || typeof page.expected.index !== 'boolean' || typeof page.expected.ai !== 'boolean') {
      throw new Error('Source graph contains a malformed or duplicate page');
    }
    urls.add(page.url);
  }
}

export async function auditGeneratedDocs({ root, graphPath, now = new Date() }) {
  const graph = JSON.parse(await readFile(graphPath, 'utf8'));
  validateGraph(graph);
  const artifacts = graph.artifacts || {};
  const resolvedRoot = path.resolve(root);
  const resolve = value => {
    const candidate = path.resolve(resolvedRoot, value);
    const relative = path.relative(resolvedRoot, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Source graph path escapes site root: ${value}`);
    return candidate;
  };
  const llms = await optionalText(resolve(artifacts.llms || 'llms.txt'));
  const llmsFull = await optionalText(resolve(artifacts.llmsFull || 'llms-full.txt'));
  const sitemap = await optionalText(resolve(artifacts.sitemap || 'sitemap.xml'));
  const robots = await optionalText(resolve(artifacts.robots || 'robots.txt'));
  const llmsLinks = new Set(linksFrom(llms, graph.baseUrl));
  const llmsFullLinks = new Set(linksFrom(llmsFull, graph.baseUrl));
  const sitemapSet = sitemapUrls(sitemap, graph.baseUrl);
  const disallows = robotsDisallows(robots);
  const pages = [];
  const findings = [];

  for (const declared of graph.pages) {
    const html = await optionalText(resolve(declared.html));
    const markdown = await optionalText(resolve(declared.markdown));
    const page = { ...declared, htmlContent: html, markdownContent: markdown, links: linksFrom(`${html || ''}\n${markdown || ''}`, graph.baseUrl) };
    pages.push(page);
    findings.push(finding('HTML_EXPORT', html ? 'pass' : 'fail', 'crawl', page, html ? 'HTML export exists.' : `Missing HTML export ${declared.html}.`));
    findings.push(finding('MARKDOWN_EXPORT', markdown ? 'pass' : 'fail', 'ai', page, markdown ? 'Markdown export exists.' : `Missing Markdown export ${declared.markdown}.`));
    const sitemapMatches = sitemapSet.has(page.url) === Boolean(page.expected.crawl);
    findings.push(finding('SITEMAP_ENTRY', sitemap === null ? 'fail' : sitemapMatches ? 'pass' : 'fail', 'crawl', page,
      sitemap === null ? 'sitemap.xml is missing.' : sitemapMatches ? `Sitemap membership matches expected crawl=${Boolean(page.expected.crawl)}.` : `Sitemap membership ${sitemapSet.has(page.url)} does not match expected crawl=${Boolean(page.expected.crawl)}.`));
    const expectedCanonical = new URL(page.url, graph.baseUrl).href;
    const actualCanonical = canonicalUrl(html);
    findings.push(finding('CANONICAL', actualCanonical === expectedCanonical ? 'pass' : 'fail', 'index', page,
      actualCanonical === expectedCanonical ? 'Canonical URL matches the source graph.' : `Expected canonical ${expectedCanonical}; observed ${actualCanonical || 'none'}.`));
    const blocked = disallows.some(rule => page.url.startsWith(rule));
    findings.push(finding('ROBOTS_CRAWL', robots === null ? 'fail' : blocked === !Boolean(page.expected.crawl) ? 'pass' : 'fail', 'crawl', page,
      robots === null ? 'robots.txt is missing.' : `Robots blocked=${blocked}; expected crawl=${Boolean(page.expected.crawl)}.`));
    const indexed = !noindex(html);
    findings.push(finding('NOINDEX_POLICY', indexed === Boolean(page.expected.index) ? 'pass' : 'fail', 'index', page,
      `Observed index=${indexed}; expected index=${Boolean(page.expected.index)}.`));
    for (const [code, name, content, discovered] of [
      ['LLMS_DISCOVERY', 'llms.txt', llms, llmsLinks],
      ['LLMS_FULL_DISCOVERY', 'llms-full.txt', llmsFull, llmsFullLinks],
    ]) {
      const matches = discovered.has(page.url) === Boolean(page.expected.ai);
      findings.push(finding(code, content === null ? 'fail' : matches ? 'pass' : 'fail', 'ai', page,
        content === null ? `${name} is missing.` : matches ? `${name} membership matches expected ai=${Boolean(page.expected.ai)}.` : `${name} membership ${discovered.has(page.url)} does not match expected ai=${Boolean(page.expected.ai)}.`));
    }
    const data = structuredData(html);
    findings.push(finding('STRUCTURED_DATA', page.expected.structuredData === false ? 'not-applicable' : data.valid ? 'pass' : 'fail', 'ai', page,
      page.expected.structuredData === false ? 'Structured data is not required for this URL.' : data.valid ? 'Required structured data is present and valid JSON.' : data.present ? 'Structured data is malformed.' : 'Required structured data is missing.'));
    const apiLinks = [...page.links].filter(url => /\.(?:json|ya?ml)$/i.test(url));
    if (page.expected.apiSpec || apiLinks.length) {
      let valid = apiLinks.length > 0;
      for (const url of apiLinks) {
        const candidate = await optionalText(resolve(url.replace(/^\//, '')));
        if (!candidate || !/["']?openapi["']?\s*:\s*["']?3\./.test(candidate)) valid = false;
      }
      findings.push(finding('API_SPEC_LINK', valid ? 'pass' : 'fail', 'ai', page, valid ? 'Linked API specification exists and declares OpenAPI 3.' : 'Required API specification link is absent or invalid.'));
    } else findings.push(finding('API_SPEC_LINK', 'not-applicable', 'ai', page, 'This URL does not publish an API specification.'));
    const words = visibleText(`${html || ''} ${markdown || ''}`).split(/\s+/).filter(Boolean).length;
    findings.push(finding('THIN_PAGE', words < (graph.thresholds?.thinWords || 80) ? 'warn' : 'pass', 'index', page, `${words} visible words.`));
    const generated = new Date(page.generatedAt);
    const ageDays = (now.getTime() - generated.getTime()) / 86_400_000;
    findings.push(finding('STALE_GENERATED_DOC', Number.isNaN(generated.getTime()) ? 'fail' : ageDays > (graph.thresholds?.staleDays || 90) ? 'warn' : 'pass', 'index', page, `Generated age is ${Math.floor(ageDays)} day(s).`));
  }

  const allUrls = new Set(pages.map(page => page.url));
  const incoming = new Map(pages.map(page => [page.url, 0]));
  for (const page of pages) for (const link of page.links) if (allUrls.has(link) && link !== page.url) incoming.set(link, incoming.get(link) + 1);
  for (const page of pages) findings.push(finding('ORPHAN_PAGE', page.url === '/' || incoming.get(page.url) > 0 ? 'pass' : 'warn', 'crawl', page, `${incoming.get(page.url)} internal incoming link(s).`));

  const duplicateThreshold = graph.thresholds?.nearDuplicate || 0.82;
  for (let left = 0; left < pages.length; left += 1) for (let right = left + 1; right < pages.length; right += 1) {
    const similarity = jaccard(tokens(pages[left].markdownContent || pages[left].htmlContent), tokens(pages[right].markdownContent || pages[right].htmlContent));
    if (similarity >= duplicateThreshold) findings.push(finding('NEAR_DUPLICATE', 'warn', 'index', pages[right], `${pages[left].url} and ${pages[right].url} similarity=${similarity.toFixed(3)}.`));
  }

  for (const urlClass of [...new Set(pages.map(page => page.urlClass))]) {
    const members = pages.filter(page => page.urlClass === urlClass);
    if (members.length < (graph.thresholds?.doorwayMinPages || 3)) continue;
    const pairs = [];
    for (let left = 0; left < members.length; left += 1) for (let right = left + 1; right < members.length; right += 1) pairs.push(jaccard(tokens(members[left].markdownContent), tokens(members[right].markdownContent)));
    const average = pairs.reduce((sum, value) => sum + value, 0) / pairs.length;
    const representative = members[0];
    findings.push(finding('DOORWAY_URL_SET', average >= (graph.thresholds?.doorwaySimilarity || 0.75) ? 'warn' : 'pass', 'index', representative, `${members.length} pages; average pair similarity=${average.toFixed(3)}.`));
  }

  for (const [name, content] of [['llms.txt', llms], ['llms-full.txt', llmsFull]]) {
    if (content === null) continue;
    for (const link of linksFrom(content, graph.baseUrl)) if (!allUrls.has(link) && !/\.(?:json|ya?ml)$/.test(link)) {
      findings.push(finding('BROKEN_LLMS_LINK', 'fail', 'ai', null, `${name} references undeclared URL ${link}.`));
    }
  }

  const matrix = [...new Set(pages.map(page => page.urlClass))].sort().map(urlClass => {
    const scoped = findings.filter(item => item.url_class === urlClass);
    return {
      url_class: urlClass,
      pages: pages.filter(page => page.urlClass === urlClass).length,
      crawl: aggregate(scoped.filter(item => item.domain === 'crawl').map(item => item.status)),
      index: aggregate(scoped.filter(item => item.domain === 'index').map(item => item.status)),
      ai_discoverability: aggregate(scoped.filter(item => item.domain === 'ai').map(item => item.status)),
    };
  });
  const counts = Object.fromEntries(STATUSES.map(status => [status.replace('-', '_'), findings.filter(item => item.status === status).length]));
  return {
    schema: DOCS_DISCOVERABILITY_REPORT_SCHEMA,
    source_graph: path.relative(resolvedRoot, graphPath).split(path.sep).join('/'),
    generated_at: now.toISOString(),
    status: counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'pass',
    counts,
    matrix,
    findings,
  };
}

export function renderDiscoverabilityReport(report) {
  const lines = [
    `Generated docs discoverability: ${report.status.toUpperCase()}`,
    `pass=${report.counts.pass} fail=${report.counts.fail} warn=${report.counts.warn} not-applicable=${report.counts.not_applicable}`,
    '', 'URL class                 Pages  Crawl  Index  AI',
    ...report.matrix.map(row => `${row.url_class.padEnd(25)} ${String(row.pages).padStart(5)}  ${row.crawl.padEnd(5)}  ${row.index.padEnd(5)}  ${row.ai_discoverability}`),
  ];
  for (const item of report.findings.filter(entry => entry.status === 'fail' || entry.status === 'warn')) lines.push(`${item.status.toUpperCase()} ${item.code} ${item.url || '-'}: ${item.message}`);
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node tools/docs/audit-discoverability.mjs [--root DIR] [--graph FILE] [--now ISO] [--json] [--out FILE] [--no-fail]');
    return;
  }
  const report = await auditGeneratedDocs({ root: options.root, graphPath: options.graph, now: options.now });
  const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : renderDiscoverabilityReport(report);
  if (options.output) await writeFile(options.output, output, 'utf8');
  else process.stdout.write(output);
  if (options.failOnFindings && report.status === 'fail') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(`docs-discoverability-audit: ${error.message}`); process.exitCode = 2; });
