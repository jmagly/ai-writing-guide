import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandRouter } from '../../../tools/messaging/command-router.mjs';
import { COMMANDS, CommandPermission } from '../../../tools/messaging/types.mjs';

describe('CommandRouter', () => {
  let router;
  let mockContext;

  beforeEach(() => {
    router = new CommandRouter();
    mockContext = {
      platform: 'slack',
      userId: 'user-123',
      channelId: 'channel-456',
    };
  });

  describe('registerHandler', () => {
    it('registers and dispatches successfully', async () => {
      const handler = vi.fn().mockResolvedValue({
        success: true,
        message: 'Status retrieved',
      });

      router.registerHandler('status', handler);

      const result = await router.dispatch('/status', mockContext);

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([], mockContext);
    });

    it('passes arguments to handler', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);
      router.grantPermission('user-123', CommandPermission.WRITE);

      await router.dispatch('/approve gate-123 --force', mockContext);

      expect(handler).toHaveBeenCalledWith(
        ['gate-123', '--force'],
        mockContext
      );
    });
  });

  describe('dispatch', () => {
    it('parses command and args from raw input', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);
      router.grantPermission('user-123', CommandPermission.WRITE);

      await router.dispatch('/approve gate-123', mockContext);

      expect(handler).toHaveBeenCalledWith(['gate-123'], mockContext);
    });

    it('parses command without leading slash', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('status', handler);

      await router.dispatch('status', mockContext);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns error for unknown command', async () => {
      const result = await router.dispatch('/unknown', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
      expect(result.error).toContain('unknown');
    });

    it('returns error for empty command', async () => {
      const result = await router.dispatch('', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty command');
    });

    it('returns error for command without handler', async () => {
      const result = await router.dispatch('/status', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered');
    });

    it('handles handler errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = vi.fn().mockRejectedValue(new Error('Handler crashed'));

      router.registerHandler('status', handler);

      const result = await router.dispatch('/status', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command failed');
      expect(result.error).toContain('Handler crashed');

      consoleSpy.mockRestore();
    });
  });

  describe('permissions', () => {
    it('READ commands accessible to everyone', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('status', handler);

      const result = await router.dispatch('/status', {
        ...mockContext,
        userId: 'any-user',
      });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('WRITE commands require explicit grant', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);

      const result = await router.dispatch('/approve gate-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(result.error).toContain('write');
      expect(handler).not.toHaveBeenCalled();
    });

    it('grantPermission grants write access to user', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);
      router.grantPermission('user-123', CommandPermission.WRITE);

      const result = await router.dispatch('/approve gate-123', mockContext);

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('revokePermission removes access', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);
      router.grantPermission('user-123', CommandPermission.WRITE);
      router.revokePermission('user-123', CommandPermission.WRITE);

      const result = await router.dispatch('/approve gate-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('rate limiting', () => {
    it('blocks after max requests in window', async () => {
      const router = new CommandRouter({
        rateLimitWindowMs: 1000,
        rateLimitMaxRequests: 3,
      });

      const handler = vi.fn().mockResolvedValue({ success: true });
      router.registerHandler('status', handler);

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await router.dispatch('/status', mockContext);
        results.push(result);
      }

      const successful = results.filter(r => r.success).length;
      const rateLimited = results.filter(r => r.error?.includes('Rate limit')).length;

      expect(successful).toBe(3);
      expect(rateLimited).toBe(2);
    });

    it('resets rate limit after window expires', async () => {
      const router = new CommandRouter({
        rateLimitWindowMs: 100,
        rateLimitMaxRequests: 2,
      });

      const handler = vi.fn().mockResolvedValue({ success: true });
      router.registerHandler('status', handler);

      await router.dispatch('/status', mockContext);
      await router.dispatch('/status', mockContext);

      const result3 = await router.dispatch('/status', mockContext);
      expect(result3.success).toBe(false);

      await new Promise(resolve => setTimeout(resolve, 150));

      const result4 = await router.dispatch('/status', mockContext);
      expect(result4.success).toBe(true);
    });

    it('tracks rate limits per user', async () => {
      const router = new CommandRouter({
        rateLimitWindowMs: 1000,
        rateLimitMaxRequests: 2,
      });

      const handler = vi.fn().mockResolvedValue({ success: true });
      router.registerHandler('status', handler);

      await router.dispatch('/status', { ...mockContext, userId: 'user-1' });
      await router.dispatch('/status', { ...mockContext, userId: 'user-1' });
      await router.dispatch('/status', { ...mockContext, userId: 'user-2' });

      const result1 = await router.dispatch('/status', { ...mockContext, userId: 'user-1' });
      const result2 = await router.dispatch('/status', { ...mockContext, userId: 'user-2' });

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(true);
    });
  });

  describe('getHelpText', () => {
    it('returns formatted help text', () => {
      const help = router.getHelpText();

      expect(help).toContain('Available commands:');
      expect(help).toContain('/status');
      expect(help).toContain('[READ]');
      expect(help).toContain('[WRITE]');
      expect(help).toContain('Show project status');
    });

    it('includes all commands from COMMANDS', () => {
      const help = router.getHelpText();

      for (const [name, cmd] of Object.entries(COMMANDS)) {
        expect(help).toContain(`/${name}`);
        expect(help).toContain(cmd.description);
      }
    });

    it('marks write commands with [WRITE] badge', () => {
      const help = router.getHelpText();

      expect(help).toContain('/approve [WRITE]');
      expect(help).toContain('/reject [WRITE]');
    });

    it('marks read commands with [READ] badge', () => {
      const help = router.getHelpText();

      expect(help).toContain('/status [READ]');
      expect(help).toContain('/help [READ]');
    });
  });

  describe('handlerCount', () => {
    it('returns zero initially', () => {
      expect(router.handlerCount).toBe(0);
    });

    it('increments when handlers are registered', () => {
      router.registerHandler('status', vi.fn());
      expect(router.handlerCount).toBe(1);

      router.registerHandler('approve', vi.fn());
      expect(router.handlerCount).toBe(2);
    });
  });

  describe('command parsing', () => {
    it('normalizes command to lowercase', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('status', handler);

      await router.dispatch('/STATUS', mockContext);

      expect(handler).toHaveBeenCalled();
    });

    it('handles multiple spaces between arguments', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('approve', handler);
      router.grantPermission('user-123', CommandPermission.WRITE);

      await router.dispatch('/approve    gate-123     --force', mockContext);

      expect(handler).toHaveBeenCalledWith(['gate-123', '--force'], mockContext);
    });

    it('trims leading and trailing whitespace', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });

      router.registerHandler('status', handler);

      await router.dispatch('  /status  ', mockContext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('custom permission checker', () => {
    it('uses custom permission checker when provided', async () => {
      const customChecker = vi.fn().mockReturnValue(false);
      const router = new CommandRouter({ permissionChecker: customChecker });

      const handler = vi.fn().mockResolvedValue({ success: true });
      router.registerHandler('status', handler);

      const result = await router.dispatch('/status', mockContext);

      expect(customChecker).toHaveBeenCalledWith('user-123', 'read');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });
});
