---
namespace: aiwg
platforms: [all]
name: archive-answer
description: Capture a query answer and file it as a persistent artifact in .aiwg/working/answers/ with promotion guidance to a permanent destination.
commandHint:
  argumentHint: "<title> [--content <text>] [--source-query <query>] [--tags <tag,...>] [--dest <path>]"
  allowedTools: Read, Write, Bash
  model: sonnet
  category: documentation-tracking
---

# archive-answer

Capture a query result or substantive chat answer and persist it as a structured artifact so it survives beyond the current session.

## Triggers

- "save this answer" → archive current response
- "persist that result" → write answer to working directory
- "archive this" → file as artifact with frontmatter
- "keep this for later" → save with promotion suggestion
- `--archive-answer` flag on `artifact-lookup` → automatic post-query archival

## Parameters

### `<title>` (required)

A short, descriptive title for the archived answer. Used as the filename slug and the `title` field in frontmatter.

### `--content <text>` (optional)

The answer body to persist. If omitted, the skill uses the most recent substantive assistant response in the current conversation.

### `--source-query <query>` (optional)

The query or question that produced this answer. Stored in frontmatter for traceability.

### `--tags <tag,...>` (optional)

Comma-separated tags for the artifact. The skill also infers tags from content type (e.g., `architecture`, `security`, `requirements`).

### `--dest <path>` (optional)

Override the suggested permanent destination. If omitted, the skill infers the destination from content type (see Destination Routing below).

## Behavior

### 1. Write to Working Directory

Create a markdown file at `.aiwg/working/answers/<slug>.md`:

```
.aiwg/working/answers/
└── <slug>.md
```

The slug is the title lowercased with spaces replaced by hyphens and non-alphanumeric characters stripped (e.g., "Auth flow analysis" → `auth-flow-analysis.md`).

### 2. Frontmatter Format

```yaml
---
title: "<title>"
date: "<YYYY-MM-DD>"
source-query: "<original query or empty>"
tags: [<inferred and explicit tags>]
status: working
promoted-to: ~
---
```

### 3. Destination Routing

After writing, suggest a permanent destination based on content signals:

| Content signals | Suggested destination |
|-----------------|----------------------|
| architecture, SAD, ADR, design | `.aiwg/architecture/` |
| security, threat, vulnerability, CVE | `.aiwg/security/` |
| test, coverage, regression, QA | `.aiwg/testing/` |
| risk, mitigation, impact | `.aiwg/risks/` |
| requirement, use case, story | `.aiwg/requirements/` |
| deployment, runbook, ops | `.aiwg/deployment/` |
| report, summary, metrics | `.aiwg/reports/` |
| (no strong signal) | `.aiwg/reports/` |

Tell the user: "Archived to `.aiwg/working/answers/<slug>.md`. When ready to promote, move it to `<suggested-dest>` and update `status: promoted` and `promoted-to: <final-path>`."

### 4. Index Refresh

After writing, note that the artifact will be picked up on the next index build:

```bash
aiwg index build
```

The `build-artifact-index` skill scans `.aiwg/working/answers/` and includes these files in the project graph.

## Output Example

```
Archived: .aiwg/working/answers/auth-flow-analysis.md

Frontmatter:
  title: Auth flow analysis
  date: 2026-04-12
  source-query: "how does the current auth flow handle token refresh?"
  tags: [architecture, security, auth]
  status: working

Suggested destination: .aiwg/architecture/
When promoted, run: aiwg index build
```

## Integration

- **artifact-lookup** calls this skill when `--archive-answer` is passed or when it detects a substantive multi-paragraph result.
- **workspace-prune-working** (when available) lists `.aiwg/working/answers/` entries and offers to promote or discard them during working-directory cleanup.
- **build-artifact-index** includes `.aiwg/working/answers/` in the project graph index automatically.

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/artifact-lookup/SKILL.md — Query skill that triggers archival
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/build-artifact-index/SKILL.md — Index skill that picks up archived answers
