# Civic Action

Civic Action is an opt-in, vendor-neutral AIWG addon for evidence-bound civic
research, public-meeting reconciliation, public-records planning, public
technology review, local-resource indexing, corrections, and publication QA.

It prepares structured artifacts and local findings. It never autonomously
submits records requests, contacts people, identifies speakers, publishes
content, or makes legal conclusions. Those transitions require named human
review. A machine pass covers only the declared, schema-valid fields inspected
by that command; it is not factual verification, compliance, or authorization.

## Install and discover

```bash
aiwg use civic-action
aiwg discover "plan a public records request"
aiwg discover "reconcile a public meeting transcript with minutes"
aiwg discover "publish cited local public information"
```

## Executable gates

```bash
aiwg civic source-gate source-registry.json
aiwg civic meeting-gate vote-ledger.json reconciliation.json
aiwg civic publish-gate publication-packet.json
```

All commands write a JSON report to stdout. Exit `0` means no blocking
finding, exit `1` means one or more `block` findings, and exit `2` means invalid
input or usage. Warnings remain in the report for human disposition.

## Capability map

| Need | Artifact |
|---|---|
| Public-source acquisition and reuse | `source-compliance-gate`, source registry schema/template |
| Civic newsroom planning | `civic-newsroom-plan`, newsroom FlowPlaybook |
| Meeting transcript, vote, and minutes | `public-meeting-reconcile`, vote/reconciliation schemas and flow |
| Public-records preparation | `public-records-plan`, planning schema/template and manual-submission gate |
| Public-technology evidence review | `public-technology-review`, neutral evidence/risk contract |
| Newsroom personas and corrections | four bounded agents plus `editorial-correction-review` |
| Publication QA | `civic-publish-gate`, gate-result schema and human publication gate |
| Local public resources | `local-resource-index`, CAP/GTFS/HSDS profile contract |

Optional frameworks add research, transcription, knowledge-base, editorial,
operations, and security capabilities. If absent, skills emit an explicit
`blocked-dependency-missing` or `manual-review-required` state; they do not
claim those checks ran.

See `docs/overview.md`, `docs/quickstart.md`, and the cited research reports in
`docs/research/` for the design basis and limitations.
