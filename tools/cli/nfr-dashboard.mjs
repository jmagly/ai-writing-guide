#!/usr/bin/env node

/**
 * NFR Dashboard CLI - Command-line interface for NFR monitoring
 *
 * Provides real-time monitoring, trend analysis, alerts, and reporting
 * for Non-Functional Requirements validation.
 *
 * @module tools/cli/nfr-dashboard
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Table from 'cli-table3';
import chalk from 'chalk';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const options = {
    command: args[0] || 'help',
    nfrId: args[1],
    category: args[1],
    format: 'text',
    duration: '24h',
    refresh: 5,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' && args[i + 1]) {
      options.duration = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      options.format = args[i + 1];
      i++;
    } else if (args[i] === '--refresh' && args[i + 1]) {
      options.refresh = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '-h' || args[i] === '--help') {
      options.command = 'help';
    }
  }

  return options;
}

/**
 * Parse duration string (e.g., "24h", "7d", "30d")
 */
function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)([hdw])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${durationStr}`);
  }

  const value = parseInt(match[1], 10);
  const unitMap = { h: 'hours', d: 'days', w: 'weeks' };
  const unit = unitMap[match[2]];

  return { value, unit };
}

/**
 * Load dashboard state from file
 */
async function loadDashboardState(statePath = '.aiwg/testing/dashboard-state.json') {
  try {
    const data = await readFile(statePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(chalk.yellow('⚠ No dashboard state found. Run refresh first.'));
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Format status with color
 */
function formatStatus(status) {
  switch (status) {
    case 'pass':
      return chalk.green('✓ PASS');
    case 'warning':
      return chalk.yellow('⚠ WARN');
    case 'fail':
      return chalk.red('✗ FAIL');
    default:
      return status;
  }
}

/**
 * Format trend with arrow
 */
function formatTrend(trend) {
  switch (trend) {
    case 'improving':
      return chalk.green('↓ Improving');
    case 'stable':
      return chalk.blue('→ Stable');
    case 'degrading':
      return chalk.red('↑ Degrading');
    default:
      return trend;
  }
}

/**
 * Format alert severity with color
 */
function formatSeverity(severity) {
  switch (severity) {
    case 'critical':
      return chalk.red.bold('CRITICAL');
    case 'warning':
      return chalk.yellow('WARNING');
    case 'info':
      return chalk.blue('INFO');
    default:
      return severity;
  }
}

/**
 * Format overall health status
 */
function formatHealth(health) {
  switch (health) {
    case 'healthy':
      return chalk.green.bold('🟢 HEALTHY');
    case 'degraded':
      return chalk.yellow.bold('🟡 DEGRADED');
    case 'critical':
      return chalk.red.bold('🔴 CRITICAL');
    default:
      return health;
  }
}

/**
 * Command: status - Show overall NFR status
 */
async function commandStatus(options) {
  const state = await loadDashboardState();

  console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('                    NFR DASHBOARD STATUS'));
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));

  // Overall health
  const latestMetrics = getLatestMetrics(state.metrics);
  const health = calculateOverallHealth(latestMetrics);

  console.log(`Overall Status: ${formatHealth(health)}`);
  console.log(`Last Update: ${new Date(state.lastUpdate).toLocaleString()}\n`);

  // Category summary
  const categories = ['Performance', 'Accuracy', 'Reliability', 'Security', 'Usability'];

  console.log(chalk.bold('Category Summary:'));
  const categoryTable = new Table({
    head: ['Category', 'Total', 'Pass', 'Warning', 'Fail', 'Status'],
    style: {
      head: ['cyan', 'bold'],
    },
  });

  for (const category of categories) {
    const categoryMetrics = latestMetrics.filter(m => m.category === category);
    if (categoryMetrics.length === 0) continue;

    const total = categoryMetrics.length;
    const pass = categoryMetrics.filter(m => m.status === 'pass').length;
    const warning = categoryMetrics.filter(m => m.status === 'warning').length;
    const fail = categoryMetrics.filter(m => m.status === 'fail').length;

    let categoryStatus = 'healthy';
    if (fail > 0) categoryStatus = 'critical';
    else if (warning > total * 0.3) categoryStatus = 'degraded';

    categoryTable.push([
      category,
      total,
      chalk.green(pass),
      chalk.yellow(warning),
      chalk.red(fail),
      formatHealth(categoryStatus),
    ]);
  }

  console.log(categoryTable.toString());

  // Active alerts
  const activeAlerts = state.alerts.filter(a => !a.acknowledged);
  console.log(`\n${chalk.bold('Active Alerts:')} ${activeAlerts.length}`);

  if (activeAlerts.length > 0) {
    const alertTable = new Table({
      head: ['NFR ID', 'Severity', 'Time', 'Message'],
      style: {
        head: ['cyan', 'bold'],
      },
      colWidths: [15, 12, 20, 50],
    });

    for (const alert of activeAlerts.slice(0, 5)) {
      const timeAgo = getTimeAgo(alert.timestamp);
      alertTable.push([
        alert.nfrId,
        formatSeverity(alert.severity),
        timeAgo,
        alert.message.substring(0, 47) + (alert.message.length > 47 ? '...' : ''),
      ]);
    }

    console.log(alertTable.toString());

    if (activeAlerts.length > 5) {
      console.log(chalk.dim(`... and ${activeAlerts.length - 5} more alerts`));
    }
  }

  console.log('');
}

/**
 * Command: show - Show specific NFR details
 */
async function commandShow(options) {
  const state = await loadDashboardState();
  const { nfrId } = options;

  if (!nfrId) {
    console.error(chalk.red('Error: NFR ID required'));
    console.log('Usage: aiwg-nfr-dashboard show <nfr-id>');
    process.exit(1);
  }

  const metrics = state.metrics.filter(m => m.nfrId === nfrId);
  if (metrics.length === 0) {
    console.error(chalk.red(`Error: No metrics found for NFR: ${nfrId}`));
    process.exit(1);
  }

  const latest = metrics[metrics.length - 1];

  console.log(chalk.bold(`\n═══════════════════════════════════════════════════════════════`));
  console.log(chalk.bold(`  NFR Details: ${nfrId}`));
  console.log(chalk.bold(`═══════════════════════════════════════════════════════════════\n`));

  console.log(`${chalk.bold('Category:')} ${latest.category}`);
  console.log(`${chalk.bold('Status:')} ${formatStatus(latest.status)}`);
  console.log(`${chalk.bold('Trend:')} ${formatTrend(latest.trend)}`);
  console.log(`${chalk.bold('Alert Level:')} ${latest.alertLevel.toUpperCase()}\n`);

  console.log(`${chalk.bold('Current Value:')} ${latest.currentValue.toFixed(3)} ${latest.unit}`);
  console.log(`${chalk.bold('Target Value:')} ${latest.targetValue.toFixed(3)} ${latest.unit}`);
  console.log(`${chalk.bold('Deviation:')} ${latest.deviation.toFixed(2)}%\n`);

  // Recent history
  const recentCount = Math.min(10, metrics.length);
  const recent = metrics.slice(-recentCount);

  console.log(chalk.bold(`Recent Measurements (last ${recentCount}):`));
  const historyTable = new Table({
    head: ['Timestamp', 'Value', 'Status', 'Deviation'],
    style: {
      head: ['cyan', 'bold'],
    },
  });

  for (const metric of recent) {
    historyTable.push([
      new Date(metric.timestamp).toLocaleString(),
      `${metric.currentValue.toFixed(3)} ${metric.unit}`,
      formatStatus(metric.status),
      `${metric.deviation.toFixed(2)}%`,
    ]);
  }

  console.log(historyTable.toString());
  console.log('');
}

/**
 * Command: list - List all NFRs
 */
async function commandList(options) {
  const state = await loadDashboardState();
  const { category } = options;

  let metrics = getLatestMetrics(state.metrics);

  if (category && category !== 'list') {
    metrics = metrics.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }

  console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold(`  NFR List${category && category !== 'list' ? ` - ${category}` : ''}`));
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));

  const table = new Table({
    head: ['NFR ID', 'Category', 'Current', 'Target', 'Status', 'Trend', 'Deviation'],
    style: {
      head: ['cyan', 'bold'],
    },
  });

  for (const metric of metrics) {
    table.push([
      metric.nfrId,
      metric.category,
      `${metric.currentValue.toFixed(2)} ${metric.unit}`,
      `${metric.targetValue.toFixed(2)} ${metric.unit}`,
      formatStatus(metric.status),
      formatTrend(metric.trend),
      `${metric.deviation.toFixed(1)}%`,
    ]);
  }

  console.log(table.toString());
  console.log(`\nTotal: ${metrics.length} NFRs\n`);
}

/**
 * Command: alerts - Show active alerts
 */
async function commandAlerts(options) {
  const state = await loadDashboardState();
  const alerts = state.alerts.filter(a => !a.acknowledged);

  console.log(chalk.bold('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold('                    ACTIVE ALERTS'));
  console.log(chalk.bold('═══════════════════════════════════════════════════════════════\n'));

  if (alerts.length === 0) {
    console.log(chalk.green('✓ No active alerts\n'));
    return;
  }

  // Group by severity
  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');

  console.log(`${chalk.red.bold('Critical:')} ${critical.length}`);
  console.log(`${chalk.yellow.bold('Warning:')} ${warning.length}`);
  console.log(`${chalk.blue.bold('Info:')} ${info.length}\n`);

  const table = new Table({
    head: ['ID', 'NFR ID', 'Severity', 'Time', 'Message'],
    style: {
      head: ['cyan', 'bold'],
    },
    colWidths: [10, 15, 12, 20, 50],
  });

  for (const alert of alerts) {
    const timeAgo = getTimeAgo(alert.timestamp);
    table.push([
      alert.id.substring(0, 8),
      alert.nfrId,
      formatSeverity(alert.severity),
      timeAgo,
      alert.message.substring(0, 47) + (alert.message.length > 47 ? '...' : ''),
    ]);
  }

  console.log(table.toString());
  console.log('');
}

/**
 * Command: trends - Show trend analysis
 */
async function commandTrends(options) {
  const state = await loadDashboardState();
  const { nfrId, duration } = options;

  if (!nfrId || nfrId === 'trends') {
    console.error(chalk.red('Error: NFR ID required'));
    console.log('Usage: aiwg-nfr-dashboard trends <nfr-id> [--duration 24h]');
    process.exit(1);
  }

  const metrics = state.metrics.filter(m => m.nfrId === nfrId);
  if (metrics.length === 0) {
    console.error(chalk.red(`Error: No metrics found for NFR: ${nfrId}`));
    process.exit(1);
  }

  console.log(chalk.bold(`\n═══════════════════════════════════════════════════════════════`));
  console.log(chalk.bold(`  Trend Analysis: ${nfrId} (${duration})`));
  console.log(chalk.bold(`═══════════════════════════════════════════════════════════════\n`));

  // Filter by duration
  const durationParsed = parseDuration(duration);
  const durationMs = durationToMilliseconds(durationParsed);
  const cutoffTime = Date.now() - durationMs;
  const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);

  if (recentMetrics.length < 2) {
    console.log(chalk.yellow('⚠ Insufficient data for trend analysis\n'));
    return;
  }

  // Calculate statistics
  const values = recentMetrics.map(m => m.currentValue);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = Math.min(...values);
  const max = Math.max(...values);

  let stddev = 0;
  if (values.length > 1) {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    stddev = Math.sqrt(variance);
  }

  const latest = recentMetrics[recentMetrics.length - 1];

  console.log(chalk.bold('Statistical Summary:'));
  console.log(`  Measurements: ${recentMetrics.length}`);
  console.log(`  Mean: ${mean.toFixed(3)} ${latest.unit}`);
  console.log(`  Median: ${median.toFixed(3)} ${latest.unit}`);
  console.log(`  Std Dev: ${stddev.toFixed(3)} ${latest.unit}`);
  console.log(`  Range: ${min.toFixed(3)} - ${max.toFixed(3)} ${latest.unit}\n`);

  // Simple ASCII sparkline
  console.log(chalk.bold('Value Trend:'));
  const sparkline = createSparkline(values);
  console.log(`  ${sparkline}\n`);

  // Trend direction
  const first = recentMetrics[0].currentValue;
  const last = latest.currentValue;
  const change = ((last - first) / first) * 100;

  console.log(chalk.bold('Trend Direction:'));
  console.log(`  Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
  console.log(`  Direction: ${formatTrend(latest.trend)}\n`);
}

