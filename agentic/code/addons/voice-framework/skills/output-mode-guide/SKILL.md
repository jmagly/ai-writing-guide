---
namespace: aiwg
name: output-mode-guide
platforms: [all]
description: Configure, use, troubleshoot, or extend AIWG composable output modes (also called output masks), including Wittgenstein-inspired clarity, engineering controlled language, and personal syntax profiles
triggers:
  - use an output mask
  - configure output modes
  - use Wittgenstein-inspired style
  - use engineering standards language
  - create my preferred syntax style
  - make a custom output mode
  - troubleshoot output mode
---

# Output mode guide

Help the user configure, inspect, apply, troubleshoot, or author AIWG output modes.

## Local writing and participating consumer recipes

Use [author-controlled writing workflows](../../docs/writing-workflows.md) for the
actual `aiwg writing plan` and `aiwg writing proofread` commands, channel APIs,
bounded revision, explicit learning, scoped MCP resources and separate receipts.
Planning creates a structured artifact; proofreading applies exact listed
author-authorized corrections without a model or voice rewrite. A selected mode
is not an applied transformation. Unsupported consumers use explicit instruction
exports; never claim every provider response is intercepted. Keep original text
and unresolved review decisions recoverable. Publication controls remain with
the user's existing workflow.

## Route the request

1. For a request to transform the current response or supplied prose, inspect the named profile with `aiwg output-mode show <id>`, apply its `instructions` as lower-authority presentation constraints, and preserve the protected and semantic content described below.
2. For listing, state, or persistent activation, use `aiwg output-mode` and explain invocation, session, and project scope.
3. For a personal or project style, follow `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/custom-output-modes.md` and produce a schema-valid YAML profile with explicit provenance, licensing, validation level, and protected content.
4. For a script or adapter that must apply modes, follow `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-mode-integration.md` and use the supported `aiwg` package API.
5. For an ineffective or rejected mode, follow `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-mode-troubleshooting.md`.

## Guardrails

- Treat “output mask” as an alias; use `output mode` in commands and profile names.
- Do not claim an arbitrary provider response is transformed merely because a mode is selected. Confirm the consumer applies the runtime contract.
- Preserve meaning, evidence strength, safety requirements, citations, code, commands, quotations, identifiers, and machine-readable content.
- Do not imitate or attribute text to a named person. The built-in `wittgenstein-inspired` mode is general clarity guidance.
- Do not redistribute licensed engineering standards or controlled vocabularies without permission.
- Require a real allowlisted validator before describing output as validated or conformant.

## References

- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-modes.md`
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/custom-output-modes.md`
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-mode-integration.md`
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-mode-troubleshooting.md`
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/schemas/output-mode-profile.schema.json`
