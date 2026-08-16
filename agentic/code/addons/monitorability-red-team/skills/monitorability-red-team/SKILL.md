---
namespace: aiwg
name: monitorability-red-team
platforms: [all]
description: Evaluate synthetic local multi-agent monitorability fixtures and label content, tool, state, and evidence blind spots
---

# Monitorability Red Team

Run `aiwg monitorability-red-team run [fixture.json]` only on reviewed
synthetic fixtures. Require the fixture safety declaration, preserve captured
activity evidence, and preserve every `NOT RUN` reason.

Treat an undetected case without an observability label as a blocked integrity
failure. Do not infer production coverage from a passing synthetic report, and
do not introduce external inputs, provider calls, customer data, or live
channels into the fixture lane.

@implements #2045
