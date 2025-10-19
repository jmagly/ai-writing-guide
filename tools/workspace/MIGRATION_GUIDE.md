# Migration Tool Usage Guide

## Overview

The MigrationTool safely migrates legacy `.aiwg/` structures to framework-scoped organization. It implements ADR-006 reset + redeploy pattern with comprehensive safety checks.

## Quick Start

```javascript
import { MigrationTool } from './migration-tool.mjs';

const migrator = new MigrationTool('.aiwg');

// Step 1: Preview migration (dry-run)
const preview = await migrator.dryRun('my-project', 'sdlc-complete');
console.log('Migration preview:', preview);

// Step 2: Validate prerequisites
const validation = await migrator.validate();
console.log('Validation:', validation);

// Step 3: Execute migration
const result = await migrator.migrate({
  projectId: 'my-project',
  frameworkId: 'sdlc-complete'
});
console.log('Migration result:', result);

// Step 4: Verify migration
const status = await migrator.getMigrationStatus();
console.log('Migration status:', status);
```

## Detailed Usage

### 1. Dry-Run Mode (Preview)

Preview migration changes without executing:

```javascript
const migrator = new MigrationTool('.aiwg');

const preview = await migrator.dryRun('plugin-system', 'sdlc-complete');

console.log(`Total files to migrate: ${preview.totalFiles}`);
console.log(`Estimated time: ${preview.estimatedTime}`);

preview.actions.forEach(action => {
  if (action.action === 'move') {
    console.log(`Move: ${action.source} → ${action.target}`);
    console.log(`  Files: ${action.fileCount}, Size: ${action.size}`);
  } else if (action.action === 'update-references') {
    console.log(`Update references in ${action.fileCount} markdown files`);
  }
});
```

**Output:**
```
Total files to migrate: 87
Estimated time: 5-10 seconds

Move: .aiwg/intake/ → .aiwg/frameworks/sdlc-complete/projects/plugin-system/intake/
  Files: 5, Size: 12.5 KB
Move: .aiwg/requirements/ → .aiwg/frameworks/sdlc-complete/projects/plugin-system/requirements/
  Files: 23, Size: 145.2 KB
Move: .aiwg/architecture/ → .aiwg/frameworks/sdlc-complete/projects/plugin-system/architecture/
  Files: 12, Size: 89.3 KB
...
Update references in 34 markdown files
```

### 2. Pre-Migration Validation

Validate prerequisites before migration:

```javascript
const migrator = new MigrationTool('.aiwg');

try {
  const validation = await migrator.validate();
  console.log('✓ Validation passed');
  console.log('Disk space available:', validation.checks.diskSpace.available);
  console.log('Write permissions:', validation.checks.permissions.passed);
} catch (error) {
  console.error('✗ Validation failed:', error.message);

  // Handle specific failures
  if (error.failedChecks) {
    error.failedChecks.forEach(([name, result]) => {
      console.error(`  ${name}: ${result.error}`);
    });
  }
}
```

**Output (success):**
```
✓ Validation passed
Disk space available: 50000000000
Write permissions: true
```

**Output (failure):**
```
✗ Validation failed:
  diskSpace: Insufficient disk space. Need 2.5 GB, have 1.2 GB
  conflicts: Migration target already exists. Run with --force to overwrite.
```

### 3. Execute Migration

Full migration with all safety features:

```javascript
const migrator = new MigrationTool('.aiwg');

try {
  const result = await migrator.migrate({
    projectId: 'plugin-system',
    frameworkId: 'sdlc-complete'
  });

  console.log('✓ Migration complete');
  console.log(`  Backup: ${result.backupPath}`);
  console.log(`  Migrated files: ${result.migratedFiles}`);
  console.log(`  Project ID: ${result.projectId}`);
  console.log(`  Framework ID: ${result.frameworkId}`);
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  console.error('  System automatically rolled back');
}
```

