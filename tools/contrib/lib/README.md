# Contributor Workflow Library

Core library modules for AIWG contributor workflow commands.

## Overview

This library provides foundational functionality for contributor commands (`aiwg -contribute-*`) and maintainer commands (`aiwg -review-*`).

## Modules

### github-client.mjs

Wrapper around GitHub CLI (`gh`) for GitHub API operations.

**Functions:**

- `checkGhAuth()` - Verify gh CLI authentication status
- `getUsername()` - Get current GitHub username
- `forkRepo(upstream)` - Fork repository to user's account
- `createPR(title, body, labels, draft)` - Create pull request
- `getPRStatus(prNumber)` - Get PR status and reviews
- `commentOnPR(prNumber, comment)` - Add comment to PR
- `checkPRExists(upstream)` - Check if user has open PR
- `checkRateLimit()` - Check GitHub API rate limit status
- `getPRReviews(prNumber)` - Get PR reviews
- `getPRReviewComments(prNumber)` - Get file-level review comments

**Usage:**

```javascript
import * as gh from './lib/github-client.mjs';

// Check authentication
const auth = gh.checkGhAuth();
if (!auth.authenticated) {
  console.error(auth.error);
  process.exit(1);
}

// Fork repository
const fork = gh.forkRepo('jmagly/ai-writing-guide');
if (fork.success) {
  console.log('Fork created:', fork.fork);
}

// Create PR
const pr = gh.createPR(
  'Add cursor integration',
  'Adds native Cursor support',
  ['contribution', 'platform-integration']
);
if (pr.success) {
  console.log('PR created:', pr.url);
}
```

### workspace-manager.mjs

Manages `.aiwg/contrib/{feature}/` workspaces for contribution tracking.

**Functions:**

- `initWorkspace(feature, options)` - Create workspace for new contribution
- `saveWorkspaceData(feature, data, filename)` - Save JSON data to workspace
- `loadWorkspaceData(feature, filename)` - Load JSON data from workspace
- `updateWorkspaceStatus(feature, status, additionalData)` - Update workspace status
- `getWorkspacePath(feature)` - Get workspace directory path
- `listWorkspaces()` - List all active contributions
- `cleanWorkspace(feature)` - Remove workspace
- `workspaceExists(feature)` - Check if workspace exists
- `saveQualityReport(feature, qualityData)` - Save quality validation results
- `savePRMetadata(feature, prData)` - Save PR metadata
- `getWorkspaceSummary(feature)` - Get workspace summary for display

**Workspace Schema:**

```json
{
  "feature": "cursor-integration",
  "status": "initialized|intake-complete|development|testing|pr-created|pr-updated|merged|aborted",
  "pr": { "number": 123, "url": "...", "state": "OPEN" },
  "quality": { "score": 95, "passed": true, "issues": [] },
  "created": "2025-10-17T19:00:00.000Z",
  "updated": "2025-10-17T19:30:00.000Z",
  "branch": "contrib/username/cursor-integration",
  "upstream": "jmagly/ai-writing-guide"
}
```

**Usage:**

```javascript
import * as wm from './lib/workspace-manager.mjs';

// Initialize workspace
const result = wm.initWorkspace('cursor-integration', {
  branch: 'contrib/jmagly/cursor-integration',
  upstream: 'jmagly/ai-writing-guide'
});

if (result.success) {
  console.log('Workspace created:', result.path);
}

// Update status
wm.updateWorkspaceStatus('cursor-integration', 'testing', {
  quality: { score: 95, passed: true }
});

// List all workspaces
const workspaces = wm.listWorkspaces();
console.log('Active contributions:', workspaces.workspaces.length);
```

### quality-validator.mjs

Runs quality gates and calculates quality scores for contributions.

**Functions:**

- `runMarkdownLint(projectRoot)` - Run markdown linting
- `checkManifestSync(projectRoot)` - Check manifest consistency
- `checkDocumentation(feature, projectRoot)` - Validate documentation completeness
- `runAllGates(feature, projectRoot)` - Run all quality validations
- `calculateQualityScore(results)` - Calculate 0-100 quality score
- `generateReport(results)` - Generate human-readable quality report

**Quality Score Calculation:**

```text
Base: 100 points

Deductions:
- Missing README update: -20
- Missing quick-start: -20
- Missing integration doc: -10
- Lint errors: -5 per error
- Manifest out of sync: -10
- Breaking changes undocumented: -30
- Missing tests: -10

Minimum passing score: 80/100
```

**Usage:**

```javascript
import * as qv from './lib/quality-validator.mjs';

// Run all quality gates
const results = qv.runAllGates('cursor-integration');

console.log('Quality Score:', results.score, '/100');
console.log('Passed:', results.passed ? 'YES' : 'NO');

// Generate report
const report = qv.generateReport(results);
console.log(report);

// Individual checks
const mdLint = qv.runMarkdownLint();
const manifestSync = qv.checkManifestSync();
const docs = qv.checkDocumentation('cursor-integration');
```

## Error Handling

All functions return structured results rather than throwing errors:

**Success:**

```javascript
{
  success: true,
  data: { ... },
  error: null
}
```

**Failure:**

```javascript
{
  success: false,
  data: null,
  error: "Descriptive error message"
}
```

This enables graceful error handling in contributor commands:

```javascript
const result = doSomething();
if (!result.success) {
  console.error('Error:', result.error);
  // Provide actionable guidance
  process.exit(1);
}
```

## Dependencies

- **Node.js:** >= 18.20.8
- **GitHub CLI (`gh`):** >= 2.0 (for github-client.mjs)
- **Git:** >= 2.0 (for quality-validator.mjs)
- **Existing lint tools:** `tools/lint/*.mjs` (for quality-validator.mjs)
- **Existing manifest tools:** `tools/manifest/*.mjs` (for quality-validator.mjs)

## Testing

All modules are unit testable and follow pure function patterns where possible.

**Run tests:**

```bash
# Test GitHub client
node -e "import('./lib/github-client.mjs').then(gh => { console.log(gh.checkGhAuth()); })"

# Test workspace manager
node -e "import('./lib/workspace-manager.mjs').then(wm => { console.log(wm.listWorkspaces()); })"

# Test quality validator
node -e "import('./lib/quality-validator.mjs').then(qv => { console.log(qv.runAllGates('test')); })"
```

## Design Decisions

1. **Structured Results:** All functions return `{ success, data, error }` objects instead of throwing
2. **Pure Functions:** Stateless design for testability
3. **No Console Output:** Functions return data; commands handle display
4. **Reuse Existing Tools:** Quality validator uses existing lint/manifest tools
5. **Async by Default:** All I/O operations use async/await patterns
6. **JSDoc Comments:** Full documentation for IDE autocomplete

## Integration with Commands

These library modules are used by:

- `tools/contrib/start-contribution.mjs` → workspace-manager, github-client
- `tools/contrib/test-contribution.mjs` → quality-validator, workspace-manager
- `tools/contrib/create-pr.mjs` → github-client, workspace-manager, quality-validator
- `tools/contrib/monitor-pr.mjs` → github-client, workspace-manager
- `tools/contrib/respond-pr.mjs` → github-client, workspace-manager
- `tools/maintainer/review-pr.mjs` → github-client, quality-validator

## Next Steps

See `.aiwg/planning/contributor-workflow-feature-plan.md` for:

- Phase 1: Contributor commands implementation
- Phase 2: PR lifecycle management
- Phase 3: Maintainer tools
- Phase 4: Documentation and polish
