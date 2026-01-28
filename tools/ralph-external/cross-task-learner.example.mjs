/**
 * Cross-Task Learner Usage Examples
 *
 * Demonstrates how to use CrossTaskLearner for cross-task learning
 * in Ralph external loops.
 *
 * @examples @tools/ralph-external/cross-task-learner.mjs
 */

import { CrossTaskLearner } from './cross-task-learner.mjs';

// ============================================================================
// Example 1: Basic Usage - Recording and Retrieving Tasks
// ============================================================================

console.log('=== Example 1: Basic Usage ===\n');

const learner = new CrossTaskLearner({
  memory_path: '.aiwg/ralph/memory',
  top_k: 3,
  similarity_threshold: 0.7,
  max_age_days: 90,
});

// Record a completed task
const task1 = learner.recordTaskCompletion({
  task_description: 'Implement JWT authentication for API endpoints',
  task_type: 'implementation',
  outcome: 'success',
  iterations: 3,
  final_quality: 0.85,
  key_learnings: [
    'JWT tokens should have short expiry times (15 minutes)',
    'Use RS256 algorithm for better security',
    'Store refresh tokens in httpOnly cookies',
  ],
  reflections: [
    {
      iteration: 2,
      content: 'Switched from HS256 to RS256 after security review',
      type: 'strategy_change',
      effectiveness: 'helpful',
    },
    {
      iteration: 3,
      content: 'Adding token refresh mechanism improved UX significantly',
      type: 'success_pattern',
      effectiveness: 'helpful',
    },
  ],
  tags: ['auth', 'security', 'jwt', 'api'],
  artifacts: [
    'src/auth/jwt.ts',
    'src/auth/middleware.ts',
    'test/auth/jwt.test.ts',
  ],
  metrics: {
    test_coverage: 0.95,
    time_to_complete_hours: 4.5,
  },
});

console.log('Recorded task:', task1.task_id);
console.log('');

// ============================================================================
// Example 2: Finding Similar Tasks
// ============================================================================

console.log('=== Example 2: Finding Similar Tasks ===\n');

// Record a few more tasks
learner.recordTaskCompletion({
  task_description: 'Fix authentication token expiry bug',
  task_type: 'debugging',
  outcome: 'success',
  iterations: 2,
  final_quality: 0.90,
  key_learnings: [
    'Always validate token expiry timestamp',
    'Clock skew can cause false expiry errors',
  ],
  tags: ['fix', 'auth', 'debug'],
});

learner.recordTaskCompletion({
  task_description: 'Add OAuth2 integration for Google login',
  task_type: 'implementation',
  outcome: 'success',
  iterations: 4,
  final_quality: 0.88,
  key_learnings: [
    'OAuth2 state parameter prevents CSRF attacks',
    'Store OAuth tokens separately from JWT tokens',
  ],
  tags: ['auth', 'oauth', 'integration'],
});

// Find similar tasks for a new task
const newTaskDescription = 'Implement OAuth authentication for Microsoft login';
const similarTasks = learner.findSimilarTasks(newTaskDescription);

console.log(`Found ${similarTasks.length} similar tasks for: "${newTaskDescription}"\n`);

for (const match of similarTasks) {
  console.log(`- ${match.task.task_description}`);
  console.log(`  Similarity: ${(match.similarity_score * 100).toFixed(0)}%`);
  console.log(`  Outcome: ${match.task.outcome}`);
  console.log(`  Iterations: ${match.task.iterations}`);
  console.log('');
}

// ============================================================================
// Example 3: Getting Relevant Learnings for New Task
// ============================================================================

console.log('=== Example 3: Getting Relevant Learnings ===\n');

const learnings = learner.getRelevantLearnings(
  'Implement authentication system with social login'
);

console.log('Key Learnings from Similar Tasks:');
for (const learning of learnings.key_learnings) {
  console.log(`  - ${learning}`);
}
console.log('');

console.log('Helpful Reflections:');
for (const reflection of learnings.reflections.slice(0, 2)) {
  console.log(`  [${reflection.type}] ${reflection.content}`);
}
console.log('');

console.log('Context Summary for Prompt Injection:');
console.log('---');
console.log(learnings.context_summary);
console.log('---');
console.log('');

// ============================================================================
// Example 4: Integration with Ralph Loop
// ============================================================================

console.log('=== Example 4: Ralph Loop Integration ===\n');

// At loop start: Get learnings for new task
function ralphLoopStart(taskDescription) {
  const learnings = learner.getRelevantLearnings(taskDescription);

  if (learnings.similar_tasks.length > 0) {
    console.log(`Cross-task learning enabled: Found ${learnings.similar_tasks.length} similar tasks`);

    // Inject context into prompt
    const contextForPrompt = learnings.context_summary;

    return {
      has_learnings: true,
      context: contextForPrompt,
      similar_tasks: learnings.similar_tasks,
    };
  }

  return {
    has_learnings: false,
    context: '',
    similar_tasks: [],
  };
}

