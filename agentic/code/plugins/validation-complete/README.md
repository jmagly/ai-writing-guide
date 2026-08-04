# Validation Complete

Validation Complete is the executable contract for release-provider validation.
It converts the provider normalization matrix in
`docs/contributing/release-validation-procedure.md` section 7 into AIWG Flow
resources:

- `capabilities/provider-normalization.yaml` contains one `WorkflowCapability`
  document per gap row in the procedure.
- `playbooks/provider-validation.yaml` contains one `WorkflowPlaybook` per
  provider.
- `playbooks/validate-all-providers.yaml` fans out to all provider playbooks.
- `inventories/validation-providers.yaml` records the 11 validation targets and
  whether each provider is programmatic or human gated.

The current executor contract is the core `workflow.aiwg.io/v1` metalanguage in
`agentic/code/addons/aiwg-utils/workflow/`. Live execution should write run
evidence under `.aiwg/workflow/runs/<run-id>/`, including `audit.jsonl` and a
release matrix report.

## Migration Plan

1. Keep `docs/contributing/release-validation-procedure.md` as the human-readable
   procedure and source narrative.
2. Update the Flow capabilities whenever section 7 changes; each matrix row must
   have exactly one capability whose labels identify `provider` and `gap`.
3. Run provider playbooks in parallel with the manual process for the next stable
   release cycle.
4. Treat human-gated provider steps as first-class evidence: the gate captures
   the prompt, verdict, and transcript excerpt rather than requiring a separate
   issue comment.
5. After two stable releases with matching manual and Flow verdicts, make
   `validate-all-providers` the primary release-readiness matrix and leave the
   manual procedure as the fallback for providers without a programmatic session
   interface.

## Runtime and Cost Bounds

The live pass uses lowest-tier paid accounts for each provider. A full run is
bounded to one fresh project deployment plus the provider-specific checks in
section 7. Session-gated checks should capture `pass`, `fail`, or `unsure` after
one prompt attempt; the runner should not retry expensively unless a maintainer
explicitly authorizes the extra cost.

## Failure Evidence

Every failed or unsure step must record:

- provider and capability name
- exact prompt or shell command
- verbatim agent reply or command output
- expected matcher
- follow-up issue hint from the capability description

The aggregator uses those fields to populate the release validation epic and any
follow-up issue.