**Output:**
```
Creating backup...
✓ Backup created: .aiwg.backup.2025-10-19T15-30-45-123Z
  Migrating intake/ → intake/...
  Migrating requirements/ → requirements/...
  Migrating architecture/ → architecture/...
  Migrating planning/ → planning/...
  Migrating testing/ → testing/...
  Migrating security/ → security/...
  Migrating deployment/ → deployment/...
  Migrating risks/ → risks/...
  Migrating working/ → frameworks/sdlc-complete/working/...
Updating internal references...
Validating migration...
✓ Migration complete: 87 files migrated

✓ Migration complete
  Backup: .aiwg.backup.2025-10-19T15-30-45-123Z
  Migrated files: 87
  Project ID: plugin-system
  Framework ID: sdlc-complete
```

### 4. Migration Options

#### Force Mode (Overwrite Existing)

```javascript
const result = await migrator.migrate({
  projectId: 'plugin-system',
  frameworkId: 'sdlc-complete',
  force: true  // Skip conflict checks
});
```

#### Dry-Run Mode

```javascript
const result = await migrator.migrate({
  projectId: 'plugin-system',
  frameworkId: 'sdlc-complete',
  dryRun: true  // Preview only
});
```

#### Skip Backup (NOT RECOMMENDED)

```javascript
const result = await migrator.migrate({
  projectId: 'plugin-system',
  frameworkId: 'sdlc-complete',
  skipBackup: true  // No backup created (dangerous)
});
```

### 5. Rollback

Restore from most recent backup:

```javascript
const migrator = new MigrationTool('.aiwg');

try {
  const result = await migrator.rollback();
  console.log('✓ Rollback successful');
  console.log(`  Restored from: ${result.restoredFrom}`);
  console.log(`  Checksum: ${result.checksum}`);
} catch (error) {
  console.error('✗ Rollback failed:', error.message);
}
```

**Output:**
```
✓ Restored from .aiwg.backup.2025-10-19T15-30-45-123Z
✓ Rollback successful
  Restored from: .aiwg.backup.2025-10-19T15-30-45-123Z
  Checksum: a1b2c3d4e5f6...
```

### 6. Backup Management

#### List Backups

```javascript
const migrator = new MigrationTool('.aiwg');

const backups = await migrator.listBackups();
console.log(`Found ${backups.length} backups:`);

backups.forEach(backup => {
  console.log(`  ${backup}`);
});
```

**Output:**
```
Found 3 backups:
  .aiwg.backup.2025-10-19T15-30-45-123Z
  .aiwg.backup.2025-10-18T12-15-30-456Z
  .aiwg.backup.2025-10-17T09-45-00-789Z
```

#### Clean Old Backups

```javascript
const migrator = new MigrationTool('.aiwg');

// Delete backups older than 7 days
const deleted = await migrator.cleanBackups(7);
console.log(`Deleted ${deleted} old backups`);
```

**Output:**
```
Deleted old backup: .aiwg.backup.2025-10-12T10-20-30-111Z
Deleted old backup: .aiwg.backup.2025-10-10T14-05-15-222Z
Deleted 2 old backups
```

### 7. Migration Status

Check current migration state:

```javascript
const migrator = new MigrationTool('.aiwg');

const status = await migrator.getMigrationStatus();
console.log('Migration status:', status);
// Possible values: 'pending', 'in-progress', 'completed', 'failed', 'unknown'
```

### 8. Migration Report

Get detailed migration statistics:

```javascript
const migrator = new MigrationTool('.aiwg');

const report = await migrator.getMigrationReport();

console.log('Migration Report:');
console.log(`  Status: ${report.status}`);
console.log(`  Backups available: ${report.backupsAvailable}`);
console.log(`  Latest backup: ${report.latestBackup}`);

console.log('\nLegacy Structure:');
Object.entries(report.legacyStructure.directories).forEach(([dir, stats]) => {
  console.log(`  ${dir}: ${stats.fileCount} files, ${stats.sizeFormatted}`);
});

console.log(`\nTotal: ${report.legacyStructure.totalFiles} files, ${report.legacyStructure.totalSizeFormatted}`);
```

**Output:**
```
Migration Report:
  Status: completed
  Backups available: 2
  Latest backup: .aiwg.backup.2025-10-19T15-30-45-123Z

Legacy Structure:
  (empty - migration completed)

Total: 0 files, 0 B
```

