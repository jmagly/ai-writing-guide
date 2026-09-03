---
namespace: aiwg
name: schema-review
description: Review a schema or data-contract change for authority, correctness, compatibility, fixtures, security, and projection integrity.
version: 1.0.0
platforms: [all]
triggers: [review a schema, validate data contract, schema readiness check]
---

# Schema Review

Run catalog lookup, strict lint, offline reference checks, valid/invalid fixtures,
compatibility against the declared baseline, projection verification, and
consumer-impact review. Confirm bounded validation and non-leaking diagnostics.
Return PASS only when every applicable check has direct evidence; otherwise
return REVIEW REQUIRED or FAIL with stable findings.
