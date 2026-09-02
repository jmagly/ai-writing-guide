# Civic Action

Civic Action is an opt-in, vendor-neutral AIWG addon for evidence-bound civic
research, public-meeting reconciliation, public-records planning, public
technology review, local-resource indexing, corrections, and publication QA.

It prepares structured artifacts and local findings. It never autonomously
submits records requests, contacts people, identifies speakers, publishes
content, or makes legal conclusions. Those transitions require named human
review. A machine pass covers only the declared, schema-valid fields inspected
by that command; it is not factual verification, compliance, or authorization.

## Ask the steward to set it up

Start in your agent conversation. The steward can inspect the provider and
workspace, preview the opt-in installation, preserve existing configuration,
and verify the deployed agents, skills, flows, and gates:

```text
Act as the AIWG steward and set up Civic Action for this project. Inspect the
current AIWG and provider configuration first. Explain whether you will enable
the canonical civic-action addon directly or through an available provider
plugin wrapper, preview every file or setting that will change, preserve local
customizations, and ask for approval before writing. After setup, verify that
the civic skills, agents, flows, templates, schemas, and validation gates are
discoverable. Report any unavailable optional integration and its degraded
mode. Do not submit, contact, record, identify, or publish anything.
```

Then describe the civic outcome rather than selecting implementation commands:

```text
Plan a public records request for human review using authoritative sources and
the correct jurisdiction. Preserve uncertainty, identify every required human
decision, and stop before submission.
```

Advanced operators and automation can use the direct addon installation and
gate commands documented in the
[Civic Action CLI reference](https://docs.aiwg.io/pages/cli--reference.html#civic-action).
Command results remain review evidence: they never authorize an external civic
action.

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
operations, and security capabilities. If absent, skills instruct the agent or
reviewer to report a blocked dependency or manual-review requirement; they do
not claim those checks ran.

See `docs/overview.md`, the prompt catalog in `docs/quickstart.md`, and the cited
research reports in `docs/research/` for the design basis and limitations.
