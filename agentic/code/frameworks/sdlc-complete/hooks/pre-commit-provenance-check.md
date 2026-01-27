# pre-commit-provenance-check

Verify provenance records exist for staged artifacts before committing.

## Trigger

- Pre-commit: when files in tracked directories are staged for commit

## Enforcement Level

**WARN** - Lists untracked artifacts; does not block commit.

## Behavior

When triggered:

1. **Scan staged files**:
   - Check git staged files for artifacts in tracked directories
   - Filter to `.aiwg/` artifacts and `src/` source files
   - Exclude: working files, ralph state, provenance records themselves

2. **Check provenance coverage**:
   - For each staged artifact, check for corresponding `.prov.yaml` record
   - Record exists: PASS
   - Record missing: WARN

3. **Check for orphaned records**:
   - For each staged deletion, check if provenance record should be removed
   - Artifact deleted but record remains: WARN (suggest cleanup)

4. **Report**:
   - If all artifacts have provenance: Allow silently
   - If any missing: Display warning with list of untracked artifacts
   - Suggest running `/provenance-create` for each untracked artifact

## Warning Format

```
WARNING: Provenance Records Missing
======================================
The following staged artifacts lack provenance records:

  .aiwg/architecture/adr-008-logging.md
  .aiwg/requirements/use-cases/UC-020-export.md

Run these commands to create records:
  /provenance-create .aiwg/architecture/adr-008-logging.md
  /provenance-create .aiwg/requirements/use-cases/UC-020-export.md

Or run: /provenance-validate --fix
======================================
```

## Orphaned Record Warning

```
WARNING: Orphaned Provenance Records
======================================
The following provenance records reference deleted artifacts:

  .aiwg/research/provenance/records/adr-002-old.prov.yaml
    → .aiwg/architecture/adr-002-old.md (deleted)

Run: /provenance-validate --fix to clean up
======================================
```

## Configuration

```yaml
hook:
  name: pre-commit-provenance-check
  type: pre-commit
  enforcement: warn
  tracked_directories:
    - ".aiwg/requirements/"
    - ".aiwg/architecture/"
    - ".aiwg/testing/"
    - ".aiwg/security/"
    - ".aiwg/deployment/"
    - ".aiwg/research/findings/"
    - ".aiwg/research/sources/"
    - "src/"
    - "test/"
  skip_conditions:
    - path_match: ".aiwg/working/**"
    - path_match: ".aiwg/ralph/**"
    - path_match: ".aiwg/research/provenance/**"
    - path_match: "**/*.prov.yaml"
  coverage_threshold: 0.80  # Warn if overall coverage drops below 80%
```

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @agentic/code/frameworks/sdlc-complete/commands/provenance-validate.md - Validation command
- @.aiwg/research/provenance/schemas/prov-record.yaml - PROV record schema
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
