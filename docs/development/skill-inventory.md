# Skill Inventory

Complete catalog of 53 skills across all AIWG packages.

## Utility Skills (aiwg-utils)

| Skill | Purpose |
|-------|---------|
| `artifact-metadata` | Extract and validate metadata from SDLC artifacts |
| `claims-validator` | Verify claims made in documentation against code |
| `config-validator` | Validate AIWG configuration files |
| `nl-router` | Route natural language to appropriate commands |
| `parallel-dispatch` | Coordinate parallel agent execution |
| `project-awareness` | Analyze project structure and context |
| `template-engine` | Render templates with variable substitution |
| `workspace-health` | Check workspace configuration health |

## Voice Framework Skills

| Skill | Purpose |
|-------|---------|
| `voice-analyze` | Analyze content's current voice characteristics |
| `voice-apply` | Apply voice profile to content |
| `voice-blend` | Combine multiple voice profiles |
| `voice-create` | Generate new voice profile from examples |

## Writing Quality Skills

| Skill | Purpose |
|-------|---------|
| `ai-pattern-detection` | Detect AI-generated writing patterns |

## Testing Quality Skills

| Skill | Purpose |
|-------|---------|
| `flaky-detect` | Identify flaky tests in test suites |
| `flaky-fix` | Suggest fixes for flaky tests |
| `generate-factory` | Generate test factory functions |
| `mutation-test` | Run mutation testing analysis |
| `tdd-enforce` | Enforce TDD workflow compliance |
| `test-sync` | Sync test files with source changes |

## Document Intelligence Skills

| Skill | Purpose |
|-------|---------|
| `doc-scraper` | Extract content from documentation URLs |
| `doc-splitter` | Split large documents into sections |
| `llms-txt-support` | Handle llms.txt format files |
| `pdf-extractor` | Extract text from PDF documents |
| `source-unifier` | Unify documentation from multiple sources |

## Skill Factory Skills

| Skill | Purpose |
|-------|---------|
| `quality-checker` | Check skill quality and completeness |
| `skill-builder` | AI-guided skill creation |
| `skill-enhancer` | Improve existing skill definitions |
| `skill-packager` | Package skills for distribution |

## Guided Implementation Skills

| Skill | Purpose |
|-------|---------|
| `iteration-control` | Control implementation iteration flow |

## SDLC Framework Skills

| Skill | Purpose |
|-------|---------|
| `architecture-evolution` | Track and manage architecture changes |
| `artifact-orchestration` | Coordinate artifact generation workflows |
| `decision-support` | Support technical decision making |
| `gate-evaluation` | Evaluate phase gate readiness |
| `incident-triage` | Triage production incidents |
| `risk-cycle` | Manage risk identification cycle |
| `sdlc-reports` | Generate SDLC status reports |
| `security-assessment` | Perform security assessments |
| `test-coverage` | Analyze test coverage |
| `traceability-check` | Verify requirements traceability |

## SDLC Extension Skills

### GitHub Extension

| Skill | Purpose |
|-------|---------|
| `pr-reviewer` | Review pull requests |
| `repo-analyzer` | Analyze repository structure |

### JavaScript Extension

| Skill | Purpose |
|-------|---------|
| `eslint-checker` | Run ESLint checks |
| `vitest-runner` | Run Vitest test suites |

### Python Extension

| Skill | Purpose |
|-------|---------|
| `pytest-runner` | Run pytest test suites |
| `venv-manager` | Manage Python virtual environments |

## Media Marketing Kit Skills

| Skill | Purpose |
|-------|---------|
| `approval-workflow` | Manage content approval workflows |
| `audience-synthesis` | Synthesize audience research |
| `brand-compliance` | Check brand guideline compliance |
| `competitive-intel` | Gather competitive intelligence |
| `data-pipeline` | Process marketing data |
| `performance-digest` | Generate performance summaries |
| `qa-protocol` | Execute QA protocols |
| `review-synthesis` | Synthesize review feedback |

## Skill Distribution

| Package | Skills |
|---------|--------|
| aiwg-utils | 8 |
| voice-framework | 4 |
| writing-quality | 1 |
| testing-quality | 6 |
| doc-intelligence | 5 |
| skill-factory | 4 |
| guided-implementation | 1 |
| sdlc-complete | 10 |
| sdlc extensions | 6 |
| media-marketing-kit | 8 |
| **Total** | **53** |

## Skills with Script Implementations

The following skills have Python scripts backing them:

| Skill | Script |
|-------|--------|
| `parallel-dispatch` | `scripts/parallel_dispatcher.py` |
| `project-awareness` | `scripts/project_awareness.py` |
| `template-engine` | `scripts/template_engine.py` |

All other skills are prompt-only implementations.

## Creating New Skills

See [Skill Creation Guide](skill-creation-guide.md) for instructions on creating new skills.

```bash
# Quick start
aiwg add-skill my-skill --to aiwg-utils
```
