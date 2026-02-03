---
name: cross-task-learner
description: Enable Ralph loops to learn from similar past tasks and share patterns across loops
version: 2.0.0
capabilities:
  - semantic_task_matching
  - pattern_extraction
  - pattern_injection
  - cross_loop_learning
---

# Cross-Task Learner Skill

Enable Ralph loops to learn from similar past tasks and share discovered patterns across multiple concurrent or sequential loops.

**Research Foundation**: REF-013 MetaGPT - 159% improvement with shared state

**Version 2.0**: Multi-loop awareness with loop_id tracking

---

## Overview

This skill provides two core capabilities:

1. **Pattern Extraction** - On loop completion, extract reusable patterns from execution history
2. **Pattern Injection** - On loop start, inject relevant patterns from previous loops

### Benefits

| Benefit | Impact |
|---------|--------|
| Faster resolution | Patterns eliminate redundant debugging |
| Higher success rates | Proven approaches applied automatically |
| Accumulated wisdom | System gets smarter over time |
| Anti-pattern detection | Failed approaches flagged and avoided |

### Research Basis

From REF-013 MetaGPT:
- **159% improvement** with shared state across agents
- **Publish-subscribe pattern** enables knowledge sharing
- **Structured outputs** become inputs for other agents
- **Memory persistence** critical for cross-session learning

---

## Pattern Extraction (On Loop Completion)

### Trigger

- Ralph loop completion (success, partial, or failure)
- Manual extraction request via `aiwg ralph-extract-patterns {loop_id}`

### Process

```yaml
extraction_steps:
  1_analyze_loop_history:
    - Load loop state from .aiwg/ralph/loops/{loop_id}/state.json
    - Load iteration analytics
    - Load debug memory
    - Load reflection history

  2_identify_error_fix_pairs:
    - Scan iterations for test failures
    - Identify fixes that resolved errors
    - Extract error signature + fix approach
    - Compute initial success rate (1.0 for first occurrence)

  3_identify_successful_approaches:
    - Analyze task category (testing, debugging, refactoring, etc.)
    - Extract step sequence that led to success
    - Note tools used and iteration count
    - Identify preconditions and benefits

  4_identify_failure_patterns:
    - Detect repeated same errors (anti-patterns)
    - Note approaches that led to scope creep
    - Flag patterns that caused quality degradation
    - Record better alternatives if discovered

  5_extract_code_templates:
    - Identify successful code changes
    - Generalize with placeholders
    - Document use case and placeholders
    - Tag by language and purpose

  6_check_for_duplicates:
    - Compare against existing patterns in registry
    - Merge if >80% similar
    - Update usage count and success rate if duplicate

  7_store_in_registry:
    - Add to .aiwg/ralph/shared/patterns/{type}-patterns.json
    - Update patterns index for semantic search
    - Link to source loop_id

  8_update_effectiveness_metrics:
    - Increment pattern counts
    - Update cross-loop benefit statistics
    - Log extraction event
```

### Example Extraction

**Input** (from loop `ralph-fix-auth-a1b2c3d4`):
```yaml
iteration_2:
  error:
    type: "TypeError"
    message: "Cannot read property 'email' of null"
    location: "src/auth/validate.ts:42"

iteration_3:
  fix_applied:
    description: "Added null check for user object"
    diff: |
      + if (user == null) {
      +   throw new ValidationError("User is required");
      + }
  test_results:
    passed: 12
    failed: 0
```

**Output** (extracted pattern):
```yaml
pattern_id: "pat-error-null-check-015"
type: "error_pattern"
error_signature:
  error_type: "TypeError"
  error_pattern: "Cannot read property '.*' of null"
  error_location_hints:
    - "*.ts:validate*"
fix_approach:
  description: "Add null check before property access"
  fix_category: "add_null_check"
  code_template: |
    if ({{variable}} == null) {
      throw new ValidationError("{{message}}");
    }
  code_template_language: "typescript"
source_loops:
  - loop_id: "ralph-fix-auth-a1b2c3d4"
    timestamp: "2026-02-02T15:00:00Z"
    contributed_by: "software-implementer"
success_rate: 1.0
usage_count: 1
first_discovered: "2026-02-02T15:00:00Z"
last_used: "2026-02-02T15:00:00Z"
tags:
  - "typescript"
  - "null-safety"
  - "validation"
```

### Configuration

```yaml
# In aiwg.yml or .aiwg/config.yml
ralph:
  cross_loop_learning:
    extraction:
      enabled: true
      auto_extract_on_completion: true
      min_success_rate_threshold: 0.6
      min_usage_count_for_evaluation: 3
      extract_code_templates: true
      merge_similar_patterns: true
      similarity_threshold: 0.80
```

---

## Pattern Injection (On Loop Start)

### Trigger

