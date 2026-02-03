# Memory Layer Documentation

Comprehensive guide to the Memory layer components in External Ralph Loop, implementing cross-loop persistent knowledge accumulation and retrieval.

## Table of Contents

- [Overview](#overview)
- [Memory Architecture](#memory-architecture)
- [SemanticMemory](#semanticmemory)
- [LearningExtractor](#learningextractor)
- [MemoryPromotion](#memorypromotion)
- [MemoryRetrieval](#memoryretrieval)
- [Usage Examples](#usage-examples)
- [Data Management](#data-management)

---

## Overview

The Memory layer enables External Ralph Loop to learn from experience across multiple task executions. Rather than treating each loop as isolated, the Memory layer accumulates knowledge, identifies patterns, and retrieves relevant context to improve future performance.

### Purpose

Cross-loop persistent knowledge accumulation addresses a fundamental limitation of stateless AI systems: forgetting. Each time Ralph completes a task, valuable insights are generated—successful strategies, common pitfalls, time estimates, project conventions—but without persistence, these insights are lost.

The Memory layer captures, validates, stores, and retrieves this knowledge, creating a growing corpus of project-specific expertise that improves loop efficiency and success rates over time.

### Three Memory Tiers

The Memory layer implements a hierarchical three-tier architecture inspired by human memory systems:

| Tier | Name | Scope | Lifetime | Purpose |
|------|------|-------|----------|---------|
| **L1** | Working Memory | Current session | Claude session | Temporary context, active reasoning |
| **L2** | Episodic Memory | Single loop | Loop lifecycle | Loop-specific history, iteration tracking |
| **L3** | Semantic Memory | Cross-loop | Persistent | Generalized knowledge, proven patterns |

**L1 Working Memory** exists within the Claude session itself—the conversation context, active reasoning, and immediate task state. This tier is volatile and disappears when the session ends.

**L2 Episodic Memory** is the loop state tracked in `.aiwg/ralph-external/state.json` and iteration records. It captures the full history of a single loop execution: objectives, iterations, progress, and outcomes. L2 memory persists beyond the session but is loop-specific.

**L3 Semantic Memory** is the persistent knowledge store at `.aiwg/knowledge/ralph-learnings.json`. This tier extracts generalizable insights from L2 episodic memory and stores them permanently, enabling cross-loop learning. When a new loop starts, L3 knowledge is retrieved and injected into L1 working memory, completing the learning cycle.

### Why Cross-Loop Learning Matters

Research shows that iterative refinement systems benefit significantly from accumulated experience:

- **Reduced Iteration Count**: Knowing effective strategies reduces trial-and-error cycles
- **Faster Convergence**: Time estimates help set realistic expectations and detect anomalies early
- **Error Avoidance**: Anti-pattern knowledge prevents repeated mistakes
- **Consistency**: Convention knowledge enforces project standards automatically

Without cross-loop learning, Ralph treats task #10 the same as task #1, ignoring 9 previous learning opportunities. With the Memory layer, each completed loop contributes to a growing knowledge base that improves all future tasks.

---

## Memory Architecture

### Data Flow Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ L1: Working Memory (Claude Session)                            │
│ • Current task context                                         │
│ • Injected L3 knowledge                                        │
│ • Active reasoning                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ L2: Episodic Memory (Loop State)                               │
│ • state.json: Loop metadata, iterations, progress              │
│ • iteration-NNN.json: Detailed iteration records               │
│ • Completion status, files modified, learnings                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓ (On Loop Completion)
┌─────────────────────────────────────────────────────────────────┐
│ LearningExtractor                                               │
│ • Analyzes L2 history                                          │
│ • Extracts strategies, anti-patterns, estimates, conventions   │
│ • Returns structured learnings                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ staging.json (Validation Buffer)                               │
│ • Staged learnings awaiting validation                         │
│ • Status: pending → validated/rejected                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓ (After Validation)
┌─────────────────────────────────────────────────────────────────┐
│ L3: Semantic Memory (ralph-learnings.json)                     │
│ • Persistent knowledge store                                   │
│ • Strategies, anti-patterns, estimates, conventions            │
│ • Metadata: confidence, success rate, use count                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓ (On Next Loop Start)
┌─────────────────────────────────────────────────────────────────┐
│ MemoryRetrieval                                                 │
│ • Queries L3 for relevant knowledge                            │
│ • Ranks by relevance, recency, effectiveness                   │
│ • Formats for prompt injection into L1                         │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
.aiwg/
├── knowledge/                      # L3 Semantic Memory
│   ├── ralph-learnings.json       # Main knowledge store
│   ├── ralph-learnings.json.bak   # Automatic backup
│   └── staging.json               # Validation staging area
│
└── ralph-external/                # L2 Episodic Memory
    ├── state.json                 # Current loop state
    └── iterations/                # Detailed iteration records
        ├── iteration-001.json
        ├── iteration-002.json
        └── ...
```

### Component Integration

The Memory layer consists of four specialized components that work together in a pipeline:

1. **SemanticMemory**: Persistent storage layer with data integrity guarantees
2. **LearningExtractor**: Analysis engine that extracts insights from loop history
3. **MemoryPromotion**: Pipeline manager that validates and promotes learnings L2→L3
4. **MemoryRetrieval**: Query engine that retrieves relevant knowledge for new loops

---

## SemanticMemory

**Location**: `tools/ralph-external/lib/semantic-memory.mjs`

**Purpose**: L3 persistent knowledge store with atomic writes, checksum validation, and automatic backup/recovery.

### Storage Format

SemanticMemory stores all knowledge in a single JSON file at `.aiwg/knowledge/ralph-learnings.json`:

```json
{
  "version": "1.0.0",
  "checksum": "a1b2c3d4e5f6...",
  "lastUpdated": "2026-02-03T10:30:00Z",
  "learnings": [
    {
      "id": "learn-abc123",
      "type": "strategy",
      "taskType": "test-fix",
      "content": {
        "description": "Test-driven development approach",
        "effectiveness": 0.85,
        "iterations": 12
      },
      "confidence": 0.85,
      "sourceLoops": ["ralph-001", "ralph-003"],
      "createdAt": "2026-02-01T15:00:00Z",
      "updatedAt": "2026-02-03T10:30:00Z",
      "useCount": 5,
      "successRate": 0.85
    }
  ],
  "stats": {
    "totalLearnings": 42,
    "byType": {
      "strategy": 15,
      "antipattern": 8,
      "estimate": 12,
      "convention": 7
    },
    "byTaskType": {
      "test-fix": 18,
      "feature": 10,
      "bug-fix": 8,
      "refactor": 6
    }
  }
}
```

### Learning Types

| Type | Description | Example |
|------|-------------|---------|
| `strategy` | Proven successful approaches | "Test-driven development for test fixes" |
| `antipattern` | Known failure patterns to avoid | "Avoid: Syntax errors - check code carefully" |
| `estimate` | Time/iteration predictions | "Test fixes: avg 3 iterations, 45s each" |
| `convention` | Project-specific standards | "Tests co-located with source in test/ dir" |

### Data Integrity Features

#### SHA-256 Checksums

Every write operation calculates a SHA-256 checksum of the `learnings` array:

```javascript
calculateChecksum(learnings) {
  const content = JSON.stringify(learnings, null, 0);
  return createHash('sha256').update(content).digest('hex');
}
```

On read, the checksum is verified. Mismatch indicates corruption.

#### Automatic Backup

Before overwriting `ralph-learnings.json`, the current version is backed up to `ralph-learnings.json.bak`:

```javascript
// Create backup before write
if (existsSync(this.storePath)) {
  const backupPath = `${this.storePath}.bak`;
  const currentContent = readFileSync(this.storePath, 'utf8');
  writeFileSync(backupPath, currentContent);
}
```

#### Corruption Recovery

If the main store is corrupted (checksum mismatch), SemanticMemory attempts recovery from backup:

```javascript
if (store.checksum !== expectedChecksum) {
  const backupPath = `${this.storePath}.bak`;
  if (existsSync(backupPath)) {
    const backupStore = JSON.parse(readFileSync(backupPath, 'utf8'));
    if (backupStore.checksum === this.calculateChecksum(backupStore.learnings)) {
      console.warn('Recovered from backup due to checksum mismatch');
      this.save(backupStore);
      return backupStore;
    }
  }
  throw new Error('Knowledge store corrupted and backup recovery failed');
}
```

#### Atomic Writes

Writes use the temp-file-then-rename pattern for atomicity:

```javascript
// Write to temp file
const tempPath = `${this.storePath}.tmp`;
writeFileSync(tempPath, JSON.stringify(store, null, 2));

// Atomic rename (POSIX guarantee)
fs.renameSync(tempPath, this.storePath);
```

This ensures the store is never left in a partially-written state, even if the process crashes mid-write.

### API Reference

#### Constructor

```javascript
const memory = new SemanticMemory(knowledgeDir);
```

**Parameters**:
- `knowledgeDir` (optional): Knowledge directory path. Defaults to `.aiwg/knowledge`.

#### Methods

**`store(type, taskType, content, metadata)`**

Store a new learning.

```javascript
const learning = memory.store(
  'strategy',
  'test-fix',
  {
    description: 'Test-driven development approach',
    effectiveness: 0.85
  },
  {
    confidence: 0.85,
    sourceLoops: ['ralph-001'],
    successRate: 0.85
  }
);
// Returns: { id: 'learn-abc123', type: 'strategy', ... }
```

**`retrieve(id)`**

Retrieve learning by ID. Increments `useCount` on retrieval.

```javascript
const learning = memory.retrieve('learn-abc123');
// Returns: Learning object or null
```

**`query(pattern)`**

Query learnings with filters and sorting.

```javascript
const strategies = memory.query({
  type: 'strategy',
  taskType: 'test-fix',
  minConfidence: 0.5,
  minSuccessRate: 0.6,
  limit: 5
});
// Returns: Array of matching learnings, sorted by relevance
```

**Pattern Options**:
- `type`: Filter by learning type
- `taskType`: Filter by task type
- `minConfidence`: Minimum confidence threshold (0-1)
- `minSuccessRate`: Minimum success rate threshold (0-1)
- `limit`: Maximum results to return

**Sorting**: Results sorted by weighted relevance score:
```
score = confidence × (successRate || 0.5) × log₁₀(useCount + 1)
```

**`update(id, updates)`**

Update learning metadata. Immutable fields (`id`, `createdAt`, `sourceLoops`) are protected.

```javascript
memory.update('learn-abc123', {
  confidence: 0.9,
  successRate: 0.88
});
```

**`delete(id)`**

Delete a learning permanently.

```javascript
const deleted = memory.delete('learn-abc123');
// Returns: true if deleted, false if not found
```

**`getStats()`**

Get knowledge base statistics.

```javascript
const stats = memory.getStats();
// Returns:
// {
//   totalSize: 42,
//   lastUpdated: '2026-02-03T10:30:00Z',
//   averageConfidence: 0.72,
//   averageSuccessRate: 0.68,
//   mostUsedLearning: { id: 'learn-xyz', useCount: 15, ... },
//   byType: { strategy: 15, ... },
//   byTaskType: { 'test-fix': 18, ... }
// }
```

**`verify()`**

Verify store integrity without loading into memory.

```javascript
const result = memory.verify();
// Returns: { valid: true } or { valid: false, error: 'Checksum mismatch' }
```

**`clear()`** ⚠️ **DANGEROUS**

Clear all learnings. For testing only.

```javascript
memory.clear();
```

### Configuration Options

SemanticMemory is largely self-configuring. The only configuration point is the knowledge directory location:

```javascript
// Default location
const memory = new SemanticMemory();
// Uses: .aiwg/knowledge/

// Custom location
const memory = new SemanticMemory('/custom/path/knowledge');
// Uses: /custom/path/knowledge/ralph-learnings.json
```

---

## LearningExtractor

**Location**: `tools/ralph-external/lib/learning-extractor.mjs`

**Purpose**: Analyzes completed loop L2 episodic memory to extract structured learnings for L3 semantic memory.

### Extraction Process

When a loop completes, LearningExtractor receives the full loop history (objective, iterations, status, outcomes) and performs four extraction phases:

```
Loop History
     ↓
┌────────────────────┐
│ 1. Task Detection  │ → Classify task type from objective
└────────┬───────────┘
         ↓
┌────────────────────┐
│ 2. Strategy        │ → Identify successful patterns
│    Extraction      │   from completed iterations
└────────┬───────────┘
         ↓
┌────────────────────┐
│ 3. Anti-Pattern    │ → Categorize failure patterns
│    Identification  │   from failed iterations
└────────┬───────────┘
         ↓
┌────────────────────┐
│ 4. Estimate        │ → Calculate time/iteration stats
│    Calculation     │   from completion data
└────────┬───────────┘
         ↓
┌────────────────────┐
│ 5. Convention      │ → Detect file organization
│    Detection       │   patterns from modified files
└────────┬───────────┘
         ↓
    Learnings[]
```

### Task Type Detection

LearningExtractor uses regex patterns to classify the task from the objective string:

```javascript
this.taskPatterns = {
  'test-fix': /test|spec|jest|vitest|failing/i,
  'feature': /implement|add feature|new feature|build/i,
  'refactor': /refactor|reorganize|restructure|clean/i,
  'bug-fix': /fix|bug|error|crash|issue/i,
  'documentation': /document|readme|guide|docs/i,
  'architecture': /architecture|design|structure/i,
  'performance': /optimize|performance|speed|slow/i,
};
```

**Examples**:
- `"Fix failing authentication tests"` → `test-fix`
- `"Implement user registration feature"` → `feature`
- `"Refactor auth module for clarity"` → `refactor`
- `"Optimize database queries"` → `performance`

If no pattern matches, task type defaults to `general`.

### Strategy Extraction

Strategies are extracted from **successful iterations** (status: `completed`, `progressMade: true`).

**Process**:

1. Filter to successful iterations
2. Extract learnings text from each iteration
3. Normalize learning descriptions into categories
4. Count frequency across iterations
5. Promote to strategy if used in >50% of successful iterations

**Normalization Examples**:

| Raw Learning | Normalized Category |
|--------------|---------------------|
| "Write tests first before implementation" | "Test-driven development approach" |
| "Implemented incrementally, one function at a time" | "Incremental implementation" |
| "Made minimal changes to fix the bug" | "Minimal changes approach" |
| "Refactored after tests passed" | "Implement first, refactor after" |

**Strategy Structure**:

```javascript
{
  type: 'strategy',
  taskType: 'test-fix',
  content: {
    description: 'Test-driven development approach',
    effectiveness: 0.85,  // Fraction of successful iterations
    iterations: 12        // Times used successfully
  },
  confidence: 0.85,       // Capped at 0.9
  sourceLoops: ['ralph-001', 'ralph-003'],
  successRate: 0.85       // Same as effectiveness for strategies
}
```

### Anti-Pattern Identification

Anti-patterns are extracted from **failed iterations** (status: `failed`).

**Process**:

1. Filter to failed iterations
2. Extract error messages from analysis
3. Categorize errors into failure patterns
4. Count occurrences
5. Promote to anti-pattern if occurred ≥2 times

**Error Categorization**:

| Error Pattern | Anti-Pattern Description |
|---------------|--------------------------|
| `syntax`, `parse` | "Syntax errors - check code carefully before execution" |
| `undefined`, `null` | "Null/undefined errors - add validation checks" |
| `timeout`, `timed out` | "Timeout errors - break into smaller steps" |
| `permission`, `access denied` | "Permission errors - check file/directory permissions" |
| `cannot find module`, `module not found` | "Module not found - verify dependencies installed" |

**Anti-Pattern Structure**:

```javascript
{
  type: 'antipattern',
  taskType: 'test-fix',
  content: {
    description: 'Avoid: Syntax errors - check code carefully',
    occurrences: 3,
    impact: 'high'
  },
  confidence: 0.75,      // Capped at 0.8
  sourceLoops: [],
  successRate: 0.0       // Always 0 for anti-patterns
}
```

### Estimate Calculation

Estimates are calculated from **completed iterations**.

**Process**:

1. Filter to completed iterations
2. Calculate average iteration duration
3. Count total iterations
4. Estimate complexity from iteration count and file count
5. Calculate success rate (completed / total)

**Complexity Heuristic**:

| Condition | Complexity |
|-----------|------------|
| ≤2 iterations, ≤2 files | `low` |
| ≤5 iterations, ≤5 files | `medium` |
| >5 iterations or >5 files | `high` |

**Estimate Structure**:

```javascript
{
  type: 'estimate',
  taskType: 'test-fix',
  content: {
    avgIterationTime: 45000,    // Milliseconds
    totalIterations: 3,
    complexity: 'medium',
    successRate: 0.85           // completed / total
  },
  confidence: 0.6,              // Min(completed/5, 0.9)
  sourceLoops: ['ralph-001'],
  successRate: 0.85
}
```

Confidence increases with more data points, capping at 0.9 for 5+ completed iterations.

### Convention Detection

Conventions are extracted from **file modification patterns** across all iterations.

**Process**:

1. Aggregate all modified files across iterations
2. Detect patterns (test files, module types, directories)
3. Extract examples
4. Assign confidence based on pattern strength

**Detected Patterns**:

| Pattern | Detection | Confidence |
|---------|-----------|------------|
| Test files | Files matching `.test.` or `.spec.` | 0.7 |
| ES modules | Files ending `.mjs` or `.ts` | 0.8 |
| Source organization | Directory structure patterns | 0.6 |

**Convention Structure**:

```javascript
{
  type: 'convention',
  taskType: 'general',
  content: {
    pattern: 'Tests co-located with source or in test/ directory',
    examples: [
      'src/auth/login.test.ts',
      'test/integration/api.test.mjs'
    ]
  },
  confidence: 0.7,
  sourceLoops: ['ralph-001'],
  successRate: 1.0              // Conventions always 1.0
}
```

### API Reference

#### Constructor

```javascript
const extractor = new LearningExtractor();
```

No configuration required.

#### Methods

**`extractFromLoop(loopHistory)`**

Extract all learnings from completed loop.

```javascript
const learnings = extractor.extractFromLoop({
  loopId: 'ralph-001',
  objective: 'Fix failing authentication tests',
  status: 'completed',
  currentIteration: 3,
  iterations: [
    {
      number: 1,
      status: 'completed',
      duration: 42000,
      analysis: { progressMade: true },
      learnings: ['Write tests first'],
      filesModified: ['src/auth/login.ts', 'test/auth/login.test.ts']
    },
    // ... more iterations
  ]
});
// Returns: Array of ExtractedLearning objects
```

**`detectTaskType(objective)`**

Classify task from objective string.

```javascript
const taskType = extractor.detectTaskType('Fix failing tests');
// Returns: 'test-fix'
```

---

## MemoryPromotion

**Location**: `tools/ralph-external/lib/memory-promotion.mjs`

**Purpose**: Pipeline manager that validates and promotes learnings from L2 episodic memory to L3 semantic memory.

### Promotion Pipeline

```
L2 Episodic Memory
       ↓
┌──────────────────┐
│ 1. Extract       │ → LearningExtractor.extractFromLoop()
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 2. Stage         │ → Add to staging.json with status='pending'
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 3. Validate      │ → Check fields, thresholds, type constraints
└────────┬─────────┘
         ↓
    ┌─────────┐
    │ Valid?  │
    └─┬───┬───┘
      │   │
    Yes   No
      │   │
      │   └───→ status='rejected', rejectionReason set
      ↓
┌──────────────────┐
│ 4. Promote       │ → SemanticMemory.store()
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 5. Clear Staging │ → Remove validated learnings from staging
└──────────────────┘
         ↓
L3 Semantic Memory
```

### Staging Area

Before promotion to L3, learnings are staged in `.aiwg/knowledge/staging.json`:

```json
{
  "version": "1.0.0",
  "checksum": "a1b2c3...",
  "lastUpdated": "2026-02-03T10:30:00Z",
  "staged": [
    {
      "id": "stage-1234567890-0",
      "learning": {
        "type": "strategy",
        "taskType": "test-fix",
        "content": { ... },
        "confidence": 0.85,
        "sourceLoops": ["ralph-001"],
        "successRate": 0.85
      },
      "status": "pending",
      "stagedAt": "2026-02-03T10:25:00Z"
    },
    {
      "id": "stage-1234567890-1",
      "learning": { ... },
      "status": "validated",
      "stagedAt": "2026-02-03T10:25:00Z",
      "validatedAt": "2026-02-03T10:26:00Z"
    },
    {
      "id": "stage-1234567890-2",
      "learning": { ... },
      "status": "rejected",
      "stagedAt": "2026-02-03T10:25:00Z",
      "rejectionReason": "Confidence too low (< 0.3)"
    }
  ]
}
```

**Status Values**:
- `pending`: Awaiting validation
- `validated`: Passed validation, ready for promotion
- `rejected`: Failed validation, will not be promoted

### Validation Criteria

All staged learnings must pass validation before promotion:

#### Required Fields

```javascript
if (!learning.type || !learning.taskType || !learning.content) {
  return { valid: false, reason: 'Missing required fields' };
}
```

#### Valid Type

```javascript
const validTypes = ['strategy', 'antipattern', 'estimate', 'convention'];
if (!validTypes.includes(learning.type)) {
  return { valid: false, reason: `Invalid type: ${learning.type}` };
}
```

#### Confidence Range

```javascript
if (learning.confidence < 0 || learning.confidence > 1) {
  return { valid: false, reason: 'Confidence must be between 0 and 1' };
}
```

#### Success Rate Range

```javascript
if (learning.successRate < 0 || learning.successRate > 1) {
  return { valid: false, reason: 'Success rate must be between 0 and 1' };
}
```

#### Minimum Confidence

```javascript
if (learning.confidence < 0.3) {
  return { valid: false, reason: 'Confidence too low (< 0.3)' };
}
```

#### Type-Specific Constraints

**Anti-patterns**: Must have low success rate

```javascript
if (learning.type === 'antipattern' && learning.successRate > 0.2) {
  return { valid: false, reason: 'Anti-patterns should have low success rate' };
}
```

**Strategies**: Must have reasonable success rate

```javascript
if (learning.type === 'strategy' && learning.successRate < 0.5) {
  return { valid: false, reason: 'Strategies should have success rate >= 0.5' };
}
```

### Manual vs Automatic Promotion

**Automatic Promotion** (recommended):

```javascript
const result = promotion.processPipeline(loopState, {
  autoValidate: true,   // Run validation automatically
  clearAfter: true      // Clear staging after promotion
});
// Returns:
// {
//   extracted: 5,
//   validated: 4,
//   rejected: 1,
//   promoted: 4,
//   skipped: 0
// }
```

**Manual Promotion** (for review workflows):

```javascript
// Step 1: Extract and stage
const extractResult = promotion.extract(loopState);
// { extracted: 5, staged: 5 }

// Step 2: Validate
const validateResult = promotion.validateStaged();
// { validated: 4, rejected: 1 }

// Step 3: Review staging area
const stats = promotion.getStagingStats();
// { total: 5, pending: 0, validated: 4, rejected: 1 }

// Step 4: Promote validated
const promoteResult = promotion.promote({ clearAfter: true });
// { promoted: 4, skipped: 0 }
```

### API Reference

#### Constructor

```javascript
const promotion = new MemoryPromotion(knowledgeDir);
```

**Parameters**:
- `knowledgeDir` (optional): Knowledge directory. Defaults to `.aiwg/knowledge`.

#### Methods

**`extract(loopState)`**

Extract learnings from loop and stage them.

```javascript
const result = promotion.extract(loopState);
// Returns: { extracted: 5, staged: 5 }
```

**`validate(learning)`**

Validate a single learning object.

```javascript
const validation = promotion.validate(learningObject);
// Returns: { valid: true } or { valid: false, reason: '...' }
```

**`validateStaged()`**

Validate all pending staged learnings.

```javascript
const result = promotion.validateStaged();
// Returns: { validated: 4, rejected: 1 }
```

**`promote(options)`**

Promote validated learnings to L3.

```javascript
const result = promotion.promote({
  autoValidate: true,   // Validate before promoting
  clearAfter: true      // Clear staging after promotion
});
// Returns: { promoted: 4, skipped: 0 }
```

**`processPipeline(loopState, options)`**

Run entire pipeline: extract → validate → promote.

```javascript
const result = promotion.processPipeline(loopState, {
  autoValidate: true,
  clearAfter: true
});
// Returns:
// {
//   extracted: 5,
//   validated: 4,
//   rejected: 1,
//   promoted: 4,
//   skipped: 0
// }
```

**`getStagingStats()`**

Get staging area statistics.

```javascript
const stats = promotion.getStagingStats();
// Returns:
// {
//   total: 5,
//   pending: 0,
//   validated: 4,
//   rejected: 1
// }
```

**`clearStaging()`**

Clear entire staging area.

```javascript
promotion.clearStaging();
```

---

## MemoryRetrieval

**Location**: `tools/ralph-external/lib/memory-retrieval.mjs`

**Purpose**: Query L3 semantic memory for relevant knowledge and format for prompt injection into L1 working memory.

### Retrieval Process

When a new loop starts, MemoryRetrieval queries L3 for learnings relevant to the current task:

```
New Loop Start
     ↓
RetrievalContext:
  • objective
  • taskType
  • filePatterns
  • errorPatterns
     ↓
┌───────────────────┐
│ 1. Detect Task    │ → Classify task from objective
│    Type           │
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 2. Query L3       │ → SemanticMemory.query() for each type
│    • Strategies   │   with filters
│    • Anti-patterns│
│    • Estimates    │
│    • Conventions  │
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 3. Rank Results   │ → Score by relevance, recency, success rate
└────────┬──────────┘
         ↓
┌───────────────────┐
│ 4. Format Summary │ → Generate markdown for prompt injection
└────────┬──────────┘
         ↓
    L1 Prompt
```

### Query Types

**By Task Type** (most common):

```javascript
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Fix failing authentication tests',
  taskType: 'test-fix'
});
```

**By Error Patterns** (for debugging):

```javascript
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Debug module import error',
  errorPatterns: ['cannot find module', 'import failed']
});
// Anti-patterns matching error patterns boosted in ranking
```

**By File Patterns** (for conventions):

```javascript
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Add new feature',
  filePatterns: ['.test.ts', 'src/']
});
// Conventions matching file patterns highlighted
```

### Relevance Scoring

Results are ranked by a weighted relevance score:

```javascript
relevance = (confidence × 0.4) +
            (taskTypeMatch × 0.3) +
            (successRate × 0.2) +
            (recencyBonus × 0.1)
```

**Components**:

- **Confidence (40%)**: Learning's intrinsic confidence score
- **Task Type Match (30%)**: +0.3 if learning.taskType matches context.taskType
- **Success Rate (20%)**: Learning's historical success rate
- **Recency Bonus (10%)**: `max(0, (90 - ageDays) / 90) × 0.1` (favors recent learnings)

**Example Calculation**:

```
Learning A:
  confidence: 0.8
  taskType: 'test-fix' (matches) → +0.3
  successRate: 0.75
  age: 10 days → recencyBonus = (90-10)/90 × 0.1 = 0.089

relevance = (0.8 × 0.4) + 0.3 + (0.75 × 0.2) + 0.089
          = 0.32 + 0.3 + 0.15 + 0.089
          = 0.859

Learning B:
  confidence: 0.9
  taskType: 'feature' (no match) → +0.0
  successRate: 0.85
  age: 60 days → recencyBonus = (90-60)/90 × 0.1 = 0.033

relevance = (0.9 × 0.4) + 0.0 + (0.85 × 0.2) + 0.033
          = 0.36 + 0.0 + 0.17 + 0.033
          = 0.563

Result: Learning A ranked higher despite lower confidence
```

### Result Formatting

Retrieved knowledge is formatted as markdown for prompt injection:

```markdown
## Knowledge Base (from previous loops)

## Proven Strategies

- Test-driven development approach (effectiveness: 85%)
- Incremental implementation (effectiveness: 78%)

## Anti-Patterns to Avoid

- Avoid: Syntax errors - check code carefully before execution
- Avoid: Module not found - verify dependencies installed

## Time/Iteration Estimates

- Similar tasks: ~3 iterations, ~45s per iteration

## Project Conventions

- Tests co-located with source or in test/ directory
  Examples: src/auth/login.test.ts, test/integration/api.test.mjs
- ES modules (.mjs) or TypeScript (.ts)
  Examples: lib/semantic-memory.mjs, src/types.ts
```

This formatted summary is injected into the loop's initial prompt, providing context from past experience.

### API Reference

#### Constructor

```javascript
const retrieval = new MemoryRetrieval(knowledgeDir);
```

**Parameters**:
- `knowledgeDir` (optional): Knowledge directory. Defaults to `.aiwg/knowledge`.

#### Methods

**`getRelevantKnowledge(context)`**

Get all relevant knowledge for context.

```javascript
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Fix failing tests',
  taskType: 'test-fix',              // Optional: auto-detected if omitted
  filePatterns: ['.test.ts'],        // Optional: for convention matching
  errorPatterns: ['module not found'], // Optional: for anti-pattern boosting
  iteration: 1                        // Optional: current iteration number
});

