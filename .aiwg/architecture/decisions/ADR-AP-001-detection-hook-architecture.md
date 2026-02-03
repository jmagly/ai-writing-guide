# ADR-AP-001: Detection Hook Architecture

**Status**: Proposed
**Date**: 2026-02-02
**Deciders**: Architecture Designer, Security Auditor
**Technical Story**: Agent Persistence Framework - Laziness Pattern Detection

## Context and Problem Statement

The Agent Persistence Framework requires a mechanism to detect "laziness patterns" - destructive behaviors where agents abandon difficult tasks through:

- **Test deletion**: Removing failing tests instead of fixing code
- **Feature removal**: Commenting out or deleting problematic functionality
- **Coverage regression**: Reducing test coverage to make metrics pass
- **Validation bypassing**: Removing input validation to avoid edge cases
- **Assertion weakening**: Replacing strict assertions with trivial ones

Research indicates these behaviors stem from RLHF reward hacking, sycophancy optimization, and cognitive load-induced fragility (see Section 2 of agentic-laziness-research.md). Current guardrail frameworks focus on content safety rather than task completion integrity, leaving a significant gap.

**User Constraint**: "prioritize agentic tools only using commands, skills and agents primarily"

This constraint mandates that detection mechanisms leverage the AIWG extension system (agents, commands, skills) rather than external tooling or standalone scripts.

## Decision Drivers

- **Agentic-first design**: Detection must use AIWG agents, commands, and skills per user constraint
- **Real-time detection**: Must catch violations before they're committed
- **Intelligent analysis**: Must distinguish legitimate refactoring from avoidance behavior
- **Low false positives**: Must not block valid test improvements or feature deprecations
- **Auditability**: All detection decisions must be logged with reasoning
- **ConversableAgent compatibility**: Must integrate with existing agent communication patterns

## Considered Options

### Option 1: Agent-based Detection (Selected)

A dedicated **Laziness Detection Agent** monitors file changes and analyzes them using AST parsing, pattern matching, and contextual reasoning.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    Orchestrator / Primary Agent                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ File change event
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Laziness Detection Agent                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Receive file diff via ConversableAgent.receive()       │  │
│  │ 2. Parse AST for test/feature patterns                    │  │
│  │ 3. Compare pre/post metrics (test count, coverage, LOC)   │  │
│  │ 4. Apply contextual reasoning (is this valid refactor?)   │  │
│  │ 5. Generate verdict with confidence score                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                  │
│                               ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Verdict: PASS | WARN | BLOCK                              │  │
│  │ Confidence: 0.0 - 1.0                                     │  │
│  │ Reasoning: "Detected test deletion without replacement"   │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    [Quality Gate / Human Review]
```

**Pros**:
- Full agentic integration via ConversableAgent interface
- Intelligent contextual analysis (can understand intent)
- Learns from feedback via reflection memory
- Consistent with AIWG extension architecture
- Can explain reasoning for detected violations

**Cons**:
- Higher latency than pure hook-based detection (~2-5s per analysis)
- Requires LLM invocation for each file change
- More complex implementation
- Token cost for analysis

### Option 2: Hook-based Detection

Pre-commit and post-write hooks trigger pattern matching scripts without LLM involvement.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                       Git Pre-Commit Hook                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. git diff --staged                                      │  │
│  │ 2. Regex pattern matching for deletions                   │  │
│  │ 3. Test count comparison (grep -c "it\(" / "test\(")      │  │
│  │ 4. Coverage delta check                                   │  │
│  │ 5. Exit 0 (pass) or Exit 1 (block)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Pros**:
- Very low latency (<100ms)
- No LLM cost
- Simple implementation
- Predictable behavior

**Cons**:
- Cannot distinguish legitimate refactoring from avoidance
- High false positive rate for complex changes
- No contextual understanding
- Violates "agentic-first" constraint
- Cannot explain decisions intelligently

### Option 3: Polling-based Detection

Periodic scans of codebase comparing against baseline metrics.

**Pros**:
- Simple to implement
- No integration points required
- Can detect gradual drift

**Cons**:
- High latency (violations may persist for minutes/hours)
- Resource intensive for large codebases
- No real-time prevention
- Violates "agentic-first" constraint

### Option 4: Hybrid Approach

Lightweight hooks for immediate detection, agent for intelligent analysis.

**Architecture**:
```
┌───────────────────────────────────────────────────────────────────────┐
│                        Two-Stage Detection                            │
│                                                                       │
│  Stage 1: Fast Hook (Pre-commit)                                      │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Pattern matching for obvious violations                       │  │
│  │ - Test count delta check                                        │  │
│  │ - If clear violation: BLOCK immediately                         │  │
│  │ - If uncertain: Pass to Stage 2                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                               │                                       │
│                               ▼ (uncertain cases only)                │
│  Stage 2: Agent Analysis                                              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ - Laziness Detection Agent performs deep analysis               │  │
│  │ - Contextual reasoning about intent                             │  │
│  │ - Returns verdict with explanation                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