/**
 * Command: export - Export metrics
 */
async function commandExport(options) {
  const state = await loadDashboardState();
  const { format } = options;

  if (format === 'json') {
    console.log(JSON.stringify(state.metrics, null, 2));
  } else if (format === 'csv' || format === 'export') {
    const headers = [
      'Timestamp',
      'NFR ID',
      'Category',
      'Current Value',
      'Target Value',
      'Unit',
      'Status',
      'Trend',
      'Alert Level',
      'Deviation %',
    ];

    console.log(headers.join(','));

    for (const metric of state.metrics) {
      const row = [
        new Date(metric.timestamp).toISOString(),
        metric.nfrId,
        metric.category,
        metric.currentValue.toFixed(3),
        metric.targetValue.toFixed(3),
        metric.unit,
        metric.status,
        metric.trend,
        metric.alertLevel,
        metric.deviation.toFixed(2),
      ];
      console.log(row.join(','));
    }
  } else {
    console.error(chalk.red(`Error: Invalid format: ${format}`));
    console.log('Valid formats: json, csv');
    process.exit(1);
  }
}

/**
 * Command: report - Generate full report
 */
async function commandReport(options) {
  const state = await loadDashboardState();

  console.log('═'.repeat(70));
  console.log('NFR DASHBOARD REPORT'.toUpperCase());
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('═'.repeat(70));
  console.log('');

  // Overall status
  const latestMetrics = getLatestMetrics(state.metrics);
  const health = calculateOverallHealth(latestMetrics);

  console.log(`Overall Status: ${health.toUpperCase()}`);
  console.log('');

  // Summary by category
  const categories = ['Performance', 'Accuracy', 'Reliability', 'Security', 'Usability'];
  console.log('Category Summary:');

  for (const category of categories) {
    const categoryMetrics = latestMetrics.filter(m => m.category === category);
    if (categoryMetrics.length === 0) continue;

    const passing = categoryMetrics.filter(m => m.status === 'pass').length;
    const warning = categoryMetrics.filter(m => m.status === 'warning').length;
    const failing = categoryMetrics.filter(m => m.status === 'fail').length;

    console.log(`  ${category}: ${categoryMetrics.length} NFRs (✓ ${passing}, ⚠ ${warning}, ✗ ${failing})`);
  }
  console.log('');

  // Active alerts
  const activeAlerts = state.alerts.filter(a => !a.acknowledged);
  console.log(`Active Alerts: ${activeAlerts.length}`);

  if (activeAlerts.length > 0) {
    for (const alert of activeAlerts.slice(0, 10)) {
      const timestamp = new Date(alert.timestamp).toISOString();
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.nfrId} - ${alert.message} (${timestamp})`);
    }
    if (activeAlerts.length > 10) {
      console.log(`  ... and ${activeAlerts.length - 10} more`);
    }
  }
  console.log('');

  console.log('═'.repeat(70));
}

/**
 * Command: help - Show usage information
 */
function commandHelp() {
  console.log(chalk.bold('\nNFR Dashboard CLI'));
  console.log(chalk.dim('Real-time monitoring and alerting for Non-Functional Requirements\n'));

  console.log(chalk.bold('Usage:'));
  console.log('  aiwg-nfr-dashboard <command> [options]\n');

  console.log(chalk.bold('Commands:'));
  console.log('  status                 Show overall NFR status');
  console.log('  show <nfr-id>         Show specific NFR details');
  console.log('  list [category]       List all NFRs (optionally filtered)');
  console.log('  alerts                Show active alerts');
  console.log('  trends <nfr-id>       Show trend analysis');
  console.log('  export [format]       Export metrics (csv|json)');
  console.log('  report                Generate full report\n');

  console.log(chalk.bold('Options:'));
  console.log('  --duration <time>     Time range: 1h, 24h, 7d, 30d (default: 24h)');
  console.log('  --format <type>       Output format: text|json|csv (default: text)');
  console.log('  -h, --help            Show help\n');

  console.log(chalk.bold('Examples:'));
  console.log('  aiwg-nfr-dashboard status');
  console.log('  aiwg-nfr-dashboard show NFR-PERF-001');
  console.log('  aiwg-nfr-dashboard list Performance');
  console.log('  aiwg-nfr-dashboard trends NFR-PERF-001 --duration 7d');
  console.log('  aiwg-nfr-dashboard export --format csv > metrics.csv\n');
}

/**
 * Helper: Get latest metric for each NFR
 */
function getLatestMetrics(metrics) {
  const byNfrId = new Map();

  for (const metric of metrics) {
    if (!byNfrId.has(metric.nfrId) || metric.timestamp > byNfrId.get(metric.nfrId).timestamp) {
      byNfrId.set(metric.nfrId, metric);
    }
  }

  return Array.from(byNfrId.values());
}

/**
 * Helper: Calculate overall health
 */
function calculateOverallHealth(latestMetrics) {
  if (latestMetrics.length === 0) return 'healthy';

  const criticalCount = latestMetrics.filter(m => m.status === 'fail').length;
  const warningCount = latestMetrics.filter(m => m.status === 'warning').length;

  if (criticalCount > 0) return 'critical';
  if (warningCount > latestMetrics.length * 0.3) return 'degraded';

  return 'healthy';
}

/**
 * Helper: Get time ago string
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Helper: Convert duration to milliseconds
 */
function durationToMilliseconds(duration) {
  const { value, unit } = duration;

  switch (unit) {
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'weeks':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Helper: Create ASCII sparkline
 */
function createSparkline(values, width = 60) {
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const sparkline = values.map(v => {
    const normalized = (v - min) / range;
    const index = Math.min(bars.length - 1, Math.floor(normalized * bars.length));
    return bars[index];
  }).join('');

  return sparkline;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const options = parseArgs();

    switch (options.command) {
      case 'status':
        await commandStatus(options);
        break;
      case 'show':
        await commandShow(options);
        break;
      case 'list':
        await commandList(options);
        break;
      case 'alerts':
        await commandAlerts(options);
        break;
      case 'trends':
        await commandTrends(options);
        break;
      case 'export':
        await commandExport(options);
        break;
      case 'report':
        await commandReport(options);
        break;
      case 'help':
      default:
        commandHelp();
        break;
    }
  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

main();