// Returns:
// {
//   strategies: [...],
//   antipatterns: [...],
//   estimates: [...],
//   conventions: [...],
//   summary: '## Knowledge Base...'  // Formatted markdown
// }
```

**`getAntiPatterns(context)`**

Get anti-patterns with error pattern boosting.

```javascript
const antipatterns = retrieval.getAntiPatterns({
  objective: 'Debug import error',
  errorPatterns: ['cannot find module']
});
// Returns anti-patterns matching error patterns, boosted in ranking
```

**`getFileConventions(filePatterns)`**

Get conventions relevant to file patterns.

```javascript
const conventions = retrieval.getFileConventions(['.test.ts', 'src/']);
// Returns conventions with matching examples
```

**`getEstimate(taskType, complexity)`**

Get time/iteration estimate for task.

```javascript
const estimate = retrieval.getEstimate('test-fix', 'medium');
// Returns estimate object or null
```

**`getTopLearnings(context, limit)`**

Get top N learnings ranked by relevance.

```javascript
const top = retrieval.getTopLearnings({
  objective: 'Implement feature',
  taskType: 'feature'
}, 10);
// Returns array of learnings with relevance scores
```

**`formatSummary(knowledge)`**

Format knowledge as markdown summary.

```javascript
const summary = retrieval.formatSummary({
  strategies: [...],
  antipatterns: [...],
  estimates: [...],
  conventions: [...]
});
// Returns: '## Knowledge Base...' markdown string
```

---

## Usage Examples

### Example 1: Complete Pipeline (Automatic)

Most common usage: run entire pipeline automatically on loop completion.

```javascript
import { MemoryPromotion } from './lib/memory-promotion.mjs';

