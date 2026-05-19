/**
 * Shared CLI Display Utility Module
 *
 * Provides consistent, professional terminal output across all CLI commands.
 * Wraps chalk, ora, and cli-table3 with TTY/CI-aware fallbacks.
 *
 * @issue #461
 */

import chalk from 'chalk';

// Environment detection
const isTTY = Boolean(process.stdout.isTTY);
const isCI = Boolean(
  process.env.CI ||
  process.env.GITHUB_ACTIONS ||
  process.env.GITLAB_CI ||
  process.env.CIRCLECI ||
  process.env.JENKINS_URL ||
  process.env.GITEA_ACTIONS
);

// Brand palette
const BRAND_HEX = '#818CF8';   // indigo-400 — brand mark / accent
const SUCCESS_HEX = '#34D399'; // emerald-400 — success indicators

/**
 * Brand mark — ◆ in brand indigo color
 */
export function brandMark(): string {
  return isTTY ? chalk.hex(BRAND_HEX)('◆') : '◆';
}

/**
 * Brand-colored text for inline use
 */
export function accent(text: string): string {
  return isTTY ? chalk.hex(BRAND_HEX)(text) : text;
}

/**
 * Horizontal rule separator
 */
export function rule(width = 42): void {
  const line = '─'.repeat(width);
  console.log(isTTY ? chalk.dim(`  ${line}`) : `  ${'-'.repeat(width)}`);
}

/**
 * Styled message output functions
 */
export function success(msg: string): void {
  console.log(isTTY ? chalk.hex(SUCCESS_HEX)(`  ✓ ${msg}`) : `  OK ${msg}`);
}

export function error(msg: string): void {
  console.error(isTTY ? chalk.red(`  ✗ ${msg}`) : `  ERROR ${msg}`);
}

export function warn(msg: string): void {
  console.log(isTTY ? chalk.yellow(`  ⚠ ${msg}`) : `  WARN ${msg}`);
}

export function info(msg: string): void {
  console.log(isTTY ? chalk.dim(`  › ${msg}`) : `  ${msg}`);
}

export function header(msg: string): void {
  console.log(isTTY ? chalk.bold(msg) : msg);
}

export function dim(msg: string): void {
  console.log(isTTY ? chalk.dim(msg) : msg);
}

export function blank(): void {
  console.log('');
}

/**
 * Section — a labeled block with › prefixed items
 */
export function section(title: string, items: string[]): void {
  console.log(isTTY ? chalk.bold(`  ${title}`) : `  ${title}`);
  for (const item of items) {
    console.log(isTTY ? `    ${chalk.dim('›')} ${item}` : `    › ${item}`);
  }
}

/**
 * Key-value display — aligned pairs
 */
export function keyValue(pairs: Record<string, string>): void {
  const maxKeyLen = Math.max(...Object.keys(pairs).map(k => k.length));
  for (const [key, value] of Object.entries(pairs)) {
    const label = isTTY ? chalk.dim(key.padEnd(maxKeyLen)) : key.padEnd(maxKeyLen);
    console.log(`  ${label}  ${value}`);
  }
}

/**
 * Deployment summary line — "✓ Agents      101 deployed"
 */
export function deployCount(label: string, count: number): void {
  const padded = label.length >= 12 ? `${label} ` : label.padEnd(12);
  if (isTTY) {
    console.log(chalk.hex(SUCCESS_HEX)('  ✓ ') + chalk.bold(padded) + chalk.dim(`${count} deployed`));
  } else {
    console.log(`  OK ${padded}${count} deployed`);
  }
}

/**
 * Spinner wrapper (ora) — returns noop in non-TTY/CI
 */
export interface Spinner {
  start(): Spinner;
  stop(): Spinner;
  succeed(text?: string): Spinner;
  fail(text?: string): Spinner;
  text: string;
}

const noopSpinner: Spinner = {
  start() { return this; },
  stop() { return this; },
  succeed(text?: string) { if (text) console.log(`  OK ${text}`); return this; },
  fail(text?: string) { if (text) console.error(`  FAIL ${text}`); return this; },
  text: '',
};

