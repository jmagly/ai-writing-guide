# Test Data Factory

Generate realistic test data for all SDLC artifact types.

## Overview

The `TestDataFactory` provides a comprehensive test data generation utility for creating fixtures across the entire software development lifecycle. It supports seeded random generation for reproducible tests and customizable options for fine-grained control.

## Features

- **Seeded Random Generation**: Reproducible test data for deterministic testing
- **Comprehensive Coverage**: All SDLC artifact types (requirements, architecture, testing, version control)
- **Customizable**: Override defaults with options
- **Consistent Structure**: Follows AIWG template patterns
- **Edge Case Support**: Handle minimum, maximum, and empty values

## Usage

### Basic Usage

```typescript
import { TestDataFactory } from './fixtures/test-data-factory.js';

const factory = new TestDataFactory();

// Generate a use case
const useCase = factory.generateUseCase();
console.log(useCase.id); // UC-042
console.log(useCase.title); // "Create account"

// Generate an NFR
const nfr = factory.generateNFR('Performance');
console.log(nfr.description); // "Response time shall not exceed 2 seconds..."

// Generate a test case
const testCase = factory.generateTestCase();
console.log(testCase.steps); // ["Step 1: ...", "Step 2: ...", ...]
```

### Reproducible Tests

```typescript
const factory = new TestDataFactory(12345); // Seed for reproducibility

const useCase1 = factory.generateUseCase();
const useCase2 = factory.generateUseCase();

// Reset seed
factory.seed(12345);
const useCase3 = factory.generateUseCase();

console.log(useCase1.id === useCase3.id); // true (same seed)
console.log(useCase1.id === useCase2.id); // false (different position)
```

### Customization

```typescript
const factory = new TestDataFactory();

// Custom use case
const useCase = factory.generateUseCase({
  id: 'UC-CUSTOM-001',
  title: 'Login to System',
  actors: ['User', 'AuthService'],
  scenarioStepCount: 5,
  alternateFlowCount: 2
});

// Custom NFR
const nfr = factory.generateNFR('Security', {
  id: 'NFR-SEC-001',
  description: 'All API endpoints must use HTTPS',
  priority: 'P0'
});

// Custom test case
const testCase = factory.generateTestCase({
  id: 'TC-AUTH-001',
  title: 'Verify login with valid credentials',
  priority: 'P0',
  stepCount: 3
});
```

## Supported Artifacts

### Requirements

- **Use Cases**: `generateUseCase(options?)`
- **NFRs**: `generateNFR(category, options?)`
- **Supplemental Spec**: `generateSupplementalSpec(nfrCount?)`

### Architecture

- **ADRs**: `generateADR(options?)`
- **SAD Sections**: `generateSADSection(section, options?)`
- **Component Design**: `generateComponentDesign(name)`

### Testing

- **Test Cases**: `generateTestCase(options?)`
- **Test Plans**: `generateTestPlan(testCaseCount?)`
- **Test Results**: `generateTestResult(testCase, passed)`

### Version Control

- **Git Commits**: `generateGitCommit(options?)`
- **Pull Requests**: `generatePullRequest(options?)`
- **Git History**: `generateGitHistory(commitCount)`

### Project Management

- **Project Intake**: `generateProjectIntake(options?)`
- **Risk Register**: `generateRiskRegister(riskCount?)`
- **Iteration Plan**: `generateIterationPlan(weekCount)`

## Utility Methods

```typescript
// Generate random text
const text = factory.generateRandomText(10); // 10 words

// Generate dates
const today = factory.generateDate(0);
const lastWeek = factory.generateDate(7);

// Generate IDs
const id = factory.generateId('UC'); // UC-042
```

## Examples

### Complete SDLC Workflow

```typescript
const factory = new TestDataFactory();

// Inception Phase
const intake = factory.generateProjectIntake();
const risks = factory.generateRiskRegister(5);

// Elaboration Phase
const useCases = [
  factory.generateUseCase(),
  factory.generateUseCase(),
  factory.generateUseCase()
];
const spec = factory.generateSupplementalSpec(10);
const adrs = [
  factory.generateADR(),
  factory.generateADR()
];

// Construction Phase
const testPlan = factory.generateTestPlan(20);
const commits = factory.generateGitHistory(50);

// Transition Phase
const pr = factory.generatePullRequest({ commitCount: 5 });

console.log(`Project: ${intake.projectName}`);
console.log(`Use Cases: ${useCases.length}`);
console.log(`NFRs: ${spec.nfrs.length}`);
console.log(`Test Cases: ${testPlan.testCases.length}`);
console.log(`Commits: ${commits.length}`);
```

### Integration Testing

```typescript
import { TestDataFactory } from './fixtures/test-data-factory.js';

describe('SAD Generator Integration', () => {
  let factory: TestDataFactory;

  beforeEach(() => {
    factory = new TestDataFactory(42); // Reproducible tests
  });

  it('should generate complete SAD from inputs', () => {
    // Arrange
    const useCases = [
      factory.generateUseCase(),
      factory.generateUseCase()
    ];
    const nfrs = [
      factory.generateNFR('Performance'),
      factory.generateNFR('Security')
    ];
    const adrs = [
      factory.generateADR()
    ];

    // Act
    const sad = generateSAD(useCases, nfrs, adrs);

    // Assert
    expect(sad.sections.overview).toBeTruthy();
    expect(sad.sections.components).toBeTruthy();
  });
});
```

## Coverage

The TestDataFactory has **100% statement coverage**, **99%+ branch coverage**, and **100% function coverage**, ensuring reliable test data generation.

## Design Principles

1. **Realistic Data**: Generated data follows AIWG templates and real-world patterns
2. **Variety**: Multiple options for each artifact type to avoid monotonous test data
3. **Consistency**: Seeded RNG ensures reproducible tests
4. **Flexibility**: Options parameter for customization
5. **No External Dependencies**: Uses Node.js `crypto.randomBytes` for randomness

## Technical Details

### Random Number Generation

Uses a Linear Congruential Generator (LCG) for predictable, reproducible randomness:

```typescript
class SeededRandom {
  private seed: number;

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }
}
```

### ID Generation

IDs follow AIWG conventions:

- Use Cases: `UC-001`, `UC-002`, ...
- NFRs: `NFR-PERF-001`, `NFR-SEC-001`, ...
- Test Cases: `TC-001`, `TC-002`, ...
- ADRs: `ADR-001`, `ADR-002`, ...

### Date Generation

Dates are ISO 8601 format strings:

```typescript
generateDate(7); // 7 days ago
// "2025-10-16T12:43:01.234Z"
```

## Related Components

- **MockAgentOrchestrator**: Mock multi-agent workflows
- **GitSandbox**: Isolated git operations for testing
- **PerformanceProfiler**: Track performance metrics

## Contributing

When adding new artifact types:

1. Define TypeScript interfaces
2. Implement generator method
3. Add comprehensive tests (80%+ coverage)
4. Update README examples
5. Export types from `index.ts`
