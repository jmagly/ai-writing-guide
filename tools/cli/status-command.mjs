/**
 * CLI Status Command - Display plugin health and status
 *
 * Provides user-friendly status reporting for all installed plugins (frameworks, add-ons, extensions).
 * Displays health status, version info, project counts, and workspace summary in ASCII tables.
 * Supports filtering by type, checking specific plugins, and verbose mode for detailed reports.
 *
 * @module tools/cli/status-command
 * @version 1.0.0
 * @since 2025-10-19
 *
 * @usage
 * # Show all plugins
 * node tools/cli/status-command.mjs
 * aiwg -status
 *
 * # Filter by type
 * node tools/cli/status-command.mjs --type frameworks
 * aiwg -status --type add-ons
 *
 * # Check specific plugin
 * node tools/cli/status-command.mjs sdlc-complete
 * aiwg -status gdpr-compliance
 *
 * # Verbose mode
 * node tools/cli/status-command.mjs --verbose
 * aiwg -status sdlc-complete --verbose
 *
 * @example
 * // Output example:
 * AIWG - Plugin Status
 * ================================================================================
 *
 * FRAMEWORKS (2 installed)
 * ┌────────────────┬─────────┬──────────────┬──────────┬─────────────────┐
 * │ ID             │ Version │ Installed    │ Projects │ Health          │
 * ├────────────────┼─────────┼──────────────┼──────────┼─────────────────┤
 * │ sdlc-complete  │ 1.0.0   │ 2025-10-18   │ 2        │ ✓ HEALTHY       │
 * │ marketing-flow │ 1.0.0   │ 2025-10-19   │ 1        │ ✓ HEALTHY       │
 * └────────────────┴─────────┴──────────────┴──────────┴─────────────────┘
 *
 * WORKSPACE
 *   Base Path:     .aiwg/
 *   Legacy Mode:   No (framework-scoped workspace active)
 *   Total Plugins: 2
 *   Disk Usage:    125 MB
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PluginRegistry } from '../workspace/registry-manager.mjs';
import { HealthChecker } from '../workspace/health-checker.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================
// ASCII Table Formatting
// ===========================

/**
 * Format data as ASCII table with box-drawing characters
 *
 * @param {Object[]} data - Array of row objects
 * @param {Object} columns - Column configuration { columnName: { header, width, align } }
 * @returns {string} Formatted ASCII table
 *
 * @example
 * const data = [
 *   { id: 'sdlc-complete', version: '1.0.0', health: 'healthy' },
 *   { id: 'marketing-flow', version: '1.0.0', health: 'healthy' }
 * ];
 * const columns = {
 *   id: { header: 'ID', width: 16, align: 'left' },
 *   version: { header: 'Version', width: 7, align: 'left' },
 *   health: { header: 'Health', width: 15, align: 'left' }
 * };
 * console.log(formatTable(data, columns));
 */
function formatTable(data, columns) {
  if (data.length === 0) {
    return '';
  }

  const lines = [];

  // Column order
  const columnKeys = Object.keys(columns);

  // Top border
  const topBorder = '┌' + columnKeys.map(key => '─'.repeat(columns[key].width + 2)).join('┬') + '┐';
  lines.push(topBorder);

  // Header row
  const headerRow = '│' + columnKeys.map(key => {
    const col = columns[key];
    return ' ' + padString(col.header, col.width, col.align || 'left') + ' ';
  }).join('│') + '│';
  lines.push(headerRow);

  // Header separator
  const headerSeparator = '├' + columnKeys.map(key => '─'.repeat(columns[key].width + 2)).join('┼') + '┤';
  lines.push(headerSeparator);

  // Data rows
  data.forEach(row => {
    const dataRow = '│' + columnKeys.map(key => {
      const col = columns[key];
      const value = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
      return ' ' + padString(value, col.width, col.align || 'left') + ' ';
    }).join('│') + '│';
    lines.push(dataRow);
  });

  // Bottom border
  const bottomBorder = '└' + columnKeys.map(key => '─'.repeat(columns[key].width + 2)).join('┴') + '┘';
  lines.push(bottomBorder);

  return lines.join('\n');
}

