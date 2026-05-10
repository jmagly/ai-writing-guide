---
namespace: aiwg
name: generate-tests
platforms: [all]
description: Generate comprehensive test suite for $ARGUMENTS following project testing conventions and best practices.
commandHint:
  argumentHint: 'Specify test generation options [--interactive] [--guidance "text"]'
  category: code-analysis-testing
---

# Test Generator

Generate comprehensive test suite for $ARGUMENTS following project testing conventions and best practices.

## Task

I'll analyze the target code and create complete test coverage including:

1. Unit tests for individual functions and methods
2. Integration tests for component interactions  
3. Edge case and error handling tests
4. Mock implementations for external dependencies
5. Test utilities and helpers as needed
6. Performance and snapshot tests where appropriate

## Process

I'll follow these steps:

1. Analyze the target file/component structure
2. Identify all testable functions, methods, and behaviors
3. Examine existing test patterns in the project
4. Create test files following project naming conventions
5. Implement comprehensive test cases with proper setup/teardown
6. Add necessary mocks and test utilities
7. Verify test coverage and add missing test cases

## Test Types

### Unit Tests
- Individual function testing with various inputs
- Component rendering and prop handling
- State management and lifecycle methods
- Utility function edge cases and error conditions

### Integration Tests
- Component interaction testing
- API integration with mocked responses
- Service layer integration
- End-to-end user workflows

### Framework-Specific Tests
- **React**: Component testing with React Testing Library
- **Vue**: Component testing with Vue Test Utils
- **Angular**: Component and service testing with TestBed
- **Node.js**: API endpoint and middleware testing

## Testing Best Practices

### Test Structure
- Use descriptive test names that explain the behavior
- Follow AAA pattern (Arrange, Act, Assert)
- Group related tests with describe blocks
- Use proper setup and teardown for test isolation

### Mock Strategy
- Mock external dependencies and API calls
- Use factories for test data generation
- Implement proper cleanup for async operations
- Mock timers and dates for deterministic tests

### Coverage Goals
- Aim for 80%+ code coverage
- Focus on critical business logic paths
- Test both happy path and error scenarios
- Include boundary value testing

I'll adapt to your project's testing framework (Jest, Vitest, Cypress, etc.) and follow established patterns.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Examine existing test patterns before generating new tests; match project conventions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md — Never skip test cases or weaken assertions to make coverage targets easier to hit
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md — Execute generated tests before returning; retry on failure with root cause analysis
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/security-gate/SKILL.md — Security gate may require test evidence before approving a release