// Load completed loop state
const loopState = JSON.parse(readFileSync('.aiwg/ralph-external/state.json'));

// Run pipeline
const promotion = new MemoryPromotion();
const result = promotion.processPipeline(loopState, {
  autoValidate: true,
  clearAfter: true
});

console.log(`
Extracted: ${result.extracted} learnings
Validated: ${result.validated}
Rejected:  ${result.rejected}
Promoted:  ${result.promoted} to L3
`);
```

**Output**:
```
Extracted: 5 learnings
Validated: 4
Rejected:  1
Promoted:  4 to L3
```

### Example 2: Retrieve Knowledge for New Loop

When starting a new loop, retrieve relevant knowledge:

```javascript
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';

const retrieval = new MemoryRetrieval();

// Get knowledge for current task
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Fix failing authentication tests',
  taskType: 'test-fix'
});

// Inject summary into prompt
const prompt = `
You are working on: Fix failing authentication tests

${knowledge.summary}

Begin iteration 1...
`;

console.log(prompt);
```

**Output**:
```
You are working on: Fix failing authentication tests

## Knowledge Base (from previous loops)

## Proven Strategies

- Test-driven development approach (effectiveness: 85%)
- Incremental implementation (effectiveness: 78%)

## Anti-Patterns to Avoid