/**
 * Pad string to specified width with alignment
 *
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @param {string} align - Alignment ('left' | 'right' | 'center')
 * @returns {string} Padded string
 */
function padString(str, width, align = 'left') {
  // Truncate if too long
  if (str.length > width) {
    return str.substring(0, width - 1) + '…';
  }

  const padding = width - str.length;

  if (align === 'right') {
    return ' '.repeat(padding) + str;
  } else if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  } else {
    return str + ' '.repeat(padding);
  }
}

// ===========================
// Formatting Helpers
// ===========================

/**
 * Format health status with icon
 *
 * @param {string} health - Health status ('healthy' | 'warning' | 'error' | 'unknown')
 * @returns {string} Formatted health string with icon
 */
function formatHealth(health) {
  switch (health) {
    case 'healthy':
      return '✓ HEALTHY';
    case 'warning':
      return '⚠️ WARNING';
    case 'error':
      return '❌ ERROR';
    default:
      return '? UNKNOWN';
  }
}

/**
 * Format date as YYYY-MM-DD
 *
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  if (!isoDate) return 'N/A';

  try {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
  } catch {
    return 'Invalid';
  }
}

/**
 * Format bytes as human-readable string
 *
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string (e.g., "125 MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncate plugin ID for display
 *
 * @param {string} id - Plugin ID
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated ID
 */
function truncateId(id, maxLength = 16) {
  if (id.length <= maxLength) {
    return id;
  }

  return id.substring(0, maxLength - 1) + '…';
}

/**
 * Abbreviate framework name for display
 *
 * @param {string} frameworkId - Framework ID
 * @returns {string} Abbreviated name
 */
function abbreviateFramework(frameworkId) {
  if (frameworkId.length <= 12) {
    return frameworkId;
  }

  // Try to abbreviate intelligently
  const parts = frameworkId.split('-');
  if (parts.length > 1) {
    return parts[0] + '-' + parts[parts.length - 1].substring(0, 4) + '.';
  }

  return frameworkId.substring(0, 11) + '.';
}

// ===========================
// Table Display Functions
// ===========================

/**
 * Display frameworks table
 *
 * @param {Object[]} frameworks - Array of framework plugin objects
 * @param {Map<string, Object>} healthResults - Map of plugin ID to health check result
 */
function displayFrameworksTable(frameworks, healthResults) {
  const columns = {
    id: { header: 'ID', width: 16, align: 'left' },
    version: { header: 'Version', width: 7, align: 'left' },
    installed: { header: 'Installed', width: 12, align: 'left' },
    projects: { header: 'Projects', width: 8, align: 'right' },
    health: { header: 'Health', width: 17, align: 'left' }
  };

  const data = frameworks.map(plugin => {
    const healthResult = healthResults.get(plugin.id);
    const projectCount = plugin.projects ? plugin.projects.length : 0;

    return {
      id: truncateId(plugin.id),
      version: plugin.version || 'N/A',
      installed: formatDate(plugin['install-date']),
      projects: String(projectCount),
      health: formatHealth(healthResult?.status || plugin.health || 'unknown')
    };
  });

  console.log(formatTable(data, columns));
}

/**
 * Display add-ons table
 *
 * @param {Object[]} addOns - Array of add-on plugin objects
 * @param {Map<string, Object>} healthResults - Map of plugin ID to health check result
 */
function displayAddOnsTable(addOns, healthResults) {
  const columns = {
    id: { header: 'ID', width: 17, align: 'left' },
    version: { header: 'Version', width: 7, align: 'left' },
    installed: { header: 'Installed', width: 12, align: 'left' },
    framework: { header: 'Framework', width: 12, align: 'left' },
    health: { header: 'Health', width: 17, align: 'left' }
  };

  const data = addOns.map(plugin => {
    const healthResult = healthResults.get(plugin.id);

    return {
      id: truncateId(plugin.id, 17),
      version: plugin.version || 'N/A',
      installed: formatDate(plugin['install-date']),
      framework: abbreviateFramework(plugin['parent-framework'] || 'N/A'),
      health: formatHealth(healthResult?.status || plugin.health || 'unknown')
    };
  });

  console.log(formatTable(data, columns));
}