- Ralph loop start
- Manual injection request via `aiwg ralph-inject-patterns {loop_id}`

### Process

```yaml
injection_steps:
  1_analyze_task_description:
    - Extract task text
    - Identify task category (testing, debugging, refactoring, etc.)
    - Generate task embedding for semantic matching

  2_search_error_patterns:
    - Query error patterns by task category
    - Match error signatures to likely error types
    - Filter by min success rate (default 0.6)
    - Sort by effectiveness

  3_search_success_patterns:
    - Query success patterns by task category match
    - Use semantic similarity on task description
    - Filter by min success rate
    - Sort by average iterations (lower is better)

  4_search_anti_patterns:
    - Query anti-patterns by task category
    - Identify failure modes to avoid
    - Include better alternatives

  5_search_code_templates:
    - Query templates by language and task type
    - Filter by success rate
    - Sort by usage count

  6_filter_and_rank:
    - Combine all pattern types
    - Remove duplicates
    - Rank by relevance × effectiveness
    - Take top-k (default k=5)

  7_inject_into_context:
    - Format patterns for display
    - Add to loop context as "Cross-Loop Learning Context"
    - Track which patterns were injected (for effectiveness measurement)

  8_track_usage:
    - Log pattern injection event
    - Record loop_id and injected pattern_ids
    - Enable later effectiveness analysis
```

### Example Injection

**Input** (loop `ralph-fix-validation-b2c3d4e5` starting):
```yaml
task: "Fix TypeScript type errors in user validation"
category: "debugging"
```

**Patterns Retrieved**:
```yaml
retrieved_patterns:
  error_patterns:
    - pattern_id: "pat-error-null-check-015"
      relevance: 0.95
      success_rate: 1.0
      usage_count: 1

    - pattern_id: "pat-error-type-mismatch-003"
      relevance: 0.88
      success_rate: 0.94
      usage_count: 18

  success_patterns:
    - pattern_id: "pat-success-type-fixing-002"
      relevance: 0.92
      success_rate: 0.87
      average_iterations: 2.8

  anti_patterns:
    - pattern_id: "pat-anti-premature-optimization-001"
      relevance: 0.65
      failure_rate: 0.85
```

**Injected Context** (top 5 patterns):
```markdown
## Cross-Loop Learning Context

Patterns from previous loops that may help with this task:

### Error Patterns

1. **TypeError: null property access** (100% success, 1 use)
   - Error: "Cannot read property '.*' of null"
   - Fix: Add null check before property access
   - Template:
     ```typescript
     if ({{variable}} == null) {
       throw new ValidationError("{{message}}");
     }
     ```
   - Source: ralph-fix-auth-a1b2c3d4

2. **TypeError: type mismatch** (94% success, 18 uses)
   - Error: "Type 'X' is not assignable to type 'Y'"
   - Fix: Update interface definition or add type assertion
   - Source: 18 previous loops

### Success Patterns

1. **Type error fixing approach** (87% success, avg 2.8 iterations)
   - Steps:
     1. Run tsc --noEmit to see all errors
     2. Group errors by file/type
     3. Fix interface definitions first
     4. Fix usages second
     5. Verify with tsc again
   - Source: 12 successful loops

### Anti-Patterns to Avoid

1. **Premature optimization** (85% failure rate)
   - Don't optimize before tests pass
   - Complete primary task first
   - Better alternative: pat-success-refactor-module-002
```

### Configuration

```yaml
ralph:
  cross_loop_learning:
    injection:
      enabled: true
      top_k_patterns: 5
      min_success_rate: 0.6
      max_patterns_injected: 10
      include_error_patterns: true
      include_success_patterns: true
      include_anti_patterns: true
      include_code_templates: true
```

---

## Multi-Loop Awareness (Version 2.0)

### Loop ID Tracking

All patterns now track their source loop IDs:

```yaml
pattern:
  pattern_id: "pat-error-null-check-015"
  source_loops:
    - loop_id: "ralph-fix-auth-a1b2c3d4"
      timestamp: "2026-02-02T15:00:00Z"
      contributed_by: "software-implementer"
    - loop_id: "ralph-fix-validation-b2c3d4e5"
      timestamp: "2026-02-02T16:30:00Z"
      contributed_by: "debugger"
```

### Aggregation Across Loops

Patterns aggregate learnings from multiple loops:

**Example**: Pattern seen in 3 loops
```yaml
pattern_id: "pat-error-type-mismatch-003"
source_loops: [ralph-a, ralph-b, ralph-c]
usage_count: 18  # Total across all loops
success_rate: 0.94  # Aggregated success rate (17/18)

effectiveness_trend:
  - timestamp: "2026-02-01T10:00:00Z"
    success_rate_snapshot: 1.0
    sample_size: 1
    source_loop: "ralph-a"
  - timestamp: "2026-02-01T14:00:00Z"
    success_rate_snapshot: 0.90
    sample_size: 10
    source_loops: ["ralph-a", "ralph-b"]
  - timestamp: "2026-02-02T15:00:00Z"
    success_rate_snapshot: 0.94
    sample_size: 18
    source_loops: ["ralph-a", "ralph-b", "ralph-c"]
```

