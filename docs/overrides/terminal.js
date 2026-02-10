/**
 * AIWG Docs - Terminal Enhancements
 * Makes docs site work like aiwg.io with log entry pattern and console commands
 */

// Import dbbuilder's search functionality
import { MANIFEST } from './manifest.js';
import { searchContent, filterSections } from './lib/search.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const THEME_KEY = 'aiwg-theme';
const THEMES = ['dark', 'light', 'matrix'];

// Author categories for log entry styling
const AUTHOR_MAP = {
  'quickstart': 'INSTALL',
  'getting-started': 'INSTALL',
  'installation': 'INSTALL',
  'cli': 'INSTALL',
  'agents': 'FEATURES',
  'commands': 'FEATURES',
  'frameworks': 'FEATURES',
  'sdlc': 'FEATURES',
  'marketing': 'FEATURES',
  'integrations': 'FEATURES',
  'changelog': 'RELEASE',
  'releases': 'RELEASE',
  'announcements': 'RELEASE',
  'troubleshooting': 'HELP',
  'faq': 'HELP',
  'support': 'HELP',
};

// ═══════════════════════════════════════════════════════════════════════════
// Theme Switching
// ═══════════════════════════════════════════════════════════════════════════

function getTheme() {
  return document.documentElement.dataset.theme || 'dark';
}

function setTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateThemeButton();
}

function cycleTheme() {
  const current = getTheme();
  const idx = THEMES.indexOf(current);
  const next = THEMES[(idx + 1) % THEMES.length];
  setTheme(next);
}

