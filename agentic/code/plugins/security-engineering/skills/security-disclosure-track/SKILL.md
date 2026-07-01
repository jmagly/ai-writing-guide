---
namespace: aiwg
name: security-disclosure-track
platforms: [all]
description: Track private vulnerability reports from triage through fix, CVE coordination, embargo, publication, and post-disclosure closure
requires:
  - case-record: .aiwg/security-engineering/reviews/disclosures/<case-id>.md
  - private-channel: configured advisory, private issue, encrypted email, or encrypted form
ensures:
  - custody-log: every transition records actor, timestamp, evidence, and next deadline
  - disclosure-plan: coordinated-disclosure dates and publication checklist
errors:
  - public-channel: refuses to publish private report details to public tracker channels before disclosure
invariants:
  - embargoed details stay out of public issue threads and commits
  - chain-of-custody record is git-ignored by default
script:
  entrypoint: scripts/track.mjs
  runtime: node
  cwd: project-root
  argsHint: "<case-id> [--stage triage|fix|cve|publish|close] [--evidence <text>] [--decision <text>] [--next-deadline <date>] [--embargo-days N]"
commandHint:
  argumentHint: "<case-id> [--stage triage|fix|cve|publish|close] [--embargo-days N]"
  allowedTools: Read, Write, Bash
  model: sonnet
  category: security
  orchestration: true
---

# Security Disclosure Track

Manage the advisory lifecycle after `security-report` intake. This is the closure-loop companion for private vulnerability disclosure and completes curl Practice 27 coverage.

## Stages

1. **Triage**: validate scope, severity, affected versions, reproduction, reporter contact, and embargo clock.
2. **Fix**: create private implementation plan; avoid public issue leakage; record commits/patches by hash.
3. **CVE**: determine whether CVE assignment is needed; record CNA/contact path.
4. **Publication**: prepare advisory, patched versions, acknowledgements, and release notes.
5. **Close**: confirm disclosure complete, custody record finalized, public advisory linked.

## Custody Record

Records live under `.aiwg/security-engineering/reviews/disclosures/` and are ignored by default. Each transition appends timestamp, actor, evidence, decision, and next deadline.

## References

- `agentic/code/frameworks/security-engineering/skills/security-report/SKILL.md`
- `agentic/code/frameworks/security-engineering/templates/SECURITY.md`
