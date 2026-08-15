#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distRoot = resolve(process.argv[2] || 'dist/aiwg-docs');
const indexPath = join(distRoot, 'blog', 'index.json');
const siteUrl = 'https://docs.aiwg.io';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  });
}

function injectOpenKitTheme(path) {
  const themePath = join(distRoot, 'open-kit.css');
  const copyPath = join(distRoot, 'code-copy.js');
  const themeHref = relative(dirname(path), themePath).replaceAll('\\', '/');
  const copySrc = relative(dirname(path), copyPath).replaceAll('\\', '/');
  const original = readFileSync(path, 'utf8');
  let html = original;

  if (!html.includes('open-kit.css')) {
    if (!html.includes('</head>')) throw new Error(`Cannot theme snapshot without </head>: ${path}`);
    html = html.replace('</head>', `  <link rel="stylesheet" href="${themeHref}">\n</head>`);
  }
  if (!/<body[^>]*data-code-copy(?:[\s=>])/.test(html)) {
    html = html.replace(/<body(?=[\s>])/, '<body data-code-copy');
  }
  if (!html.includes('code-copy.js')) {
    if (!html.includes('</body>')) throw new Error(`Cannot enhance snapshot without </body>: ${path}`);
    html = html.replace('</body>', `  <script src="${copySrc}" defer></script>\n</body>`);
  }

  if (html === original) return false;
  writeFileSync(path, html);
  return true;
}

function pageShell({ title, description, canonical, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | AIWG Documentation</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <style>
    :root { color-scheme: light; --ink: #17212b; --paper: #e8edf0; --white: #fff; --blue: #0068ff; --yellow: #ffcf33; --coral: #ff6f59; --mint: #65d6a6; --muted: #465564; --line: 3px; }
    * { box-sizing: border-box; }
    html { background: var(--paper); color: var(--ink); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
    body { margin: 0; }
    a { color: inherit; }
    a:focus-visible { outline: 4px solid var(--blue); outline-offset: 3px; }
    .site-nav { position: sticky; top: 0; z-index: 10; display: flex; gap: 1rem; align-items: center; padding: 1rem max(4vw, 1rem); border-bottom: var(--line) solid var(--ink); background: rgb(232 237 240 / 96%); }
    .logo { font-size: 1.35rem; font-weight: 950; text-decoration: none; }
    .logo span { padding: .14rem .38rem; background: var(--yellow); }
    .site-links { display: flex; gap: 1rem; margin-left: auto; }
    .site-links a { font-weight: 800; text-decoration: none; }
    .site-links a:hover { text-decoration: underline; text-decoration-thickness: 3px; }
    main { width: min(1100px, calc(100vw - 2rem)); margin: 0 auto; padding: clamp(3rem, 8vw, 7rem) 0; }
    .eyebrow, .meta { color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .78rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
    h1 { max-width: 10ch; margin: .65rem 0 1.25rem; font-size: clamp(3.5rem, 10vw, 7.5rem); line-height: .84; letter-spacing: -.065em; }
    .lead { max-width: 62ch; color: var(--muted); font-size: 1.15rem; }
    .posts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.35rem; margin-top: 3rem; }
    article { min-height: 230px; padding: 1.35rem; border: var(--line) solid var(--ink); border-top: 14px solid var(--coral); background: var(--white); box-shadow: 6px 6px 0 var(--ink); }
    article:nth-child(4n + 2) { border-top-color: var(--mint); }
    article:nth-child(4n + 3) { border-top-color: var(--yellow); }
    article:nth-child(4n) { border-top-color: var(--blue); }
    article h2 { margin: .55rem 0 .75rem; font-size: clamp(1.4rem, 3vw, 2.2rem); line-height: 1; letter-spacing: -.04em; }
    article h2 a { color: var(--ink); text-decoration-thickness: 3px; }
    .summary { color: var(--muted); margin-bottom: 0; }
    .back { display: inline-block; margin-bottom: 2rem; color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 850; }
    .site-footer { display: flex; justify-content: space-between; gap: 1rem; padding: 2rem max(4vw, 1rem); border-top: var(--line) solid var(--ink); background: var(--yellow); font-weight: 800; }
    @media (max-width: 700px) { .posts { grid-template-columns: 1fr; } .site-nav { align-items: flex-start; flex-direction: column; } .site-links { width: 100%; margin-left: 0; overflow-x: auto; } h1 { font-size: clamp(3.2rem, 18vw, 5rem); } .site-footer { flex-direction: column; } }
  </style>
</head>
<body>
<header class="site-nav">
  <a class="logo" href="https://aiwg.io/">AIWG <span>/ BLOG</span></a>
  <nav class="site-links" aria-label="AIWG sites">
    <a href="/">Docs</a>
    <a href="https://aiwg.io/install/">Install</a>
    <a href="https://github.com/jmagly/aiwg">GitHub</a>
  </nav>
</header>
${body}
<footer class="site-footer"><span>AIWG · MIT licensed</span><span>Open tools for durable AI work.</span></footer>
</body>
</html>
`;
}

const data = JSON.parse(readFileSync(indexPath, 'utf8'));
const posts = Array.isArray(data.posts) ? data.posts : [];

const listItems = posts.map((post) => {
  const title = escapeHtml(post.title || post.slug);
  const date = escapeHtml(post.date || '');
  const readingTime = post.reading_time ? ` · ${escapeHtml(post.reading_time)} min read` : '';
  const summary = post.summary ? `<p class="summary">${escapeHtml(post.summary)}</p>` : '';
  const href = escapeHtml(post.url || `${siteUrl}/pages/blog--${post.slug}.html`);
  return `<article>
      <div class="meta">${date}${readingTime}</div>
      <h2><a href="${href}">${title}</a></h2>
      ${summary}
    </article>`;
}).join('\n');

write(join(distRoot, 'blog', 'index.html'), pageShell({
  title: 'AIWG Blog',
  description: 'AIWG engineering blog — how the framework works and how to use it.',
  canonical: `${siteUrl}/blog/`,
  body: `<main>
  <a class="back" href="/">← AIWG Documentation</a>
  <div class="eyebrow">AIWG Blog</div>
  <h1>AIWG Blog</h1>
  <p class="lead">Engineering notes, release context, and practical guidance for teams using AIWG.</p>
  <section class="posts" aria-label="Blog posts">
    ${listItems || '<p class="lead">No published posts yet.</p>'}
  </section>
</main>`
}));

for (const post of posts) {
  if (!post.slug) continue;
  const href = post.url || `${siteUrl}/pages/blog--${post.slug}.html`;
  write(join(distRoot, 'blog', post.slug, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(post.title || post.slug)} | AIWG Documentation</title>
  <meta http-equiv="refresh" content="0; url=${escapeHtml(href)}">
  <link rel="canonical" href="${escapeHtml(href)}">
  <script>window.location.replace(${JSON.stringify(href)});</script>
</head>
<body>
  <p><a href="${escapeHtml(href)}">Continue to ${escapeHtml(post.title || post.slug)}</a></p>
</body>
</html>
`);
}

const snapshots = htmlFiles(join(distRoot, 'pages'));
write(
  join(distRoot, 'code-copy.js'),
  readFileSync(join(repoRoot, 'docs', 'overrides', 'code-copy.js'), 'utf8'),
);
const themedSnapshots = snapshots.filter(injectOpenKitTheme).length;

console.log(`[docs-blog] wrote ${posts.length} static blog route(s) under ${join(distRoot, 'blog')}`);
console.log(`[docs-theme] linked open-kit.css and code-copy.js from ${themedSnapshots} standalone page snapshot(s)`);
