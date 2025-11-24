# Use-Case Brief

## Metadata

- ID: UC-003
- Owner: Requirements Analyst
- Contributors: System Analyst, Intake Coordinator
- Reviewers: Requirements Reviewer
- Team: SDLC Framework - Inception Phase
- Stakeholders: Solo Developers, Small Teams, Enterprise Teams (brownfield projects)
- Status: approved
- Dates: created 2025-10-17 / updated 2025-10-17 / due N/A
- Related: REQ-SDLC-003 (Intake Generation), REQ-SDLC-004 (Codebase Analysis)
- Links: /.claude/commands/intake-from-codebase.md

## Related templates

- agentic/code/frameworks/sdlc-complete/templates/intake/ (3 intake forms)
- agentic/code/frameworks/sdlc-complete/agents/intake-coordinator.md

## Identifier

- ID: UC-003
- Name: Generate Intake Documents from Existing Codebase

## Summary

Solo developers formalizing existing projects need intake documents without manual form-filling friction. The intake-from-codebase command analyzes git history, code structure, dependencies, and documentation to auto-generate 3 intake forms (project-intake, technical-intake, stakeholder-intake) in <5 minutes, enabling rapid progression from brownfield codebase to structured SDLC workflows.

## Actors & Preconditions

- Primary actor(s): Solo developer, technical lead, project manager inheriting existing codebase
- Preconditions:
  - Existing codebase with git history (at least 10+ commits for meaningful analysis)
  - SDLC commands deployed (aiwg -deploy-commands --mode sdlc)
  - Project contains typical artifacts (README.md, package.json/requirements.txt, source code)
  - Claude Code or compatible LLM coding assistant available

## Main Success Scenario

1. User navigates to existing project directory: `cd /path/to/existing-project`
2. User invokes intake generation: `/intake-from-codebase .`
3. Intake Coordinator agent analyzes codebase:
   - Git history (commit frequency, contributors, activity timeline)
   - Code structure (language, framework, architecture patterns)
   - Dependencies (package.json, requirements.txt, Gemfile, etc.)
   - Documentation (README.md, CONTRIBUTING.md, wiki pages)
   - Issue tracker (if GitHub repo, analyze open/closed issues)
4. Agent generates 3 intake forms:
   - `project-intake.md`: Vision, goals, stakeholders, success criteria
   - `technical-intake.md`: Tech stack, architecture, constraints, dependencies
   - `stakeholder-intake.md`: User personas, team structure, communication patterns
5. Agent saves forms to `.aiwg/intake/` directory
6. User reviews generated intake forms for accuracy (80-90% accuracy expected, user edits remaining 10-20%)
7. User optionally invokes interactive refinement: `/intake-from-codebase . --interactive` (agent asks strategic questions to fill gaps)
8. User validates intake completeness: `/intake-start .aiwg/intake/` (checks for required fields, warns if gaps exist)

## Postconditions

- 3 intake documents created in `.aiwg/intake/` (project-intake.md, technical-intake.md, stakeholder-intake.md)
- 80-90% of intake fields auto-populated from codebase analysis (user edits remaining 10-20%)
- User can proceed to Inception phase workflows without manual form-filling
- Codebase context captured for future SDLC artifact generation (requirements, architecture, testing)

## Success Criteria (Quantifiable)

- 3 intake documents generated in <5 minutes (single command invocation)
- 80-90% field accuracy (measured via user edits required: target <20% field modifications)
- User-reported time savings: 30-60 minutes saved vs manual intake form completion
- 100% of critical fields populated (project name, tech stack, primary language, repository URL)
- Zero data loss (agent reads codebase, never modifies existing files)

## Priority

**HIGH** - Critical for brownfield project adoption, primary use case for Solo Developers formalizing existing work

## Effort Estimate

**User Effort**:
- Initial invocation: <1 minute (single command)
- Review and edit generated intake: 10-20 minutes (validate accuracy, fill gaps)
- Interactive refinement (optional): +5-10 minutes (answer strategic questions)
- **Total**: 15-30 minutes (vs 60-90 minutes manual form-filling)

**Agent Processing**:
- Codebase analysis: 2-4 minutes (depends on repository size)
- Intake generation: 1-2 minutes (template population)
- **Total**: <5 minutes for end-to-end generation

**Learning Curve**: 0 minutes (command generates documents automatically, no user learning required)

## Notes

**Open Questions**:
- Should agent analyze issue tracker (GitHub Issues, Jira) to infer stakeholder needs and pain points?
- How to handle multi-language codebases (polyglot projects with Python backend + React frontend)?
- Should agent detect project phase (early prototype vs mature product) and adjust intake depth accordingly?

**Risks**:
- Inaccurate inference: Agent misinterprets codebase structure, generates incorrect intake (mitigation: interactive refinement mode for user validation)
- Missing context: Codebase lacks documentation, git history is sparse (mitigation: agent flags low-confidence fields, prompts user for manual input)
- Large codebases: Analysis times out or overwhelms context window (mitigation: sample-based analysis for repos >1000 files)

**Dependencies**:
- Git repository with meaningful history (at least 10+ commits)
- Readable documentation (README.md improves accuracy by 40-60%)
- Standard dependency files (package.json, requirements.txt, etc.)
- Intake Coordinator agent deployed (aiwg -deploy-agents --mode sdlc)

**Future Enhancements**:
- GitHub API integration (analyze issues, PRs, releases for deeper context)
- Multi-repository analysis (monorepo support, microservices architecture)
- Confidence scoring (agent reports certainty level for each generated field)
- Incremental updates (re-run command to refresh intake as codebase evolves)
- Template customization (users provide custom intake templates for domain-specific fields)