- Avoid: Syntax errors - check code carefully before execution

## Time/Iteration Estimates

- Similar tasks: ~3 iterations, ~45s per iteration

Begin iteration 1...
```

### Example 3: Manual Promotion with Review

For workflows requiring human review before promotion:

```javascript
import { MemoryPromotion } from './lib/memory-promotion.mjs';

const promotion = new MemoryPromotion();

// Step 1: Extract and stage
const extractResult = promotion.extract(loopState);
console.log(`Extracted ${extractResult.extracted} learnings`);

// Step 2: Validate
const validateResult = promotion.validateStaged();
console.log(`Validated: ${validateResult.validated}, Rejected: ${validateResult.rejected}`);

// Step 3: Review staging area
const staging = promotion.loadStaging();
console.log('\nStaged Learnings:');
for (const staged of staging.staged) {
  console.log(`${staged.id}: ${staged.status}`);
  if (staged.status === 'rejected') {
    console.log(`  Reason: ${staged.rejectionReason}`);
  } else if (staged.status === 'validated') {
    console.log(`  Type: ${staged.learning.type}, Confidence: ${staged.learning.confidence}`);
  }
}

// Step 4: Human review and decision
const shouldPromote = confirm('Promote validated learnings to L3?');

if (shouldPromote) {
  const promoteResult = promotion.promote({ clearAfter: true });
  console.log(`Promoted ${promoteResult.promoted} learnings`);
} else {
  console.log('Promotion cancelled');
}
```

### Example 4: Query Specific Learning Types

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory();

// Get all high-confidence strategies for test fixes
const strategies = memory.query({
  type: 'strategy',
  taskType: 'test-fix',
  minConfidence: 0.7,
  minSuccessRate: 0.8
});

console.log('High-confidence test-fix strategies:');
for (const strategy of strategies) {
  console.log(`- ${strategy.content.description} (${strategy.confidence})`);
}

// Get recent anti-patterns
const antipatterns = memory.query({
  type: 'antipattern',
  limit: 5
});

console.log('\nRecent anti-patterns:');
for (const ap of antipatterns) {
  console.log(`- ${ap.content.description}`);
}
```

