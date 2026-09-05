---
namespace: aiwg
name: context-firewall
platforms: [all]
kernel: true
description: Audit provider-facing context, trust, drift, poisoning signals, and budget, then manage the reviewed baseline through a plan-first public CLI workflow
---

# Context Firewall

Use the public AIWG CLI to inspect context that can enter provider sessions. Keep
scans read-only, never print source bodies as part of a threat finding, and treat
baseline confirmation as an attestation that every planned record was reviewed.

## Triggers

- "audit context" → run the read-only firewall scan
- "check context budget" → scan and explain budget attribution
- "review memory baseline" → produce the full baseline plan without writing
- "approve the context baseline" → plan first, then request explicit write authorization
- "doctor says the context baseline is missing" → route to the plan-first workflow

## Process

1. Run `aiwg context-firewall scan`, adding repeatable `--provider <name>`,
   `--strict`, or `--json` only when the task needs them.
2. Report violations and warnings using paths, trust labels, review states,
   digests, sizes, and signal identifiers. Do not reproduce suspicious content.
3. If a baseline is requested, run `aiwg context-firewall baseline --plan`.
   Inspect every emitted record and surface any quarantined, stale, external, or
   changed entry before considering a write.
4. Do not infer approval from a request to scan, diagnose, plan, or repair.
   Baseline mutation requires explicit user authorization after the plan has
   been presented and reviewed.
5. Only after that authorization, run
   `aiwg context-firewall baseline --write --confirm-reviewed`. Use
   `--output <project-relative-path>` only when the user requested a custom
   destination.
6. Re-run `aiwg context-firewall scan --strict` and report the resulting status.

The writer fails closed for unsafe records, paths outside the project root,
symlink escapes, and missing confirmation. Do not bypass those checks or invoke
the underlying implementation script directly.

## Output

Report:

- providers and total portable context budget;
- attribution by memory, rule, skill, agent, generated bridge, and project-local;
- trust and review findings by path, without source bodies;
- whether the operation was read-only or changed the reviewed baseline;
- the final strict scan status.

## References

- @$AIWG_ROOT/docs/security/context-memory-firewall.md — operator model and remediation guide
- @$AIWG_ROOT/docs/agents/cli-reference.md — public CLI contract
- @$AIWG_ROOT/tools/security/context-memory-firewall.mjs — packaged engine; never invoke directly for user remediation
