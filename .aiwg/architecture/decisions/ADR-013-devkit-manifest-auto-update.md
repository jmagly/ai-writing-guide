# ADR-013: Automatic Manifest Updates on Component Add

**Status**: Proposed
**Date**: 2025-12-10
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Development Kit Implementation

---

## Context and Problem Statement

When users add agents, commands, or skills to addons/frameworks/extensions, the `manifest.json` must be updated to include the new component. Without manifest registration, components won't be discovered or deployed.

Options considered:
1. **Manual update** (user edits manifest.json themselves)
2. **Automatic update** (CLI updates manifest after creating file)
3. **Full regeneration** (scan directory and rebuild manifest)

## Decision Drivers

- **Error prevention**: Manual updates are error-prone
- **Data preservation**: Custom fields in manifest must survive updates
- **Consistency**: Manifest should always reflect actual files
- **User experience**: Scaffolding should be complete without extra steps

## Decision

**Automatically update manifest.json** when adding components, with validation after update.

## Rationale

1. **Complete workflow**: `aiwg add-agent` creates file AND registers it
2. **No forgotten registrations**: Can't add agent without manifest entry
3. **Preserves custom fields**: Targeted update vs. full regeneration
4. **Validation catches issues**: Post-update check ensures consistency
5. **Matches user expectation**: "Add agent" means it's ready to use

## Consequences

### Positive

- Zero manual manifest editing required
- Components immediately discoverable after creation
- Reduced user errors
- Consistent manifest structure

### Negative

- CLI must parse and update JSON safely
- Need to preserve formatting preferences
- Merge conflicts possible in multi-user scenarios

### Risks

**Risk: Manifest corruption** (LOW)
- **Mitigation**: Backup manifest before update, validate after, rollback on failure
- **Acceptance**: JSON parsing well-tested, validation catches issues

**Risk: Lost custom fields** (LOW)
- **Mitigation**: Targeted updates, not regeneration
- **Acceptance**: Only modify specific arrays (agents, commands, skills)

## Implementation Pattern

```javascript
// Pseudo-code for add-agent
async function addAgent(name, target, template) {
  // 1. Resolve paths
  const targetPath = resolveAddonPath(target);
  const manifestPath = path.join(targetPath, 'manifest.json');

  // 2. Backup existing manifest
  const backup = await fs.readFile(manifestPath, 'utf8');

  // 3. Create agent file from template
  const agentPath = path.join(targetPath, 'agents', `${name}.md`);
  await createFromTemplate(template, agentPath, { name });

  // 4. Update manifest
  const manifest = JSON.parse(backup);
  manifest.agents = manifest.agents || [];
  if (!manifest.agents.includes(name)) {
    manifest.agents.push(name);
    manifest.agents.sort(); // Alphabetical for consistency
  }

  // 5. Write updated manifest
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // 6. Validate result
  const valid = await validateManifest(manifestPath);
  if (!valid) {
    // Rollback on failure
    await fs.writeFile(manifestPath, backup);
    throw new Error('Manifest validation failed after update');
  }

  return { agentPath, manifestPath };
}
```

## Manifest Update Rules

1. **Arrays only**: Only modify `agents`, `commands`, `skills` arrays
2. **No duplicates**: Check before adding, skip if already present
3. **Alphabetical sort**: Maintain consistent ordering
4. **Preserve formatting**: Use 2-space indent, trailing newline
5. **Validate after**: Run manifest validation after every update

## Alternatives Considered

### Alternative 1: Manual Updates

User edits manifest.json after creating files.

**Rejected because**: Users forget, make typos, inconsistent formatting, incomplete workflow.

### Alternative 2: Full Regeneration

Scan directories and rebuild manifest from scratch.

**Rejected because**: May lose custom fields (description, metadata), version info, dependencies.

### Alternative 3: Separate Registration Command

`aiwg register-agent <name> --in <target>` as separate step.

**Rejected because**: Extra step users will forget, should be atomic with creation.

## References

- **ADR-009**: Devkit extends aiwg-utils
- **ADR-011**: CLI and in-session commands
- **manifest.json schema**: Current validation rules
- **AIWG Development Kit Plan**: `.aiwg/planning/aiwg-devkit-plan.md`

---

**Last Updated**: 2025-12-10
**Author**: Claude (Orchestrator)
**Reviewers**: Project Owner (pending)