function updateThemeButton() {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = `[${getTheme()}]`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Log Entry System
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get author category from section ID
 */
function getAuthorFromSection(sectionId) {
  if (!sectionId) return 'SYSTEM';

  const lower = sectionId.toLowerCase();
  for (const [key, author] of Object.entries(AUTHOR_MAP)) {
    if (lower.includes(key)) return author;
  }
  return 'DOCS';
}

/**
 * Create a log entry element
 */
function createLogEntry(author, content, title = '') {
  const entry = document.createElement('article');
  entry.className = 'log-entry';
  entry.dataset.author = author;

  const header = document.createElement('header');
  header.className = 'log-entry__header';
  header.innerHTML = `
    <span class="author">${author}</span>
    <span class="timestamp">${title || new Date().toLocaleTimeString()}</span>
  `;

  const body = document.createElement('div');
  body.className = 'log-entry__body';

  if (typeof content === 'string') {
    body.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  } else {
    body.innerHTML = content;
  }

  entry.appendChild(header);
  entry.appendChild(body);
  return entry;
}

/**
 * Append a text log entry to the main panel
 */
function appendLogEntry(author, content, title = '') {
  const app = document.getElementById('app');
  if (!app) return;

  const entry = createLogEntry(author, content, title);
  app.appendChild(entry);
  entry.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// Content Wrapping
// ═══════════════════════════════════════════════════════════════════════════

let lastSectionId = null;
let contentObserver = null;

/**
 * Wrap new content in log entry format
 */
function wrapContentInLogEntry(container) {
  // Get current section from hash
  const sectionId = location.hash.replace('#', '') || 'welcome';

  // Don't re-wrap the same section
  if (sectionId === lastSectionId) return;
  lastSectionId = sectionId;

  // Find the section element (dbbuilder creates <section> or content directly)
  const section = container.querySelector('section') || container.querySelector('article');
  if (!section) return;

  // Check if already wrapped
  if (section.closest('.log-entry')) return;

  // Get title from first heading or section id
  const heading = section.querySelector('h1, h2');
  const title = heading ? heading.textContent : sectionId;

  // Determine author category
  const author = getAuthorFromSection(sectionId);

  // Create wrapper
  const wrapper = document.createElement('article');
  wrapper.className = 'log-entry';
  wrapper.dataset.author = author;

  const header = document.createElement('header');
  header.className = 'log-entry__header';
  header.innerHTML = `
    <span class="author">${author}</span>
    <span class="timestamp">${title}</span>
  `;

  const body = document.createElement('div');
  body.className = 'log-entry__body';

  // Move all content into the body
  while (container.firstChild) {
    body.appendChild(container.firstChild);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(body);
  container.appendChild(wrapper);

  // Scroll to top of new content
  container.scrollTop = 0;
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Initialize content observer to wrap loaded content
 */
function initContentObserver() {
  const app = document.getElementById('app');
  if (!app) return;

  contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Debounce to let dbbuilder finish rendering
        setTimeout(() => wrapContentInLogEntry(app), 50);
        break;
      }
    }
  });

  contentObserver.observe(app, { childList: true, subtree: false });

  // Wrap initial content if present
  if (app.children.length > 0) {
    setTimeout(() => wrapContentInLogEntry(app), 100);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Console Commands
// ═══════════════════════════════════════════════════════════════════════════

const COMMANDS = {
  help: {
    description: 'Show available commands',
    handler: () => showHelp(),
  },
  search: {
    description: 'Search documentation',
    handler: (args) => searchDocs(args.join(' ')),
  },
  theme: {
    description: 'Switch theme: dark | light | matrix',
    handler: (args) => {
      const theme = args[0] || 'dark';
      if (THEMES.includes(theme)) {
        setTheme(theme);
        appendLogEntry('THEME', `Switched to "${theme}" theme`);
      } else {
        cycleTheme();
        appendLogEntry('THEME', `Switched to "${getTheme()}" theme`);
      }
    },
  },
  clear: {
    description: 'Clear the display',
    handler: () => clearDisplay(),
  },
  top: {
    description: 'Scroll to top',
    handler: () => {
      scrollToTop();
      appendLogEntry('NAV', 'Scrolled to top');
    },
  },
  home: {
    description: 'Go to home page',
    handler: () => {
      location.hash = '#welcome';
    },
  },
  version: {
    description: 'Show AIWG version',
    handler: () => appendLogEntry('VERSION', 'AIWG Docs v2024.12.5'),
  },
  github: {
    description: 'Open GitHub repo',
    handler: () => {
      window.open('https://github.com/jmagly/aiwg', '_blank');
      appendLogEntry('NAV', 'Opened GitHub repository');
    },
  },
  npm: {
    description: 'Open npm package',
    handler: () => {
      window.open('https://www.npmjs.com/package/aiwg', '_blank');
      appendLogEntry('NAV', 'Opened npm package');
    },
  },
  discord: {
    description: 'Open Discord community',
    handler: () => {
      window.open('https://discord.gg/BuAusFMxdA', '_blank');
      appendLogEntry('NAV', 'Opened Discord community');
    },
  },
};

function showHelp() {
  const lines = Object.entries(COMMANDS)
    .map(([name, { description }]) => `  ${name.padEnd(12)} ${description}`)
    .join('\n');

  appendLogEntry('HELP', `Available commands:\n\n${lines}\n\nTip: Type a search term to find docs.`);
}

// Store current search query for highlighting
let currentSearchQuery = '';

async function searchDocs(query) {
  if (!query.trim()) {
    appendLogEntry('SEARCH', 'Usage: search <query>\n\nExample: search agents');
    return;
  }

  appendLogEntry('SEARCH', `Searching for "${query}"... (indexing on first search)`);
  currentSearchQuery = query.trim();

  try {
    // Use dbbuilder's full-text search (searches content, not just titles)
    const results = await searchContent(MANIFEST, query);

    displaySearchResults(results, query);
  } catch (err) {
    console.error('Full-text search failed, falling back to title search:', err);
    // Fallback to quick filter if full search fails
    const results = filterSections(MANIFEST, query);
    displaySearchResults(results, query, true);
  }
}

function displaySearchResults(results, query, isFallback = false) {
  const mode = isFallback ? ' (titles only)' : '';

  if (results.length === 0) {
    appendLogEntry('SEARCH', `No results for "${query}"${mode}\n\nTry a different search term or browse the navigation.`);
    return;
  }

  // Create clickable results list
  const container = document.createElement('div');
  container.className = 'search-results';

  const header = document.createElement('div');
  header.textContent = `Found ${results.length} results for "${query}"${mode}:`;
  header.style.marginBottom = 'var(--space-3)';
  container.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'search-results-list';

  results.forEach((r, i) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${r.id}`;
    link.className = 'search-result-link';
    link.dataset.section = r.id;
    link.dataset.query = query;

    const num = document.createElement('span');
    num.className = 'search-result-num';
    num.textContent = `${(i + 1).toString().padStart(2)}.`;

    const title = document.createElement('span');
    title.className = 'search-result-title';
    title.textContent = r.title;

    link.appendChild(num);
    link.appendChild(title);

    if (r.group && r.group !== r.title) {
      const group = document.createElement('span');
      group.className = 'search-result-group';
      group.textContent = `[${r.group}]`;
      link.appendChild(group);
    }

    // Click handler for highlighting
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithHighlight(r.id, query);
    });

    item.appendChild(link);
    list.appendChild(item);
  });

  container.appendChild(list);
  appendLogEntry('SEARCH', container, `${results.length} results`);

  // Still store for number navigation as fallback
  window._searchResults = results.map(r => ({ section: r.id, title: r.title, summary: r.summary }));
  window._searchQuery = query;
}

// Navigate to search result with highlighting
function navigateWithHighlight(sectionId, query) {
  // Store query in localStorage for dbbuilder's highlight system
  if (query) {
    localStorage.setItem('docs-toolkit-command-query', query);
  }
  location.hash = `#${sectionId}`;
}

function clearDisplay() {
  const app = document.getElementById('app');
  if (!app) return;

  // Keep only the current section, remove log history
  const entries = app.querySelectorAll('.log-entry');
  entries.forEach((entry, index) => {
    if (index > 0) entry.remove();
  });

  appendLogEntry('SYSTEM', 'Display cleared. Current section retained.');
}

async function processCommand(input) {
  if (!input) return;

  const raw = input.trim();

  // Check for number input (search result selection)
  const num = parseInt(raw, 10);
  if (!isNaN(num) && window._searchResults && window._searchResults.length > 0) {
    const idx = num - 1;
    if (idx >= 0 && idx < window._searchResults.length) {
      const result = window._searchResults[idx];
      appendLogEntry('NAV', `Navigating to: ${result.title} (with highlights)`);
      navigateWithHighlight(result.section, window._searchQuery);
      window._searchResults = null;
      window._searchQuery = null;
      return;
    }
  }

  const [cmd, ...args] = raw.toLowerCase().split(/\s+/);

  if (COMMANDS[cmd]) {
    await COMMANDS[cmd].handler(args);
    return;
  }

  // Treat as search query - always show results, don't auto-navigate
  await searchDocs(raw);
}

// ═══════════════════════════════════════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════════════════════════════════════

let lastKeyTime = 0;
let lastKey = '';

function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const isTyping = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

    // Allow these shortcuts even when typing
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer();
      const palette = document.getElementById('commandPalette');
      if (palette && !palette.hidden) {
        return; // Let palette handle its own escape
      }
    }

    // Skip other shortcuts when typing
    if (isTyping) return;

    const now = Date.now();

    switch (e.key) {
      case '?':
        e.preventDefault();
        toggleHelp();
        break;

      case '/':
        e.preventDefault();
        focusConsole();
        break;

      case 't':
        e.preventDefault();
        cycleTheme();
        break;

      case 'g':
        // Double-tap 'g' to scroll to top
        if (lastKey === 'g' && now - lastKeyTime < 300) {
          e.preventDefault();
          scrollToTop();
        }
        break;

      case 'G':
        e.preventDefault();
        scrollToBottom();
        break;

      case 'j':
        e.preventDefault();
        scrollDown();
        break;

      case 'k':
        e.preventDefault();
        scrollUp();
        break;
    }

    lastKey = e.key;
    lastKeyTime = now;
  });
}

