# Flow: choose-theme

## Purpose

Select and persist a reusable visual theme through evidence-backed research, five-way comparison, comparable samples, human approval, and deliberate rotation.

## State flow

```text
intake
  -> inventory brand + templates + recent usage
  -> research (dated citations)
  -> five distinct candidate cards
  -> rotation + constraint scoring
  -> comparable samples or specification-only equivalents
  -> human select | revise | reject
  -> selected theme JSON + Markdown card
  -> template-from-theme | asset-production
  -> registry usage event + QA records
```

## Gates

| Gate | Evidence | Failure path |
|---|---|---|
| Intake complete | theme brief | ask only for missing consequential constraints |
| Research traceable | URL + dates + evidence type | remove unsupported trend claim |
| Candidates comparable | same content, dimensions, fidelity | regenerate inconsistent samples |
| Candidates distinct | rotation audit and qualitative contrast | revise highest-overlap direction |
| Selection authorized | named human choice and rationale | remain `sampled` |
| Handoff ready | brand/accessibility/licensing/technical QA | remain `selected`, never claim production-ready |

## Artifacts

`theme-brief.md`, five `candidate-*.md` files, `comparison.md`, `samples/`, `decisions/<theme>-selection.json`, `themes/<theme>.json`, `themes/<theme>.md`, and registry update.

