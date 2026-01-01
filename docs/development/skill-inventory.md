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

10 skills (19%) have Python script implementations. 43 skills (81%) are prompt-only.

### Script-Backed Skills Inventory

| Skill | Addon | Script(s) | Lines | Purpose |
|-------|-------|-----------|-------|---------|
| `template-engine` | aiwg-utils | `template_engine.py` | 550 | Template discovery, parsing, variable substitution, validation |
| `artifact-metadata` | aiwg-utils | `artifact_metadata.py` | 623 | SDLC artifact metadata, versioning, status lifecycle, traceability |
| `parallel-dispatch` | aiwg-utils | `parallel_dispatcher.py` | 444 | Multi-agent orchestration, agent groups, timeout handling |
| `project-awareness` | aiwg-utils | `project_awareness.py`, `status_check.py` | 863 | Tech stack detection, AIWG state, project recommendations |
| `voice-apply` | voice-framework | `voice_loader.py` | 264 | Voice profile discovery and loading from multiple locations |
| `voice-create` | voice-framework | `voice_generator.py` | 429 | Generate voice profiles from natural language descriptions |
| `voice-analyze` | voice-framework | `voice_analyzer.py` | 561 | Reverse-engineer voice profiles from sample content |
| `voice-blend` | voice-framework | `voice_blender.py` | 438 | Weighted mixing of multiple voice profiles |
| `tdd-enforce` | testing-quality | `tdd_setup.py` | 433 | Pre-commit hooks, CI coverage gates, TDD enforcement |
| `ai-pattern-detection` | writing-quality | `pattern_scanner.py` | 231 | Regex-based AI pattern detection, authenticity scoring |

**Total:** 12 scripts, ~4,836 lines of Python

### Script Details

#### template_engine.py

```bash
# List available templates
python template_engine.py --list --json

# Instantiate template with variables
python template_engine.py --template sad --var project_name="MyProject" --var author="Team"

# Validate template syntax
python template_engine.py --validate --template custom-template.md

# Preview without saving
python template_engine.py --template test-plan --preview
```

Features:
- Template discovery across project, framework, and installation paths
- Handlebars-compatible syntax (placeholders, conditionals, loops)
- Variable validation and defaults
- Template metadata (.meta.yaml) support

#### artifact_metadata.py

```bash
# Create metadata for artifact
python artifact_metadata.py --create --artifact .aiwg/architecture/sad.md --type architecture

# Update version with history
python artifact_metadata.py --version "1.0.0" --artifact .aiwg/architecture/sad.md --summary "Initial baseline"

# Record review
python artifact_metadata.py --review --artifact .aiwg/architecture/sad.md --reviewer "security-architect" --outcome "approved"

# List artifacts by status
python artifact_metadata.py --list --status "review"
```

Features:
- Semantic versioning with validation
- Status lifecycle (draft → review → approved → baselined → deprecated)
- Review tracking with outcomes
- Traceability links (requirements, parent/children)

#### parallel_dispatcher.py

```bash
# Use predefined agent group
python parallel_dispatcher.py --group architecture-review --artifact .aiwg/architecture/sad.md

# Custom agent list
python parallel_dispatcher.py --agents "security-architect,test-architect" --artifact .aiwg/architecture/sad.md

# List available groups
python parallel_dispatcher.py --list-groups

# Show orchestration prompt
python parallel_dispatcher.py --group security-review --artifact file.md --show-prompt
```

Built-in agent groups:
- `architecture-review`: security-architect, test-architect, requirements-analyst, technical-writer
- `security-review`: security-architect, security-auditor, privacy-officer
- `documentation-review`: technical-writer, requirements-analyst, domain-expert
- `marketing-review`: brand-guardian, legal-reviewer, quality-controller, accessibility-checker
- `code-review`: code-reviewer, security-auditor, test-engineer
- `gate-validation`: architecture-designer, test-architect, security-gatekeeper, requirements-analyst

#### project_awareness.py

```bash
# Full project analysis
python project_awareness.py --full

# Tech stack only
python project_awareness.py --tech-stack

# AIWG workspace state
python project_awareness.py --aiwg-state

# Recommendations for next steps
python project_awareness.py --recommendations
```

Detects: language, runtime, package manager, test framework, CI/CD, database

#### voice_loader.py

```bash
# List available profiles
python voice_loader.py --list

# Load specific profile
python voice_loader.py --profile technical-authority --format json
```

Search order: project (.aiwg/voices/) → user (~/.config/aiwg/voices/) → built-in

#### voice_generator.py

```bash
# Generate from description
python voice_generator.py --description "friendly technical writer for beginners"

# Save to project
python voice_generator.py --description "..." --name my-voice --output .aiwg/voices/

# Save globally
python voice_generator.py --description "..." --global
```

#### voice_analyzer.py

```bash
# Analyze file
python voice_analyzer.py --input sample.txt

# Analyze multiple samples
python voice_analyzer.py --input "file1.txt,file2.txt"

# From stdin
cat content.md | python voice_analyzer.py --stdin

# Save extracted profile
python voice_analyzer.py --input sample.txt --name extracted-voice --output .aiwg/voices/
```

#### voice_blender.py

```bash
# Equal blend
python voice_blender.py --voices "technical-authority,friendly-explainer"

# Weighted blend
python voice_blender.py --voices "technical-authority:0.7,friendly-explainer:0.3"

# Save blend
python voice_blender.py --voices "..." --name my-blend --output .aiwg/voices/
```

#### tdd_setup.py

```bash
# Standard enforcement
python tdd_setup.py

# Strict mode (higher thresholds)
python tdd_setup.py --level strict

# Gradual adoption (lower initial thresholds)
python tdd_setup.py --level gradual

# Dry run
python tdd_setup.py --dry-run

# Custom thresholds
python tdd_setup.py --threshold 90 --branch-threshold 85
```

Generates: pre-commit hooks (Husky/pre-commit), GitHub Actions workflow

#### pattern_scanner.py

```bash
# Scan file
python pattern_scanner.py document.md

# Scan inline text
python pattern_scanner.py --text "This plays a crucial role in our comprehensive platform."
```

Output: JSON with authenticity score (0-100), pattern matches, severity grades

### Known Issues

All issues resolved as of 2024-12-31.

| Skill | Issue | Resolution |
|-------|-------|------------|
| tdd-enforce | SKILL.md referenced non-existent `coverage_gate.py` | Removed invalid reference, documented actual script options |
| voice-apply | Exit code 1 on usage display | Fixed to exit 0, added `--help` flag |
| ai-pattern-detection | No `--help` flag support | Added `--help` and `-h` support |

### Prompt-Only Skills (43)

All other skills work through SKILL.md prompt definitions without Python scripts:
- Claims validation, config validation, NL routing, workspace health
- Flaky test detection/fixing, factory generation, mutation testing, test sync
- Doc scraping, splitting, PDF extraction, source unification
- Skill building, enhancing, packaging, quality checking
- SDLC orchestration, gate evaluation, risk management, security assessment
- Marketing workflows, brand compliance, audience synthesis

See [Skill Creation Guide](skill-creation-guide.md) for when to use scripts vs prompt-only.

## Creating New Skills

See [Skill Creation Guide](skill-creation-guide.md) for instructions on creating new skills.

```bash
# Quick start
aiwg add-skill my-skill --to aiwg-utils
```
