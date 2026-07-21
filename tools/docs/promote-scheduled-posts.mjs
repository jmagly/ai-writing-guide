#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const SCHEDULED_DIR = resolve(ROOT, 'scheduled-docs/blog');
const LIVE_DIR = resolve(ROOT, 'docs/blog');
const BLOG_MANIFEST = resolve(ROOT, 'docs/blog/_manifest.json');
const DOCS_MANIFEST = resolve(ROOT, 'docs/_manifest.json');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const nowArg = process.argv.find((arg) => arg.startsWith('--now='));
const now = nowArg ? new Date(nowArg.slice('--now='.length)) : new Date();

function frontmatter(src) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    data[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return data;
}

function isDue(meta) {
  if (!meta.publish_at) return false;
  const due = new Date(meta.publish_at);
  return !Number.isNaN(due.valueOf()) && due <= now;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function addToManifest(slug, meta) {
  const blog = JSON.parse(readFileSync(BLOG_MANIFEST, 'utf8'));
  blog.order = [slug, ...(blog.order || []).filter((item) => item !== slug)];
  writeJson(BLOG_MANIFEST, blog);

  const docs = JSON.parse(readFileSync(DOCS_MANIFEST, 'utf8'));
  const id = `blog/${slug}`;
  docs.order = (docs.order || []).includes(id) ? docs.order : [...(docs.order || []), id];
  docs.pages = (docs.pages || []).filter((page) => page.id !== id);
  const blogIdx = docs.pages.findIndex((page) => page.id === 'blog');
  const page = {
    id,
    title: meta.title || slug,
    summary: meta.summary || '',
    file: `blog/${slug}.md`,
    parent: 'blog',
  };
  if (blogIdx === -1) docs.pages.push(page);
  else docs.pages.splice(blogIdx + 1, 0, page);
  writeJson(DOCS_MANIFEST, docs);
}

if (!existsSync(SCHEDULED_DIR)) {
  console.log(`[scheduled-docs] no scheduled directory: ${SCHEDULED_DIR}`);
  process.exit(0);
}

const due = [];
for (const entry of readdirSync(SCHEDULED_DIR)) {
  if (!entry.endsWith('.md')) continue;
  const path = resolve(SCHEDULED_DIR, entry);
  const src = readFileSync(path, 'utf8');
  const meta = frontmatter(src);
  if (isDue(meta)) due.push({ path, slug: meta.slug || basename(entry, '.md'), meta });
}

if (due.length === 0) {
  console.log('[scheduled-docs] no due posts');
  process.exit(0);
}

mkdirSync(LIVE_DIR, { recursive: true });
for (const post of due) {
  const target = resolve(LIVE_DIR, `${post.slug}.md`);
  console.log(`[scheduled-docs] promote ${post.path} -> ${target}`);
  if (existsSync(target)) throw new Error(`target already exists: ${target}`);
  if (!dryRun) {
    mkdirSync(dirname(target), { recursive: true });
    renameSync(post.path, target);
    addToManifest(post.slug, post.meta);
  }
}

if (dryRun) console.log('[scheduled-docs] dry run complete');
