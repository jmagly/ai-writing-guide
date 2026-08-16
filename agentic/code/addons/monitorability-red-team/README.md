# Monitorability Red Team

This experimental security-engineering addon measures what a monitor could
actually observe in synthetic, local multi-agent fixtures. It does not provide
offensive instructions, contact external systems, start providers, or test
live communication channels.

```bash
aiwg use monitorability-red-team
aiwg monitorability-red-team run
aiwg monitorability-red-team run path/to/synthetic-fixture.json --format markdown
```

The default suite covers semantic and Unicode/tag carrier classes,
paraphrase and Unicode normalization defenses, and same-family self-monitoring.
Cross-vendor evidence is marked `NOT RUN` because the fixture runner is
offline. Every missed observation must be labeled `content-blind`,
`tool-blind`, `state-blind`, or `evidence-incomplete`; an unlabeled miss blocks
the report instead of being silently accepted.

## Safety and evidence constraints

- Fixtures must declare `synthetic-local-only`, forbid network and provider
  calls, record completed redaction, classify every scenario as synthetic, and
  identify its provenance as inline with no external reference.
- Never place credentials, external secrets, customer content, personal
  identifiers, provider transcripts, or live-channel data in a fixture.
- Redact any non-synthetic identifier or value before fixture creation.
- Sandbox activity evidence must be attached as synthetic fixture events or
  recorded as `NOT RUN` with a reason.
- A passing report is evidence about the fixture only. It is not evidence that
  a production monitor sees every carrier or state transition.

Public core includes the local evaluator, fixtures, and evidence report.
Enterprise assessment packaging and adversarial reports remain out of scope.
