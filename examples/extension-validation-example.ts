/**
 * Extension Validation Example
 *
 * Demonstrates how to use Zod schemas to validate extension manifests.
 *
 * @reference @src/extensions/validation.ts
 * @reference @src/extensions/types.ts
 */

import {
  validateExtension,
  isValidExtension,
  validateExtensionStrict,
  formatValidationErrors,
  type ValidationResult,
  type ValidatedExtension,
} from '../src/extensions/validation.js';
import type { Extension } from '../src/extensions/types.js';

// ============================================
// Example 1: Basic Validation
// ============================================

const exampleAgent = {
  id: 'test-engineer',
  type: 'agent',
  name: 'Test Engineer',
  description: 'Implements test-first development with comprehensive coverage',
  version: '1.0.0',
  capabilities: ['testing', 'tdd', 'coverage'],
  keywords: ['test', 'tdd', 'quality'],
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
  },
  metadata: {
    type: 'agent',
    role: 'Test-First Development',
    model: {
      tier: 'sonnet',
    },
    tools: ['Read', 'Write', 'Bash', 'Grep'],
  },
} as const;

console.log('=== Example 1: Basic Validation ===');

const result = validateExtension(exampleAgent);

if (result.success) {
  console.log('✓ Extension is valid!');
  console.log(`  Name: ${result.data.name}`);
  console.log(`  Type: ${result.data.type}`);
  console.log(`  Version: ${result.data.version}`);
} else {
  console.error('✗ Extension is invalid:');
  formatValidationErrors(result.errors).forEach(err => {
    console.error(`  - ${err}`);
  });
}

// ============================================
// Example 2: Type Guard Usage
// ============================================

console.log('\n=== Example 2: Type Guard ===');

function processExtension(data: unknown): void {
  if (isValidExtension(data)) {
    // TypeScript knows data is ValidatedExtension here
    console.log(`Processing ${data.name} (${data.type})`);
    console.log(`Capabilities: ${data.capabilities.join(', ')}`);
  } else {
    console.log('Invalid extension data');
  }
}

processExtension(exampleAgent);

// ============================================
// Example 3: Strict Validation (Throws)
// ============================================

console.log('\n=== Example 3: Strict Validation ===');

try {
  const validated = validateExtensionStrict(exampleAgent);
  console.log('✓ Strict validation passed');
  console.log(`  Extension ID: ${validated.id}`);
} catch (error) {
  console.error('✗ Strict validation failed:', error);
}

// ============================================
// Example 4: Invalid Extension
// ============================================

console.log('\n=== Example 4: Invalid Extension ===');

const invalidExtension = {
  id: 'Invalid-ID', // Wrong: must be kebab-case
  type: 'agent',
  name: '', // Wrong: empty string
  description: 'Test',
  version: 'v1.0', // Wrong: invalid format
  capabilities: [], // Wrong: must have at least one
  keywords: ['test'],
  platforms: {
    claude: 'full',
  },
  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
  },
  metadata: {
    type: 'agent',
    role: 'Test',
    model: { tier: 'sonnet' },
    tools: ['Read'],
  },
};

const invalidResult = validateExtension(invalidExtension);

if (!invalidResult.success) {
  console.log('Expected validation errors found:');
  formatValidationErrors(invalidResult.errors).forEach(err => {
    console.log(`  - ${err}`);
  });
}

// ============================================
// Example 5: Type Mismatch Detection
// ============================================

console.log('\n=== Example 5: Type Mismatch Detection ===');

const typeMismatch = {
  ...exampleAgent,
  type: 'command', // Doesn't match metadata.type
  metadata: {
    type: 'agent', // Mismatch!
    role: 'Test',
    model: { tier: 'sonnet' },
    tools: ['Read'],
  },
};

const mismatchResult = validateExtension(typeMismatch);

if (!mismatchResult.success) {
  console.log('Type mismatch detected:');
  formatValidationErrors(mismatchResult.errors).forEach(err => {
    console.log(`  - ${err}`);
  });
}

// ============================================
// Example 6: CalVer Version Support
// ============================================

console.log('\n=== Example 6: CalVer Version ===');

const calverExtension = {
  ...exampleAgent,
  version: '2026.1.5', // CalVer format
};

const calverResult = validateExtension(calverExtension);

if (calverResult.success) {
  console.log(`✓ CalVer format accepted: ${calverResult.data.version}`);
}

// ============================================
// Example 7: Complete Extension with Metadata
// ============================================

console.log('\n=== Example 7: Complete Extension ===');

const completeExtension: Extension = {
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Designs RESTful APIs with OpenAPI specifications',
  version: '1.0.0',
  capabilities: ['api-design', 'openapi', 'rest'],
  keywords: ['api', 'design', 'openapi'],
  category: 'sdlc/architecture',
  platforms: {
    claude: 'full',
    cursor: 'partial',
  },
  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
    core: true,
  },
  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: { tier: 'sonnet' },
    tools: ['Read', 'Write', 'Grep'],
    maxTools: 10,
    workflow: ['understand requirements', 'design endpoints', 'document'],
  },
  author: 'AIWG Contributors',
  license: 'MIT',
  repository: 'https://github.com/jmagly/aiwg',
  status: 'stable',
};

const completeResult = validateExtension(completeExtension);

if (completeResult.success) {
  console.log('✓ Complete extension validated successfully');
  console.log(`  ID: ${completeResult.data.id}`);
  console.log(`  Author: ${completeResult.data.author}`);
  console.log(`  License: ${completeResult.data.license}`);
  console.log(`  Status: ${completeResult.data.status}`);
}

console.log('\n=== Validation Examples Complete ===');
