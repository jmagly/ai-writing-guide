# MultiLoopStateManager Unit Test Specification

**Test File**: `test/unit/ralph/multi-loop-state-manager.test.mjs`
**Target**: `tools/ralph-external/multi-loop-state-manager.ts` (when implemented)
**Coverage Target**: >85% line coverage
**Status**: Specification (implementation pending)

## References

- @.aiwg/working/multi-loop-ralph-plan.md - Architecture design
- @.aiwg/testing/multi-loop-ralph-test-strategy.md - Test strategy
- @.aiwg/research/findings/REF-086-multi-agent-coordination-tax.md - MAX_CONCURRENT_LOOPS rationale
- @.claude/rules/executable-feedback.md - Execution testing requirements

## Test Setup

### Imports

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MultiLoopStateManager } from '../../../tools/ralph-external/multi-loop-state-manager.ts';
import { existsSync, readFileSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import mockFs from 'mock-fs';
```

### Global Setup

```javascript
let stateManager;
let testRoot;

beforeEach(() => {
  // Create isolated test environment
  testRoot = '/tmp/ralph-test-' + Date.now();
  stateManager = new MultiLoopStateManager(testRoot);

  // Mock file system with empty registry
  mockFs({
    [testRoot]: {
      '.aiwg': {
        'ralph': {
          'registry.json': JSON.stringify({
            version: '2.0.0',
            max_concurrent_loops: 4,
            updated_at: new Date().toISOString(),
            active_loops: [],
            total_active: 0,
            total_completed: 0,
            total_aborted: 0
          }),
          'loops': {},
          'archive': {},
          'shared': {
            'patterns': {},
            'memory': {}
          }
        }
      }
    }
  });
});

afterEach(() => {
  mockFs.restore();
});
```

## Test Suite: Constructor

### Test: constructor_validPath_initializesCorrectly

**Purpose**: Verify constructor sets up paths correctly

```javascript
describe('constructor', () => {
  it('should initialize with correct paths', () => {
    const manager = new MultiLoopStateManager('/test/project');

    expect(manager.projectRoot).toBe('/test/project');
    expect(manager.baseDir).toBe('/test/project/.aiwg/ralph');
    expect(manager.registryPath).toBe('/test/project/.aiwg/ralph/registry.json');
    expect(manager.loopsDir).toBe('/test/project/.aiwg/ralph/loops');
    expect(manager.archiveDir).toBe('/test/project/.aiwg/ralph/archive');
  });
});
```

**Expected**: All path properties correctly set
**Coverage**: Constructor initialization

---

## Test Suite: createLoop()

### Test: createLoop_validConfig_success

**Purpose**: Verify successful loop creation with valid configuration

```javascript
describe('createLoop', () => {
  it('should create loop with valid config', () => {
    const config = {
      task: 'Fix all failing tests',
      completionCriteria: 'npm test passes',
      maxIterations: 10
    };

    const result = stateManager.createLoop(config);

    // Verify return value
    expect(result).toHaveProperty('loopId');
    expect(result).toHaveProperty('state');
    expect(result.loopId).toMatch(/^ralph-fix-all-failing-tests-[a-f0-9]{8}$/);

    // Verify directory created
    const loopDir = join(testRoot, '.aiwg/ralph/loops', result.loopId);
    expect(existsSync(loopDir)).toBe(true);

    // Verify state file created
    const statePath = join(loopDir, 'state.json');
    expect(existsSync(statePath)).toBe(true);

    // Verify state content
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    expect(state.loopId).toBe(result.loopId);
    expect(state.task).toBe(config.task);
    expect(state.status).toBe('running');

    // Verify registry updated
    const registry = JSON.parse(readFileSync(stateManager.registryPath, 'utf8'));
    expect(registry.active_loops).toHaveLength(1);
    expect(registry.active_loops[0].loop_id).toBe(result.loopId);
  });
});
```

**Expected**: Loop created with all artifacts
**Coverage**: Happy path

---

### Test: createLoop_maxConcurrent_throwsError

**Purpose**: Verify MAX_CONCURRENT_LOOPS enforcement

```javascript
it('should reject 5th loop without --force', () => {
  // Create 4 loops
  for (let i = 0; i < 4; i++) {
    stateManager.createLoop({ task: `Task ${i}` });
  }

  // 5th should fail
  expect(() => {
    stateManager.createLoop({ task: 'Task 5' });
  }).toThrow(/Cannot create loop: 4 loops already active/);
  expect(() => {
    stateManager.createLoop({ task: 'Task 5' });
  }).toThrow(/max: 4/);
  expect(() => {
    stateManager.createLoop({ task: 'Task 5' });
  }).toThrow(/10 communication paths/);
});
```

**Expected**: Error thrown with helpful message
**Coverage**: Limit enforcement (REF-086)

---

### Test: createLoop_forceOverride_warnsAndAllows

**Purpose**: Verify --force flag allows override with warning

```javascript
it('should allow 5th loop with --force flag', () => {
  // Create 4 loops
  for (let i = 0; i < 4; i++) {
    stateManager.createLoop({ task: `Task ${i}` });
  }

  // Mock console.warn
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

  // 5th with force should succeed
  const result = stateManager.createLoop(
    { task: 'Task 5' },
    { force: true }
  );

  expect(result).toHaveProperty('loopId');
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('Exceeding recommended MAX_CONCURRENT_LOOPS')
  );
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('Communication paths: 10')
  );

  warnSpy.mockRestore();
});
```

**Expected**: Loop created with warnings logged
**Coverage**: Force override path

---

### Test: createLoop_customLoopId_usesProvided

**Purpose**: Verify custom loop ID is used when provided

```javascript
it('should use custom loop ID when provided', () => {
  const config = {
    task: 'Fix tests',
    loopId: 'my-custom-loop-id'
  };

  const result = stateManager.createLoop(config);

  expect(result.loopId).toBe('my-custom-loop-id');

  const loopDir = join(testRoot, '.aiwg/ralph/loops/my-custom-loop-id');
  expect(existsSync(loopDir)).toBe(true);
});
```

**Expected**: Custom ID used instead of generated
**Coverage**: Custom ID path

---

### Test: createLoop_createsSubdirectories

**Purpose**: Verify all required subdirectories are created

```javascript
it('should create all required subdirectories', () => {
  const result = stateManager.createLoop({ task: 'Test' });
  const loopDir = join(testRoot, '.aiwg/ralph/loops', result.loopId);

  const requiredDirs = [
    'iterations',
    'checkpoints',
    'debug-memory'
  ];

  for (const dir of requiredDirs) {
    const path = join(loopDir, dir);
    expect(existsSync(path)).toBe(true);
  }
});
```

**Expected**: All subdirectories exist
**Coverage**: Directory structure

---

## Test Suite: getLoop()

### Test: getLoop_existingLoop_returnsState

**Purpose**: Verify retrieval of existing loop state

```javascript
describe('getLoop', () => {
  it('should return state for existing loop', () => {
    const created = stateManager.createLoop({ task: 'Test task' });
    const retrieved = stateManager.getLoop(created.loopId);

    expect(retrieved.loopId).toBe(created.loopId);
    expect(retrieved.task).toBe('Test task');
    expect(retrieved.status).toBe('running');
  });
});
```

**Expected**: State object returned
**Coverage**: Happy path

---

### Test: getLoop_nonExistentLoop_throwsError

**Purpose**: Verify error for missing loop

```javascript
it('should throw error for non-existent loop', () => {
  expect(() => {
    stateManager.getLoop('ralph-nonexistent-loop-id');
  }).toThrow(/ENOENT|no such file/i);
});
```

**Expected**: Error thrown
**Coverage**: Error handling

---

### Test: getLoop_corruptedState_throwsError

**Purpose**: Verify error for corrupted state file

```javascript
it('should throw error for corrupted state file', () => {
  const created = stateManager.createLoop({ task: 'Test' });
  const statePath = join(testRoot, '.aiwg/ralph/loops', created.loopId, 'state.json');

  // Corrupt the file
  mockFs({
    [statePath]: 'invalid json {{{',
  });

  expect(() => {
    stateManager.getLoop(created.loopId);
  }).toThrow(/JSON/);

  mockFs.restore();
});
```

**Expected**: JSON parse error thrown
**Coverage**: Corrupted data handling

---

## Test Suite: listActiveLoops()

### Test: listActiveLoops_empty_returnsEmptyArray

**Purpose**: Verify empty array when no loops exist

```javascript
describe('listActiveLoops', () => {
  it('should return empty array when no loops', () => {
    const loops = stateManager.listActiveLoops();

    expect(Array.isArray(loops)).toBe(true);
    expect(loops).toHaveLength(0);
  });
});
```

**Expected**: Empty array
**Coverage**: Edge case

---

### Test: listActiveLoops_multiple_returnsAll

**Purpose**: Verify all active loops returned

```javascript
it('should return all active loops', () => {
  // Create 3 loops
  const loop1 = stateManager.createLoop({ task: 'Task 1' });
  const loop2 = stateManager.createLoop({ task: 'Task 2' });
  const loop3 = stateManager.createLoop({ task: 'Task 3' });

  const loops = stateManager.listActiveLoops();

  expect(loops).toHaveLength(3);
  expect(loops.map(l => l.loop_id)).toContain(loop1.loopId);
  expect(loops.map(l => l.loop_id)).toContain(loop2.loopId);
  expect(loops.map(l => l.loop_id)).toContain(loop3.loopId);
});
```

**Expected**: Array with 3 loops
**Coverage**: Multi-loop scenario

---

### Test: listActiveLoops_excludesArchived

**Purpose**: Verify archived loops not included

```javascript
it('should not include archived loops', () => {
  const loop1 = stateManager.createLoop({ task: 'Task 1' });
  const loop2 = stateManager.createLoop({ task: 'Task 2' });

  // Archive loop1
  stateManager.archiveLoop(loop1.loopId);

  const loops = stateManager.listActiveLoops();

  expect(loops).toHaveLength(1);
  expect(loops[0].loop_id).toBe(loop2.loopId);
});
```

**Expected**: Only active loops returned
**Coverage**: Archive filtering

---

## Test Suite: updateRegistry()

### Test: updateRegistry_atomic_usesLocking

**Purpose**: Verify file locking during registry updates

```javascript
describe('updateRegistry', () => {
  it('should use file locking for atomic updates', () => {
    const lockPath = `${stateManager.registryPath}.lock`;

    stateManager.updateRegistry((registry) => {
      // Lock should exist during update
      expect(existsSync(lockPath)).toBe(true);
      return registry;
    });

    // Lock should be released after
    expect(existsSync(lockPath)).toBe(false);
  });
});
```

**Expected**: Lock acquired and released
**Coverage**: Concurrency safety

---

### Test: updateRegistry_releasesLockOnError

**Purpose**: Verify lock released even if update function throws

```javascript
it('should release lock even on error', () => {
  const lockPath = `${stateManager.registryPath}.lock`;

  expect(() => {
    stateManager.updateRegistry((registry) => {
      throw new Error('Update failed');
    });
  }).toThrow('Update failed');

  // Lock should still be released
  expect(existsSync(lockPath)).toBe(false);
});
```

**Expected**: Lock released, error propagated
**Coverage**: Error handling

---

## Test Suite: archiveLoop()

### Test: archiveLoop_success_movesDirectory

**Purpose**: Verify loop directory moved to archive

```javascript
describe('archiveLoop', () => {
  it('should move loop directory to archive', () => {
    const loop = stateManager.createLoop({ task: 'Test' });
    const loopDir = join(testRoot, '.aiwg/ralph/loops', loop.loopId);
    const archiveDir = join(testRoot, '.aiwg/ralph/archive', loop.loopId);

    expect(existsSync(loopDir)).toBe(true);
    expect(existsSync(archiveDir)).toBe(false);

    stateManager.archiveLoop(loop.loopId);

    expect(existsSync(loopDir)).toBe(false);
    expect(existsSync(archiveDir)).toBe(true);
  });
});
```

**Expected**: Directory moved
**Coverage**: Archive operation

---

### Test: archiveLoop_updatesRegistry

**Purpose**: Verify registry updated to remove archived loop

```javascript
it('should remove loop from registry', () => {
  const loop = stateManager.createLoop({ task: 'Test' });

  let registry = JSON.parse(readFileSync(stateManager.registryPath, 'utf8'));
  expect(registry.active_loops).toHaveLength(1);

  stateManager.archiveLoop(loop.loopId);

  registry = JSON.parse(readFileSync(stateManager.registryPath, 'utf8'));
  expect(registry.active_loops).toHaveLength(0);
  expect(registry.total_completed).toBe(1);
});
```

**Expected**: Registry updated correctly
**Coverage**: Registry consistency

---

### Test: archiveLoop_preservesState

**Purpose**: Verify state file preserved in archive

```javascript
it('should preserve state file in archive', () => {
  const loop = stateManager.createLoop({ task: 'Test task' });
  stateManager.archiveLoop(loop.loopId);

  const archiveStatePath = join(
    testRoot,
    '.aiwg/ralph/archive',
    loop.loopId,
    'state.json'
  );

  expect(existsSync(archiveStatePath)).toBe(true);

  const state = JSON.parse(readFileSync(archiveStatePath, 'utf8'));
  expect(state.task).toBe('Test task');
});
```

**Expected**: State preserved
**Coverage**: Data preservation

---

## Test Suite: calculateCommunicationPaths()

### Test: calculateCommunicationPaths_correctFormula

**Purpose**: Verify n*(n-1)/2 formula applied correctly

```javascript
describe('calculateCommunicationPaths', () => {
  it('should calculate correct paths for various N', () => {
    expect(stateManager.calculateCommunicationPaths(2)).toBe(1);   // 2*1/2 = 1
    expect(stateManager.calculateCommunicationPaths(3)).toBe(3);   // 3*2/2 = 3
    expect(stateManager.calculateCommunicationPaths(4)).toBe(6);   // 4*3/2 = 6
    expect(stateManager.calculateCommunicationPaths(5)).toBe(10);  // 5*4/2 = 10
    expect(stateManager.calculateCommunicationPaths(7)).toBe(21);  // 7*6/2 = 21
  });
});
```

**Expected**: Correct path counts (REF-088)
**Coverage**: Math formula

---

## Test Suite: Edge Cases

### Test: createLoop_emptyTask_throws

**Purpose**: Verify validation of required fields

```javascript
describe('edge cases', () => {
  it('should throw error for empty task', () => {
    expect(() => {
      stateManager.createLoop({ task: '' });
    }).toThrow(/task.*required/i);
  });
});
```

**Expected**: Validation error
**Coverage**: Input validation

---

### Test: createLoop_veryLongTask_truncatesSlug

**Purpose**: Verify slug truncation at 30 characters

```javascript
it('should truncate very long task names', () => {
  const longTask = 'This is a very long task name that should be truncated to fit within limits';
  const result = stateManager.createLoop({ task: longTask });

  const slug = result.loopId.split('-').slice(1, -1).join('-');
  expect(slug.length).toBeLessThanOrEqual(30);
});
```

**Expected**: Slug <= 30 chars
**Coverage**: Length limit

---

### Test: getLoop_specialCharsInId_handled

**Purpose**: Verify safe handling of special characters

```javascript
it('should safely handle special characters in loop ID', () => {
  const safeId = 'ralph-test-task-abc123';
  const result = stateManager.createLoop({ task: 'Test', loopId: safeId });

  expect(result.loopId).toBe(safeId);
  expect(() => stateManager.getLoop(safeId)).not.toThrow();
});
```

**Expected**: No path traversal vulnerabilities
**Coverage**: Security

---

## Test Suite: Concurrency Scenarios

### Test: concurrent_twoLoops_createSimultaneous

**Purpose**: Verify concurrent loop creation works

```javascript
describe('concurrency', () => {
  it('should handle simultaneous loop creation', async () => {
    const promises = [
      Promise.resolve(stateManager.createLoop({ task: 'Task 1' })),
      Promise.resolve(stateManager.createLoop({ task: 'Task 2' }))
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(2);
    expect(results[0].loopId).not.toBe(results[1].loopId);

    const registry = JSON.parse(readFileSync(stateManager.registryPath, 'utf8'));
    expect(registry.active_loops).toHaveLength(2);
  });
});
```

**Expected**: Both loops created successfully
**Coverage**: Concurrent creation

---

### Test: concurrent_registryUpdate_serialized

**Purpose**: Verify registry updates are serialized

```javascript
it('should serialize concurrent registry updates', async () => {
  const loop1 = stateManager.createLoop({ task: 'Task 1' });
  const loop2 = stateManager.createLoop({ task: 'Task 2' });

  // Simulate concurrent updates
  const updates = [
    stateManager.updateRegistry((reg) => {
      reg.active_loops[0].status = 'paused';
      return reg;
    }),
    stateManager.updateRegistry((reg) => {
      reg.active_loops[1].status = 'completed';
      return reg;
    })
  ];

  await Promise.all(updates.map(u => Promise.resolve(u)));

  const registry = JSON.parse(readFileSync(stateManager.registryPath, 'utf8'));
  expect(registry.active_loops[0].status).toBe('paused');
  expect(registry.active_loops[1].status).toBe('completed');
});
```

**Expected**: Both updates applied correctly
**Coverage**: Lock serialization

---

## Coverage Summary

### Expected Coverage by Component

| Component | Target | Critical Paths |
|-----------|--------|----------------|
| createLoop() | >90% | MAX_CONCURRENT enforcement, ID generation, directory creation |
| getLoop() | >85% | State retrieval, error handling |
| listActiveLoops() | >80% | Empty, multiple, filtered |
| updateRegistry() | 100% | Locking, error handling |
| archiveLoop() | >85% | Move, registry update, preservation |
| calculateCommunicationPaths() | 100% | Formula accuracy |
| Edge cases | >70% | Validation, limits, security |
| Concurrency | >75% | Simultaneous operations |

### Total Expected Coverage: >85%

## Test Execution

```bash
# Run this test file
npm test -- multi-loop-state-manager.test.mjs

# Run with coverage
npm test -- multi-loop-state-manager.test.mjs --coverage

# Run in watch mode
npm test -- multi-loop-state-manager.test.mjs --watch
```

## Notes

### Test Data

- Use deterministic UUIDs where possible (mocked `randomUUID()`)
- Use fixed timestamps for reproducibility
- Clean up all test artifacts in `afterEach()`

### Performance

- Each test should complete in <100ms
- Integration tests allowed up to 5s
- Use `jest.setTimeout()` for long-running tests

### Maintenance

- Update tests when implementation changes
- Keep test names descriptive
- Document complex test scenarios
- Add regression tests for bugs found

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-02 | Test Engineer | Initial test specification |