/**
 * Display extensions table
 *
 * @param {Object[]} extensions - Array of extension plugin objects
 * @param {Map<string, Object>} healthResults - Map of plugin ID to health check result
 */
function displayExtensionsTable(extensions, healthResults) {
  const columns = {
    id: { header: 'ID', width: 17, align: 'left' },
    version: { header: 'Version', width: 7, align: 'left' },
    installed: { header: 'Installed', width: 12, align: 'left' },
    extends: { header: 'Extends', width: 12, align: 'left' },
    health: { header: 'Health', width: 17, align: 'left' }
  };

  const data = extensions.map(plugin => {
    const healthResult = healthResults.get(plugin.id);

    return {
      id: truncateId(plugin.id, 17),
      version: plugin.version || 'N/A',
      installed: formatDate(plugin['install-date']),
      extends: abbreviateFramework(plugin.extends || 'N/A'),
      health: formatHealth(healthResult?.status || plugin.health || 'unknown')
    };
  });

  console.log(formatTable(data, columns));
}

// ===========================
// Workspace Summary
// ===========================

/**
 * Display workspace summary
 *
 * @param {Object[]} plugins - All plugins
 * @param {string} basePath - Base path to .aiwg directory
 */
async function displayWorkspaceSummary(plugins, basePath) {
  console.log('\nWORKSPACE');

  // Calculate total disk usage
  let totalDiskUsage = 0;
  for (const plugin of plugins) {
    try {
      const repoPath = path.join(basePath, plugin['repo-path']);
      const usage = await getDirectorySize(repoPath);
      totalDiskUsage += usage;
    } catch {
      // Ignore errors
    }
  }

  // Detect legacy mode
  const legacyMode = await detectLegacyMode(basePath);

  console.log(`  Base Path:     ${basePath}`);
  console.log(`  Legacy Mode:   ${legacyMode ? 'Yes (shared workspace)' : 'No (framework-scoped workspace active)'}`);
  console.log(`  Total Plugins: ${plugins.length}`);
  console.log(`  Disk Usage:    ${formatBytes(totalDiskUsage)}`);
}

/**
 * Detect legacy workspace mode
 *
 * @param {string} basePath - Base path to .aiwg directory
 * @returns {Promise<boolean>} True if legacy mode detected
 */
