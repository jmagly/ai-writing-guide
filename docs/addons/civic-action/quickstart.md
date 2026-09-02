# Civic Action quickstart

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed and connected to the target project.

Ask the agent to make the opt-in addon available before starting work:

```text
Enable AIWG's civic-action capabilities for this project. Preview any files
or provider configuration that will change, preserve existing work, ask for
approval where required, and verify the addon is available when finished.
```

Start with a natural-language ask:

```text
Plan a public records request for human review.
Reconcile this public meeting transcript with the approved minutes.
Review this public technology procurement using source-linked evidence.
Index local emergency, transit, and human-service resources with citations.
Run civic publication quality gates on this evidence packet.
```

For source acquisition, ask the agent to copy `templates/source-registry.yaml`,
replace every unknown state with observed evidence, and obtain named review:

```text
Validate this civic source registry. Check every source identity, acquisition
record, content hash, license or terms state, privacy and accessibility review,
and named human approval. Do not treat unknown evidence as a pass. Report each
blocking item with its source-linked evidence.
```

For meetings, preserve separate source media, transcript, ledger, and minutes
artifacts. Do not replace `SPEAKER_XX` with a name without evidence and human
confirmation:

```text
Reconcile this public meeting's source media, transcript, vote ledger, and
approved minutes. Preserve speaker uncertainty, require evidence and human
confirmation for identity changes, and report every mismatch with citations.
```

For publication, supply claim-level citations, privacy and accessibility
reviews, correction state, upstream gates, and exact-hash human approval:

```text
Review this civic publication packet for release readiness. Verify claim-level
citations, privacy and accessibility review, correction state, upstream gates,
and exact-hash human approval. Report blockers and do not publish anything.
```

A machine result with no blocker is not permission to publish. Invalid inputs
or blocking findings must be corrected and reviewed. Human publication remains
a separate external action. Exact automation syntax and result codes are kept
in the [CLI reference](../../cli/reference.md).