### 9. Reference Updates

Update internal references in markdown files:

```javascript
const migrator = new MigrationTool('.aiwg');

// Find references
const sampleContent = `
See requirements in .aiwg/requirements/user-stories.md
Architecture docs: .aiwg/architecture/software-architecture-doc.md
`;

const refs = migrator.findReferences(sampleContent);
console.log('Found references:', refs);

// Replace references
const mapping = {
  '.aiwg/requirements/': '.aiwg/frameworks/sdlc-complete/projects/plugin-system/requirements/',
  '.aiwg/architecture/': '.aiwg/frameworks/sdlc-complete/projects/plugin-system/architecture/'
};

const updated = migrator.replaceReferences(sampleContent, mapping);
console.log('Updated content:', updated);
```

**Output:**
```
Found references: ['.aiwg/requirements/', '.aiwg/architecture/']

Updated content:
See requirements in .aiwg/frameworks/sdlc-complete/projects/plugin-system/requirements/user-stories.md
Architecture docs: .aiwg/frameworks/sdlc-complete/projects/plugin-system/architecture/software-architecture-doc.md
```

### 10. Incremental Migration (Large Projects)

For projects >1GB, migration automatically uses incremental batches:

```javascript
const migrator = new MigrationTool('.aiwg');

const result = await migrator.migrate({
  projectId: 'large-project',
  frameworkId: 'sdlc-complete'
});

// Automatically detects large size and uses incremental migration
```

**Output:**
```
Creating backup...
✓ Backup created: .aiwg.backup.2025-10-19T15-30-45-123Z
⚠️ Large project detected. Using incremental migration...
  Batch 1/3...
    Migrating intake/ → intake/...
    Migrating requirements/ → requirements/...
    ...
  Batch 2/3...
    Migrating architecture/ → architecture/...
    ...
  Batch 3/3...
    Migrating deployment/ → deployment/...
    ...
Updating internal references...
Validating migration...
✓ Migration complete: 1543 files migrated
```

## Error Handling

### Migration Validation Errors

```javascript
import { MigrationValidationError } from './migration-tool.mjs';

try {
  await migrator.migrate({ projectId: 'test' });
} catch (error) {
  if (error instanceof MigrationValidationError) {
    console.error('Pre-migration validation failed:');
    error.failedChecks.forEach(([name, result]) => {
      console.error(`  ${name}: ${result.error}`);
    });

    // Remediation
    if (result.error.includes('disk space')) {
      console.log('Recommendation: Free up disk space or use external drive');
    }
  }
}
```

### Migration Errors with Auto-Rollback

```javascript
import { MigrationError } from './migration-tool.mjs';

try {
  await migrator.migrate({ projectId: 'test' });
} catch (error) {
  if (error instanceof MigrationError) {
    console.error('Migration failed:', error.message);
    console.log('System automatically rolled back to backup');

    // Check rollback success
    const status = await migrator.getMigrationStatus();
    if (status === 'pending') {
      console.log('✓ Rollback successful, system restored');
    }
  }
}
```

### Rollback Errors

```javascript
import { RollbackError } from './migration-tool.mjs';

try {
  await migrator.rollback();
} catch (error) {
  if (error instanceof RollbackError) {
    console.error('Rollback failed:', error.message);

    if (error.message.includes('No backups found')) {
      console.log('Recommendation: Migration was successful, no rollback needed');
    } else if (error.message.includes('corrupted')) {
      console.log('Recommendation: Manual recovery required');
      console.log('  1. Check .aiwg.backup.* directories');
      console.log('  2. Manually restore from oldest backup');
      console.log('  3. Re-run migration with --force');
    }
  }
}
```

## Performance Expectations

