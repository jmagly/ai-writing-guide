/**
 * AIWG Docs - Terminal Enhancements
 * Adds terminal aesthetic features to dbbuilder docs
 */

// ═══════════════════════════════════════════════════════════════════════════
// Theme Switching
// ═══════════════════════════════════════════════════════════════════════════

const THEME_KEY = 'aiwg-theme';
const THEMES = ['dark', 'light', 'matrix'];

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
        // Let the palette handle its own escape
        return;
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

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processCommand(input.value.trim());
      input.value = '';
    }
  });
}

function processCommand(cmd) {
  if (!cmd) return;

  const [command, ...args] = cmd.split(/\s+/);

  switch (command.toLowerCase()) {
    case 'help':
      // Open command palette
      document.getElementById('commandToggle')?.click();
      break;

    case 'theme':
      const theme = args[0]?.toLowerCase();
      if (THEMES.includes(theme)) {
        setTheme(theme);
      } else {
        cycleTheme();
      }
      break;

    case 'top':
      scrollToTop();
      break;

    case 'bottom':
      scrollToBottom();
      break;

    case 'clear':
      // Nothing to clear in docs context
      break;

    default:
      // Treat as search - open palette with query
      const palette = document.getElementById('commandPalette');
      const palInput = document.getElementById('commandInput');
      if (palette && palInput) {
        palette.hidden = false;
        palInput.value = cmd;
        palInput.focus();
        palInput.dispatchEvent(new Event('input'));
      }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Context Indicator
// ═══════════════════════════════════════════════════════════════════════════

function initContextIndicator() {
  const indicator = document.getElementById('contextIndicator');
  if (!indicator) return;

  function updateContext() {
    const hash = location.hash.replace('#', '') || 'home';
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

  // Count nav items as proxy for sections
  function updateCount() {
    const nav = document.getElementById('nav');
    if (nav) {
      const items = nav.querySelectorAll('button[data-section]');
      counter.textContent = `${items.length} sections`;
    }
  }

  // Update after nav is built (small delay to let dbbuilder init)
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
// Initialize
// ═══════════════════════════════════════════════════════════════════════════

function init() {
  // Theme is already applied via inline script in <head>
  // Just update the button text
  updateThemeButton();

  initKeyboard();
  initDrawer();
  initConsole();
  initContextIndicator();
  initSectionCounter();
  initCopyButtons();
  initThemeToggle();

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