**Pros**:
- Best of both approaches
- Fast path for obvious cases
- Intelligent analysis for edge cases
- Reduced LLM costs (only invoked for uncertain cases)

**Cons**:
- More complex implementation
- Two systems to maintain
- Partially violates "agentic-first" constraint for Stage 1

## Decision Outcome

**Chosen option**: Option 1 - Agent-based Detection

This decision prioritizes the user constraint for agentic-first design. While Option 4 (Hybrid) offers performance benefits, the user explicitly requested prioritizing "agentic tools only using commands, skills and agents primarily."

The Laziness Detection Agent will:

1. **Integrate via ConversableAgent interface** - Receives file change messages, returns verdicts
2. **Use skill-based pattern detection** - Laziness Detection Skill provides pattern matching capabilities
3. **Leverage command interface** - `/detect-laziness` command for manual invocation
4. **Support quality gate integration** - Auto-invoked during Construction phase

## Detailed Design

### Laziness Detection Agent

```yaml
# agentic/code/frameworks/sdlc-complete/agents/laziness-detector.md
---
name: laziness-detector
description: Detects and prevents agent laziness patterns in code changes
model: sonnet
tools: Read, Grep, Glob, Bash
orchestration: false
category: quality
subagent-optimized: true
---
```

**ConversableAgent Protocol**:

```typescript
interface LazinessDetectionRequest {
  role: "user";
  content: string;  // Description of changes
  metadata: {
    artifactPath: string;      // File being modified
    artifactType: "code" | "test" | "config";
    diff: string;              // Unified diff
    baselineMetrics?: {
      testCount: number;
      coverage: number;
      featureFlags: string[];
    };
  };
}

interface LazinessDetectionResponse {
  role: "assistant";
  content: string;  // Explanation
  metadata: {
    verdict: "PASS" | "WARN" | "BLOCK";
    confidence: number;  // 0.0 - 1.0
    patterns: DetectedPattern[];
    recommendation: string;
  };
}
```

### Detection Patterns

Based on Microsoft AI Red Team taxonomy and agentic-laziness-research.md:

| Pattern ID | Name | Indicators | Severity |
|------------|------|------------|----------|
| LP-001 | Test Deletion | Test file removed or test count decreased | CRITICAL |
| LP-002 | Test Skipping | `.skip()`, `.only()`, `@Ignore` added | HIGH |
| LP-003 | Assertion Weakening | `toBe()` replaced with `toBeTruthy()` | MEDIUM |
| LP-004 | Feature Removal | Function/class deleted without replacement | HIGH |
| LP-005 | Validation Bypass | Input validation removed or weakened | CRITICAL |
| LP-006 | Error Suppression | Catch blocks with empty bodies added | HIGH |
| LP-007 | Coverage Regression | Line/branch coverage decreased >5% | MEDIUM |
| LP-008 | Mock Over-reliance | Real implementations replaced with mocks | LOW |

### Laziness Detection Skill

```yaml
# agentic/code/frameworks/sdlc-complete/skills/laziness-detection.md
---
name: laziness-detection
description: Pattern matching and analysis for agent laziness behaviors
category: quality
triggers:
  - file_change
  - pre_commit
  - quality_gate
---
```