### Cross-Loop Pattern Updates

When a loop uses a pattern, it updates the shared registry:

```yaml
on_pattern_application:
  1_increment_usage_count:
    - pattern.usage_count += 1

  2_update_success_rate:
    - If application succeeded:
        pattern.successful_applications += 1
    - Else:
        pattern.failed_applications += 1
    - pattern.success_rate = successful / (successful + failed)

  3_update_effectiveness_trend:
    - Add new snapshot with current success rate and sample size

  4_add_source_loop:
    - If loop_id not in source_loops:
        pattern.source_loops.append({
          loop_id: current_loop_id,
          timestamp: now,
          contributed_by: current_agent
        })

  5_update_last_used:
    - pattern.last_used = now
```

### Pattern Lineage

Patterns maintain full lineage across loops:

```
Pattern: pat-error-null-check-015

Discovered: ralph-fix-auth-a1b2c3d4 (2026-02-02T15:00:00Z)
Applied:    ralph-fix-validation-b2c3d4e5 (2026-02-02T16:30:00Z) ✓
Applied:    ralph-fix-user-c3d4e5f6 (2026-02-02T18:00:00Z) ✓
Applied:    ralph-fix-api-d4e5f6a7 (2026-02-02T19:15:00Z) ✗

Success rate: 75% (3/4)
```

---

## Effectiveness Measurement

### Metrics Tracked

All metrics now support multi-loop aggregation:

```yaml
effectiveness_metrics:
  total_patterns: 47
  patterns_by_type:
    error_patterns: 24
    success_patterns: 15
    anti_patterns: 5
    code_templates: 3

  pattern_usage_stats:
    total_applications: 156
    successful_applications: 142
    failed_applications: 14
    overall_success_rate: 0.91

  cross_loop_benefit:
    loops_with_pattern_injection: 23
    loops_without_pattern_injection: 8
    average_iterations_with: 3.2
    average_iterations_without: 5.1
    improvement_percentage: 37.3  # (5.1 - 3.2) / 5.1 * 100

  last_updated: "2026-02-02T20:00:00Z"
```

### Per-Loop Impact

Each loop tracks which patterns it used:

```yaml
loop_state:
  loop_id: "ralph-fix-validation-b2c3d4e5"
  cross_loop_learning:
    injected_patterns:
      - pattern_id: "pat-error-null-check-015"
        applied: true
        successful: true
        iteration_used: 2

      - pattern_id: "pat-error-type-mismatch-003"
        applied: true
        successful: true
        iteration_used: 4

    extracted_patterns:
      - pattern_id: "pat-error-optional-types-016"
        new: true
        success_rate: 1.0

    improvement_estimate:
      baseline_iterations: 6  # Estimated without patterns
      actual_iterations: 4
      improvement: 33.3%
```

---

## Storage Structure

```
.aiwg/ralph/
├── shared/                          # Cross-loop shared state
│   ├── patterns/
│   │   ├── error-patterns.json      # Error → fix patterns
│   │   ├── success-patterns.json    # Success approaches
│   │   ├── anti-patterns.json       # Failure patterns
│   │   └── code-templates.json      # Reusable code
│   ├── archive/                     # Pruned patterns
│   │   ├── 2026-01-patterns.json
│   │   └── 2026-02-patterns.json
│   └── effectiveness-metrics.json   # Cross-loop metrics
│
├── memory/                          # Cross-task memory
│   ├── task-index.json              # Semantic task index
│   ├── embeddings/                  # Task embeddings
│   ├── reflections/                 # Reflexion-style reflections
│   └── patterns/                    # Patterns integrated here too
│
└── loops/                           # Per-loop state
    ├── ralph-fix-auth-a1b2c3d4/
    │   ├── state.json               # Includes pattern usage
    │   └── analytics/
    │       └── analytics.json       # Pattern effectiveness
    └── ralph-fix-validation-b2c3d4e5/
        └── ...
```

---

## CLI Commands

### Extract Patterns Manually

```bash
# Extract from completed loop
aiwg ralph-extract-patterns ralph-fix-auth-a1b2c3d4

# Extract from all completed loops
aiwg ralph-extract-patterns --all

# Extract specific pattern types only
aiwg ralph-extract-patterns ralph-fix-auth-a1b2c3d4 --types error,success
```

### Inject Patterns Manually

```bash
# Inject patterns into running loop
aiwg ralph-inject-patterns ralph-current-loop-e5f6a7b8

# Inject with custom filters
aiwg ralph-inject-patterns ralph-current-loop-e5f6a7b8 \
  --min-success-rate 0.8 \
  --top-k 10
```

