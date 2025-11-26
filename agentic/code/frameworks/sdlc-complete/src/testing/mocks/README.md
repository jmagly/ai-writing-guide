# Testing Mocks

Mock implementations for isolated testing of SDLC components.

## MockAgentOrchestrator

Mock Claude Code multi-agent orchestration for testing without real API calls.

### Features

- Simulate agent execution without real API calls
- Controllable responses and delays
- Error injection for failure testing
- Execution history tracking
- Parallel agent simulation
- 100% test coverage
- Satisfies NFR-TEST-004: <10% mismatch with real agent behavior

### Basic Usage

```typescript
import { MockAgentOrchestrator } from './mocks/agent-orchestrator.js';

// Create orchestrator
const orchestrator = new MockAgentOrchestrator();

// Register agents with behavior
orchestrator.registerAgent('security-architect', {
  responseGenerator: (prompt: string) => {
    return `Security review: ${prompt} - APPROVED`;
  },
  delay: 100 // Optional: simulate processing time
});

// Execute single agent
const response = await orchestrator.executeAgent(
  'security-architect',
  'Review authentication flow'
);

console.log(response.output); // "Security review: Review authentication flow - APPROVED"
console.log(response.executionTime); // ~100ms
```

### Parallel Execution

```typescript
// Register multiple agents
orchestrator.registerAgent('security-architect', {
  responseGenerator: () => 'APPROVED: Security validation passed',
  delay: 50
});

orchestrator.registerAgent('test-architect', {
  responseGenerator: () => 'CONDITIONAL: Add performance tests',
  delay: 40
});

// Execute in parallel
const reviews = await orchestrator.executeParallel([
  { agentType: 'security-architect', prompt: 'Review SAD' },
  { agentType: 'test-architect', prompt: 'Review SAD' }
]);

// Process results (maintains order)
reviews.forEach(review => {
  console.log(`${review.agentType}: ${review.output}`);
});
```

### Error Injection

```typescript
// Inject one-time error
orchestrator.injectError(
  'test-agent',
  new Error('Service temporarily unavailable')
);

// Next execution will fail
try {
  await orchestrator.executeAgent('test-agent', 'Test');
} catch (error) {
  console.log('Expected failure:', error.message);
}

// Subsequent executions succeed (error cleared)
const response = await orchestrator.executeAgent('test-agent', 'Test again');
console.log('Success:', response.output);
```

### Error Rate Simulation

```typescript
// Configure agent with 50% failure rate
orchestrator.registerAgent('unreliable-agent', {
  responseGenerator: () => 'Success',
  errorRate: 0.5 // 50% chance of failure
});

// Some executions will fail randomly
const results = await Promise.allSettled([
  orchestrator.executeAgent('unreliable-agent', 'Attempt 1'),
  orchestrator.executeAgent('unreliable-agent', 'Attempt 2'),
  orchestrator.executeAgent('unreliable-agent', 'Attempt 3')
]);

console.log(`${results.filter(r => r.status === 'fulfilled').length}/3 succeeded`);
```

### Delay Control

```typescript
// Global delay (applies to all agents)
orchestrator.setGlobalDelay(50);

// Per-agent delay (in behavior config)
orchestrator.registerAgent('slow-agent', {
  responseGenerator: () => 'Done',
  delay: 100
});

// One-time delay injection
orchestrator.injectDelay('fast-agent', 200);

// Total delay = global + behavior + injection
```

### Execution History

```typescript
// Execute some agents
await orchestrator.executeAgent('agent-1', 'Task A');
await orchestrator.executeAgent('agent-2', 'Task B');

// Get execution history
const history = orchestrator.getExecutionHistory();

history.forEach(execution => {
  console.log(`[${new Date(execution.timestamp).toISOString()}] ${execution.agentType}`);
  console.log(`  Prompt: ${execution.prompt}`);
  console.log(`  Output: ${execution.response.output}`);
  console.log(`  Duration: ${execution.response.executionTime}ms`);
});
```

### State Management

```typescript
// Reset clears history and injections, but keeps registered agents
orchestrator.reset();

// Check registered agents
console.log(orchestrator.getRegisteredAgents()); // ['agent-1', 'agent-2']
console.log(orchestrator.hasAgent('agent-1')); // true

// Remove specific agent
orchestrator.unregisterAgent('agent-1');

// Clear all agents
orchestrator.clearAgents();
```