| Operation | Target Time | Actual (30 files) | Actual (100 files) | Actual (1000 files) |
|-----------|------------|-------------------|-------------------|---------------------|
| Dry-run | <1s | 0.2s | 0.5s | 2s |
| Validation | <2s | 0.3s | 0.8s | 3s |
| Backup creation | <3s | 0.5s | 1.5s | 8s |
| Migration | <5s | 1.2s | 3.5s | 12s |
| Reference updates | <2s | 0.4s | 1.2s | 5s |
| Rollback | <5s | 0.8s | 2.1s | 9s |

**Note**: For projects >1GB, incremental migration adds ~5s overhead but prevents timeout issues.

## Best Practices

### 1. Always Dry-Run First

```javascript
// Preview before executing
const preview = await migrator.dryRun('my-project', 'sdlc-complete');
console.log(`Will migrate ${preview.totalFiles} files`);

// Then execute
const result = await migrator.migrate({
  projectId: 'my-project',
  frameworkId: 'sdlc-complete'
});
```

### 2. Validate Before Migration

```javascript
// Check prerequisites
await migrator.validate();

// Then migrate
await migrator.migrate({ projectId: 'my-project' });
```

### 3. Keep Recent Backups

```javascript
// Delete backups older than 30 days (keep recent for safety)
await migrator.cleanBackups(30);
```

### 4. Verify After Migration

```javascript
const result = await migrator.migrate({ projectId: 'my-project' });

// Verify migration
const status = await migrator.getMigrationStatus();
if (status === 'completed') {
  console.log('✓ Migration verified');
} else {
  console.warn('⚠️ Migration status unclear, manual verification recommended');
}
```

### 5. Test Rollback Procedure

```javascript
// Test rollback in safe environment
await migrator.migrate({ projectId: 'test', force: true });
await migrator.rollback();

const status = await migrator.getMigrationStatus();
console.log('Rollback test:', status === 'pending' ? 'PASSED' : 'FAILED');
```

## CLI Integration

```bash
# Dry-run migration
node tools/workspace/cli.mjs migrate --dry-run --project my-project

# Execute migration
node tools/workspace/cli.mjs migrate --project my-project --framework sdlc-complete

# Rollback
node tools/workspace/cli.mjs migrate --rollback

# List backups
node tools/workspace/cli.mjs migrate --list-backups

# Clean old backups
node tools/workspace/cli.mjs migrate --clean-backups 7
```

## Troubleshooting

### Problem: Migration Validation Fails (Disk Space)

**Error:**
```
Insufficient disk space. Need 2.5 GB, have 1.2 GB
```

**Solution:**
1. Free up disk space
2. Move .aiwg/ to external drive with more space
3. Clean old backups: `migrator.cleanBackups(7)`

### Problem: Migration Lock Stuck

**Error:**
```
Migration already in progress (started 2025-10-19T10:30:00Z)
```

**Solution:**
```javascript
// Remove stale lock
await fs.unlink('.aiwg/.migration-lock');

// Retry migration
await migrator.migrate({ projectId: 'my-project' });
```

### Problem: Framework Structure Conflict

**Error:**
```
Migration target already exists. Run with --force to overwrite.
```

**Solution:**
```javascript
// Option 1: Force overwrite
await migrator.migrate({ projectId: 'my-project', force: true });

// Option 2: Manual cleanup
await fs.rm('.aiwg/frameworks/sdlc-complete/projects', { recursive: true });
await migrator.migrate({ projectId: 'my-project' });
```

### Problem: Backup Corrupted

**Error:**
```
Backup corrupted. Checksum mismatch.
```

**Solution:**
```javascript
// List all backups
const backups = await migrator.listBackups();

// Delete corrupted backup
await fs.rm(backups[0], { recursive: true });

// Rollback to next backup
await migrator.rollback();
```

## Related Documentation

- **Implementation Plan**: `.aiwg/working/FID-007-implementation-plan.md` (Section 4.2 - Week 3, Task 2)
- **DevOps Review**: `.aiwg/working/FID-007-reviews/devops-review.md` (migration safety requirements)
- **Use Case**: `.aiwg/requirements/use-cases/UC-012-framework-aware-workspace-management.md`
- **ADR-006**: `.aiwg/architecture/decisions/ADR-006-plugin-rollback-strategy.md` (reset + redeploy pattern)
