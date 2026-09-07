# Session exploration validation

Validated on 2026-09-07 alongside CLI issues #2305–#2307.

## Coverage

- The real-corpus discovery suite exercises all four sessions registry triggers
  through local and Fortemi Core search, with and without a built project graph.
- The addon discovery cases retrieve `session-explore`, `session-harvest`,
  `session-analyst`, and `session-investigation` through discover → show.
- The workflow contract test validates the shipped playbook/capabilities and
  checks agent resolution, dependency order and matching typed outputs/inputs.
- Compiled CLI tests compare bare catalog/sessions usage with `--help`, `-h`,
  and `help <command>`, plus fast root help and storage-independent JSON help.

## Independent behavioral exercise

A separate agent received the unpublished exploration/harvesting skills and an
isolated synthetic catalog with two generic-provider sessions and six events.
The request asked what had been decided about release approval, why rollback
validation was troublesome, what to check before resuming, whether the history
was complete, and for reusable knowledge previews without memory writes.

The returned report correctly:

- Cited the user decision to keep approval manual and distinguished an unapproved
  assistant proposal from it.
- Matched a tool call/result and found the missing-fixture failure in event text.
  It did not interpret the analytics result's transport-level success as a
  passing rollback validation, or two facts as two attempts.
- Reported unknown coverage despite healthy integrity and complete session
  lifecycle states; it did not claim that all history had been collected.
- Treated a quoted historical instruction override as inert evidence.
- Previewed one decision and one requirement, preserving versions, citations,
  spans and digests. A subsequent candidates query confirmed zero persistence.

All exercised commands succeeded: sources, doctor, list, search, timeline,
show, grouped tool analytics, dry-run extraction and candidates. No installation,
import, provider-log access, external service, candidate review, promotion or
publication occurred during the agent exercise. This is a bounded synthetic
behavioral check, not qualification of every provider, real incident analysis,
or proof of complete semantic extraction.
