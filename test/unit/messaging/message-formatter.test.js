import { describe, it, expect } from 'vitest';
import {
  formatEvent,
  getSeverityColor,
  getSeverityEmoji,
} from '../../../tools/messaging/message-formatter.mjs';
import { Severity, ButtonStyle } from '../../../tools/messaging/types.mjs';

describe('MessageFormatter', () => {
  describe('getSeverityColor', () => {
    it('returns correct hex color for info', () => {
      expect(getSeverityColor(Severity.INFO)).toBe('#36a64f');
    });

    it('returns correct hex color for warning', () => {
      expect(getSeverityColor(Severity.WARNING)).toBe('#daa520');
    });

    it('returns correct hex color for critical', () => {
      expect(getSeverityColor(Severity.CRITICAL)).toBe('#dc3545');
    });

    it('returns default color for unknown severity', () => {
      expect(getSeverityColor('unknown')).toBe('#36a64f');
    });
  });

  describe('getSeverityEmoji', () => {
    it('returns correct emoji for info', () => {
      expect(getSeverityEmoji(Severity.INFO)).toBe('\u2705');
    });

    it('returns correct emoji for warning', () => {
      expect(getSeverityEmoji(Severity.WARNING)).toBe('\u26a0\ufe0f');
    });

    it('returns correct emoji for critical', () => {
      expect(getSeverityEmoji(Severity.CRITICAL)).toBe('\ud83d\udea8');
    });

    it('returns default emoji for unknown severity', () => {
      expect(getSeverityEmoji('unknown')).toBe('\u2705');
    });
  });

  describe('formatEvent', () => {
    it('formats known topic with specific formatter', () => {
      const event = {
        topic: 'ralph.started',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph-orchestrator',
        loopId: 'loop-123',
        severity: 'info',
        summary: 'Ralph loop started for task',
        details: {
          objective: 'Fix authentication bug',
          maxIterations: 10,
        },
        project: 'test-project',
      };

      const message = formatEvent(event);

      expect(message).toMatchObject({
        title: 'Ralph Loop Started',
        body: 'Ralph loop started for task',
        severity: 'info',
        project: 'test-project',
        timestamp: '2026-01-01T00:00:00Z',
      });

      expect(message.fields).toEqual([
        { label: 'Objective', value: 'Fix authentication bug', inline: false },
        { label: 'Max Iterations', value: '10', inline: true },
        { label: 'Loop ID', value: 'loop-123', inline: true },
      ]);
    });

    it('formats unknown topic with generic formatter', () => {
      const event = {
        topic: 'custom.event',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'custom-source',
        severity: 'info',
        summary: 'Custom event occurred',
        details: {
          foo: 'bar',
          count: 42,
        },
        project: 'test-project',
      };

      const message = formatEvent(event);

      expect(message).toMatchObject({
        title: 'custom.event',
        body: 'Custom event occurred',
        severity: 'info',
        project: 'test-project',
        timestamp: '2026-01-01T00:00:00Z',
      });

      expect(message.fields).toEqual([
        { label: 'foo', value: 'bar', inline: true },
        { label: 'count', value: '42', inline: true },
      ]);
    });

    it('formats ralph.started event', () => {
      const event = {
        topic: 'ralph.started',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        loopId: 'loop-123',
        severity: 'info',
        summary: 'Started',
        details: {
          objective: 'Build feature',
          maxIterations: 5,
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Ralph Loop Started');
      expect(message.severity).toBe('info');
      expect(message.fields).toHaveLength(3);
    });

    it('formats ralph.iteration event with high progress as info', () => {
      const event = {
        topic: 'ralph.iteration',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        loopId: 'loop-123',
        severity: 'info',
        summary: 'Iteration 4',
        details: {
          iteration: 4,
          maxIterations: 5,
          progress: 85,
          status: 'in_progress',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Iteration 4/5');
      expect(message.severity).toBe('info');
      expect(message.threadId).toBe('loop-123');
      expect(message.fields).toContainEqual({
        label: 'Progress',
        value: '85%',
        inline: true,
      });
    });

    it('formats ralph.iteration event with low progress as warning', () => {
      const event = {
        topic: 'ralph.iteration',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        loopId: 'loop-123',
        severity: 'info',
        summary: 'Iteration 2',
        details: {
          iteration: 2,
          maxIterations: 10,
          progress: 30,
          status: 'in_progress',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.severity).toBe('warning');
    });

    it('formats gate.pending event with actions', () => {
      const event = {
        topic: 'gate.pending',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'gate',
        gateId: 'gate-456',
        severity: 'warning',
        summary: 'Gate requires approval',
        details: {
          gateName: 'GATE-E2C',
          qualityScore: 85,
          artifactCount: 5,
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('HITL Gate: Approval Required');
      expect(message.severity).toBe('warning');
      expect(message.actions).toHaveLength(2);
      expect(message.actions[0]).toMatchObject({
        id: 'approve_gate-456',
        label: 'Approve',
        style: ButtonStyle.PRIMARY,
        command: 'approve gate-456',
      });
      expect(message.actions[1]).toMatchObject({
        id: 'reject_gate-456',
        label: 'Reject',
        style: ButtonStyle.DANGER,
        command: 'reject gate-456',
      });
    });

    it('formats security.critical event', () => {
      const event = {
        topic: 'security.critical',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'security-auditor',
        severity: 'critical',
        summary: 'SQL injection vulnerability found',
        details: {
          finding: 'Unvalidated user input in query',
          file: 'src/auth/login.ts',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Security Alert: Critical Finding');
      expect(message.severity).toBe('critical');
      expect(message.fields).toContainEqual({
        label: 'Finding',
        value: 'Unvalidated user input in query',
        inline: false,
      });
      expect(message.fields).toContainEqual({
        label: 'File',
        value: 'src/auth/login.ts',
        inline: true,
      });
    });

    it('formats ralph.completed event', () => {
      const event = {
        topic: 'ralph.completed',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        loopId: 'loop-123',
        severity: 'info',
        summary: 'Loop completed successfully',
        details: {
          iterations: 7,
          success: true,
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Ralph Loop Completed');
      expect(message.severity).toBe('info');
      expect(message.threadId).toBe('loop-123');
      expect(message.fields).toContainEqual({
        label: 'Result',
        value: 'Success',
        inline: true,
      });
    });

    it('formats ralph.failed event with error code block', () => {
      const event = {
        topic: 'ralph.failed',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ralph',
        loopId: 'loop-123',
        severity: 'critical',
        summary: 'Loop failed',
        details: {
          reason: 'Max iterations exceeded',
          iterations: 10,
          lastError: 'TypeError: Cannot read property "x" of undefined',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Ralph Loop Failed');
      expect(message.severity).toBe('critical');
      expect(message.codeBlock).toBe('TypeError: Cannot read property "x" of undefined');
    });

    it('formats gate.approved event', () => {
      const event = {
        topic: 'gate.approved',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'gate',
        gateId: 'gate-456',
        severity: 'info',
        summary: 'Gate approved',
        details: {
          approvedBy: 'user-123',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('Gate Approved');
      expect(message.severity).toBe('info');
      expect(message.fields).toContainEqual({
        label: 'Approved By',
        value: 'user-123',
        inline: true,
      });
    });

    it('formats health.degraded event', () => {
      const event = {
        topic: 'health.degraded',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'health-monitor',
        severity: 'warning',
        summary: 'System health degraded',
        details: {
          component: 'database',
          status: 'degraded',
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('System Health Degraded');
      expect(message.severity).toBe('warning');
      expect(message.fields).toContainEqual({
        label: 'Component',
        value: 'database',
        inline: true,
      });
    });

    it('formats daemon.started event', () => {
      const event = {
        topic: 'daemon.started',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'daemon',
        severity: 'info',
        summary: 'Daemon started',
        details: {
          pid: 12345,
          adapters: ['slack', 'discord'],
        },
        project: 'test',
      };

      const message = formatEvent(event);

      expect(message.title).toBe('AIWG Daemon Started');
      expect(message.fields).toContainEqual({
        label: 'PID',
        value: '12345',
        inline: true,
      });
      expect(message.fields).toContainEqual({
        label: 'Adapters',
        value: 'slack, discord',
        inline: true,
      });
    });
  });
});