export async function spinner(msg: string): Promise<Spinner> {
  if (!isTTY || isCI) {
    console.log(`  ${msg}`);
    return noopSpinner;
  }
  try {
    const ora = (await import('ora')).default;
    return ora({ text: msg, indent: 2 }) as unknown as Spinner;
  } catch {
    console.log(`  ${msg}`);
    return noopSpinner;
  }
}

/**
 * Table display — wraps cli-table3 if available, falls back to padded columns
 */
export async function table(headers: string[], rows: string[][]): Promise<void> {
  try {
    const Table = (await import('cli-table3')).default;
    const t = new Table({
      head: isTTY ? headers.map(h => chalk.bold(h)) : headers,
      style: { head: [], border: [] },
    });
    for (const row of rows) {
      t.push(row);
    }
    console.log(t.toString());
  } catch {
    // Fallback: padded columns
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    );
    console.log(headers.map((h, i) => h.padEnd(widths[i])).join('  '));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));
    for (const row of rows) {
      console.log(row.map((c, i) => (c || '').padEnd(widths[i])).join('  '));
    }
  }
}

/**
 * Format a channel label with color
 */
export function channelLabel(channel: string): string {
  if (!isTTY) return `[${channel}]`;
  switch (channel) {
    case 'stable':  return chalk.green(`[${channel}]`);
    case 'edge':    return chalk.yellow(`[${channel}]`);
    case 'dev':     return chalk.cyan(`[${channel}]`);
    case 'rc':      return chalk.yellow(`[${channel}]`);
    case 'beta':    return chalk.yellow(`[${channel}]`);
    case 'alpha':   return chalk.yellow(`[${channel}]`);
    case 'nightly': return chalk.magenta(`[${channel}]`);
    default: return chalk.dim(`[${channel}]`);
  }
}

/**
 * Format a status check result line (for doctor)
 */
export function checkResult(name: string, status: 'ok' | 'warn' | 'error' | 'info', message: string): void {
  const symbols: Record<string, string> = { ok: '✓', warn: '⚠', error: '✗', info: '○' };
  const symbol = symbols[status] || '?';

  if (!isTTY) {
    console.log(`  ${symbol} ${name}: ${message}`);
    return;
  }

  const colors: Record<string, typeof chalk.green> = {
    ok: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    info: chalk.cyan,
  };
  const colorFn = colors[status] || chalk.dim;
  console.log(`  ${colorFn(symbol)} ${name}: ${message}`);
}

/**
 * Summary bar for doctor results
 */
export function summaryBar(pass: number, warnings: number, errors: number): void {
  if (errors > 0) {
    const msg = `${errors} error(s), ${warnings} warning(s), ${pass} passed`;
    console.log(isTTY ? chalk.red(`  ✗ ${msg}`) : `  FAIL ${msg}`);
  } else if (warnings > 0) {
    const msg = `${warnings} warning(s), ${pass} passed`;
    console.log(isTTY ? chalk.yellow(`  ⚠ ${msg}`) : `  WARN ${msg}`);
  } else {
    const msg = `${pass} passed`;
    console.log(isTTY ? chalk.hex(SUCCESS_HEX)(`  ✓ All ${msg}`) : `  OK All ${msg}`);
  }
}

/**
 * Bold text for inline use
 */
export function bold(text: string): string {
  return isTTY ? chalk.bold(text) : text;
}

/**
 * Dimmed text for inline use
 */
export function dimText(text: string): string {
  return isTTY ? chalk.dim(text) : text;
}

/**
 * Colored text for inline use
 */
export function green(text: string): string {
  return isTTY ? chalk.green(text) : text;
}

export function red(text: string): string {
  return isTTY ? chalk.red(text) : text;
}

export function yellow(text: string): string {
  return isTTY ? chalk.yellow(text) : text;
}

export function cyan(text: string): string {
  return isTTY ? chalk.cyan(text) : text;
}

export { isTTY, isCI, BRAND_HEX };
