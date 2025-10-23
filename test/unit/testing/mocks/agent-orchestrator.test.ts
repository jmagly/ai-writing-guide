/**
 * Tests for MockAgentOrchestrator
 * Validates agent registration, execution, error injection, and history tracking
 * Target: 80%+ unit test coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockAgentOrchestrator,
  type MockAgentBehavior,
  type AgentRequest,
  type AgentResponse
} from '../../../../src/testing/mocks/agent-orchestrator.js';

describe('MockAgentOrchestrator', () => {

// Timing tolerance for test assertions (ms)
const TIMING_TOLERANCE = 10;
  let orchestrator: MockAgentOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAgentOrchestrator();
  });

  describe('Agent Registration', () => {
    it('should register an agent with behavior', () => {
      const behavior: MockAgentBehavior = {
        responseGenerator: (prompt: string) => `Response to: ${prompt}`
      };

      orchestrator.registerAgent('test-agent', behavior);

      expect(orchestrator.hasAgent('test-agent')).toBe(true);
      expect(orchestrator.getRegisteredAgents()).toContain('test-agent');
    });

    it('should register multiple agents', () => {
      orchestrator.registerAgent('agent-1', {
        responseGenerator: () => 'Response 1'
      });
      orchestrator.registerAgent('agent-2', {
        responseGenerator: () => 'Response 2'
      });

      const agents = orchestrator.getRegisteredAgents();
      expect(agents).toHaveLength(2);
      expect(agents).toContain('agent-1');
      expect(agents).toContain('agent-2');
    });

    it('should overwrite agent if registered twice', () => {
      orchestrator.registerAgent('agent', {
        responseGenerator: () => 'First'
      });
      orchestrator.registerAgent('agent', {
        responseGenerator: () => 'Second'
      });

      expect(orchestrator.getRegisteredAgents()).toHaveLength(1);
    });

    it('should unregister an agent', () => {
      orchestrator.registerAgent('test-agent', {
        responseGenerator: () => 'Response'
      });

      const removed = orchestrator.unregisterAgent('test-agent');

      expect(removed).toBe(true);
      expect(orchestrator.hasAgent('test-agent')).toBe(false);
    });

    it('should return false when unregistering non-existent agent', () => {
      const removed = orchestrator.unregisterAgent('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all agents', () => {
      orchestrator.registerAgent('agent-1', {
        responseGenerator: () => 'Response 1'
      });
      orchestrator.registerAgent('agent-2', {
        responseGenerator: () => 'Response 2'
      });

      orchestrator.clearAgents();

      expect(orchestrator.getRegisteredAgents()).toHaveLength(0);
    });
  });

  describe('Single Agent Execution', () => {
    beforeEach(() => {
      orchestrator.registerAgent('echo-agent', {
        responseGenerator: (prompt: string) => `Echo: ${prompt}`
      });
    });

    it('should execute registered agent', async () => {
      const response = await orchestrator.executeAgent('echo-agent', 'Hello');

      expect(response.agentType).toBe('echo-agent');
      expect(response.output).toBe('Echo: Hello');
      expect(response.executionTime).toBeGreaterThanOrEqual(0);
      expect(response.error).toBeUndefined();
    });

    it('should throw error for unregistered agent', async () => {
      await expect(
        orchestrator.executeAgent('unknown-agent', 'Test')
      ).rejects.toThrow("Agent type 'unknown-agent' is not registered");
    });

    it('should pass prompt to response generator', async () => {
      orchestrator.registerAgent('prompt-tester', {
        responseGenerator: (prompt: string) => {
          // Verify prompt contains expected content
          return prompt.includes('test-data') ? 'Found' : 'Not found';
        }
      });

      const response = await orchestrator.executeAgent(
        'prompt-tester',
        'Please process test-data'
      );

      expect(response.output).toBe('Found');
    });

    it('should record execution in history', async () => {
      await orchestrator.executeAgent('echo-agent', 'Test prompt');

      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].agentType).toBe('echo-agent');
      expect(history[0].prompt).toBe('Test prompt');
      expect(history[0].response.output).toBe('Echo: Test prompt');
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should track execution time', async () => {
      orchestrator.registerAgent('delayed-agent', {
        responseGenerator: () => 'Done',
        delay: 50
      });

      const response = await orchestrator.executeAgent('delayed-agent', 'Test');

      expect(response.executionTime).toBeGreaterThanOrEqual(50 - TIMING_TOLERANCE);
    });
  });

  describe('Delay Simulation', () => {
    it('should apply behavior delay', async () => {
      orchestrator.registerAgent('slow-agent', {
        responseGenerator: () => 'Result',
        delay: 100
      });

      const start = Date.now();
      await orchestrator.executeAgent('slow-agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100 - TIMING_TOLERANCE);
    });

    it('should apply global delay', async () => {
      orchestrator.registerAgent('fast-agent', {
        responseGenerator: () => 'Result'
      });
      orchestrator.setGlobalDelay(80);

      const start = Date.now();
      await orchestrator.executeAgent('fast-agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(80 - TIMING_TOLERANCE);
    });

    it('should combine global and behavior delays', async () => {
      orchestrator.registerAgent('slow-agent', {
        responseGenerator: () => 'Result',
        delay: 50
      });
      orchestrator.setGlobalDelay(50);

      const start = Date.now();
      await orchestrator.executeAgent('slow-agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100 - TIMING_TOLERANCE);
    });

    it('should apply injected delay', async () => {
      orchestrator.registerAgent('agent', {
        responseGenerator: () => 'Result'
      });
      orchestrator.injectDelay('agent', 75);

      const start = Date.now();
      await orchestrator.executeAgent('agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(75 - TIMING_TOLERANCE);
    });

    it('should combine all delay sources', async () => {
      orchestrator.registerAgent('agent', {
        responseGenerator: () => 'Result',
        delay: 30
      });
      orchestrator.setGlobalDelay(30);
      orchestrator.injectDelay('agent', 30);

      const start = Date.now();
      await orchestrator.executeAgent('agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90 - TIMING_TOLERANCE);
    });

    it('should clear injected delay after first use', async () => {
      orchestrator.registerAgent('agent', {
        responseGenerator: () => 'Result'
      });
      orchestrator.injectDelay('agent', 100);

      // First execution should be delayed
      const start1 = Date.now();
      await orchestrator.executeAgent('agent', 'Test 1');
      const duration1 = Date.now() - start1;
      expect(duration1).toBeGreaterThanOrEqual(100 - TIMING_TOLERANCE);

      // Second execution should NOT be delayed
      const start2 = Date.now();
      await orchestrator.executeAgent('agent', 'Test 2');
      const duration2 = Date.now() - start2;
      expect(duration2).toBeLessThan(50);
    });

    it('should throw error for negative global delay', () => {
      expect(() => orchestrator.setGlobalDelay(-10)).toThrow(
        'Global delay must be non-negative'
      );
    });

    it('should throw error for negative injected delay', () => {
      expect(() => orchestrator.injectDelay('agent', -5)).toThrow(
        'Injected delay must be non-negative'
      );
    });
  });

  describe('Error Injection', () => {
    beforeEach(() => {
      orchestrator.registerAgent('test-agent', {
        responseGenerator: () => 'Success'
      });
    });

    it('should inject and throw error', async () => {
      const testError = new Error('Injected failure');
      orchestrator.injectError('test-agent', testError);

      await expect(
        orchestrator.executeAgent('test-agent', 'Test')
      ).rejects.toThrow('Injected failure');
    });

    it('should record error in execution history', async () => {
      const testError = new Error('Test error');
      orchestrator.injectError('test-agent', testError);

      try {
        await orchestrator.executeAgent('test-agent', 'Test');
      } catch {
        // Expected
      }

      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].response.error).toBeDefined();
      expect(history[0].response.error?.message).toBe('Test error');
    });

    it('should clear injected error after first use', async () => {
      orchestrator.injectError('test-agent', new Error('First error'));

      // First execution should fail
      await expect(
        orchestrator.executeAgent('test-agent', 'Test 1')
      ).rejects.toThrow('First error');

      // Second execution should succeed
      const response = await orchestrator.executeAgent('test-agent', 'Test 2');
      expect(response.output).toBe('Success');
    });

    it('should respect error rate configuration', async () => {
      orchestrator.registerAgent('unreliable-agent', {
        responseGenerator: () => 'Success',
        errorRate: 1.0 // Always fail
      });

      await expect(
        orchestrator.executeAgent('unreliable-agent', 'Test')
      ).rejects.toThrow('Simulated random failure');
    });

    it('should succeed when error rate is 0', async () => {
      orchestrator.registerAgent('reliable-agent', {
        responseGenerator: () => 'Success',
        errorRate: 0
      });

      const response = await orchestrator.executeAgent('reliable-agent', 'Test');
      expect(response.output).toBe('Success');
    });
  });

  describe('Parallel Execution', () => {
    beforeEach(() => {
      orchestrator.registerAgent('agent-1', {
        responseGenerator: (prompt: string) => `Agent 1: ${prompt}`,
        delay: 20
      });
      orchestrator.registerAgent('agent-2', {
        responseGenerator: (prompt: string) => `Agent 2: ${prompt}`,
        delay: 30
      });
      orchestrator.registerAgent('agent-3', {
        responseGenerator: (prompt: string) => `Agent 3: ${prompt}`,
        delay: 10
      });
    });

    it('should execute multiple agents in parallel', async () => {
      const requests: AgentRequest[] = [
        { agentType: 'agent-1', prompt: 'Task A' },
        { agentType: 'agent-2', prompt: 'Task B' },
        { agentType: 'agent-3', prompt: 'Task C' }
      ];

      const start = Date.now();
      const responses = await orchestrator.executeParallel(requests);
      const duration = Date.now() - start;

      // Should complete in time of slowest agent (30ms), not sum (60ms)
      expect(duration).toBeLessThan(100); // Allow overhead
      expect(responses).toHaveLength(3);
    });

    it('should maintain request order in responses', async () => {
      const requests: AgentRequest[] = [
        { agentType: 'agent-1', prompt: 'First' },
        { agentType: 'agent-2', prompt: 'Second' },
        { agentType: 'agent-3', prompt: 'Third' }
      ];

      const responses = await orchestrator.executeParallel(requests);

      expect(responses[0].agentType).toBe('agent-1');
      expect(responses[0].output).toBe('Agent 1: First');
      expect(responses[1].agentType).toBe('agent-2');
      expect(responses[1].output).toBe('Agent 2: Second');
      expect(responses[2].agentType).toBe('agent-3');
      expect(responses[2].output).toBe('Agent 3: Third');
    });

    it('should record all parallel executions in history', async () => {
      const requests: AgentRequest[] = [
        { agentType: 'agent-1', prompt: 'A' },
        { agentType: 'agent-2', prompt: 'B' }
      ];

      await orchestrator.executeParallel(requests);

      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(2);
    });

    it('should handle errors in parallel execution', async () => {
      orchestrator.injectError('agent-2', new Error('Agent 2 failed'));

      const requests: AgentRequest[] = [
        { agentType: 'agent-1', prompt: 'A' },
        { agentType: 'agent-2', prompt: 'B' },
        { agentType: 'agent-3', prompt: 'C' }
      ];

      const responses = await orchestrator.executeParallel(requests);

      expect(responses).toHaveLength(3);
      expect(responses[0].error).toBeUndefined();
      expect(responses[1].error).toBeDefined();
      expect(responses[1].error?.message).toBe('Agent 2 failed');
      expect(responses[2].error).toBeUndefined();
    });

    it('should continue execution when one agent fails', async () => {
      orchestrator.registerAgent('failing-agent', {
        responseGenerator: () => 'Never reached',
        errorRate: 1.0
      });

      const requests: AgentRequest[] = [
        { agentType: 'agent-1', prompt: 'A' },
        { agentType: 'failing-agent', prompt: 'B' },
        { agentType: 'agent-3', prompt: 'C' }
      ];

      const responses = await orchestrator.executeParallel(requests);

      expect(responses[0].output).toBe('Agent 1: A');
      expect(responses[1].error).toBeDefined();
      expect(responses[2].output).toBe('Agent 3: C');
    });
  });

  describe('Execution History', () => {
    beforeEach(() => {
      orchestrator.registerAgent('test-agent', {
        responseGenerator: (prompt: string) => `Result: ${prompt}`
      });
    });

    it('should track multiple executions', async () => {
      await orchestrator.executeAgent('test-agent', 'First');
      await orchestrator.executeAgent('test-agent', 'Second');
      await orchestrator.executeAgent('test-agent', 'Third');

      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].prompt).toBe('First');
      expect(history[1].prompt).toBe('Second');
      expect(history[2].prompt).toBe('Third');
    });

    it('should include timestamps in execution records', async () => {
      const beforeExecution = Date.now();
      await orchestrator.executeAgent('test-agent', 'Test');
      const afterExecution = Date.now();

      const history = orchestrator.getExecutionHistory();
      const timestamp = history[0].timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(beforeExecution);
      expect(timestamp).toBeLessThanOrEqual(afterExecution);
    });

    it('should return copy of history to prevent mutation', async () => {
      await orchestrator.executeAgent('test-agent', 'Test');

      const history1 = orchestrator.getExecutionHistory();
      const history2 = orchestrator.getExecutionHistory();

      expect(history1).not.toBe(history2); // Different array instances
      expect(history1).toEqual(history2); // But equal content
    });

    it('should track failed executions', async () => {
      orchestrator.injectError('test-agent', new Error('Test failure'));

      try {
        await orchestrator.executeAgent('test-agent', 'Test');
      } catch {
        // Expected
      }

      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].response.error).toBeDefined();
    });
  });

  describe('State Reset', () => {
    beforeEach(() => {
      orchestrator.registerAgent('test-agent', {
        responseGenerator: () => 'Result'
      });
    });

    it('should clear execution history', async () => {
      await orchestrator.executeAgent('test-agent', 'Test 1');
      await orchestrator.executeAgent('test-agent', 'Test 2');

      orchestrator.reset();

      expect(orchestrator.getExecutionHistory()).toHaveLength(0);
    });

    it('should clear error injections', async () => {
      orchestrator.injectError('test-agent', new Error('Test error'));

      orchestrator.reset();

      const response = await orchestrator.executeAgent('test-agent', 'Test');
      expect(response.output).toBe('Result');
    });

    it('should clear delay injections', async () => {
      orchestrator.injectDelay('test-agent', 100);

      orchestrator.reset();

      const start = Date.now();
      await orchestrator.executeAgent('test-agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should reset global delay', async () => {
      orchestrator.setGlobalDelay(100);

      orchestrator.reset();

      const start = Date.now();
      await orchestrator.executeAgent('test-agent', 'Test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should NOT clear registered agents', async () => {
      orchestrator.reset();

      expect(orchestrator.hasAgent('test-agent')).toBe(true);
      const response = await orchestrator.executeAgent('test-agent', 'Test');
      expect(response.output).toBe('Result');
    });
  });

  describe('Integration Scenarios', () => {
    it('should simulate realistic multi-agent workflow', async () => {
      // Setup: Register agents for SAD review workflow
      orchestrator.registerAgent('architecture-designer', {
        responseGenerator: (prompt: string) => {
          return `# Software Architecture Document\n\nDraft architecture for: ${prompt}`;
        },
        delay: 100
      });

      orchestrator.registerAgent('security-architect', {
        responseGenerator: () => {
          return 'APPROVED: Security review complete. No major concerns.';
        },
        delay: 50
      });

      orchestrator.registerAgent('test-architect', {
        responseGenerator: () => {
          return 'CONDITIONAL: Add performance test strategy.';
        },
        delay: 40
      });

      // Execute: Primary author creates draft
      const draft = await orchestrator.executeAgent(
        'architecture-designer',
        'E-commerce platform'
      );
      expect(draft.output).toContain('Software Architecture Document');

      // Execute: Parallel reviewers
      const reviews = await orchestrator.executeParallel([
        { agentType: 'security-architect', prompt: 'Review SAD' },
        { agentType: 'test-architect', prompt: 'Review SAD' }
      ]);

      expect(reviews).toHaveLength(2);
      expect(reviews[0].output).toContain('APPROVED');
      expect(reviews[1].output).toContain('CONDITIONAL');

      // Verify history
      const history = orchestrator.getExecutionHistory();
      expect(history).toHaveLength(3); // 1 draft + 2 reviews
    });

    it('should handle partial failures in review cycle', async () => {
      orchestrator.registerAgent('reviewer-1', {
        responseGenerator: () => 'APPROVED'
      });
      orchestrator.registerAgent('reviewer-2', {
        responseGenerator: () => 'APPROVED'
      });
      orchestrator.registerAgent('reviewer-3', {
        responseGenerator: () => 'APPROVED'
      });

      // Inject failure in one reviewer
      orchestrator.injectError(
        'reviewer-2',
        new Error('Reviewer unavailable')
      );

      const reviews = await orchestrator.executeParallel([
        { agentType: 'reviewer-1', prompt: 'Review' },
        { agentType: 'reviewer-2', prompt: 'Review' },
        { agentType: 'reviewer-3', prompt: 'Review' }
      ]);

      const successful = reviews.filter(r => !r.error);
      const failed = reviews.filter(r => r.error);

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });

    it('should support retry logic with error injection', async () => {
      orchestrator.registerAgent('retry-agent', {
        responseGenerator: () => 'Success'
      });

      // First attempt: inject error
      orchestrator.injectError('retry-agent', new Error('Temporary failure'));

      let attempt1Failed = false;
      try {
        await orchestrator.executeAgent('retry-agent', 'Attempt 1');
      } catch {
        attempt1Failed = true;
      }

      expect(attempt1Failed).toBe(true);

      // Second attempt: should succeed (error cleared)
      const response = await orchestrator.executeAgent('retry-agent', 'Attempt 2');
      expect(response.output).toBe('Success');
    });
  });
});
