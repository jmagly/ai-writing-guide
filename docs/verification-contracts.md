# Verification contracts for research and planning

Declare expected artifacts, checks, expected outcomes, and completion evidence before dispatch. The reusable machine-readable contract is [`verification-contract.schema.json`](../agentic/code/frameworks/sdlc-complete/schemas/verification-contract.schema.json).

```yaml
expected_artifacts: [{path: report.md, required: true}]
checks:
  - {id: citations, kind: documentary, procedure: "resolve every citation", expected: "zero unresolved", required: true}
completion_evidence:
  - {check_id: citations, observed: "zero unresolved", evidence: review.log, status: pass}
```

`complete` requires every required artifact and `pass` evidence for every required check. Missing artifacts/evidence are `incomplete`. A failed check that cannot be repaired in scope or needs unavailable authority/input is `blocked`. Never report planned, skipped, `fail`, or `missing` verification as success.

Executable changes normally need focused tests and proportionate build/type/CI evidence. Documents need schema/template validation, links, internal consistency, and a named human checkpoint for consequential judgment. Research acquisition verifies content type, checksum, metadata, and full text; induction adds REF/sidecar/GRADE lint; synthesis adds citation verification and evidence/inference/recommendation separation. Issue planning checks duplicates, dependency direction, labels, rendering, and acceptance-testability.