### Testing Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockAgentOrchestrator } from '@/testing/mocks';

describe('Architecture Review Workflow', () => {
  let orchestrator: MockAgentOrchestrator;

  beforeEach(() => {
    orchestrator = new MockAgentOrchestrator();

    // Setup test agents
    orchestrator.registerAgent('architecture-designer', {
      responseGenerator: () => '# Software Architecture Document\n...'
    });

    orchestrator.registerAgent('security-reviewer', {
      responseGenerator: () => 'APPROVED'
    });
  });

  it('should generate and review architecture document', async () => {
    // Generate draft
    const draft = await orchestrator.executeAgent(
      'architecture-designer',
      'Design e-commerce platform'
    );

    expect(draft.output).toContain('Software Architecture Document');

    // Review draft
    const review = await orchestrator.executeAgent(
      'security-reviewer',
      draft.output
    );

    expect(review.output).toBe('APPROVED');

    // Verify workflow
    const history = orchestrator.getExecutionHistory();
    expect(history).toHaveLength(2);
  });

  it('should handle reviewer failure gracefully', async () => {
    // Simulate reviewer failure
    orchestrator.injectError(
      'security-reviewer',
      new Error('Reviewer timeout')
    );

    const draft = await orchestrator.executeAgent(
      'architecture-designer',
      'Design platform'
    );

    // Attempt review (will fail)
    await expect(
      orchestrator.executeAgent('security-reviewer', draft.output)
    ).rejects.toThrow('Reviewer timeout');

    // Retry review (should succeed)
    const review = await orchestrator.executeAgent(
      'security-reviewer',
      draft.output
    );

    expect(review.output).toBe('APPROVED');
  });
});
```

### Real-World Scenario: SAD Review Workflow

```typescript
// Setup SDLC agents
const orchestrator = new MockAgentOrchestrator();

orchestrator.registerAgent('architecture-designer', {
  responseGenerator: (prompt: string) => {
    return `# Software Architecture Document

## System Overview
${prompt}

## Component Design
- Frontend: React SPA
- Backend: Node.js REST API
- Database: PostgreSQL
- Cache: Redis
`;
  },
  delay: 150
});

orchestrator.registerAgent('security-architect', {
  responseGenerator: () => 'APPROVED: Security validation complete',
  delay: 50
});

orchestrator.registerAgent('test-architect', {
  responseGenerator: () => 'CONDITIONAL: Add performance test strategy',
  delay: 40
});

orchestrator.registerAgent('requirements-analyst', {
  responseGenerator: () => 'APPROVED: Requirements traceability verified',
  delay: 30
});

// Execute workflow
async function executeSADReviewWorkflow() {
  // Step 1: Primary author creates draft
  console.log('Step 1: Architecture Designer creating draft...');
  const draft = await orchestrator.executeAgent(
    'architecture-designer',
    'E-commerce platform with inventory management'
  );
  console.log(`Draft complete (${draft.executionTime}ms)`);

  // Step 2: Parallel reviewers
  console.log('\nStep 2: Launching parallel reviews...');
  const reviews = await orchestrator.executeParallel([
    { agentType: 'security-architect', prompt: draft.output },
    { agentType: 'test-architect', prompt: draft.output },
    { agentType: 'requirements-analyst', prompt: draft.output }
  ]);

  console.log('Reviews complete:');
  reviews.forEach(review => {
    console.log(`  ${review.agentType}: ${review.output}`);
  });

  // Step 3: Check for approvals
  const allApproved = reviews.every(r =>
    !r.error && r.output.includes('APPROVED')
  );

  if (allApproved) {
    console.log('\n✓ SAD BASELINED');
  } else {
    console.log('\n⚠ SAD requires revisions');
  }

  // Show execution summary
  const history = orchestrator.getExecutionHistory();
  console.log(`\nTotal executions: ${history.length}`);
  const totalTime = history.reduce((sum, h) => sum + h.response.executionTime, 0);
  console.log(`Total time: ${totalTime}ms`);
}

await executeSADReviewWorkflow();
```

### API Reference

See TypeScript types in `agent-orchestrator.ts` for complete API documentation.
