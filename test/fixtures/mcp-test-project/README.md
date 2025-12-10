# MCP Test Project - TaskFlow Pro

This is a test fixture project for validating AIWG MCP server functionality.

## Purpose

Provides a realistic project structure with:
- SDLC artifacts in `.aiwg/` directory
- Sample source code with traceability markers
- Multiple artifact types (requirements, architecture, risks, etc.)

## Structure

```
mcp-test-project/
├── CLAUDE.md              # Project context
├── README.md              # This file
├── .aiwg/
│   ├── intake/
│   │   └── project-intake.md
│   ├── requirements/
│   │   ├── UC-001-create-task.md
│   │   └── UC-002-assign-task.md
│   ├── architecture/
│   │   ├── software-architecture-doc.md
│   │   └── ADR-001-database-selection.md
│   ├── planning/
│   │   └── phase-plan-elaboration.md
│   ├── risks/
│   │   └── risk-register.md
│   ├── testing/
│   │   └── test-strategy.md
│   ├── security/
│   │   └── threat-model.md
│   └── working/           # Temp files (ignored)
└── src/
    ├── api/
    │   └── tasks.ts
    ├── services/
    │   └── task-service.ts
    └── models/
        └── task.ts
```

## MCP Testing

Use this project as a target for MCP tool calls:

```bash
# Read an artifact
artifact-read { "path": "requirements/UC-001-create-task.md", "project_dir": "test/fixtures/mcp-test-project" }

# Write to working directory
artifact-write { "path": "working/test-output.md", "content": "...", "project_dir": "test/fixtures/mcp-test-project" }

# Run workflow (dry run)
workflow-run { "prompt": "run security review", "project_dir": "test/fixtures/mcp-test-project", "dry_run": true }
```

## Traceability

Source files include `@implements` and `@architecture` markers linking to AIWG artifacts:

```typescript
/**
 * @implements UC-001
 * @architecture .aiwg/architecture/software-architecture-doc.md
 */
```
