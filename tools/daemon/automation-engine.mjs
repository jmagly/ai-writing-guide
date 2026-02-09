/**
 * Automation Engine - Trigger-action rules for the daemon
 *
 * Processes configurable rules that map daemon events to agent actions.
 * Supports approval gates, cooldowns, and condition evaluation.
 *
 * @implements @.aiwg/requirements/use-cases/UC-AUTO-001.md
 * @tests @test/unit/daemon/automation-engine.test.js
 */

import { EventEmitter } from 'node:events';

export class AutomationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.rules = [];
    this.supervisor = options.supervisor || null;
    this.enabled = options.enabled !== false;
    this.cooldowns = new Map(); // ruleId -> lastFiredAt
    this.executionLog = [];
    this.maxLogEntries = options.maxLogEntries || 500;
    this.approvalHandler = options.approvalHandler || null;
  }

  /**
   * Load rules from configuration
   * @param {Array} rules - Array of rule definitions
   */
  loadRules(rules) {
    this.rules = [];

    for (const rule of rules) {
      const validated = this._validateRule(rule);
      if (validated) {
        this.rules.push(validated);
      }
    }

    this.emit('rules:loaded', { count: this.rules.length });
  }

  /**
   * Process an incoming event against all rules
   * @param {object} event - Event to process
   */
  async processEvent(event) {
    if (!this.enabled) return;

    const matchingRules = this.rules.filter((rule) =>
      this._matchesRule(rule, event)
    );

    for (const rule of matchingRules) {
      await this._executeRule(rule, event);
    }
  }

  /**
   * Enable/disable the engine
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.emit('engine:toggled', { enabled });
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      ruleCount: this.rules.length,
      rules: this.rules.map((r) => ({
        id: r.id,
        trigger: r.trigger,
        action: r.action,
        enabled: r.enabled !== false,
        cooldownMs: r.cooldownMs || 0,
        requiresApproval: r.requiresApproval || false,
      })),
      recentExecutions: this.executionLog.slice(-10),
    };
  }

  /**
   * Get a specific rule by id
   */
  getRule(id) {
    return this.rules.find((r) => r.id === id) || null;
  }

  /**
   * Enable or disable a specific rule
   */
  setRuleEnabled(id, enabled) {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) return false;
    rule.enabled = enabled;
    this.emit('rule:toggled', { id, enabled });
    return true;
  }

  /**
   * Get execution log
   */
  getExecutionLog(limit = 50) {
    return this.executionLog.slice(-limit);
  }

  /**
   * Get rule count
   */
  get ruleCount() {
    return this.rules.length;
  }

  // --- Private methods ---

  _validateRule(rule) {
    if (!rule.id || typeof rule.id !== 'string') {
      this.emit('rule:invalid', { rule, error: 'Missing or invalid rule id' });
      return null;
    }

    if (!rule.trigger) {
      this.emit('rule:invalid', { rule, error: 'Missing trigger' });
      return null;
    }

    if (!rule.action) {
      this.emit('rule:invalid', { rule, error: 'Missing action' });
      return null;
    }

    return {
      id: rule.id,
      trigger: rule.trigger,
      action: rule.action,
      enabled: rule.enabled !== false,
      cooldownMs: rule.cooldownMs || 0,
      requiresApproval: rule.requiresApproval || false,
      conditions: rule.conditions || [],
      description: rule.description || '',
    };
  }

  _matchesRule(rule, event) {
    if (rule.enabled === false) return false;

    // Check trigger type match
    if (rule.trigger.type && rule.trigger.type !== event.type) {
      return false;
    }

    // Check trigger source match
    if (rule.trigger.source && rule.trigger.source !== event.source) {
      return false;
    }

    // Check trigger pattern (regex on event type or source)
    if (rule.trigger.pattern) {
      const regex = new RegExp(rule.trigger.pattern);
      const matchTarget = `${event.type || ''}:${event.source || ''}`;
      if (!regex.test(matchTarget)) {
        return false;
      }
    }

    // Check conditions
    for (const condition of rule.conditions || []) {
      if (!this._evaluateCondition(condition, event)) {
        return false;
      }
    }

    // Check cooldown
    if (rule.cooldownMs > 0) {
      const lastFired = this.cooldowns.get(rule.id);
      if (lastFired && Date.now() - lastFired < rule.cooldownMs) {
        return false;
      }
    }

    return true;
  }

  _evaluateCondition(condition, event) {
    const { field, operator, value } = condition;

    // Navigate to the field value in the event
    const fieldValue = this._getNestedField(event, field);

    switch (operator) {
      case 'eq':
      case 'equals':
        return fieldValue === value;
      case 'neq':
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'matches':
        return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > value;
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < value;
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= value;
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= value;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  _getNestedField(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  async _executeRule(rule, event) {
    // Check approval
    if (rule.requiresApproval) {
      if (this.approvalHandler) {
        const approved = await this.approvalHandler(rule, event);
        if (!approved) {
          this._logExecution(rule, event, 'denied');
          return;
        }
      } else {
        // No approval handler, skip rule
        this._logExecution(rule, event, 'skipped_no_approver');
        return;
      }
    }

    // Update cooldown
    this.cooldowns.set(rule.id, Date.now());

    try {
      if (rule.action.type === 'agent' && this.supervisor) {
        // Submit to agent supervisor
        const prompt = this._interpolateTemplate(rule.action.prompt, event);
        const task = this.supervisor.submit(prompt, {
          agent: rule.action.agent,
          priority: rule.action.priority || 0,
          metadata: { ruleId: rule.id, eventType: event.type },
        });

        this._logExecution(rule, event, 'submitted', { taskId: task.id });
        this.emit('rule:executed', { ruleId: rule.id, taskId: task.id, event });
      } else if (rule.action.type === 'notify') {
        this.emit('rule:notify', {
          ruleId: rule.id,
          message: this._interpolateTemplate(rule.action.message, event),
          channel: rule.action.channel,
          event,
        });
        this._logExecution(rule, event, 'notified');
      } else if (rule.action.type === 'webhook') {
        this.emit('rule:webhook', {
          ruleId: rule.id,
          url: rule.action.url,
          payload: event,
        });
        this._logExecution(rule, event, 'webhook_sent');
      } else {
        this._logExecution(rule, event, 'unknown_action_type');
      }
    } catch (err) {
      this._logExecution(rule, event, 'error', { error: err.message });
      this.emit('rule:error', { ruleId: rule.id, error: err.message });
    }
  }

  _interpolateTemplate(template, event) {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this._getNestedField(event, path);
      return value !== undefined ? String(value) : match;
    });
  }

  _logExecution(rule, event, status, extra = {}) {
    const entry = {
      ruleId: rule.id,
      eventType: event.type,
      status,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    this.executionLog.push(entry);

    if (this.executionLog.length > this.maxLogEntries) {
      this.executionLog.shift();
    }
  }
}