### List Patterns

```bash
# List all patterns
aiwg ralph-patterns list

# Filter by type
aiwg ralph-patterns list --type error

# Filter by success rate
aiwg ralph-patterns list --min-success-rate 0.8

# Filter by source loop
aiwg ralph-patterns list --from-loop ralph-fix-auth-a1b2c3d4
```

### Show Pattern Details

```bash
aiwg ralph-patterns show pat-error-null-check-015
```

**Output**:
```yaml
Pattern: pat-error-null-check-015
Type: Error Pattern
Created: 2026-02-02T15:00:00Z
Last Used: 2026-02-02T19:15:00Z

Effectiveness:
  Success Rate: 75% (3/4 applications)
  Usage Count: 4
  Average Impact: -2.0 iterations

Source Loops:
  - ralph-fix-auth-a1b2c3d4 (discovered)
  - ralph-fix-validation-b2c3d4e5 (applied successfully)
  - ralph-fix-user-c3d4e5f6 (applied successfully)
  - ralph-fix-api-d4e5f6a7 (applied, failed)

Error Signature:
  Type: TypeError
  Pattern: "Cannot read property '.*' of null"

Fix Approach:
  Category: add_null_check
  Template: |
    if ({{variable}} == null) {
      throw new ValidationError("{{message}}");
    }

Tags: typescript, null-safety, validation
```

### Prune Patterns

```bash
# Dry run
aiwg ralph-patterns prune --dry-run

# Prune low-success patterns
aiwg ralph-patterns prune --min-success-rate 0.5

# Prune old unused patterns
aiwg ralph-patterns prune --max-age-days 90
```

---

## Integration with Other Skills

### With Reflection Injection

Patterns complement reflections:
- **Reflections**: What was learned in this specific loop
- **Patterns**: Reusable knowledge across all loops

Both are injected into new loop context.

### With Auto-Test Execution

Patterns inform test execution:
- Error patterns suggest which tests to run
- Success patterns guide test-driven approaches
- Code templates provide test setup patterns

### With Ralph Loop Skill

Ralph loop skill triggers pattern extraction/injection:
- On loop start: Inject relevant patterns
- On loop completion: Extract new patterns
- On iteration: Update pattern usage tracking

---

## Best Practices

### 1. Let Patterns Stabilize

Don't prune patterns too early. Allow 5-10 uses before evaluating:

```yaml
min_usage_count_for_evaluation: 5
```

### 2. Tag Patterns Consistently

Use standardized tags:
- Language: `typescript`, `python`, `go`
- Domain: `auth`, `validation`, `testing`
- Type: `null-safety`, `async`, `error-handling`

### 3. Monitor Pattern Quality

Regularly review low-success patterns:

```bash
aiwg ralph-patterns list --min-success-rate 0.0 --max-success-rate 0.6
```

### 4. Share Patterns Across Teams

Export/import patterns for team-wide learning:

```bash
# Export team patterns
aiwg ralph-patterns export --output team-patterns.json

# Import on teammate's machine
aiwg ralph-patterns import --input team-patterns.json
```

---

## Troubleshooting

### Pattern Not Injected

**Symptom**: Loop doesn't receive relevant pattern

**Causes**:
1. Pattern below success rate threshold
2. Task description doesn't match semantically
3. Injection disabled

**Fix**:
```bash
# Check pattern
aiwg ralph-patterns show {pattern_id}

# Lower threshold
aiwg ralph "task" --min-pattern-success-rate 0.5

# Check config
grep -A10 "cross_loop_learning:" aiwg.yml
```

### Pattern Not Extracted

**Symptom**: Loop completed but no patterns added

**Causes**:
1. Auto-extraction disabled
2. Loop didn't succeed
3. Pattern duplicates existing one

**Fix**:
```bash
# Extract manually
aiwg ralph-extract-patterns {loop_id}

# Enable auto-extraction
# In aiwg.yml:
ralph:
  cross_loop_learning:
    extraction:
      auto_extract_on_completion: true
```

---

## Related

- `@agentic/code/addons/ralph/schemas/shared-patterns.yaml` - Pattern schema
- `@agentic/code/addons/ralph/schemas/cross-task-memory.yaml` - Cross-task memory
- `@agentic/code/addons/ralph/docs/cross-loop-learning.md` - Full documentation
- `.aiwg/research/paper-analysis/REF-013-aiwg-analysis.md` - MetaGPT research
- `/ralph` - Ralph loop command
- `ralph-loop` skill - Detects Ralph requests

---

## Version History

- **2.0.0**: Multi-loop awareness with loop_id tracking and cross-loop aggregation (Issue #269)
- **1.0.0**: Initial cross-task learning with semantic matching (Issues #154, #155)
