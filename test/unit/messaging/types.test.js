import { describe, it, expect } from 'vitest';
import {
  Severity,
  EventTopic,
  CommandPermission,
  COMMANDS,
  ButtonStyle,
} from '../../../tools/messaging/types.mjs';

describe('Messaging Types', () => {
  describe('Severity', () => {
    it('exports all severity levels', () => {
      expect(Severity.INFO).toBe('info');
      expect(Severity.WARNING).toBe('warning');
      expect(Severity.CRITICAL).toBe('critical');
    });

    it('has exactly 3 severity levels', () => {
      expect(Object.keys(Severity)).toHaveLength(3);
    });
  });

  describe('EventTopic', () => {
    it('exports all 22 event topics', () => {
      expect(Object.keys(EventTopic)).toHaveLength(22);
    });

    it('exports all Ralph topics', () => {
      expect(EventTopic.RALPH_STARTED).toBe('ralph.started');
      expect(EventTopic.RALPH_ITERATION).toBe('ralph.iteration');
      expect(EventTopic.RALPH_COMPLETED).toBe('ralph.completed');
      expect(EventTopic.RALPH_FAILED).toBe('ralph.failed');
      expect(EventTopic.RALPH_ABORTED).toBe('ralph.aborted');
    });

    it('exports all gate topics', () => {
      expect(EventTopic.GATE_PENDING).toBe('gate.pending');
      expect(EventTopic.GATE_APPROVED).toBe('gate.approved');
      expect(EventTopic.GATE_REJECTED).toBe('gate.rejected');
      expect(EventTopic.GATE_TIMEOUT).toBe('gate.timeout');
    });

    it('exports all security topics', () => {
      expect(EventTopic.SECURITY_CRITICAL).toBe('security.critical');
      expect(EventTopic.SECURITY_WARNING).toBe('security.warning');
      expect(EventTopic.SECURITY_SCAN_DONE).toBe('security.scan_done');
    });

    it('exports all health topics', () => {
      expect(EventTopic.HEALTH_CHECK).toBe('health.check');
      expect(EventTopic.HEALTH_DEGRADED).toBe('health.degraded');
      expect(EventTopic.HEALTH_RECOVERED).toBe('health.recovered');
    });

    it('exports all build topics', () => {
      expect(EventTopic.BUILD_FAILED).toBe('build.failed');
      expect(EventTopic.BUILD_PASSED).toBe('build.passed');
    });

    it('exports all daemon topics', () => {
      expect(EventTopic.DAEMON_STARTED).toBe('daemon.started');
      expect(EventTopic.DAEMON_STOPPING).toBe('daemon.stopping');
    });

    it('exports all chat topics', () => {
      expect(EventTopic.CHAT_MESSAGE).toBe('chat.message');
      expect(EventTopic.CHAT_RESPONSE).toBe('chat.response');
      expect(EventTopic.CHAT_ERROR).toBe('chat.error');
    });
  });

  describe('CommandPermission', () => {
    it('exports both permission levels', () => {
      expect(CommandPermission.READ).toBe('read');
      expect(CommandPermission.WRITE).toBe('write');
    });

    it('has exactly 2 permission levels', () => {
      expect(Object.keys(CommandPermission)).toHaveLength(2);
    });
  });

  describe('COMMANDS', () => {
    it('exports all 7 commands', () => {
      expect(Object.keys(COMMANDS)).toHaveLength(7);
    });

    it('defines status command', () => {
      expect(COMMANDS.status).toEqual({
        permission: 'read',
        description: 'Show project status',
      });
    });

    it('defines ralph-status command', () => {
      expect(COMMANDS['ralph-status']).toEqual({
        permission: 'read',
        description: 'Show Ralph loop status',
      });
    });

    it('defines approve command with write permission', () => {
      expect(COMMANDS.approve).toEqual({
        permission: 'write',
        description: 'Approve a pending HITL gate',
      });
    });

    it('defines reject command with write permission', () => {
      expect(COMMANDS.reject).toEqual({
        permission: 'write',
        description: 'Reject a pending HITL gate',
      });
    });

    it('defines health command', () => {
      expect(COMMANDS.health).toEqual({
        permission: 'read',
        description: 'Run health check',
      });
    });

    it('defines help command', () => {
      expect(COMMANDS.help).toEqual({
        permission: 'read',
        description: 'List available commands',
      });
    });

    it('defines ask command', () => {
      expect(COMMANDS.ask).toEqual({
        permission: 'read',
        description: 'Ask AI a question (e.g., /ask what is our test coverage?)',
      });
    });

    it('has 5 read commands and 2 write commands', () => {
      const readCommands = Object.values(COMMANDS).filter(
        cmd => cmd.permission === 'read'
      );
      const writeCommands = Object.values(COMMANDS).filter(
        cmd => cmd.permission === 'write'
      );

      expect(readCommands).toHaveLength(5);
      expect(writeCommands).toHaveLength(2);
    });

    it('all commands have required properties', () => {
      for (const cmd of Object.values(COMMANDS)) {
        expect(cmd).toHaveProperty('permission');
        expect(cmd).toHaveProperty('description');
        expect(['read', 'write']).toContain(cmd.permission);
        expect(typeof cmd.description).toBe('string');
      }
    });
  });

  describe('ButtonStyle', () => {
    it('exports all button styles', () => {
      expect(ButtonStyle.PRIMARY).toBe('primary');
      expect(ButtonStyle.DANGER).toBe('danger');
      expect(ButtonStyle.DEFAULT).toBe('default');
    });

    it('has exactly 3 button styles', () => {
      expect(Object.keys(ButtonStyle)).toHaveLength(3);
    });
  });
});