function toggleHelp() {
  const helpSection = document.querySelector('.sidebar__section:first-child');
  if (helpSection) {
    helpSection.classList.toggle('hidden');
  }
}

function focusConsole() {
  const input = document.getElementById('consoleInput');
  if (input) {
    input.focus();
    input.select();
  }
}

function scrollToTop() {
  const mainPanel = document.querySelector('.main-panel');
  if (mainPanel) {
    mainPanel.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToBottom() {
  const mainPanel = document.querySelector('.main-panel');
  if (mainPanel) {
    mainPanel.scrollTo({ top: mainPanel.scrollHeight, behavior: 'smooth' });
  }
}

function scrollDown() {
  const mainPanel = document.querySelector('.main-panel');
  if (mainPanel) {
    mainPanel.scrollBy({ top: 100, behavior: 'smooth' });
  }
}

function scrollUp() {
  const mainPanel = document.querySelector('.main-panel');
  if (mainPanel) {
    mainPanel.scrollBy({ top: -100, behavior: 'smooth' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mobile Drawer
// ═══════════════════════════════════════════════════════════════════════════

function initDrawer() {
  const toggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('drawerOverlay');

  if (!toggle || !sidebar || !overlay) return;

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('sidebar--open');
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener('click', closeDrawer);
}

function openDrawer() {
  const sidebar = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('drawerOverlay');
  const toggle = document.getElementById('mobileMenuToggle');

  if (sidebar) sidebar.classList.add('sidebar--open');
  if (overlay) overlay.classList.add('drawer-overlay--visible');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add('drawer-open');

  // Focus first link in sidebar
  const firstLink = sidebar?.querySelector('a, button');
  if (firstLink) firstLink.focus();
}

function closeDrawer() {
  const sidebar = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('drawerOverlay');
  const toggle = document.getElementById('mobileMenuToggle');

  if (sidebar) sidebar.classList.remove('sidebar--open');
  if (overlay) overlay.classList.remove('drawer-overlay--visible');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('drawer-open');
}

// ═══════════════════════════════════════════════════════════════════════════
// Console Input
// ═══════════════════════════════════════════════════════════════════════════

function initConsole() {
  const input = document.getElementById('consoleInput');
  if (!input) return;

  // Show welcome on first focus
  input.addEventListener('focus', () => {
    showWelcomeOnFirstInteraction();
  }, { once: true });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processCommand(input.value.trim());
      input.value = '';
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Context Indicator
// ═══════════════════════════════════════════════════════════════════════════

function initContextIndicator() {
  const indicator = document.getElementById('contextIndicator');
  if (!indicator) return;

  function updateContext() {
    const hash = location.hash.replace('#', '') || 'welcome';
    indicator.textContent = `docs:${hash}`;
  }

  window.addEventListener('hashchange', updateContext);
  updateContext();
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Counter
// ═══════════════════════════════════════════════════════════════════════════

function initSectionCounter() {
  const counter = document.getElementById('sectionCount');
  if (!counter) return;

  function updateCount() {
    const nav = document.getElementById('nav');
    if (nav) {
      const items = nav.querySelectorAll('button[data-section]');
      counter.textContent = `${items.length} sections`;
    }
  }

  // Update after nav is built
  setTimeout(updateCount, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// Copy Buttons for Code Blocks
// ═══════════════════════════════════════════════════════════════════════════

function initCopyButtons() {
  // Watch for new content and add copy buttons
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            addCopyButtons(node);
          }
        });
      }
    }
  });

  const app = document.getElementById('app');
  if (app) {
    observer.observe(app, { childList: true, subtree: true });
    addCopyButtons(app);
  }
}

function addCopyButtons(container) {
  const preBlocks = container.querySelectorAll('pre:not(.has-copy-btn)');

  preBlocks.forEach((pre) => {
    pre.classList.add('has-copy-btn');

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const code = pre.querySelector('code') || pre;
    const text = code.textContent;

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '[CPY]';
    btn.setAttribute('data-copy', text);
    btn.addEventListener('click', () => copyToClipboard(btn, text));

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(btn);
  });
}

async function copyToClipboard(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = '[OK!]';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '[CPY]';
      btn.classList.remove('copied');
    }, 1500);
  } catch (err) {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = '[OK!]';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '[CPY]';
      btn.classList.remove('copied');
    }, 1500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Theme Toggle Button
// ═══════════════════════════════════════════════════════════════════════════

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', cycleTheme);
  updateThemeButton();
}

