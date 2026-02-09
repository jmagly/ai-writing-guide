/**
 * Unit tests for AutomationEngine
 *
 * Tests trigger-action rule processing, condition evaluation,
 * cooldowns, approval gates, and action execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomationEngine } from '../../../tools/daemon/automation-engine.mjs';

describe('AutomationEngine', () => {
  describe('constructor', () => {
    it('should initialize with default options', () => {
      const engine = new AutomationEngine();

      expect(engine.rules).toEqual([]);
      expect(engine.supervisor).toBe(null);
      expect(engine.enabled).toBe(true);
      expect(engine.cooldowns).toBeInstanceOf(Map);
      expect(engine.executionLog).toEqual([]);
      expect(engine.maxLogEntries).toBe(500);
      expect(engine.approvalHandler).toBe(null);
    });

    it('should initialize with custom options', () => {
      const mockSupervisor = { submit: vi.fn() };
      const mockApprovalHandler = vi.fn();

      const engine = new AutomationEngine({
        supervisor: mockSupervisor,
        maxLogEntries: 100,
        approvalHandler: mockApprovalHandler,
      });

      expect(engine.supervisor).toBe(mockSupervisor);
      expect(engine.maxLogEntries).toBe(100);
      expect(engine.approvalHandler).toBe(mockApprovalHandler);
    });

    it('should initialize with enabled=false', () => {
      const engine = new AutomationEngine({ enabled: false });

      expect(engine.enabled).toBe(false);
    });

    it('should be an EventEmitter', () => {
      const engine = new AutomationEngine();

      expect(engine.on).toBeInstanceOf(Function);
      expect(engine.emit).toBeInstanceOf(Function);
    });
  });

  describe('loadRules', () => {
    it('should load valid rules', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rules:loaded', eventSpy);

      const rules = [
        { id: 'rule1', trigger: { type: 'file:modified' }, action: { type: 'notify' } },
        { id: 'rule2', trigger: { type: 'error' }, action: { type: 'agent' } },
      ];

      engine.loadRules(rules);

      expect(engine.rules).toHaveLength(2);
      expect(engine.rules[0].id).toBe('rule1');
      expect(engine.rules[1].id).toBe('rule2');
      expect(eventSpy).toHaveBeenCalledWith({ count: 2 });
    });

    it('should skip invalid rules with missing id', () => {
      const engine = new AutomationEngine();
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const rules = [
        { trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: '', trigger: { type: 'test' }, action: { type: 'notify' } },
      ];

      engine.loadRules(rules);

      expect(engine.rules).toHaveLength(0);
      expect(invalidSpy).toHaveBeenCalledTimes(2);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing or invalid rule id' })
      );
    });

    it('should skip invalid rules with missing trigger', () => {
      const engine = new AutomationEngine();
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const rules = [{ id: 'rule1', action: { type: 'notify' } }];

      engine.loadRules(rules);

      expect(engine.rules).toHaveLength(0);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing trigger' })
      );
    });

    it('should skip invalid rules with missing action', () => {
      const engine = new AutomationEngine();
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const rules = [{ id: 'rule1', trigger: { type: 'test' } }];

      engine.loadRules(rules);

      expect(engine.rules).toHaveLength(0);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing action' })
      );
    });

    it('should emit rules:loaded event with count', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rules:loaded', eventSpy);

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      expect(eventSpy).toHaveBeenCalledWith({ count: 1 });
    });

    it('should clear existing rules before loading new ones', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);
      expect(engine.rules).toHaveLength(1);

      engine.loadRules([
        { id: 'r2', trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: 'r3', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      expect(engine.rules).toHaveLength(2);
      expect(engine.rules[0].id).toBe('r2');
      expect(engine.rules[1].id).toBe('r3');
    });

    it('should set default values for optional fields', () => {
      const engine = new AutomationEngine();

      engine.loadRules([
        { id: 'rule1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      const rule = engine.rules[0];
      expect(rule.enabled).toBe(true);
      expect(rule.cooldownMs).toBe(0);
      expect(rule.requiresApproval).toBe(false);
      expect(rule.conditions).toEqual([]);
      expect(rule.description).toBe('');
    });

    it('should preserve custom optional fields', () => {
      const engine = new AutomationEngine();

      engine.loadRules([
        {
          id: 'rule1',
          trigger: { type: 'test' },
          action: { type: 'notify' },
          enabled: false,
          cooldownMs: 5000,
          requiresApproval: true,
          conditions: [{ field: 'severity', operator: 'eq', value: 'high' }],
          description: 'Test rule',
        },
      ]);

      const rule = engine.rules[0];
      expect(rule.enabled).toBe(false);
      expect(rule.cooldownMs).toBe(5000);
      expect(rule.requiresApproval).toBe(true);
      expect(rule.conditions).toHaveLength(1);
      expect(rule.description).toBe('Test rule');
    });
  });

  describe('processEvent', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should skip processing when disabled', async () => {
      engine.setEnabled(false);
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      await engine.processEvent({ type: 'test' });

      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('should match rules by type', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        { id: 'r1', trigger: { type: 'file:modified' }, action: { type: 'notify' } },
        { id: 'r2', trigger: { type: 'error' }, action: { type: 'notify' } },
      ]);

      await engine.processEvent({ type: 'file:modified', path: '/test.js' });

      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1' }),
        expect.objectContaining({ type: 'file:modified' })
      );
    });

    it('should match rules by source', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        { id: 'r1', trigger: { source: 'watcher' }, action: { type: 'notify' } },
        { id: 'r2', trigger: { source: 'api' }, action: { type: 'notify' } },
      ]);

      await engine.processEvent({ type: 'event', source: 'watcher' });

      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1' }),
        expect.any(Object)
      );
    });

    it('should match rules by pattern', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        {
          id: 'r1',
          trigger: { pattern: 'file:.*' },
          action: { type: 'notify' },
        },
      ]);

      await engine.processEvent({ type: 'file:modified', source: 'watcher' });

      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('should not match rules with pattern mismatch', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        {
          id: 'r1',
          trigger: { pattern: 'error:.*' },
          action: { type: 'notify' },
        },
      ]);

      await engine.processEvent({ type: 'file:modified', source: 'watcher' });

      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('should match rules with conditions', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'error' },
          action: { type: 'notify' },
          conditions: [{ field: 'severity', operator: 'eq', value: 'high' }],
        },
      ]);

      await engine.processEvent({ type: 'error', severity: 'high' });

      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it('should not match rules when conditions fail', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'error' },
          action: { type: 'notify' },
          conditions: [{ field: 'severity', operator: 'eq', value: 'high' }],
        },
      ]);

      await engine.processEvent({ type: 'error', severity: 'low' });

      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('should respect cooldowns', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'test' },
          action: { type: 'notify' },
          cooldownMs: 1000,
        },
      ]);

      await engine.processEvent({ type: 'test' });
      expect(executeSpy).toHaveBeenCalledTimes(1);

      await engine.processEvent({ type: 'test' });
      expect(executeSpy).toHaveBeenCalledTimes(1); // Still 1, blocked by cooldown
    });

    it('should execute multiple matching rules', async () => {
      const executeSpy = vi.spyOn(engine, '_executeRule');

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: 'r2', trigger: { type: 'test' }, action: { type: 'webhook' } },
      ]);

      await engine.processEvent({ type: 'test' });

      expect(executeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('setEnabled', () => {
    it('should enable the engine', () => {
      const engine = new AutomationEngine({ enabled: false });
      const eventSpy = vi.fn();
      engine.on('engine:toggled', eventSpy);

      engine.setEnabled(true);

      expect(engine.enabled).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith({ enabled: true });
    });

    it('should disable the engine', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('engine:toggled', eventSpy);

      engine.setEnabled(false);

      expect(engine.enabled).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith({ enabled: false });
    });

    it('should emit engine:toggled event', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('engine:toggled', eventSpy);

      engine.setEnabled(false);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('getStatus', () => {
    it('should return correct structure', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'test' },
          action: { type: 'notify' },
          cooldownMs: 5000,
          requiresApproval: true,
        },
      ]);

      const status = engine.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('ruleCount');
      expect(status).toHaveProperty('rules');
      expect(status).toHaveProperty('recentExecutions');
      expect(status.enabled).toBe(true);
      expect(status.ruleCount).toBe(1);
      expect(status.rules).toHaveLength(1);
      expect(status.rules[0]).toEqual({
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify' },
        enabled: true,
        cooldownMs: 5000,
        requiresApproval: true,
      });
    });

    it('should return last 10 recent executions', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      // Simulate 15 executions
      for (let i = 0; i < 15; i++) {
        engine.executionLog.push({
          ruleId: 'r1',
          eventType: 'test',
          status: 'notified',
          timestamp: new Date().toISOString(),
        });
      }

      const status = engine.getStatus();

      expect(status.recentExecutions).toHaveLength(10);
    });

    it('should show rule enabled state', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'test' },
          action: { type: 'notify' },
          enabled: false,
        },
      ]);

      const status = engine.getStatus();

      expect(status.rules[0].enabled).toBe(false);
    });
  });

  describe('getRule', () => {
    it('should find rule by id', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: 'r2', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      const rule = engine.getRule('r2');

      expect(rule).not.toBe(null);
      expect(rule.id).toBe('r2');
    });

    it('should return null for unknown id', () => {
      const engine = new AutomationEngine();
      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      const rule = engine.getRule('nonexistent');

      expect(rule).toBe(null);
    });

    it('should return null when no rules loaded', () => {
      const engine = new AutomationEngine();

      const rule = engine.getRule('r1');

      expect(rule).toBe(null);
    });
  });

  describe('setRuleEnabled', () => {
    it('should enable a rule', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rule:toggled', eventSpy);

      engine.loadRules([
        {
          id: 'r1',
          trigger: { type: 'test' },
          action: { type: 'notify' },
          enabled: false,
        },
      ]);

      const result = engine.setRuleEnabled('r1', true);

      expect(result).toBe(true);
      expect(engine.rules[0].enabled).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith({ id: 'r1', enabled: true });
    });

    it('should disable a rule', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rule:toggled', eventSpy);

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      const result = engine.setRuleEnabled('r1', false);

      expect(result).toBe(true);
      expect(engine.rules[0].enabled).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith({ id: 'r1', enabled: false });
    });

    it('should return false for unknown rule', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rule:toggled', eventSpy);

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      const result = engine.setRuleEnabled('nonexistent', true);

      expect(result).toBe(false);
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should emit rule:toggled event', () => {
      const engine = new AutomationEngine();
      const eventSpy = vi.fn();
      engine.on('rule:toggled', eventSpy);

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      engine.setRuleEnabled('r1', false);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith({ id: 'r1', enabled: false });
    });
  });

  describe('getExecutionLog', () => {
    it('should return last N entries', () => {
      const engine = new AutomationEngine();

      for (let i = 0; i < 100; i++) {
        engine.executionLog.push({
          ruleId: `r${i}`,
          eventType: 'test',
          status: 'notified',
          timestamp: new Date().toISOString(),
        });
      }

      const log = engine.getExecutionLog(10);

      expect(log).toHaveLength(10);
      expect(log[0].ruleId).toBe('r90');
      expect(log[9].ruleId).toBe('r99');
    });

    it('should default to 50 entries', () => {
      const engine = new AutomationEngine();

      for (let i = 0; i < 100; i++) {
        engine.executionLog.push({
          ruleId: `r${i}`,
          eventType: 'test',
          status: 'notified',
          timestamp: new Date().toISOString(),
        });
      }

      const log = engine.getExecutionLog();

      expect(log).toHaveLength(50);
      expect(log[0].ruleId).toBe('r50');
      expect(log[49].ruleId).toBe('r99');
    });

    it('should return all entries if fewer than limit', () => {
      const engine = new AutomationEngine();

      for (let i = 0; i < 5; i++) {
        engine.executionLog.push({
          ruleId: `r${i}`,
          eventType: 'test',
          status: 'notified',
          timestamp: new Date().toISOString(),
        });
      }

      const log = engine.getExecutionLog(50);

      expect(log).toHaveLength(5);
    });
  });

  describe('ruleCount', () => {
    it('should return correct count', () => {
      const engine = new AutomationEngine();

      expect(engine.ruleCount).toBe(0);

      engine.loadRules([
        { id: 'r1', trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: 'r2', trigger: { type: 'test' }, action: { type: 'notify' } },
        { id: 'r3', trigger: { type: 'test' }, action: { type: 'notify' } },
      ]);

      expect(engine.ruleCount).toBe(3);
    });
  });

  describe('_validateRule', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should reject rule with missing id', () => {
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const result = engine._validateRule({
        trigger: { type: 'test' },
        action: { type: 'notify' },
      });

      expect(result).toBe(null);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing or invalid rule id' })
      );
    });

    it('should reject rule with non-string id', () => {
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const result = engine._validateRule({
        id: 123,
        trigger: { type: 'test' },
        action: { type: 'notify' },
      });

      expect(result).toBe(null);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing or invalid rule id' })
      );
    });

    it('should reject rule with missing trigger', () => {
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const result = engine._validateRule({
        id: 'r1',
        action: { type: 'notify' },
      });

      expect(result).toBe(null);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing trigger' })
      );
    });

    it('should reject rule with missing action', () => {
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      const result = engine._validateRule({
        id: 'r1',
        trigger: { type: 'test' },
      });

      expect(result).toBe(null);
      expect(invalidSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Missing action' })
      );
    });

    it('should emit rule:invalid event', () => {
      const invalidSpy = vi.fn();
      engine.on('rule:invalid', invalidSpy);

      engine._validateRule({ trigger: { type: 'test' }, action: { type: 'notify' } });

      expect(invalidSpy).toHaveBeenCalledTimes(1);
    });

    it('should return validated rule with defaults', () => {
      const result = engine._validateRule({
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify' },
      });

      expect(result).toEqual({
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify' },
        enabled: true,
        cooldownMs: 0,
        requiresApproval: false,
        conditions: [],
        description: '',
      });
    });

    it('should preserve custom fields', () => {
      const result = engine._validateRule({
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify' },
        enabled: false,
        cooldownMs: 5000,
        requiresApproval: true,
        conditions: [{ field: 'x', operator: 'eq', value: 1 }],
        description: 'Test rule',
      });

      expect(result.enabled).toBe(false);
      expect(result.cooldownMs).toBe(5000);
      expect(result.requiresApproval).toBe(true);
      expect(result.conditions).toHaveLength(1);
      expect(result.description).toBe('Test rule');
    });
  });

  describe('_matchesRule', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should not match disabled rule', () => {
      const rule = { id: 'r1', trigger: { type: 'test' }, enabled: false };
      const event = { type: 'test' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should match by type', () => {
      const rule = { id: 'r1', trigger: { type: 'test' }, enabled: true };
      const event = { type: 'test' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });

    it('should not match different type', () => {
      const rule = { id: 'r1', trigger: { type: 'test' }, enabled: true };
      const event = { type: 'other' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should match by source', () => {
      const rule = { id: 'r1', trigger: { source: 'watcher' }, enabled: true };
      const event = { type: 'test', source: 'watcher' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });

    it('should not match different source', () => {
      const rule = { id: 'r1', trigger: { source: 'watcher' }, enabled: true };
      const event = { type: 'test', source: 'api' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should match by pattern', () => {
      const rule = { id: 'r1', trigger: { pattern: 'file:.*' }, enabled: true };
      const event = { type: 'file:modified', source: 'watcher' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });

    it('should not match pattern mismatch', () => {
      const rule = { id: 'r1', trigger: { pattern: 'error:.*' }, enabled: true };
      const event = { type: 'file:modified', source: 'watcher' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should match with all conditions passing', () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'error' },
        enabled: true,
        conditions: [
          { field: 'severity', operator: 'eq', value: 'high' },
          { field: 'count', operator: 'gt', value: 5 },
        ],
      };
      const event = { type: 'error', severity: 'high', count: 10 };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });

    it('should not match when any condition fails', () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'error' },
        enabled: true,
        conditions: [
          { field: 'severity', operator: 'eq', value: 'high' },
          { field: 'count', operator: 'gt', value: 5 },
        ],
      };
      const event = { type: 'error', severity: 'high', count: 3 };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should respect cooldown', () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        enabled: true,
        cooldownMs: 1000,
      };
      const event = { type: 'test' };

      engine.cooldowns.set('r1', Date.now());

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(false);
    });

    it('should match after cooldown expires', () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        enabled: true,
        cooldownMs: 100,
      };
      const event = { type: 'test' };

      engine.cooldowns.set('r1', Date.now() - 200);

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });

    it('should match when cooldown is 0', () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        enabled: true,
        cooldownMs: 0,
      };
      const event = { type: 'test' };

      const result = engine._matchesRule(rule, event);

      expect(result).toBe(true);
    });
  });

  describe('_evaluateCondition', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should evaluate eq operator', () => {
      const testCases = [
        { condition: { field: 'x', operator: 'eq', value: 5 }, event: { x: 5 }, expected: true },
        { condition: { field: 'x', operator: 'eq', value: 5 }, event: { x: 10 }, expected: false },
        {
          condition: { field: 'name', operator: 'eq', value: 'test' },
          event: { name: 'test' },
          expected: true,
        },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate equals operator', () => {
      const condition = { field: 'status', operator: 'equals', value: 'active' };
      const event = { status: 'active' };

      const result = engine._evaluateCondition(condition, event);

      expect(result).toBe(true);
    });

    it('should evaluate neq operator', () => {
      const testCases = [
        { condition: { field: 'x', operator: 'neq', value: 5 }, event: { x: 10 }, expected: true },
        { condition: { field: 'x', operator: 'neq', value: 5 }, event: { x: 5 }, expected: false },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate not_equals operator', () => {
      const condition = { field: 'status', operator: 'not_equals', value: 'inactive' };
      const event = { status: 'active' };

      const result = engine._evaluateCondition(condition, event);

      expect(result).toBe(true);
    });

    it('should evaluate contains operator', () => {
      const testCases = [
        {
          condition: { field: 'message', operator: 'contains', value: 'error' },
          event: { message: 'An error occurred' },
          expected: true,
        },
        {
          condition: { field: 'message', operator: 'contains', value: 'error' },
          event: { message: 'Success' },
          expected: false,
        },
        {
          condition: { field: 'count', operator: 'contains', value: 'x' },
          event: { count: 5 },
          expected: false,
        },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate matches operator', () => {
      const testCases = [
        {
          condition: { field: 'path', operator: 'matches', value: '.*\\.js$' },
          event: { path: '/src/test.js' },
          expected: true,
        },
        {
          condition: { field: 'path', operator: 'matches', value: '.*\\.js$' },
          event: { path: '/src/test.ts' },
          expected: false,
        },
        {
          condition: { field: 'count', operator: 'matches', value: '\\d+' },
          event: { count: 5 },
          expected: false,
        },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate gt operator', () => {
      const testCases = [
        { condition: { field: 'count', operator: 'gt', value: 5 }, event: { count: 10 }, expected: true },
        { condition: { field: 'count', operator: 'gt', value: 5 }, event: { count: 5 }, expected: false },
        { condition: { field: 'count', operator: 'gt', value: 5 }, event: { count: 3 }, expected: false },
        {
          condition: { field: 'name', operator: 'gt', value: 5 },
          event: { name: 'test' },
          expected: false,
        },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate lt operator', () => {
      const testCases = [
        { condition: { field: 'count', operator: 'lt', value: 5 }, event: { count: 3 }, expected: true },
        { condition: { field: 'count', operator: 'lt', value: 5 }, event: { count: 5 }, expected: false },
        { condition: { field: 'count', operator: 'lt', value: 5 }, event: { count: 10 }, expected: false },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate gte operator', () => {
      const testCases = [
        { condition: { field: 'count', operator: 'gte', value: 5 }, event: { count: 10 }, expected: true },
        { condition: { field: 'count', operator: 'gte', value: 5 }, event: { count: 5 }, expected: true },
        { condition: { field: 'count', operator: 'gte', value: 5 }, event: { count: 3 }, expected: false },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate lte operator', () => {
      const testCases = [
        { condition: { field: 'count', operator: 'lte', value: 5 }, event: { count: 3 }, expected: true },
        { condition: { field: 'count', operator: 'lte', value: 5 }, event: { count: 5 }, expected: true },
        { condition: { field: 'count', operator: 'lte', value: 5 }, event: { count: 10 }, expected: false },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate exists operator', () => {
      const testCases = [
        { condition: { field: 'x', operator: 'exists' }, event: { x: 5 }, expected: true },
        { condition: { field: 'x', operator: 'exists' }, event: { x: null }, expected: false },
        { condition: { field: 'x', operator: 'exists' }, event: {}, expected: false },
        { condition: { field: 'x', operator: 'exists' }, event: { x: undefined }, expected: false },
        { condition: { field: 'x', operator: 'exists' }, event: { x: 0 }, expected: true },
        { condition: { field: 'x', operator: 'exists' }, event: { x: '' }, expected: true },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should evaluate not_exists operator', () => {
      const testCases = [
        { condition: { field: 'x', operator: 'not_exists' }, event: {}, expected: true },
        { condition: { field: 'x', operator: 'not_exists' }, event: { x: null }, expected: true },
        { condition: { field: 'x', operator: 'not_exists' }, event: { x: undefined }, expected: true },
        { condition: { field: 'x', operator: 'not_exists' }, event: { x: 5 }, expected: false },
        { condition: { field: 'x', operator: 'not_exists' }, event: { x: 0 }, expected: false },
      ];

      for (const { condition, event, expected } of testCases) {
        const result = engine._evaluateCondition(condition, event);
        expect(result).toBe(expected);
      }
    });

    it('should return false for unknown operator', () => {
      const condition = { field: 'x', operator: 'unknown', value: 5 };
      const event = { x: 5 };

      const result = engine._evaluateCondition(condition, event);

      expect(result).toBe(false);
    });
  });

  describe('_getNestedField', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should get simple path', () => {
      const obj = { x: 5 };
      const result = engine._getNestedField(obj, 'x');
      expect(result).toBe(5);
    });

    it('should get nested path', () => {
      const obj = { user: { profile: { name: 'Alice' } } };
      const result = engine._getNestedField(obj, 'user.profile.name');
      expect(result).toBe('Alice');
    });

    it('should return undefined for missing path', () => {
      const obj = { x: 5 };
      const result = engine._getNestedField(obj, 'y');
      expect(result).toBe(undefined);
    });

    it('should return undefined for deeply missing path', () => {
      const obj = { user: { profile: {} } };
      const result = engine._getNestedField(obj, 'user.profile.name');
      expect(result).toBe(undefined);
    });

    it('should return undefined when intermediate value is null', () => {
      const obj = { user: null };
      const result = engine._getNestedField(obj, 'user.profile.name');
      expect(result).toBe(undefined);
    });

    it('should return undefined when intermediate value is undefined', () => {
      const obj = { user: undefined };
      const result = engine._getNestedField(obj, 'user.profile.name');
      expect(result).toBe(undefined);
    });

    it('should handle array-like paths', () => {
      const obj = { items: { 0: 'first' } };
      const result = engine._getNestedField(obj, 'items.0');
      expect(result).toBe('first');
    });
  });

  describe('_executeRule', () => {
    let engine;
    let mockSupervisor;

    beforeEach(() => {
      mockSupervisor = {
        submit: vi.fn((prompt, opts) => ({ id: 'task-123', ...opts })),
      };
      engine = new AutomationEngine({ supervisor: mockSupervisor });
    });

    it('should execute agent action with supervisor', async () => {
      const executedSpy = vi.fn();
      engine.on('rule:executed', executedSpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: {
          type: 'agent',
          agent: 'test-agent',
          prompt: 'Process event {{type}}',
          priority: 10,
        },
      };
      const event = { type: 'file:modified', path: '/test.js' };

      await engine._executeRule(rule, event);

      expect(mockSupervisor.submit).toHaveBeenCalledWith(
        'Process event file:modified',
        expect.objectContaining({
          agent: 'test-agent',
          priority: 10,
          metadata: { ruleId: 'r1', eventType: 'file:modified' },
        })
      );
      expect(executedSpy).toHaveBeenCalledWith({
        ruleId: 'r1',
        taskId: 'task-123',
        event,
      });
      expect(engine.executionLog).toHaveLength(1);
      expect(engine.executionLog[0].status).toBe('submitted');
    });

    it('should not execute agent action without supervisor', async () => {
      const noSupervisorEngine = new AutomationEngine();
      const executedSpy = vi.fn();
      noSupervisorEngine.on('rule:executed', executedSpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'agent', agent: 'test-agent', prompt: 'Test' },
      };
      const event = { type: 'test' };

      await noSupervisorEngine._executeRule(rule, event);

      expect(executedSpy).not.toHaveBeenCalled();
      expect(noSupervisorEngine.executionLog[0].status).toBe('unknown_action_type');
    });

    it('should execute notify action', async () => {
      const notifySpy = vi.fn();
      engine.on('rule:notify', notifySpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: {
          type: 'notify',
          message: 'Alert: {{type}} in {{path}}',
          channel: 'slack',
        },
      };
      const event = { type: 'error', path: '/src/app.js' };

      await engine._executeRule(rule, event);

      expect(notifySpy).toHaveBeenCalledWith({
        ruleId: 'r1',
        message: 'Alert: error in /src/app.js',
        channel: 'slack',
        event,
      });
      expect(engine.executionLog[0].status).toBe('notified');
    });

    it('should execute webhook action', async () => {
      const webhookSpy = vi.fn();
      engine.on('rule:webhook', webhookSpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'webhook', url: 'https://example.com/webhook' },
      };
      const event = { type: 'deploy', status: 'success' };

      await engine._executeRule(rule, event);

      expect(webhookSpy).toHaveBeenCalledWith({
        ruleId: 'r1',
        url: 'https://example.com/webhook',
        payload: event,
      });
      expect(engine.executionLog[0].status).toBe('webhook_sent');
    });

    it('should handle unknown action type', async () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'unknown' },
      };
      const event = { type: 'test' };

      await engine._executeRule(rule, event);

      expect(engine.executionLog[0].status).toBe('unknown_action_type');
    });

    it('should request approval when required', async () => {
      const mockApprovalHandler = vi.fn().mockResolvedValue(true);
      engine.approvalHandler = mockApprovalHandler;

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify', message: 'Test' },
        requiresApproval: true,
      };
      const event = { type: 'test' };

      await engine._executeRule(rule, event);

      expect(mockApprovalHandler).toHaveBeenCalledWith(rule, event);
      expect(engine.executionLog[0].status).toBe('notified');
    });

    it('should skip execution when approval denied', async () => {
      const mockApprovalHandler = vi.fn().mockResolvedValue(false);
      engine.approvalHandler = mockApprovalHandler;
      const notifySpy = vi.fn();
      engine.on('rule:notify', notifySpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify', message: 'Test' },
        requiresApproval: true,
      };
      const event = { type: 'test' };

      await engine._executeRule(rule, event);

      expect(mockApprovalHandler).toHaveBeenCalledWith(rule, event);
      expect(notifySpy).not.toHaveBeenCalled();
      expect(engine.executionLog[0].status).toBe('denied');
    });

    it('should skip execution when no approval handler', async () => {
      const noHandlerEngine = new AutomationEngine();
      const notifySpy = vi.fn();
      noHandlerEngine.on('rule:notify', notifySpy);

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify', message: 'Test' },
        requiresApproval: true,
      };
      const event = { type: 'test' };

      await noHandlerEngine._executeRule(rule, event);

      expect(notifySpy).not.toHaveBeenCalled();
      expect(noHandlerEngine.executionLog[0].status).toBe('skipped_no_approver');
    });

    it('should handle execution errors', async () => {
      const errorSpy = vi.fn();
      engine.on('rule:error', errorSpy);

      mockSupervisor.submit = vi.fn(() => {
        throw new Error('Submit failed');
      });

      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'agent', agent: 'test', prompt: 'Test' },
      };
      const event = { type: 'test' };

      await engine._executeRule(rule, event);

      expect(errorSpy).toHaveBeenCalledWith({
        ruleId: 'r1',
        error: 'Submit failed',
      });
      expect(engine.executionLog[0].status).toBe('error');
      expect(engine.executionLog[0].error).toBe('Submit failed');
    });

    it('should set cooldown timestamp', async () => {
      const rule = {
        id: 'r1',
        trigger: { type: 'test' },
        action: { type: 'notify', message: 'Test' },
        cooldownMs: 5000,
      };
      const event = { type: 'test' };

      const beforeTime = Date.now();
      await engine._executeRule(rule, event);
      const afterTime = Date.now();

      const cooldownTime = engine.cooldowns.get('r1');
      expect(cooldownTime).toBeGreaterThanOrEqual(beforeTime);
      expect(cooldownTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('_interpolateTemplate', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine();
    });

    it('should perform simple substitution', () => {
      const template = 'Event type: {{type}}';
      const event = { type: 'file:modified' };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('Event type: file:modified');
    });

    it('should perform nested path substitution', () => {
      const template = 'User: {{user.profile.name}}';
      const event = { user: { profile: { name: 'Alice' } } };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('User: Alice');
    });

    it('should handle multiple substitutions', () => {
      const template = '{{type}} in {{path}} by {{user}}';
      const event = { type: 'error', path: '/src/app.js', user: 'bob' };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('error in /src/app.js by bob');
    });

    it('should leave placeholder when value missing', () => {
      const template = 'Status: {{status}}';
      const event = { type: 'test' };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('Status: {{status}}');
    });

    it('should return empty string for null template', () => {
      const result = engine._interpolateTemplate(null, { type: 'test' });

      expect(result).toBe('');
    });

    it('should return empty string for undefined template', () => {
      const result = engine._interpolateTemplate(undefined, { type: 'test' });

      expect(result).toBe('');
    });

    it('should convert non-string values to strings', () => {
      const template = 'Count: {{count}}, Active: {{active}}';
      const event = { count: 42, active: true };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('Count: 42, Active: true');
    });

    it('should handle template without placeholders', () => {
      const template = 'Static message';
      const event = { type: 'test' };

      const result = engine._interpolateTemplate(template, event);

      expect(result).toBe('Static message');
    });
  });

  describe('_logExecution', () => {
    let engine;

    beforeEach(() => {
      engine = new AutomationEngine({ maxLogEntries: 3 });
    });

    it('should add entry to execution log', () => {
      const rule = { id: 'r1' };
      const event = { type: 'test' };

      engine._logExecution(rule, event, 'submitted');

      expect(engine.executionLog).toHaveLength(1);
      expect(engine.executionLog[0]).toMatchObject({
        ruleId: 'r1',
        eventType: 'test',
        status: 'submitted',
      });
      expect(engine.executionLog[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include extra fields', () => {
      const rule = { id: 'r1' };
      const event = { type: 'test' };

      engine._logExecution(rule, event, 'error', { error: 'Failed' });

      expect(engine.executionLog[0]).toMatchObject({
        ruleId: 'r1',
        eventType: 'test',
        status: 'error',
        error: 'Failed',
      });
    });

    it('should respect maxLogEntries cap', () => {
      const rule = { id: 'r1' };
      const event = { type: 'test' };

      engine._logExecution(rule, event, 'status1');
      engine._logExecution(rule, event, 'status2');
      engine._logExecution(rule, event, 'status3');
      engine._logExecution(rule, event, 'status4');

      expect(engine.executionLog).toHaveLength(3);
      expect(engine.executionLog[0].status).toBe('status2');
      expect(engine.executionLog[1].status).toBe('status3');
      expect(engine.executionLog[2].status).toBe('status4');
    });

    it('should include timestamp in ISO format', () => {
      const rule = { id: 'r1' };
      const event = { type: 'test' };

      engine._logExecution(rule, event, 'submitted');

      const timestamp = engine.executionLog[0].timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