### Example 5: Error-Based Anti-Pattern Retrieval

When debugging, boost anti-patterns matching current errors:

```javascript
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';

const retrieval = new MemoryRetrieval();

// Current iteration has module import errors
const knowledge = retrieval.getRelevantKnowledge({
  objective: 'Fix module imports',
  errorPatterns: ['cannot find module', 'module not found']
});

// Anti-patterns matching error patterns are boosted
console.log('Relevant anti-patterns:');
for (const ap of knowledge.antipatterns) {
  console.log(`- ${ap.content.description}`);
}
```

**Output**:
```
Relevant anti-patterns:
- Avoid: Module not found - verify dependencies installed
- Avoid: Permission errors - check file/directory permissions
```

### Example 6: Cross-Loop Learning Demonstration

Demonstrates knowledge accumulation across multiple loops:

```javascript
import { MemoryPromotion } from './lib/memory-promotion.mjs';
import { MemoryRetrieval } from './lib/memory-retrieval.mjs';
import { SemanticMemory } from './lib/semantic-memory.mjs';

// Loop 1: Test fix task
const loop1 = {
  loopId: 'ralph-001',
  objective: 'Fix failing authentication tests',
  status: 'completed',
  currentIteration: 3,
  iterations: [/* ... */]
};

// Extract and promote learnings from Loop 1
const promotion = new MemoryPromotion();
const result1 = promotion.processPipeline(loop1);
console.log(`Loop 1: Promoted ${result1.promoted} learnings`);

// Loop 2: Another test fix task
const loop2 = {
  loopId: 'ralph-002',
  objective: 'Fix database connection tests',
  status: 'completed',
  currentIteration: 2,
  iterations: [/* ... */]
};

// Before starting Loop 2, retrieve learnings from Loop 1
const retrieval = new MemoryRetrieval();
const knowledge = retrieval.getRelevantKnowledge({
  objective: loop2.objective,
  taskType: 'test-fix'
});

console.log('\nLoop 2 starts with knowledge from Loop 1:');
console.log(knowledge.summary);

// Complete Loop 2 and promote
const result2 = promotion.processPipeline(loop2);
console.log(`\nLoop 2: Promoted ${result2.promoted} learnings`);

// Loop 3: Benefit from accumulated knowledge
const loop3 = {
  loopId: 'ralph-003',
  objective: 'Fix API endpoint tests',
  status: 'completed',
  currentIteration: 2,  // Fewer iterations due to learned strategies
  iterations: [/* ... */]
};

const knowledge3 = retrieval.getRelevantKnowledge({
  objective: loop3.objective,
  taskType: 'test-fix'
});

console.log('\nLoop 3 starts with knowledge from Loops 1 & 2:');
console.log(knowledge3.summary);

// Check knowledge base growth
const memory = new SemanticMemory();
const stats = memory.getStats();
console.log(`\nKnowledge base: ${stats.totalSize} learnings`);
console.log(`Strategies: ${stats.byType.strategy}`);
console.log(`Anti-patterns: ${stats.byType.antipattern}`);
```

