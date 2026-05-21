---
artifact_type: use_case
id: UC-NUA-001
study: novice-user-adoption
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-001: Non-technical user installs AIWG and uses it on a project

## Reasoning

1. **Problem analysis** — The end-to-end novice journey from "I heard about AIWG" to "I'm getting AIWG-quality output in my project" has unmeasured failure rates. This UC is the umbrella covering the journey; the workstream-specific UCs (002–007) cover its stages.
2. **Constraint identification** — Most novice users do not understand the difference between user-scope and project-scope tools. The journey must accommodate users who think of AIWG like an app, not a developer tool.
3. **Alternative consideration** — Options considered: (a) treat AIWG as power-user-only and accept current adoption ceiling; (b) build a wizard-only path; (c) keep current default and add guard-rails. Chose (c) augmented with optional wizard.
4. **Decision rationale** — Augment the existing flow rather than replace it. Power users keep their current path; novices get warnings and an optional wizard.
5. **Risk assessment** — Augmenting risks adding friction. Mitigated by making warnings non-blocking and the wizard opt-in.

## Primary Actor

Novice User (non-CS background, basic CLI familiarity, no prior AIWG exposure)

## Goal

Get AIWG operating correctly in the user's project so that AI sessions in that project benefit from AIWG's discover/skill/agent/KB routing.

## Preconditions

- User has read the AIWG landing page or been referred by a colleague
- User has Node.js installed (or equivalent runtime AIWG supports)
- User has at least one AI provider configured locally

## Main Success Scenario

1. User installs AIWG (`npm install -g aiwg` or plugin marketplace)
2. User navigates to a project directory
3. User runs `aiwg use sdlc` (or another framework appropriate to their need)
4. AIWG deploys artifacts to the appropriate platform path
5. User opens an AI session in the project directory
6. User asks the agent a question AIWG can help with
7. Agent invokes `aiwg discover`, finds relevant skills/agents, applies them
8. User receives discernibly higher-quality output than from a plain agent session

## Alternative Flows

**A1 — User runs `aiwg use` in $HOME or a non-project directory** (UC-NUA-002 handles)

**A2 — User does not know what framework to install** (UC-NUA-003 wizard handles)

**A3 — User wants AIWG available globally without per-project setup** (UC-NUA-004 handles)

**A4 — Agent does not invoke discover** (UC-NUA-005 handles — covers per-platform hookup)

## Postconditions

- AIWG artifacts are deployed to the correct platform path for the user's provider
- The agent on subsequent sessions in this project actually uses the discover/skill/agent/KB routing
- User can articulate, at minimum, that "AIWG is helping" — without needing to articulate how

## Acceptance Criteria

- [ ] A user with no prior AIWG exposure can complete steps 1–6 without consulting documentation beyond the landing page
- [ ] At least 80% of novice users in a Cognitive Walkthrough complete step 7 (agent invokes discover) without intervention
- [ ] At least 50% of novice users can correctly answer "is AIWG engaged in this session?" after one successful interaction

## References

- Parent journey: epic roctinam/aiwg#1334
- Child UCs: UC-NUA-002 through UC-NUA-007
- Research: REF-943 (Krug, self-evidence), REF-947 (Zamfirescu-Pereira, novice failure modes)
