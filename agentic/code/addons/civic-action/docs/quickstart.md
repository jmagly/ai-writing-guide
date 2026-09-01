# Civic Action quickstart

Install the opt-in addon:

```bash
aiwg use civic-action
```

Start with a natural-language ask:

```text
Plan a public records request for human review.
Reconcile this public meeting transcript with the approved minutes.
Review this public technology procurement using source-linked evidence.
Index local emergency, transit, and human-service resources with citations.
Run civic publication quality gates on this evidence packet.
```

For source acquisition, copy `templates/source-registry.yaml`, replace every
unknown state with observed evidence, obtain named review, then run:

```bash
aiwg civic source-gate source-registry.json
```

For meetings, preserve separate source media, transcript, ledger, and minutes
artifacts. Do not replace `SPEAKER_XX` with a name without evidence and human
confirmation:

```bash
aiwg civic meeting-gate vote-ledger.json reconciliation.json
```

For publication, supply claim-level citations, privacy and accessibility
reviews, correction state, upstream gates, and exact-hash human approval:

```bash
aiwg civic publish-gate publication-packet.json
```

Exit `0` means no machine block, not permission to publish. Exit `1` is a
blocking result. Exit `2` is invalid input/usage. Human publication remains a
separate external action.