---

## Data Management

### Viewing Stored Memories

**Command-line inspection**:

```bash
# View all learnings
cat .aiwg/knowledge/ralph-learnings.json | jq '.learnings'

# View summary stats
cat .aiwg/knowledge/ralph-learnings.json | jq '.stats'

# View strategies only
cat .aiwg/knowledge/ralph-learnings.json | jq '.learnings[] | select(.type == "strategy")'

# View learnings for specific task type
cat .aiwg/knowledge/ralph-learnings.json | jq '.learnings[] | select(.taskType == "test-fix")'

# Check staging area
cat .aiwg/knowledge/staging.json | jq '.staged'
```

**Programmatic access**:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory();
const stats = memory.getStats();

console.log('Knowledge Base Statistics:');
console.log(`Total learnings: ${stats.totalSize}`);
console.log(`Last updated: ${stats.lastUpdated}`);
console.log(`Average confidence: ${stats.averageConfidence.toFixed(2)}`);
console.log(`Average success rate: ${stats.averageSuccessRate.toFixed(2)}`);
console.log('\nBy Type:');
console.log(`  Strategies: ${stats.byType.strategy}`);
console.log(`  Anti-patterns: ${stats.byType.antipattern}`);
console.log(`  Estimates: ${stats.byType.estimate}`);
console.log(`  Conventions: ${stats.byType.convention}`);
console.log('\nBy Task Type:');
for (const [taskType, count] of Object.entries(stats.byTaskType)) {
  console.log(`  ${taskType}: ${count}`);
}
```

### Pruning and Cleanup

**Remove low-quality learnings**:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory();
const store = memory.load();

// Remove learnings below quality threshold
const threshold = 0.4;
const before = store.learnings.length;

store.learnings = store.learnings.filter(l =>
  l.confidence >= threshold && l.successRate >= threshold
);

const after = store.learnings.length;
memory.save(store);

console.log(`Removed ${before - after} low-quality learnings`);
```

