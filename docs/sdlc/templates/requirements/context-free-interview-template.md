# Context-Free Interview Script

> Use this script to elicit stakeholder or user problems, context, and desired outcomes without biasing the conversation with implementation ideas.

## Ownership & Collaboration
- Document Owner: System Analyst
- Contributor Roles: Business Process Analyst, Requirements Reviewer
- Automation Inputs: Stakeholder profile, interview goals
- Automation Outputs: `interview-session-notes.md` aligned to sections 2–11

## 1 Preparation
- Identify stakeholder / user role.
- Schedule session, confirm recording or note-taking approach.

## 2 Establish Stakeholder or User Profile
- Name, company/industry
- Job title and key responsibilities
- Deliverables produced and consumers
- Success metrics and inhibitors
- Influential trends affecting the role

## 3 Assess the Problem Space
- Which `<application type>` problems lack good solutions?
- Why do these problems exist today?
- How are they solved currently?
- How would the stakeholder prefer to solve them?
- Continue probing (“Anything else?”) until no further issues emerge.

## 4 Understand the User Environment
- Who are the end users? What are their backgrounds?
- Platform landscape (current and planned)
- Complementary applications requiring integration
- Usability expectations and training tolerance
- Documentation (online and hard-copy) requirements

## 5 Recap for Understanding
- Restate problems in your own words and confirm accuracy.
- Ask if additional problems exist beyond those discussed.

## 6 Present Analyst Inputs (if appropriate)
- Introduce observed or suspected problems for validation.
- For each proposed problem, ask: Is it real? Causes? Current workaround? Desired solution? Relative priority?

## 7 Assess Potential Solution Concepts
- Share high-level “What if you could…“ capability statements.
- Capture stakeholder’s perceived value and priority for each capability.

## 8 Evaluate Opportunity Size
- Identify other impacted stakeholders or teams.
- Estimate number of users and perceived business value of a solution.

## 9 Reliability, Performance, and Support Expectations
- Reliability, availability, and performance targets
- Support model, maintenance expectations, security, installation, configuration, licensing, packaging, distribution requirements
- Regulatory or environmental constraints

## 10 Wrap-Up
- Ask for remaining questions or concerns.
- Confirm permission for follow-up and potential participation in reviews.

## 11 Analyst Summary
- Record top three to four problems/opportunities highlighted.
- Note immediate follow-up actions or research tasks.

## Interview Artifacts
- Attach notes, recordings, or summaries in `docs/sdlc/artifacts/<project>/interviews/`.

## Agent Notes
- Summarize interview outcomes in Section 11 so they can feed stakeholder requests automatically.
- Record consent for follow-ups and review participation when applicable.
- Verify the Automation Outputs entry is satisfied before signaling completion.
