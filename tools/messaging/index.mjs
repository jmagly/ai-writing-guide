/**
 * AIWG Messaging Hub — main entry point.
 *
 * Wires together the EventBus, MessageFormatter, AdapterRegistry,
 * and CommandRouter into a cohesive messaging subsystem that can be
 * embedded in the daemon or used standalone.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import path from 'path';
import { EventBus } from './event-bus.mjs';
import { formatEvent } from './message-formatter.mjs';
import {
  initializeRegistry,
  loadEnabledAdapters,
  getRegistryStatus,
  shutdownAll,
} from './adapter-registry.mjs';
import { CommandRouter } from './command-router.mjs';
import { COMMANDS, EventTopic } from './types.mjs';

/**
 * @typedef {Object} MessagingHub
 * @property {EventBus} bus - Internal event bus
 * @property {CommandRouter} router - Command dispatcher
 * @property {number} adapterCount - Number of loaded adapters
 * @property {(event: import('./event-bus.mjs').AiwgEvent) => void} publish
 * @property {() => Promise<void>} shutdown
 * @property {() => Object} getStatus
 */

/**
 * Create and initialize the messaging hub.
 *
 * Discovers enabled adapters from environment variables, loads them,
 * wires event subscriptions, and registers default command handlers.
 *
 * @param {Object} [options]
 * @param {Object} [options.adapterConfigs] - Per-adapter config overrides
 * @param {string[]} [options.writeUsers] - User IDs with write permission
 * @returns {Promise<MessagingHub|null>} null if no adapters enabled
 */
export async function createMessagingHub(options = {}) {
  const { adapterConfigs = {}, writeUsers = [] } = options;

  // Discover and load adapters
  initializeRegistry();
  const adapters = await loadEnabledAdapters(adapterConfigs);

  if (adapters.size === 0) {
    console.log('[messaging] No adapters enabled — messaging hub not started');
    return null;
  }

  const projectName = path.basename(process.cwd());
  const bus = new EventBus();
  const router = new CommandRouter();

  // Grant write permissions
  for (const userId of writeUsers) {
    router.grantPermission(userId, 'write');
  }

  // Register default command handlers
  registerDefaultHandlers(router, bus);

  // Wire adapters: EventBus → format → send to all adapters
  bus.subscribe('*', async (event) => {
    const message = formatEvent(event);

    for (const [name, adapter] of adapters) {
      try {
        await adapter.send(message);
      } catch (error) {
        console.error(`[messaging] Failed to send to ${name}: ${error.message}`);
      }
    }
  }, 'messaging-hub-broadcaster');

  // Wire inbound commands from adapters → router → response
  for (const [name, adapter] of adapters) {
    adapter.onCommand(async (command, args, context) => {
      const rawInput = [command, ...args].join(' ');
      const result = await router.dispatch(rawInput, context);

      // Send response back to the originating platform
      const responseMessage = {
        title: result.success ? 'Command Result' : 'Command Failed',
        body: result.message || result.error || 'No response',
        severity: result.success ? 'info' : 'warning',
        fields: [],
        project: projectName,
        timestamp: new Date().toISOString(),
      };

      try {
        await adapter.send(responseMessage, context.channelId || context.chatId);
      } catch (error) {
        console.error(`[messaging] Failed to send command response to ${name}: ${error.message}`);
      }
    });
  }

  console.log(`[messaging] Hub started with ${adapters.size} adapter(s): ${[...adapters.keys()].join(', ')}`);

  return {
    bus,
    router,
    adapterCount: adapters.size,

    /**
     * Publish an event to all connected messaging platforms.
     *
     * @param {import('./event-bus.mjs').AiwgEvent} event
     */
    publish(event) {
      if (!event.project) {
        event.project = projectName;
      }
      bus.publish(event);
    },

    /**
     * Shutdown all adapters and clean up the event bus.
     *
     * @returns {Promise<void>}
     */
    async shutdown() {
      bus.destroy();
      await shutdownAll();
      console.log('[messaging] Hub shut down');
    },

    /**
     * Get combined status of all components.
     *
     * @returns {Object}
     */
    getStatus() {
      return {
        adapters: getRegistryStatus(),
        commands: router.handlerCount,
        subscribers: bus.subscriberCount,
        deadLetters: bus.getDeadLetters().length,
      };
    },
  };
}

/**
 * Register built-in command handlers.
 *
 * @param {CommandRouter} router
 * @param {EventBus} bus
 */