**Remove stale learnings** (older than 90 days):

```javascript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

store.learnings = store.learnings.filter(l =>
  new Date(l.updatedAt) >= cutoffDate
);

memory.save(store);
console.log(`Removed stale learnings older than 90 days`);
```

**Remove unused learnings** (useCount = 0):

```javascript
store.learnings = store.learnings.filter(l => l.useCount > 0);

memory.save(store);
console.log('Removed learnings that were never retrieved');
```

**Clear staging area**:

```javascript
import { MemoryPromotion } from './lib/memory-promotion.mjs';

const promotion = new MemoryPromotion();
promotion.clearStaging();
console.log('Staging area cleared');
```

### Backup and Restore

**Manual backup**:

```bash
# Create timestamped backup
cp .aiwg/knowledge/ralph-learnings.json \
   .aiwg/knowledge/ralph-learnings-$(date +%Y%m%d-%H%M%S).json

# Verify backup
ls -lh .aiwg/knowledge/ralph-learnings-*.json
```

**Automated backup** (using SemanticMemory's automatic backup):

Every write operation creates `.aiwg/knowledge/ralph-learnings.json.bak` automatically. If corruption occurs, recovery is attempted from this backup.

**Restore from backup**:

```bash
# Restore from automatic backup
cp .aiwg/knowledge/ralph-learnings.json.bak \
   .aiwg/knowledge/ralph-learnings.json

# Restore from timestamped backup
cp .aiwg/knowledge/ralph-learnings-20260203-103000.json \
   .aiwg/knowledge/ralph-learnings.json
```

**Verify integrity after restore**:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

const memory = new SemanticMemory();
const verification = memory.verify();

if (verification.valid) {
  console.log('Store integrity verified');
} else {
  console.error('Integrity check failed:', verification.error);
}
```

### Merging Knowledge Stores

When working across multiple projects or machines:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';

// Load both stores
const memory1 = new SemanticMemory('/path/to/project1/.aiwg/knowledge');
const store1 = memory1.load();

const memory2 = new SemanticMemory('/path/to/project2/.aiwg/knowledge');
const store2 = memory2.load();

// Merge learnings (deduplicate by ID)
const merged = new Map();

for (const learning of store1.learnings) {
  merged.set(learning.id, learning);
}

for (const learning of store2.learnings) {
  if (!merged.has(learning.id)) {
    merged.set(learning.id, learning);
  }
}

// Create merged store
const mergedStore = {
  ...store1,
  learnings: Array.from(merged.values())
};

// Save merged store
const memoryMerged = new SemanticMemory('/path/to/merged/.aiwg/knowledge');
memoryMerged.save(mergedStore);

console.log(`Merged ${store1.learnings.length} + ${store2.learnings.length} = ${mergedStore.learnings.length} learnings`);
```

### Export and Import

**Export to JSON**:

```bash
cat .aiwg/knowledge/ralph-learnings.json > ralph-export.json
```

**Export to CSV** (for analysis):

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';
import { writeFileSync } from 'fs';

const memory = new SemanticMemory();
const store = memory.load();

// CSV header
let csv = 'id,type,taskType,confidence,successRate,useCount,createdAt\n';

// CSV rows
for (const learning of store.learnings) {
  csv += `${learning.id},${learning.type},${learning.taskType},${learning.confidence},${learning.successRate},${learning.useCount},${learning.createdAt}\n`;
}

writeFileSync('ralph-learnings.csv', csv);
console.log('Exported to ralph-learnings.csv');
```

**Import from JSON**:

```javascript
import { SemanticMemory } from './lib/semantic-memory.mjs';
import { readFileSync } from 'fs';

const memory = new SemanticMemory();
const importedStore = JSON.parse(readFileSync('ralph-export.json'));

// Validate checksum
const expectedChecksum = memory.calculateChecksum(importedStore.learnings);
if (importedStore.checksum !== expectedChecksum) {
  console.error('Import failed: Checksum mismatch');
  process.exit(1);
}

// Save imported store
memory.save(importedStore);
console.log(`Imported ${importedStore.learnings.length} learnings`);
```

---

## References

- **Implementation**: `@tools/ralph-external/lib/semantic-memory.mjs`
- **Implementation**: `@tools/ralph-external/lib/learning-extractor.mjs`
- **Implementation**: `@tools/ralph-external/lib/memory-promotion.mjs`
- **Implementation**: `@tools/ralph-external/lib/memory-retrieval.mjs`
- **Specification**: `@.aiwg/working/issue-ralph-external-completion.md` Section L3
- **Issue**: #24

---

**Document Status**: Complete
**Last Updated**: 2026-02-03
**Version**: 1.0.0
