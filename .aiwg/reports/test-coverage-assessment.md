# Test Coverage Assessment: AIWG CLI Commands and Capabilities

**Assessment Date**: 2025-12-08
**Scope**: New features introduced in PRs #51 (Skills System) and #52 (Voice Framework)
**Test Framework**: Vitest (v2.1.0) with TypeScript
**Current Test Count**: 39 test files, 136 TypeScript source files

---

## Executive Summary

**Critical Gap**: The new Skills System (PR #51) and Voice Framework (PR #52) have **ZERO automated tests** despite being production-deployed features. Existing voice tests cover only the TypeScript implementation (`src/writing/voice-*.ts`), not the new Python-based skill scripts or CLI deployment commands.

**Risk Level**: HIGH
- Skills deployment (`--deploy-skills`) has no integration tests
- 4 voice framework skills (29 SKILL.md files total) have no test coverage
- Python skill scripts (10 files, ~4,500 lines) completely untested
- CLI skill commands have no validation tests

**Recommended Action**: Implement critical-path tests first (skill loading, deployment, voice profile YAML validation) before expanding to comprehensive coverage.

---

## 1. Inventory of New Features Needing Tests

### 1.1 Skills System (PR #51: `2f14b46`)

**CLI Commands** (in `tools/agents/deploy-agents.mjs`):
- `--deploy-skills` flag (deploys skills to `.claude/skills/`)
- `--skills-only` flag (deploys only skills, skips agents)
- `listSkillDirs()` function (scans for SKILL.md directories)
- `deploySkillDir()` function (copies skill directory with metadata)

**Skill Discovery & Loading** (no TypeScript implementation):
- Skill manifest parsing (SKILL.md YAML frontmatter)
- Skill directory structure validation
- Skill dependency resolution (references, scripts)
- Cross-framework skill loading (addons, frameworks)

**Deployed Skills** (3 initial skills):
1. **project-awareness** (130 lines)
   - Phase detection
   - Project status checking
   - SDLC state awareness
2. **ai-pattern-detection** (101 lines)
   - Pattern scanning
   - Quick reference lookup
3. **writing-quality/validation** (distributed)
   - Integration with existing validation engine

**Python Scripts**:
- `status_check.py` (218 lines) - project status automation
- `pattern_scanner.py` (231 lines) - AI pattern detection

### 1.2 Voice Framework (PR #52: `db0f666`)

**Voice Skills** (4 new skills, 29 total SKILL.md files):

1. **voice-apply** (192 lines)
   - Load voice profiles (YAML)
   - Apply voice to content transformation
   - Voice dimension calibration

2. **voice-create** (148 lines)
   - Generate voice profiles from natural language
   - Voice dimension mapping
   - YAML profile generation

3. **voice-blend** (168 lines)
   - Weighted voice mixing
   - Dimension interpolation
   - Vocabulary merging

4. **voice-analyze** (219 lines)
   - Reverse-engineer voice from samples
   - Feature extraction (sentence length, vocabulary)
   - Voice profile generation

**Python Implementations**:
- `voice_loader.py` (264 lines) - YAML profile loading
- `voice_generator.py` (429 lines) - profile generation
- `voice_blender.py` (438 lines) - profile blending
- `voice_analyzer.py` (561 lines) - text analysis

**Voice Profile Templates** (4 built-in):
- `technical-authority.yaml` (84 lines)
- `friendly-explainer.yaml` (80 lines)
- `executive-brief.yaml` (86 lines)
- `casual-conversational.yaml` (80 lines)

**Schema**:
- `voice-profile.schema.json` (244 lines) - JSON Schema for YAML validation

**CLI Integration** (none yet):
- No dedicated CLI commands for voice operations
- Integration via `--deploy-skills` only

### 1.3 AIWG Utils Skills (PR #52: `db0f666`)

**New Skills** (6 utilities):

1. **artifact-metadata** (281 lines + 623-line Python script)
   - Artifact tracking
   - Metadata generation
   - Traceability support

2. **config-validator** (502 lines)
   - Configuration validation
   - Schema enforcement

3. **nl-router** (478 lines)
   - Natural language command routing
   - Intent detection

4. **parallel-dispatch** (269 lines + 444-line Python script)
   - Multi-agent orchestration
   - Parallel task execution

5. **project-awareness** (316 lines + 645-line Python script - expanded)
   - Enhanced project status
   - Phase detection
   - Git integration

6. **template-engine** (321 lines + 550-line Python script)
   - Template loading
   - Placeholder replacement
   - Conditional sections

---

## 2. Existing Test Coverage

### 2.1 TypeScript Tests (39 files, excellent coverage for src/)

**Voice-Related Tests** (2 files, 1,299 lines):
- `/test/unit/writing/voice-analyzer.test.ts` (557 lines)
  - ✅ Voice analysis (academic, technical, executive, casual)
  - ✅ Diversity scoring
  - ✅ Variation comparison
  - ✅ Perspective/tone detection
  - ✅ Consistency analysis
  - ✅ Edge cases (empty, unicode, long content)
  - **Gap**: Does NOT test Python `voice_analyzer.py` script

- `/test/unit/writing/voice-calibration.test.ts` (1,299 lines)
  - ✅ Voice profile management (get, update, create custom)
  - ✅ Calibration with training corpus
  - ✅ Detection accuracy
  - ✅ Characteristic tuning
  - ✅ Marker optimization
  - ✅ Transformation accuracy
  - ✅ Report generation
  - **Gap**: Does NOT test Python voice skill scripts

**Writing Tests** (7 files):
- `content-diversifier.test.ts`
- `example-generator.test.ts`
- `pattern-library.test.ts`
- `prompt-optimizer.test.ts`
- `prompt-templates.test.ts`
- `validation-engine.test.ts`
- `validation-rules.test.ts`

**Plugin Tests** (13 files):
- Cross-framework ops
- Framework detection
- Framework isolation
- Migration
- Metadata validation
- Plugin install/uninstall
- Registry validation
- Workspace creation

**CLI Tests** (4 files):
- `config-loader.test.ts`
- `git-hooks.test.ts`
- `watch-service.test.ts`
- `workflow-orchestrator.test.ts`

**Agent Tests** (3 files):
- `agent-deployer.test.ts`
- `agent-packager.test.ts`
- `agent-validator.test.ts`

**Intake Tests** (1 file):
- `git-history-analyzer.test.ts`

**Testing Framework Tests** (6 files):
- Corpus building
- Ground truth management
- Test data factory
- Test case generation
- Test code generation
- Use case parsing

**Workspace Tests** (3 files):
- `health-checker.test.ts`
- `natural-language-router.test.ts`
- `registry-manager.test.ts`

### 2.2 What Is NOT Tested

**Critical Gaps**:

1. **Skills System** (0% coverage):
   - ❌ Skill loading (`listSkillDirs()`, `deploySkillDir()`)
   - ❌ SKILL.md parsing (YAML frontmatter)
   - ❌ Skill deployment to `.claude/skills/`
   - ❌ Skill directory structure validation
   - ❌ Skill dependency resolution

2. **Voice Framework Python Scripts** (0% coverage):
   - ❌ `voice_loader.py` - YAML profile loading
   - ❌ `voice_generator.py` - profile generation from NL
   - ❌ `voice_blender.py` - weighted voice mixing
   - ❌ `voice_analyzer.py` - text feature extraction

3. **Voice Profile Schema Validation** (0% coverage):
   - ❌ YAML schema validation (`voice-profile.schema.json`)
   - ❌ Built-in template loading (4 templates)
   - ❌ Voice profile search paths (project, user, built-in)

4. **AIWG Utils Python Scripts** (0% coverage):
   - ❌ `artifact_metadata.py` (623 lines)
   - ❌ `parallel_dispatcher.py` (444 lines)
   - ❌ `project_awareness.py` (645 lines)
   - ❌ `template_engine.py` (550 lines)

5. **CLI Skill Commands** (0% coverage):
   - ❌ `aiwg -deploy-agents --deploy-skills`
   - ❌ `aiwg -deploy-agents --skills-only`
   - ❌ No dedicated voice CLI commands

6. **Integration Tests** (0% coverage):
   - ❌ End-to-end skill deployment
   - ❌ Voice profile application workflow
   - ❌ Cross-skill dependency resolution
   - ❌ Python script execution from CLI

---

## 3. Recommended Test Cases (By Priority)

### Priority 1: Critical Path (Blocking Production Use)

**Skill Loading & Deployment** (6 tests):
1. **Test**: `listSkillDirs()` discovers all SKILL.md files
   - Input: `agentic/code/addons/voice-framework/skills/`
   - Expected: 4 skill directories found
   - Assertions: All have SKILL.md, correct names

2. **Test**: `deploySkillDir()` copies skill directory to target
   - Input: `voice-apply` skill
   - Expected: `.claude/skills/voice-apply/` created with all files
   - Assertions: SKILL.md, scripts/, references/ copied

3. **Test**: SKILL.md frontmatter parsing
   - Input: `voice-apply/SKILL.md`
   - Expected: `{name: 'voice-apply', description: '...', version: '1.0.0'}`
   - Assertions: Valid YAML, required fields present

4. **Test**: Skill deployment with `--deploy-skills` flag
   - Input: `deploy-agents.mjs --target /tmp/test --deploy-skills --mode all`
   - Expected: 29 skills deployed to `.claude/skills/`
   - Assertions: All SKILL.md files present, no duplicates

5. **Test**: Skills-only deployment (skip agents)
   - Input: `deploy-agents.mjs --skills-only`
   - Expected: Only `.claude/skills/` created, no `.claude/agents/`
   - Assertions: Agents directory not touched

6. **Test**: Skill directory structure validation
   - Input: Malformed skill (no SKILL.md)
   - Expected: Error or warning logged
   - Assertions: Deployment fails gracefully

**Voice Profile YAML Validation** (4 tests):
7. **Test**: Load built-in voice profile (technical-authority.yaml)
   - Input: `technical-authority`
   - Expected: Profile loaded with all dimensions
   - Assertions: formality=0.7, confidence=0.9, warmth=0.3

8. **Test**: Validate voice profile against schema
   - Input: Valid YAML with all required fields
   - Expected: Schema validation passes
   - Assertions: No validation errors

9. **Test**: Reject invalid voice profile (missing dimensions)
   - Input: YAML with missing `formality` dimension
   - Expected: Schema validation fails
   - Assertions: Clear error message

10. **Test**: Voice profile search paths (project > user > built-in)
    - Input: Custom profile in `.aiwg/voices/custom.yaml`
    - Expected: Custom profile loaded instead of built-in
    - Assertions: Correct precedence order

### Priority 2: Core Functionality (Ensures Correctness)

**Voice Skill Python Scripts** (8 tests):

11. **Test**: `voice_loader.py` loads YAML profile
    - Command: `python voice_loader.py technical-authority`
    - Expected: JSON output with profile data
    - Assertions: Exit code 0, valid JSON

12. **Test**: `voice_generator.py` creates profile from NL description
    - Command: `python voice_generator.py "technical docs, precise, no-nonsense"`
    - Expected: Generated YAML with calibrated dimensions
    - Assertions: formality > 0.6, complexity > 0.7

13. **Test**: `voice_blender.py` mixes two profiles (50/50)
    - Command: `python voice_blender.py technical-authority friendly-explainer --weights 0.5 0.5`
    - Expected: Blended profile with averaged dimensions
    - Assertions: formality = avg(0.7, 0.2) = 0.45

14. **Test**: `voice_analyzer.py` analyzes text sample
    - Command: `python voice_analyzer.py --sample "System latency is 45ms."`
    - Expected: Detected voice: technical
    - Assertions: Confidence > 0.7

15. **Test**: `voice_loader.py` handles missing profile
    - Command: `python voice_loader.py nonexistent`
    - Expected: Error message, exit code 1
    - Assertions: Graceful failure

16. **Test**: `voice_generator.py` validates generated YAML
    - Command: Generate profile, validate against schema
    - Expected: Valid YAML conforming to schema
    - Assertions: jsonschema validates successfully

17. **Test**: `voice_blender.py` handles weighted blend (80/20)
    - Command: Blend with `--weights 0.8 0.2`
    - Expected: Dominant voice weighted higher
    - Assertions: Dimensions closer to dominant voice

18. **Test**: `voice_analyzer.py` extracts vocabulary features
    - Command: Analyze technical text
    - Expected: High technical vocabulary density
    - Assertions: Technical terms detected

**AIWG Utils Python Scripts** (6 tests):

19. **Test**: `artifact_metadata.py` generates metadata
    - Command: `python artifact_metadata.py --artifact .aiwg/architecture/sad.md`
    - Expected: Metadata YAML with timestamps, authors
    - Assertions: Valid metadata structure

20. **Test**: `parallel_dispatcher.py` dispatches multiple tasks
    - Command: `python parallel_dispatcher.py --tasks task1,task2,task3`
    - Expected: All tasks executed (mock or noop)
    - Assertions: Exit code 0, all tasks logged

21. **Test**: `project_awareness.py` detects project phase
    - Command: `python project_awareness.py --root .`
    - Expected: Current phase detected (e.g., "Elaboration")
    - Assertions: Phase name returned

22. **Test**: `template_engine.py` loads and populates template
    - Command: `python template_engine.py --template sad-template.md --vars '{"project": "Test"}'`
    - Expected: Populated template with placeholders replaced
    - Assertions: No `{{placeholder}}` tokens remain

23. **Test**: `status_check.py` reports project status
    - Command: `python status_check.py`
    - Expected: JSON status report
    - Assertions: Valid JSON, includes phase, milestones

24. **Test**: `pattern_scanner.py` detects AI patterns
    - Command: `python pattern_scanner.py --text "Furthermore, it is important to note..."`
    - Expected: Detected patterns: ["Furthermore", "it is important to note"]
    - Assertions: Pattern count > 0

### Priority 3: Integration & Edge Cases (Ensures Robustness)

**End-to-End Workflows** (6 tests):

25. **Test**: Deploy skills + voice profiles to new project
    - Flow: `aiwg -deploy-agents --target /tmp/new-project --deploy-skills`
    - Expected: Skills deployed, voice templates available
    - Assertions: All 29 skills present, 4 voice templates accessible

26. **Test**: Apply voice profile to content
    - Flow: Load `technical-authority`, transform casual text
    - Expected: Text transformed to technical voice
    - Assertions: Formality increased, technical terms added

27. **Test**: Create custom voice, save, reload
    - Flow: Generate profile → save to `.aiwg/voices/` → reload
    - Expected: Profile persisted and reloadable
    - Assertions: Loaded profile matches generated profile

28. **Test**: Blend voices, apply to content
    - Flow: Blend 70% technical + 30% friendly → apply to text
    - Expected: Text with blended voice characteristics
    - Assertions: Tone reflects both voices weighted correctly

29. **Test**: Analyze existing content, extract voice, apply to new content
    - Flow: Analyze docs → extract profile → apply to new text
    - Expected: New text matches original voice
    - Assertions: Voice consistency score > 0.8

30. **Test**: Skill dependency resolution (skill references another skill)
    - Flow: Deploy skill that references `template-engine`
    - Expected: Both skills deployed, references resolved
    - Assertions: No broken references

**Error Handling & Edge Cases** (6 tests):

31. **Test**: Deploy skills to read-only directory
    - Input: Target directory without write permissions
    - Expected: Clear error message, graceful exit
    - Assertions: No partial deployment

32. **Test**: Load corrupted SKILL.md (invalid YAML)
    - Input: SKILL.md with syntax error in frontmatter
    - Expected: Parse error, skip skill
    - Assertions: Other skills still deploy

33. **Test**: Voice profile with invalid dimension values (outside 0-1)
    - Input: YAML with `formality: 1.5`
    - Expected: Schema validation failure
    - Assertions: Error indicates invalid range

34. **Test**: Voice blending with > 2 profiles (multi-way blend)
    - Input: Blend 3 profiles with equal weights
    - Expected: All dimensions averaged
    - Assertions: Vocabulary merged from all 3

35. **Test**: Voice analyzer with empty text
    - Input: Empty string
    - Expected: Default neutral voice or error
    - Assertions: Graceful handling, no crash

36. **Test**: Skill deployment with conflicting names
    - Input: Two skills with same name in different frameworks
    - Expected: Namespace conflict resolved (e.g., last-wins or error)
    - Assertions: Clear behavior documented

---

## 4. Testing Strategy & Implementation Plan

### Phase 1: Critical Path (Week 1)
**Goal**: Unblock production use with confidence

- **Day 1-2**: Skill loading & deployment (Tests 1-6)
  - Create `/test/unit/cli/skill-deployer.test.ts`
  - Mock filesystem for isolated testing
  - Target: 6 tests passing

- **Day 3**: Voice profile YAML validation (Tests 7-10)
  - Create `/test/unit/voice/voice-profile-loader.test.ts`
  - Use real YAML templates from `voices/templates/`
  - Validate against JSON schema
  - Target: 4 tests passing

- **Day 4-5**: Python script execution tests (Tests 11-18)
  - Create `/test/integration/voice-scripts.test.ts`
  - Spawn Python processes, validate outputs
  - Requires Python venv setup in CI
  - Target: 8 tests passing

**Deliverable**: 18 tests, ~70% coverage of critical paths

### Phase 2: Core Functionality (Week 2)
**Goal**: Ensure correctness of all new features

- **Day 6-7**: AIWG Utils Python scripts (Tests 19-24)
  - Create `/test/integration/aiwg-utils-scripts.test.ts`
  - Mock project structures for testing
  - Target: 6 tests passing

- **Day 8-9**: Integration workflows (Tests 25-30)
  - Create `/test/integration/skill-workflows.test.ts`
  - End-to-end scenarios (deploy → use → verify)
  - Target: 6 tests passing

**Deliverable**: 12 additional tests, ~85% coverage

### Phase 3: Robustness & Edge Cases (Week 3)
**Goal**: Harden against production failures

- **Day 10-12**: Error handling & edge cases (Tests 31-36)
  - Create `/test/unit/voice/edge-cases.test.ts`
  - Negative testing (invalid inputs, permissions)
  - Target: 6 tests passing

- **Day 13-14**: CI/CD integration
  - Add Python to GitHub Actions workflow
  - Ensure all Python scripts executable in CI
  - Add test coverage reporting

**Deliverable**: 6 additional tests, 95% coverage, CI passing

### Phase 4: Continuous Coverage (Ongoing)
- Add tests for every new skill (template in CONTRIBUTING.md)
- Maintain 80%+ coverage requirement
- Automated coverage drift detection in CI

---

## 5. Testing Infrastructure Requirements

### 5.1 Test Framework Extensions

**Current Setup** (Vitest):
- ✅ TypeScript compilation
- ✅ Vitest v2.1.0 configured
- ✅ Coverage with c8/v8
- ✅ 39 existing test files

**Required Additions**:
- ❌ Python test runner integration (pytest or unittest)
- ❌ Python venv setup in test runs
- ❌ YAML schema validation library (ajv or jsonschema)
- ❌ Filesystem mocking for skill deployment tests
- ❌ Process spawning helpers for Python script tests

### 5.2 CI/CD Changes

**Current CI** (`.github/workflows/`):
- ✅ Markdown linting
- ✅ Metadata validation
- ✅ TypeScript build

**Required Additions**:
```yaml
# .github/workflows/test.yml (new file)
name: Test Suite

on: [push, pull_request]

jobs:
  test-typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  test-python-scripts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: |
          python -m venv venv
          source venv/bin/activate
          pip install pyyaml jsonschema
      - run: |
          # Run Python script tests
          npm run test:python

  integration-tests:
    runs-on: ubuntu-latest
    needs: [test-typescript, test-python-scripts]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      - run: npm run test:integration
```

### 5.3 Test Data & Fixtures

**Required Test Fixtures**:
1. Sample SKILL.md files (valid, invalid, edge cases)
2. Sample voice profile YAMLs (valid, invalid, missing fields)
3. Sample text corpora for voice analysis (technical, casual, etc.)
4. Mock project structures (`.aiwg/` directories)
5. Mock skill dependency graphs

**Location**: `/test/fixtures/skills/` and `/test/fixtures/voices/`

---

## 6. Success Metrics

### Coverage Targets

| Component | Current | Target (Phase 1) | Target (Final) |
|-----------|---------|------------------|----------------|
| TypeScript (src/) | ~85% | 85% (maintain) | 90% |
| CLI Commands | 40% | 70% | 85% |
| Skills System | 0% | 60% | 80% |
| Voice Framework | 50% (TS only) | 75% | 85% |
| Python Scripts | 0% | 50% | 70% |
| Integration | 0% | 40% | 60% |
| **Overall** | ~45% | **65%** | **80%** |

### Test Quality Metrics

- **All tests pass in CI**: 100%
- **Flaky test rate**: < 2%
- **Test execution time**: < 5 minutes (unit + integration)
- **Test coverage drift**: Alert if coverage drops > 5%

### Functional Validation

- ✅ All 29 skills deploy successfully
- ✅ All 4 voice profiles load and validate
- ✅ All 10 Python scripts execute without errors
- ✅ End-to-end workflows pass (deploy → use → verify)
- ✅ Error scenarios handled gracefully (no crashes)

---

## 7. Risks & Mitigation

### Risk 1: Python Test Infrastructure Complexity
**Impact**: High - Python tests require venv, dependencies, cross-platform support
**Likelihood**: Medium
**Mitigation**:
- Use Docker for consistent Python environments
- Document Python setup in CONTRIBUTING.md
- Provide pre-configured dev containers

### Risk 2: Test Execution Time (Python Spawning)
**Impact**: Medium - Spawning Python processes is slow
**Likelihood**: High
**Mitigation**:
- Cache Python script outputs for unit tests
- Run integration tests in parallel
- Use faster Python test runners (pytest with xdist)

### Risk 3: YAML Schema Validation Complexity
**Impact**: Low - Schema validation adds dependency
**Likelihood**: Low
**Mitigation**:
- Use lightweight libraries (ajv, jsonschema)
- Schema validation optional for unit tests

### Risk 4: Test Maintenance Burden (29 Skills)
**Impact**: High - Every skill needs tests
**Likelihood**: High
**Mitigation**:
- Create skill test template (copy-paste for new skills)
- Automate test generation from SKILL.md metadata
- Parameterized tests for similar skill patterns

---

## 8. Actionable Next Steps

### Immediate (This Week)
1. **Create test infrastructure PR**:
   - Add `/test/unit/cli/skill-deployer.test.ts` (Tests 1-6)
   - Add `/test/unit/voice/voice-profile-loader.test.ts` (Tests 7-10)
   - Add Python setup to package.json scripts
   - Update vitest.config.js to include new test paths

2. **Setup CI for Python**:
   - Add `.github/workflows/test-python.yml`
   - Install Python dependencies in CI
   - Run Python script smoke tests

3. **Document testing standards**:
   - Add "Testing Skills" section to CONTRIBUTING.md
   - Provide skill test template
   - Document Python test conventions

### Short-Term (Next 2 Weeks)
4. **Implement Priority 1 tests (Tests 1-18)**:
   - All critical path tests passing
   - CI green with Python tests
   - Coverage report shows 65%+ overall

5. **Add integration tests (Tests 19-30)**:
   - End-to-end workflows validated
   - Python scripts tested in context
   - Coverage reaches 75%+

### Medium-Term (Next Month)
6. **Complete test suite (Tests 31-36)**:
   - All edge cases covered
   - Error handling validated
   - Coverage stable at 80%+

7. **Establish test quality gates**:
   - Block PRs if coverage drops
   - Require tests for new skills
   - Automated test generation for skills

---

## Appendix A: Test File Structure

```
/test/
├── unit/
│   ├── cli/
│   │   ├── skill-deployer.test.ts       [NEW - Tests 1-6]
│   │   ├── config-loader.test.ts        [EXISTS]
│   │   └── ...
│   ├── voice/
│   │   ├── voice-profile-loader.test.ts [NEW - Tests 7-10]
│   │   ├── edge-cases.test.ts           [NEW - Tests 31-36]
│   │   ├── voice-analyzer.test.ts       [EXISTS]
│   │   └── voice-calibration.test.ts    [EXISTS]
│   └── ...
├── integration/
│   ├── voice-scripts.test.ts            [NEW - Tests 11-18]
│   ├── aiwg-utils-scripts.test.ts       [NEW - Tests 19-24]
│   └── skill-workflows.test.ts          [NEW - Tests 25-30]
└── fixtures/
    ├── skills/
    │   ├── valid-skill/
    │   │   ├── SKILL.md
    │   │   └── scripts/example.py
    │   ├── invalid-skill/
    │   └── ...
    └── voices/
        ├── valid-profile.yaml
        ├── invalid-profile.yaml
        └── ...
```

---

## Appendix B: Example Test Case (Test #1)

```typescript
// /test/unit/cli/skill-deployer.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { listSkillDirs } from '../../../tools/agents/deploy-agents.mjs';
import path from 'path';

describe('Skill Discovery', () => {
  const voiceSkillsRoot = path.join(
    __dirname,
    '../../../agentic/code/addons/voice-framework/skills'
  );

  it('should discover all SKILL.md files in voice-framework', () => {
    const skillDirs = listSkillDirs(voiceSkillsRoot);

    expect(skillDirs).toHaveLength(4);
    expect(skillDirs).toContain('voice-apply');
    expect(skillDirs).toContain('voice-create');
    expect(skillDirs).toContain('voice-blend');
    expect(skillDirs).toContain('voice-analyze');
  });

  it('should validate SKILL.md exists in each skill directory', () => {
    const skillDirs = listSkillDirs(voiceSkillsRoot);

    for (const skillName of skillDirs) {
      const skillMdPath = path.join(voiceSkillsRoot, skillName, 'SKILL.md');
      expect(fs.existsSync(skillMdPath)).toBe(true);
    }
  });
});
```

---

## Appendix C: Python Test Example (Test #11)

```typescript
// /test/integration/voice-scripts.test.ts

import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

describe('Voice Loader Python Script', () => {
  const scriptPath = path.join(
    __dirname,
    '../../agentic/code/addons/voice-framework/skills/voice-apply/scripts/voice_loader.py'
  );

  it('should load technical-authority voice profile', async () => {
    const { stdout, stderr } = await execAsync(
      `python ${scriptPath} technical-authority`
    );

    expect(stderr).toBe('');
    const profile = JSON.parse(stdout);

    expect(profile.name).toBe('technical-authority');
    expect(profile.dimensions.formality).toBeCloseTo(0.7, 1);
    expect(profile.dimensions.confidence).toBeCloseTo(0.9, 1);
  }, 10000); // 10s timeout for Python execution
});
```

---

**End of Assessment**