function registerDefaultHandlers(router, bus) {
  // /help — list available commands
  router.registerHandler('help', async (_args, _context) => {
    return {
      success: true,
      message: router.getHelpText(),
    };
  });

  // /status — show project status
  router.registerHandler('status', async (_args, _context) => {
    const projectName = path.basename(process.cwd());
    const statusParts = [`Project: ${projectName}`];

    // Check for .aiwg directory
    const fs = await import('fs');
    if (fs.existsSync('.aiwg/planning/current-phase.txt')) {
      const phase = fs.readFileSync('.aiwg/planning/current-phase.txt', 'utf8').trim();
      statusParts.push(`Phase: ${phase}`);
    }

    // Check daemon state
    if (fs.existsSync('.aiwg/daemon/state.json')) {
      try {
        const state = JSON.parse(fs.readFileSync('.aiwg/daemon/state.json', 'utf8'));
        statusParts.push(`Daemon uptime: ${state.uptime_seconds}s`);
        statusParts.push(`Health: ${state.health?.status || 'unknown'}`);
      } catch {
        statusParts.push('Daemon: state unreadable');
      }
    }

    return {
      success: true,
      message: statusParts.join('\n'),
    };
  });

  // /ralph-status — show Ralph loop status
  router.registerHandler('ralph-status', async (_args, _context) => {
    const fs = await import('fs');
    const ralphDir = '.aiwg/ralph-external';

    if (!fs.existsSync(ralphDir)) {
      return { success: true, message: 'No Ralph loop active' };
    }

    try {
      const files = fs.readdirSync(ralphDir).filter(f => f.endsWith('.json'));
      if (files.length === 0) {
        return { success: true, message: 'No Ralph loop state files found' };
      }

      // Read the most recent state file
      const latest = files.sort().pop();
      const state = JSON.parse(fs.readFileSync(path.join(ralphDir, latest), 'utf8'));

      const parts = [
        `Loop: ${state.id || latest}`,
        `Status: ${state.status || 'unknown'}`,
        `Iteration: ${state.iteration || 'N/A'}/${state.maxIterations || 'N/A'}`,
      ];

      if (state.objective) {
        parts.push(`Objective: ${state.objective}`);
      }

      return { success: true, message: parts.join('\n') };
    } catch (error) {
      return { success: true, message: `Ralph state error: ${error.message}` };
    }
  });

  // /health — run health check
  router.registerHandler('health', async (_args, _context) => {
    const checks = [];

    const fs = await import('fs');

    // Check daemon heartbeat
    if (fs.existsSync('.aiwg/daemon/heartbeat')) {
      try {
        const hb = JSON.parse(fs.readFileSync('.aiwg/daemon/heartbeat', 'utf8'));
        const age = (Date.now() - new Date(hb.timestamp).getTime()) / 1000;
        checks.push(age < 120 ? 'Daemon: healthy' : `Daemon: stale heartbeat (${Math.round(age)}s ago)`);
      } catch {
        checks.push('Daemon: heartbeat unreadable');
      }
    } else {
      checks.push('Daemon: not running');
    }

    // Check adapter status
    const adapterStatuses = getRegistryStatus();
    for (const adapter of adapterStatuses) {
      const status = adapter.status === 'ready' ? 'connected' : adapter.status;
      checks.push(`${adapter.name}: ${status}${adapter.error ? ` (${adapter.error})` : ''}`);
    }

    return {
      success: true,
      message: `Health Check\n${checks.join('\n')}`,
    };
  });

  // /approve — approve a pending HITL gate
  router.registerHandler('approve', async (args, context) => {
    const gateId = args[0];
    if (!gateId) {
      return { success: false, error: 'Usage: /approve <gate-id>' };
    }

    bus.publish({
      topic: EventTopic.GATE_APPROVED,
      source: 'messaging-command',
      gateId,
      severity: 'info',
      summary: `Gate ${gateId} approved via ${context.platform}`,
      details: {
        approvedBy: context.userId || context.from?.username || 'unknown',
        platform: context.platform,
      },
      project: path.basename(process.cwd()),
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: `Gate ${gateId} approved` };
  });

  // /reject — reject a pending HITL gate
  router.registerHandler('reject', async (args, context) => {
    const gateId = args[0];
    if (!gateId) {
      return { success: false, error: 'Usage: /reject <gate-id> [reason]' };
    }

    const reason = args.slice(1).join(' ') || 'Rejected via messaging';

    bus.publish({
      topic: EventTopic.GATE_REJECTED,
      source: 'messaging-command',
      gateId,
      severity: 'warning',
      summary: `Gate ${gateId} rejected via ${context.platform}: ${reason}`,
      details: {
        rejectedBy: context.userId || context.from?.username || 'unknown',
        reason,
        platform: context.platform,
      },
      project: path.basename(process.cwd()),
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: `Gate ${gateId} rejected: ${reason}` };
  });
}

export default createMessagingHub;
