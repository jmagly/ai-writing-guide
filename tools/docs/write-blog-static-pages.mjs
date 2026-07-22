#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const distRoot = resolve(process.argv[2] || 'dist/aiwg-docs');
const indexPath = join(distRoot, 'blog', 'index.json');
const siteUrl = 'https://docs.aiwg.io';

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
    :root { color-scheme: dark; --bg: #050712; --panel: #0b1220; --text: #e5edf8; --muted: #9fb2c8; --accent: #66e3ff; --line: rgba(255,255,255,.14); }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top left, rgba(102,227,255,.14), transparent 32rem), var(--bg); color: var(--text); font: 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(980px, calc(100vw - 2rem)); margin: 0 auto; padding: 4rem 0; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .eyebrow { color: var(--accent); font-size: .78rem; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: .5rem 0 1rem; font-size: clamp(2.25rem, 7vw, 4.5rem); line-height: .95; letter-spacing: -.05em; }
    .lead { color: var(--muted); max-width: 62ch; font-size: 1.08rem; }
    .posts { display: grid; gap: 1rem; margin-top: 2rem; }
    article { border: 1px solid var(--line); background: color-mix(in srgb, var(--panel) 86%, transparent); border-radius: 1rem; padding: 1.25rem; }
    article h2 { margin: .35rem 0 .5rem; font-size: clamp(1.25rem, 4vw, 2rem); line-height: 1.08; }
    .meta { color: var(--muted); font-size: .9rem; }
    .summary { color: var(--muted); margin-bottom: 0; }
    .back { display: inline-block; margin-bottom: 2rem; color: var(--muted); }
  </style>
</head>
<body>
${body}
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

console.log(`[docs-blog] wrote ${posts.length} static blog route(s) under ${join(distRoot, 'blog')}`);
