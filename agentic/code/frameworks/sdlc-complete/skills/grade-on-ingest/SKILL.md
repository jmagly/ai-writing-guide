# GRADE-on-Ingest

Automatically triggers GRADE quality assessment when new research sources or findings are added to the corpus.

## Triggers

- "add research source"
- "new finding"
- "ingest paper"
- "add reference"
- "import study"
- "register source"
- "cite new paper"

## Purpose

Ensures every research source entering the corpus receives a GRADE quality assessment at ingestion time, preventing unassessed sources from being cited without quality context. Implements the "assess at entry" pattern to maintain corpus-wide quality visibility.

## Activation Conditions

This skill activates when:

1. **New file created** in `.aiwg/research/sources/` or `.aiwg/research/findings/`
2. **File pattern matches**: `REF-*.md`, `*.pdf` added to research directories
3. **Agent activity**: Any agent writes to research corpus directories
4. **Manual trigger**: User requests source assessment

### Skip Conditions

- File is in `.aiwg/research/quality-assessments/` (already an assessment)
- File is `INDEX.md` or `README.md`
- File is a schema or template (`*.yaml` in schemas/)
- Assessment already exists for this REF-ID

## Behavior

When a new research source is detected:

1. **Extract metadata**
   - Parse YAML frontmatter from source document
   - Extract `ref_id`, `title`, `authors`, `year`, `source_type`
   - If frontmatter missing, prompt agent to add it

2. **Determine baseline quality**
   - Map source type to GRADE baseline:
     - `peer_reviewed_journal` -> HIGH
     - `peer_reviewed_conference` -> HIGH
     - `preprint` -> MODERATE
     - `technical_report` -> MODERATE
     - `industry_whitepaper` -> LOW
     - `blog_post` -> VERY LOW
     - `forum_discussion` -> VERY LOW

3. **Invoke Quality Assessor**
   - Delegate to Quality Assessor agent for full GRADE assessment
   - Pass source metadata and content
   - Request assessment in YAML format

4. **Store assessment**
   - Save to `.aiwg/research/quality-assessments/{ref-id}-assessment.yaml`
   - Update source frontmatter with `grade_level` field (if `--update-frontmatter`)

5. **Update corpus index**
   - Add entry to quality assessment index
   - Update GRADE distribution statistics
   - Flag if corpus has > 30% unassessed sources

6. **Report**
   - Display assessment summary to user
   - Include hedging language recommendations
   - Warn if source quality is LOW or VERY LOW

## Agent Orchestration

- **Primary**: Quality Assessor (performs the assessment)
- **Supporting**: Citation Verifier (validates existing citations of this source after assessment)
- **Notification**: Technical Writer, Documentation Synthesizer (if source is cited in existing docs, notify of GRADE level)

## Integration

### With Citation Guard

After assessment completes, Citation Guard uses the GRADE level to enforce hedging:

```yaml
integration:
  citation_guard:
    action: update_grade_cache
    data: new_assessment
```

### With Research Metadata

Assessment populates fields required by research metadata rules:

```yaml
integration:
  research_metadata:
    fields_populated:
      - quality_assessment.grade_level
      - quality_assessment.baseline
      - quality_assessment.downgrade_factors
      - quality_assessment.upgrade_factors
```

### With Provenance Tracking

Assessment activity recorded in provenance chain:

```yaml
integration:
  provenance:
    activity_type: quality_assessment
    agent: quality-assessor
```

## Configuration

```yaml
skill:
  name: grade-on-ingest
  type: passive
  always_active_for:
    - quality-assessor
    - technical-researcher
    - citation-verifier
  file_triggers:
    - pattern: ".aiwg/research/sources/REF-*.md"
    - pattern: ".aiwg/research/findings/REF-*.md"
  auto_assess: true
  update_frontmatter: false  # Requires --update-frontmatter flag
  notify_on_low_quality: true
  block_on_missing_frontmatter: false
```

## Output Locations

- Assessment: `.aiwg/research/quality-assessments/{ref-id}-assessment.yaml`
- Updated frontmatter: Source document (if `--update-frontmatter`)
- Index update: `.aiwg/research/quality-assessments/INDEX.md`

## References

- @agentic/code/frameworks/sdlc-complete/agents/quality-assessor.md - Assessment agent
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- @agentic/code/frameworks/sdlc-complete/schemas/research/quality-dimensions.yaml - Quality schema
- @.claude/rules/research-metadata.md - Metadata requirements
- @.claude/rules/citation-policy.md - Citation policy
- @agentic/code/frameworks/sdlc-complete/skills/citation-guard/SKILL.md - Citation guard
