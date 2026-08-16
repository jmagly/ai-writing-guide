# AIWG Research Evaluation Harness

This fixture expresses the existing research-evaluation playbook as inspectable
policy. It is a comparison target, not authority to execute external work.

## Stages

- MUST [stage-ingest]: Validate the reviewed corpus input before analysis.
- MUST [stage-evaluate]: Run the pinned research evaluation flow.
- MUST [stage-verify]: Verify claims independently before promotion.

## Roles

- MUST [role-evaluator]: Bind evaluation to the documented evaluator role.
- SHOULD [role-observer]: A human observer may review the plan before dispatch.

## State Rules

- MUST [state-transition]: Permit only declared state transitions.

## Verification Rules

- MUST [verify-evidence]: Reject promotion without evidence-integrity validation.

## Evidence Contract

- MUST [evidence-export]: Export the activity/provenance evidence package.

## Stopping Conditions

- MUST [stop-on-hold]: Stop when the evaluator returns HOLD or ROLLBACK.
- MUST [stop-manual]: Pause at the final human promotion gate.

## Execution Map

<!-- nlah:execution-map:start -->
```json
{
  "version": "1",
  "comparison": {
    "current_flow": "agentic/code/frameworks/research-complete/flows/research-evaluation.md",
    "preserved": ["corpus validation", "independent verification", "evidence export", "promotion stopping gates"],
    "differences": ["clause-to-mechanism mappings are explicit", "ambiguous prose is reported but not executable", "dispatch remains plan-only pending runtime authorization"]
  },
  "modules": [
    {
      "id": "core-flow",
      "clauses": [
        {"id": "stage-ingest", "kind": "validator", "target": "research-corpus-input", "stage": "ingest"},
        {"id": "stage-evaluate", "kind": "flow", "target": "research-evaluation", "stage": "evaluate"},
        {"id": "role-evaluator", "kind": "agent", "target": "eval-reviewer", "stage": "evaluate"},
        {"id": "state-transition", "kind": "validator", "target": "evaluation-state-machine", "stage": "evaluate"}
      ]
    },
    {
      "id": "verifier",
      "clauses": [
        {"id": "stage-verify", "kind": "validator", "target": "independent-claim-check", "stage": "verify"},
        {"id": "verify-evidence", "kind": "validator", "target": "eval-integrity-gate", "stage": "verify"}
      ]
    },
    {
      "id": "evidence-and-stop",
      "clauses": [
        {"id": "evidence-export", "kind": "script", "target": "activity-evidence-export", "stage": "package"},
        {"id": "stop-on-hold", "kind": "validator", "target": "promotion-decision-gate", "stage": "stop"},
        {"id": "stop-manual", "kind": "manual", "target": "maintainer-promotion-approval", "stage": "stop"}
      ]
    }
  ]
}
```
<!-- nlah:execution-map:end -->

The verifier module is the first ablation target. Removing it must be reported
as two newly unmapped clauses, never silently treated as an executable harness.

@implements #2043
