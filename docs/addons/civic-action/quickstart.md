# Civic Action quickstart

> **First time using AIWG?** Begin with [Install, Connect, and
Verify](../../getting-started/install-connect-verify.md). This guide assumes AIWG is connected to the target project
and your provider session can read the deployed context.

## Ask the steward to set up Civic Action

Use the AIWG steward for the safest setup path. This prompt asks it to distinguish
the canonical addon from any provider plugin wrapper, preview changes, and prove
that the deployment works before civic work begins:

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

If you explicitly prefer terminal operation or automation, the
[Civic Action CLI reference](https://docs.aiwg.io/pages/cli--reference.html#civic-action)
shows the direct `use` setup and validation commands. The rest of this guide
uses prompts because the steward and civic skills carry the safety context that
bare commands do not.

## Ask for an evidence-bound workflow

Choose the prompt closest to your outcome and attach or identify the available
source material. The agent should ask for missing jurisdiction and approval
details instead of guessing them.

### Review a public source

```text
Review this public source before acquisition or reuse. Establish the publisher,
jurisdiction, access method, authorization, current terms and publication
rights, retrieval identity, freshness deadline, citation selector, fallback,
and named human review. Treat unknown, stale, expired, or bypassed conditions
as findings rather than assumptions. Return the source registry and gate report;
do not acquire restricted material.
```

### Plan a public-records request

```text
Plan a public records request for human review. Research the applicable
jurisdiction and existing public sources first, draft a narrow request, separate
estimated dates from observed events, identify privacy and fee risks, and show
the proposed tracking record. Stop before submission and ask a named person to
approve the exact request.
```

### Reconcile a public meeting

```text
Reconcile this public meeting's official source media, transcript, vote ledger,
agenda, and approved minutes. Confirm recording and use are allowed for the
jurisdiction before processing. Preserve speaker uncertainty, never infer an
absent vote, distinguish draft from approved minutes, and cite every motion,
vote, and material mismatch. Return the ledger and reconciliation packet for
named human review; do not publish it.
```

### Review public technology

```text
Review this public-technology procurement using primary public records and
source-linked evidence. Inventory the relevant request, bid, contract, policy,
meeting, payment, and oversight records; distinguish verified facts from claims;
and map privacy, accessibility, security, interoperability, resilience, fiscal,
and supplier risks to evidence. Do not rank vendors or recommend an award.
```

### Index local public resources

```text
Create a cited local-resource index from the authoritative CAP, GTFS, or HSDS
source I provide. Preserve the original source and retrieval identities, bind
the record to the correct format profile, validate freshness and public scope,
and keep correction and takedown review visible. Report incomplete or unsafe
records as blocked; do not present this as full standards conformance.
```

### Prepare a correction

```text
Review this proposed correction against the original and replacement artifacts.
Identify every changed claim, supporting citation, affected downstream target,
privacy or safety concern, and required revalidation. Preserve append-only
version history and distinguish requested reindexing from observed completion.
Return a correction record for independent human approval; do not publish it.
```

### Review a publication packet

```text
Review this civic publication packet for release readiness. Verify every
material claim has a source, retrieval, and selector; inspect contrary evidence,
freshness, privacy, accessibility, structured data, corrections, upstream gates,
and deployment checks; and require independent, dated approval of the exact
artifact hash. Report every warning and blocker. Do not publish anything.
```

## Expected handoff

The agent should return the artifacts it created or updated, source-linked
findings, gate results, unresolved assumptions, unavailable optional
capabilities, and the named human decisions still required. A machine result
with no blocker is not permission to submit, contact, record, identify, or
publish. Those remain separate external actions.
