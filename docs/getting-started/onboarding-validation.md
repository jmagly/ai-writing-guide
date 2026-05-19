# Onboarding Validation

Use this page to validate whether the beginner path actually helps a new user reach first success.

This is a lightweight validation loop. It does not require invasive telemetry.

A docs change is not finished when it reads well to maintainers. The problem to measure is activation: can a new user move through 5 milestones, from Start Here to one useful AIWG workflow, without already knowing AIWG vocabulary?

We chose manual dry-run notes first because the project does not need telemetry to learn whether the path broke. While a larger sample would be better, 1 recorded novice session is enough to expose the first serious issue; 3 sessions across 2 providers is the better follow-up target.

Validation baseline: test this checklist against AIWG version 2026.5. While the sample target is small, maintainers should record any issue that failed inside the first 300s of a novice dry run.

## Activation Milestones

Track whether the user reaches each milestone:

| Milestone | Evidence to record |
|---|---|
| Landed on beginner docs | Page link shared, support thread, or session note. |
| Installed or confirmed AIWG | `aiwg -version` result or existing provider integration. |
| Ran guided setup | `aiwg wizard --dry-run` or `aiwg wizard` output. |
| Verified engagement | `aiwg status --probe --json` result. |
| Completed one useful workflow | Short note naming the command, skill, or agent outcome. |

## Cognitive Walkthrough Checklist

For Start Here, the first-success recipes, the wizard, plus the status probe, ask:

| Question | Pass signal |
|---|---|
| Will a beginner know where to start? | The first link or command is obvious. |
| Will they know where to run commands? | The guide says to use the project root before deploy. |
| Will they know which provider/tool they are using? | Provider handoff gives a plain tool name and flag. |
| Will they know what AIWG did? | The status probe gives engaged state and next action. |
| Will they know what to do when stuck? | Recovery prompts and troubleshooting links are visible. |
| Can they avoid catalog overload? | Steward/discover instructions ask for one path and one fallback. |

## Low-Friction Evidence Sources

Use one or more:

- opt-in novice session notes;
- issue reports tagged to onboarding;
- support thread counts before and after docs changes;
- short survey answers after a first session;
- manual cognitive walkthrough notes from a maintainer.

Do not collect secrets, private project files, or model transcripts without explicit permission.

Minimum useful sample: 1 recorded novice dry run before calling the path validated. Better sample: 3 dry runs across at least 2 providers, because local deployment and provider-session behavior are different evidence types.

## Dry-Run Note Template

```markdown
## Novice Dry Run

- Date:
- Participant type:
- Provider:
- Project type:
- Starting page:
- Milestones reached:
- First blocker:
- Recovery path used:
- First useful output:
- Follow-up issues:
```

## Research Coordination

Research citation cleanup and provider field validation are separate maintenance tracks. This page tracks whether the beginner path works as a product path after docs and wizard/status changes land.

For the current 2024-2026 evidence refresh, see [Onboarding Research Refresh](onboarding-research-refresh.md).

## Related

- [Start Here](start-here.md)
- [Provider Handoff](provider-handoff.md)
- [Scope And Recovery](scope-and-recovery.md)
- [Onboarding Research Refresh](onboarding-research-refresh.md)
