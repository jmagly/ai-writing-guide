# Test Evaluation Summary Template

Adapted from the original RUP template: https://files.defcon.no/RUP/webtmpl/templates/test/rup_tsteval.htm

## Purpose
Summarize testing results at the end of an iteration, release, or major test cycle to inform go/no-go decisions.

## Ownership & Collaboration
- Document Owner: Test Engineer
- Contributor Roles: Test Architect, Project Manager
- Automation Inputs: Executed test results, defect logs, coverage metrics
- Automation Outputs: `test-evaluation-summary.md` with sections 1–9

## Completion Checklist
- Test execution metrics captured with context
- Defect summary mapped to severity and resolution status
- Recommendations and outstanding risks clearly stated

## Document Sections
1. **Overview**
   - Identify test cycle, dates, scope, and responsible teams.
2. **Objectives**
   - Restate what the test cycle aimed to validate.
3. **Execution Summary**
   - Provide statistics (tests executed/passed/failed, automation coverage, duration).
4. **Defect Summary**
   - Present defect counts by severity/priority and status.
   - Highlight critical defects blocking release.
5. **Key Findings**
   - Describe significant observations, trends, or unexpected behavior.
6. **Quality Assessment**
   - Evaluate whether quality goals and exit criteria were met.
7. **Risks and Recommendations**
   - Identify remaining risks, mitigation actions, and go/no-go recommendation.
8. **Follow-Up Actions**
   - List required actions, owners, and due dates.
9. **Appendices**
   - Link to detailed logs, dashboards, and defect reports.

## Agent Notes
- Use concise tables or bullet lists for metrics to aid quick review.
- Align severity nomenclature with the Defect Management process.
- Provide narrative context for metrics to help stakeholders interpret results.
- Verify the Automation Outputs entry is satisfied before signaling completion.
