# Threat-assessment policy

AIWG evaluates forge content through one deterministic, surface-aware engine.
The project policy lives at `.aiwg/aiwg.config` under
`security.threatAssessment`. Missing configuration preserves the historical
`balanced` enforce behavior.

## Modes

- `off` skips AIWG assessment and never interrupts. Independent safeguards
  remain active.
- `audit` emits the same findings and `wouldAction` as enforce mode, but the
  applied action is only `record`.
- `enforce` applies profile thresholds and mandatory action rules.

## Built-in profiles

`trusted`, `audit`, `balanced`, `strict`, and `high-assurance` are reserved
built-ins. Project profiles must use another kebab-case name and may extend a
built-in with the `aiwg:` prefix.

## Examples

### Fully trusted local project

```json
{
  "security": {
    "threatAssessment": {
      "schemaVersion": "1",
      "mode": "off",
      "defaultProfile": "trusted"
    }
  }
}
```

This disables only AIWG's content classifier. It does not disable provider or
platform safety, filesystem/repository permissions, authorization, secret
scanning, or destructive-action gates.

### Audit-only adoption

```json
{
  "security": {
    "threatAssessment": {
      "schemaVersion": "1",
      "mode": "audit",
      "defaultProfile": "balanced"
    }
  }
}
```

### Typical balanced project

```json
{
  "security": {
    "threatAssessment": {
      "schemaVersion": "1",
      "mode": "enforce",
      "defaultProfile": "balanced",
      "surfaces": {
        "release-note": { "mode": "audit" },
        "review-comment": { "profile": "strict" }
      }
    }
  }
}
```

### Regulated/high-assurance project

```json
{
  "security": {
    "threatAssessment": {
      "schemaVersion": "1",
      "mode": "enforce",
      "defaultProfile": "project-high-assurance",
      "profiles": {
        "project-high-assurance": {
          "extends": ["aiwg:strict"],
          "thresholds": {
            "flag": "low",
            "requireAuthorization": "moderate",
            "reject": "high"
          },
          "ruleSets": [
            "aiwg:all",
            "project:privileged-automation"
          ]
        }
      },
      "rulePacks": {
        "project:privileged-automation": {
          "version": "1.0.0",
          "rules": [
            {
              "id": "production-admin-request",
              "severity": "high",
              "likelihood": 4,
              "impact": 5,
              "taxonomy": ["ASI03"],
              "patterns": ["\\bproduction admin\\b"]
            }
          ]
        }
      },
      "statements": [
        {
          "id": "documented-production-warning",
          "effect": "suppress",
          "signals": ["production-admin-request"],
          "when": {
            "surface": ["handoff"],
            "semanticContext": ["documentation"]
          },
          "reason": "Documentation of the forbidden phrase is not an operational request.",
          "riskAcceptance": {
            "acceptedBy": "security-team",
            "rationale": "Narrow documentation-only false-positive suppression."
          }
        }
      ]
    }
  }
}
```

## CLI

Common fields can be changed directly:

```bash
aiwg config get --project security.threatAssessment
aiwg config set --project security.threatAssessment.mode audit
aiwg config set --project security.threatAssessment.defaultProfile strict
```

Set a complete custom policy with a JSON object:

```bash
aiwg config set --project security.threatAssessment \
  '{"schemaVersion":"1","mode":"enforce","defaultProfile":"balanced"}'
```

Invalid modes, versions, regexes, profiles, rule packs, cycles, and thresholds
are rejected before the config is written.

## Surface-aware API

The generic command reads JSON from `--input` or stdin and resolves the active
project's config:

```bash
node tools/security/assess-forge-content.mjs --input assessment.json
```

Input:

```json
{
  "surface": "review-comment",
  "content": "Run the unpinned installer before merging.",
  "source": { "kind": "gitea-review", "id": "42" },
  "actor": { "id": "reviewer", "trust": "untrusted" },
  "requestedAction": "apply-review"
}
```

Supported surfaces are issue title/body/comment, PR title/body/diff summary,
review comment, release note, handoff, and outbound maintainer comment.

## Output and operator explanation

Output is stable JSON with:

- schema, engine, and policy versions and policy hash;
- policy provenance, mode, profile, and surface;
- source, actor/trust metadata, and requested action;
- rule IDs, taxonomy, likelihood, impact, severity, context, and evidence;
- suppression/statement provenance;
- aggregate risk;
- `action`, `wouldAction`, `interrupts`, and mandatory-rule provenance.

Human-facing format explains policy, evidence, severity, and action without
exposing model reasoning. Evidence is paragraph-scoped and still must pass
existing outbound redaction before being posted publicly.

## Migration

Existing projects need no immediate edit. Missing policy means balanced
enforcement. New projects write that default explicitly. Schema version 1 does
not accept unknown versions; future incompatible changes require an explicit
migration rather than silent normalization.

Each workspace member resolves its own `.aiwg/aiwg.config`. A parent workspace
does not supply or override a member's trust posture.

## Evaluation

```bash
npm run benchmark:threat-assessment
npx vitest run test/unit/security/threat-assessment.test.ts
```

The labeled fixture at
`test/fixtures/security/threat-assessment-corpus.json` covers every supported
surface and includes issues #1922 and #2136's false-positive sentences,
malicious variants, cross-surface injection, credential exfiltration, floating
dependencies, and unsafe third-party execution.