async function detectLegacyMode(basePath) {
  try {
    // Legacy mode: .aiwg/intake/ exists (shared workspace)
    // New mode: .aiwg/frameworks/{framework-id}/projects/{project-id}/intake/
    const intakePath = path.join(basePath, 'intake');
    await fs.access(intakePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate directory size recursively
 *
 * @param {string} dirPath - Directory path
 * @returns {Promise<number>} Total size in bytes
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Ignore permission errors, missing directories
  }

  return totalSize;
}

// ===========================
// Verbose Mode Display
// ===========================

/**
 * Display verbose status for single plugin
 *
 * @param {Object} plugin - Plugin metadata
 * @param {Object} healthResult - Health check result
 * @param {string} basePath - Base path to .aiwg directory
 */
async function displayVerbose(plugin, healthResult, basePath) {
  console.log(`\nPlugin: ${plugin.id} (${plugin.type.charAt(0).toUpperCase() + plugin.type.slice(1)})`);
  console.log('='.repeat(80));
  console.log(`Name:         ${plugin.name}`);
  console.log(`Version:      ${plugin.version}`);
  console.log(`Installed:    ${formatDate(plugin['install-date'])}`);
  console.log(`Health:       ${formatHealth(healthResult.status)}`);
  console.log(`Last Checked: ${healthResult.timestamp ? new Date(healthResult.timestamp).toLocaleString() : 'Never'}`);

  // Directories
  console.log('\nDIRECTORIES');
  const repoPath = path.join(basePath, plugin['repo-path']);
  console.log(`  Repo Path:    ${repoPath}`);

  if (plugin.type === 'framework') {
    const projectsPath = path.join(basePath, path.dirname(plugin['repo-path']), 'projects');
    console.log(`  Projects:     ${projectsPath}`);
  }

  // Projects (for frameworks)
  if (plugin.type === 'framework') {
    console.log(`\nPROJECTS (${plugin.projects?.length || 0})`);
    if (plugin.projects && plugin.projects.length > 0) {
      plugin.projects.forEach(projectId => {
        console.log(`  - ${projectId}`);
      });
    } else {
      console.log('  No active projects');
    }
  }

  // Dependencies (for add-ons/extensions)
  if (plugin.type === 'add-on') {
    console.log(`\nDEPENDENCIES`);
    console.log(`  Parent Framework: ${plugin['parent-framework'] || 'N/A'}`);
  }

  if (plugin.type === 'extension') {
    console.log(`\nDEPENDENCIES`);
    console.log(`  Extends: ${plugin.extends || 'N/A'}`);
  }

  // Health check details
  console.log('\nHEALTH CHECK');

  // Count issues by category
  const manifestIssues = healthResult.issues.filter(i => i.check === 'manifest-integrity');
  const dirIssues = healthResult.issues.filter(i => i.check === 'directory-structure');
  const versionIssues = healthResult.issues.filter(i => i.check === 'version-compatibility');
  const depIssues = healthResult.issues.filter(i => i.check === 'dependencies');
  const diskIssues = healthResult.issues.filter(i => i.check === 'disk-usage');

  console.log(`  Manifest:     ${manifestIssues.length === 0 ? '✓ Valid' : `❌ ${manifestIssues.length} issue(s)`}`);
  console.log(`  Directories:  ${dirIssues.length === 0 ? '✓ Present' : `❌ ${dirIssues.length} issue(s)`}`);

  if (plugin.type === 'add-on' || plugin.type === 'extension') {
    console.log(`  Dependencies: ${depIssues.length === 0 ? '✓ Satisfied' : `❌ ${depIssues.length} issue(s)`}`);
  } else {
    console.log(`  Dependencies: N/A (framework has no dependencies)`);
  }

  // Disk usage
  try {
    const diskUsage = await getDirectorySize(repoPath);
    console.log(`  Disk Usage:   ${formatBytes(diskUsage)}`);
  } catch {
    console.log(`  Disk Usage:   Unknown`);
  }

  // Issue details
  if (healthResult.issues.length > 0) {
    console.log('\nISSUES FOUND');
    healthResult.issues.forEach((issue, index) => {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.check}`);
      console.log(`     ${issue.message}`);
    });
  } else {
    console.log('\nNo issues found.');
  }
}

// ===========================
// Command Logic
// ===========================

/**
 * Parse command-line arguments
 *
 * @param {string[]} args - Command-line arguments (process.argv.slice(2))
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  const options = {
    type: null,
    verbose: false,
    pluginId: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--type') {
      options.type = args[++i];
      if (!['frameworks', 'add-ons', 'extensions'].includes(options.type)) {
        throw new Error(`Invalid type '${options.type}': must be 'frameworks', 'add-ons', or 'extensions'`);
      }
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      // Plugin ID
      options.pluginId = arg;
    }
  }

  return options;
}

/**
 * Filter plugins based on options
 *
 * @param {Object[]} plugins - All plugins
 * @param {Object} options - Command options
 * @returns {Object[]} Filtered plugins
 */
function filterPlugins(plugins, options) {
  let filtered = plugins;

  // Filter by type
  if (options.type) {
    const typeMap = {
      'frameworks': 'framework',
      'add-ons': 'add-on',
      'extensions': 'extension'
    };
    filtered = filtered.filter(p => p.type === typeMap[options.type]);
  }

  // Filter by ID
  if (options.pluginId) {
    filtered = filtered.filter(p => p.id === options.pluginId);
  }

  return filtered;
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
AIWG - Plugin Status Command

USAGE
  aiwg -status [options] [plugin-id]
  node tools/cli/status-command.mjs [options] [plugin-id]

OPTIONS
  --type <frameworks|add-ons|extensions>  Filter by plugin type
  --verbose                                Show detailed information
  --help, -h                               Show this help message

ARGUMENTS
  plugin-id                                Check specific plugin (optional)

EXAMPLES
  # Show all plugins
  aiwg -status

  # Filter by type
  aiwg -status --type frameworks
  aiwg -status --type add-ons

  # Check specific plugin
  aiwg -status sdlc-complete

  # Verbose mode
  aiwg -status --verbose
  aiwg -status sdlc-complete --verbose

OUTPUT
  Displays health status for installed plugins with:
  - Plugin ID, version, install date
  - Health status (✓ HEALTHY, ⚠️ WARNING, ❌ ERROR)
  - Project count (frameworks)
  - Parent framework (add-ons)
  - Workspace summary (base path, legacy mode, disk usage)
`);
}

/**
 * Main status command
 *
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<void>}
 */
export async function statusCommand(args) {
  try {
    // Parse arguments
    const options = parseArgs(args);

    // Show help
    if (options.help) {
      displayHelp();
      return;
    }

    // Initialize registry and health checker (support test override)
    const registryPath = process.env.AIWG_REGISTRY_PATH || path.join(path.resolve(".aiwg"), "frameworks", "registry.json");
    const basePath = path.dirname(path.dirname(registryPath));
    const registry = new PluginRegistry(registryPath);
    const healthChecker = new HealthChecker(basePath, registry);

    // Get all plugins
    let plugins = await registry.listPlugins();

    // Filter plugins
    plugins = filterPlugins(plugins, options);

    // Check if any plugins found
    if (plugins.length === 0) {
      if (options.pluginId) {
        console.error(`Error: Plugin '${options.pluginId}' not found in registry.`);
        console.error(`Install plugins via: aiwg -deploy-agents --mode sdlc`);
        process.exit(1);
      } else if (options.type) {
        console.log(`\nNo ${options.type} installed.`);
        return;
      } else {
        console.log('\nNo plugins installed.');
        console.log('Install plugins via: aiwg -deploy-agents --mode sdlc');
        return;
      }
    }

    // Run health checks for all plugins
    const healthResults = new Map();
    for (const plugin of plugins) {
      try {
        const result = await healthChecker.checkPlugin(plugin.id);
        healthResults.set(plugin.id, result);
      } catch (error) {
        console.warn(`Warning: Health check failed for '${plugin.id}': ${error.message}`);
        healthResults.set(plugin.id, {
          status: 'error',
          issues: [{ check: 'health-check', severity: 'error', message: error.message }],
          timestamp: new Date().toISOString()
        });
      }
    }

    // Verbose mode for single plugin
    if (options.verbose && options.pluginId && plugins.length === 1) {
      await displayVerbose(plugins[0], healthResults.get(plugins[0].id), basePath);
      return;
    }

    // Display header
    console.log('\nAIWG - Plugin Status');
    console.log('='.repeat(80));

    // Group by type
    const frameworks = plugins.filter(p => p.type === 'framework');
    const addOns = plugins.filter(p => p.type === 'add-on');
    const extensions = plugins.filter(p => p.type === 'extension');

    // Display frameworks table
    if (frameworks.length > 0 && (!options.type || options.type === 'frameworks')) {
      console.log(`\nFRAMEWORKS (${frameworks.length} installed)`);
      displayFrameworksTable(frameworks, healthResults);
    }

    // Display add-ons table
    if (addOns.length > 0 && (!options.type || options.type === 'add-ons')) {
      console.log(`\nADD-ONS (${addOns.length} installed)`);
      displayAddOnsTable(addOns, healthResults);
    }

    // Display extensions table
    if (extensions.length > 0 && (!options.type || options.type === 'extensions')) {
      console.log(`\nEXTENSIONS (${extensions.length} installed)`);
      displayExtensionsTable(extensions, healthResults);
    } else if (!options.type && extensions.length === 0 && addOns.length === 0 && frameworks.length > 0) {
      // Only show "no extensions" message if showing all types and we have other plugins
      console.log('\nEXTENSIONS (0 installed)');
      console.log('No custom extensions installed.');
    }

    // Display workspace summary (only if not filtering by type or ID)
    if (!options.type && !options.pluginId) {
      await displayWorkspaceSummary(plugins, basePath);
    }

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ===========================
// CLI Entry Point
// ===========================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  await statusCommand(args);
}