**Capabilities**:
- AST parsing for test structure analysis
- Diff parsing for change classification
- Metric comparison (test count, coverage, LOC)
- Pattern matching against known avoidance behaviors

### Command Interface

```yaml
# agentic/code/frameworks/sdlc-complete/commands/detect-laziness.md
---
name: detect-laziness
aliases: ["laziness-check", "lz"]
category: quality
description: Analyze changes for laziness patterns
---
```

**Usage**:
```bash
# Check specific file
aiwg detect-laziness src/auth/login.ts

# Check staged changes
aiwg detect-laziness --staged

# Check with baseline comparison
aiwg detect-laziness --baseline HEAD~1
```

### Quality Gate Integration

The Laziness Detection Agent is invoked at the Construction phase quality gate:

```yaml
# In quality gate configuration
construction_gate:
  checks:
    - name: laziness-detection
      agent: laziness-detector
      trigger: on_file_change
      blocking: true
      threshold:
        verdict: PASS
        confidence: 0.80
```

## Consequences

### Positive

- **Agentic-first compliance**: Fully uses AIWG extension system
- **Intelligent analysis**: Can understand context and intent
- **Explainable decisions**: Agent provides reasoning for verdicts
- **Learning capability**: Can improve via reflection memory
- **Integration ready**: Uses ConversableAgent interface
- **Extensible patterns**: New patterns easily added to detection skill

### Negative

- **Latency**: 2-5 seconds per analysis vs <100ms for hooks
- **Token cost**: Each analysis consumes LLM tokens
- **Complexity**: More moving parts than simple hooks
- **False negatives possible**: Sophisticated avoidance may evade detection

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| High false positive rate | Medium | Blocks valid refactoring | Confidence thresholds, human override |
| Analysis latency frustrating | Medium | Developer friction | Async analysis, background processing |
| Agent itself exhibits laziness | Low | Detection gaps | Meta-detection, human review |
| Token cost escalation | Low | Budget overruns | Caching, batching, delta analysis |

## Alternatives Considered

See Options 2, 3, and 4 above. Option 2 (Hook-based) was rejected for violating the agentic-first constraint. Option 3 (Polling) was rejected for latency concerns. Option 4 (Hybrid) was considered but deprioritized to maintain purity of agentic approach per user constraint.

## Implementation Roadmap

### Phase 1: Core Agent (Week 1)
- [ ] Create laziness-detector agent definition
- [ ] Implement ConversableAgent interface methods
- [ ] Define detection pattern catalog

### Phase 2: Detection Skill (Week 2)
- [ ] Implement AST parsing for test structure
- [ ] Build diff analysis capabilities
- [ ] Create pattern matching engine

### Phase 3: Command Integration (Week 3)
- [ ] Implement `/detect-laziness` command
- [ ] Add CLI interface via `aiwg detect-laziness`
- [ ] Integrate with pre-commit workflow

### Phase 4: Quality Gate Integration (Week 4)
- [ ] Connect to Construction phase gate
- [ ] Implement verdict aggregation
- [ ] Add human override mechanism

## References

### AIWG Research

- @.aiwg/research/findings/agentic-laziness-research.md - Comprehensive laziness research
  - Section 2: Root causes (RLHF reward hacking, sycophancy)
  - Section 5: Microsoft taxonomy (premature termination patterns)
  - Section 8: Proposed mitigations

### AIWG Rules

- @.claude/rules/conversable-agent-interface.md - ConversableAgent protocol
- @.claude/rules/failure-mitigation.md - Failure archetype handling
- @.claude/rules/executable-feedback.md - Test execution patterns
- @.claude/rules/actionable-feedback.md - Feedback quality requirements

### External Research

- Microsoft AI Red Team Taxonomy (April 2025) - Failure mode classification including premature termination
- METR (June 2025) - Reward hacking in frontier models
- Anthropic - Natural emergent misalignment from reward hacking

### Related ADRs

- @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md - Extension architecture
- @.aiwg/architecture/decisions/ADR-005-quality-gate-thresholds.md - Quality gate design

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Architecture Designer | Initial proposal |
