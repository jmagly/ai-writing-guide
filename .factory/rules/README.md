# AIWG Rules (Factory AI)

This directory contains AIWG enforcement rules deployed for Factory AI.

## Deployment

Rules are deployed from the canonical source at `agentic/code/frameworks/sdlc-complete/rules/` via:

```bash
aiwg use sdlc --provider factory
```

## Core Rules (Always Deployed)

| Rule | Enforcement | What It Does |
|------|-------------|-------------|
| `no-attribution` | CRITICAL | Zero AI branding in commits, PRs, docs, code |
| `token-security` | CRITICAL | Never hardcode, log, or expose tokens |
| `versioning` | CRITICAL | CalVer format, no leading zeros |
| `citation-policy` | CRITICAL | Never fabricate citations or sources |
| `anti-laziness` | HIGH | Never delete tests or remove features to pass |
| `executable-feedback` | HIGH | Execute tests before returning code |
| `failure-mitigation` | HIGH | Mitigate known LLM failure archetypes |

## Manifest

See `agentic/code/frameworks/sdlc-complete/rules/manifest.json` for the complete rule registry including sdlc and research tier rules.

## All Droids Must Follow Core Rules

Every Factory AI droid deployed by AIWG inherits these core enforcement policies. The rules apply to all code generation, documentation, commit messages, and artifact creation regardless of droid specialization.