// ═══════════════════════════════════════════════════════════════════════════
// Welcome Message (shown on first CLI interaction)
// ═══════════════════════════════════════════════════════════════════════════

const WELCOME_SHOWN_KEY = 'aiwg-welcome-shown';
let welcomeShown = false;

function showWelcomeOnFirstInteraction() {
  // Check if already shown this session or previously
  if (welcomeShown || sessionStorage.getItem(WELCOME_SHOWN_KEY)) {
    return;
  }

  welcomeShown = true;
  sessionStorage.setItem(WELCOME_SHOWN_KEY, 'true');

  appendLogEntry('SYSTEM', `AIWG Documentation Terminal

Welcome to the AIWG documentation.

Type "help" for available commands.
Use the navigation panel or search to explore.

Quick commands:
  help        Show all commands
  search      Search documentation
  theme       Switch theme (dark/light/matrix)
  clear       Clear display

Keyboard shortcuts:
  ?           Toggle help panel
  /           Focus search
  t           Cycle themes
  gg          Scroll to top
  G           Scroll to bottom`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════════

function init() {
  // Let dbbuilder handle routing - it already defaults to DEFAULT_SECTION
  // Don't interfere with hash navigation here

  // Theme is already applied via inline script in <head>
  updateThemeButton();

  initKeyboard();
  initDrawer();
  initConsole();
  initContextIndicator();
  initSectionCounter();
  initCopyButtons();
  initThemeToggle();
  initContentObserver();

  // Remove loading state
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
