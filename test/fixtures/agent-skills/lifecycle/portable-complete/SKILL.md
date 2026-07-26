---
name: portable-complete
description: Use this complete portable fixture to verify Agent Skills round trips.
license: LICENSE.txt
compatibility: Requires a POSIX-compatible shell and UTF-8 text support.
metadata:
  author: AIWG
  version: "1"
allowed-tools: Read Grep Bash
namespace: fixtures
platforms:
  - all
triggers:
  - verify the portable Agent Skills lifecycle
commandHint:
  allowedTools: Read, Grep, Bash
  orchestration: false
userInvocable: true
---

# Portable complete

Read the [guide](references/guide.md), inspect the
[asset](assets/example.json), review the [license](LICENSE.txt), and use the
[verification script](scripts/verify.sh) without executing it during import.