// At loop completion: Record task for future learning
function ralphLoopComplete(loopState, outcome) {
  learner.recordTaskCompletion({
    task_description: loopState.objective,
    task_type: 'implementation', // or detect from description
    outcome: outcome.success ? 'success' : 'partial',
    iterations: loopState.iteration,
    final_quality: outcome.final_quality || 0,
    key_learnings: outcome.key_learnings || [],
    reflections: loopState.reflections || [],
    tags: [], // Auto-extracted
    artifacts: outcome.artifacts_generated || [],
    metrics: {
      total_time_ms: loopState.elapsed_time_ms,
      tokens_used: loopState.total_tokens,
    },
  });

  console.log('Task recorded for future cross-task learning');
}

// Simulate loop
const loopContext = ralphLoopStart('Implement SAML SSO integration');
console.log('Loop start context:', loopContext.has_learnings ? 'WITH cross-task learning' : 'NO similar tasks');
console.log('');

// Simulate completion
ralphLoopComplete(
  {
    objective: 'Implement SAML SSO integration',
    iteration: 5,
    reflections: [
      {
        iteration: 3,
        content: 'SAML metadata validation is critical for security',
        type: 'constraint_discovery',
        effectiveness: 'helpful',
      },
    ],
  },
  {
    success: true,
    final_quality: 0.87,
    key_learnings: [
      'SAML requires XML signature validation',
      'SP-initiated vs IdP-initiated flows have different security requirements',
    ],
    artifacts_generated: ['src/auth/saml.ts', 'src/auth/saml-config.ts'],
  }
);

// ============================================================================
// Example 5: Memory Management
// ============================================================================

console.log('\n=== Example 5: Memory Management ===\n');

// Get statistics
const stats = learner.getStatistics();
console.log('Memory Statistics:');
console.log(`  Total tasks: ${stats.total_tasks}`);
console.log(`  Tasks by type:`, stats.tasks_by_type);
console.log(`  Tasks by outcome:`, stats.tasks_by_outcome);
console.log('');

// Search by tags
const authTasks = learner.searchByTags(['auth', 'security']);
console.log(`Found ${authTasks.length} tasks with auth/security tags`);
console.log('');

// Prune old entries
const pruneResult = learner.pruneOldEntries(90);
console.log(`Pruned ${pruneResult.removed} old entries, ${pruneResult.remaining} remaining`);
console.log('');

// ============================================================================
// Example 6: Export/Import for Backups
// ============================================================================

console.log('=== Example 6: Export/Import ===\n');

// Export memory
const exported = learner.export();
console.log('Exported memory:');
console.log(`  Version: ${exported.version}`);
console.log(`  Total tasks: ${exported.total_tasks}`);
console.log(`  Exported at: ${exported.exported_at}`);
console.log('');

// Could save to file for backup
// import { writeFileSync } from 'fs';
// writeFileSync('cross-task-backup.json', JSON.stringify(exported, null, 2));

// Import from backup
// const backup = JSON.parse(readFileSync('cross-task-backup.json', 'utf8'));
// learner.import(backup);

// ============================================================================
// Example 7: Configuration Options
// ============================================================================

console.log('=== Example 7: Custom Configuration ===\n');

const customLearner = new CrossTaskLearner({
  memory_path: '.aiwg/ralph/memory',
  top_k: 5, // Return top 5 similar tasks
  similarity_threshold: 0.6, // Lower threshold for more matches
  max_age_days: 30, // Only consider recent tasks
  inject_reflections: true, // Include reflections in context
  inject_summary: true, // Include summary
  max_tokens: 3000, // Allow longer context
});

console.log('Custom learner created with:');
console.log(`  top_k: 5`);
console.log(`  similarity_threshold: 0.6`);
console.log(`  max_age_days: 30`);
console.log(`  max_tokens: 3000`);
console.log('');

// ============================================================================
// Summary
// ============================================================================

console.log('=== Summary ===\n');
console.log('CrossTaskLearner enables:');
console.log('  1. Recording completed tasks with learnings and reflections');
console.log('  2. Finding similar past tasks using keyword/tag matching');
console.log('  3. Injecting relevant learnings into new task contexts');
console.log('  4. Learning patterns across tasks to improve success rates');
console.log('  5. Memory management with pruning and export/import');
console.log('');
console.log('Integration with Ralph:');
console.log('  - At loop start: getRelevantLearnings() → inject into prompt');
console.log('  - At loop end: recordTaskCompletion() → store for future');
console.log('');
