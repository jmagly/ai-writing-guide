# Author a custom syntax or house style

Use a custom output mode when you want repeatable sentence structure, terminology, document organization, or presentation rules across AIWG-run workflows. A custom mode can be personal and user-wide or checked into a project for the whole team.

## Choose the scope of the profile definition

For a project profile:

```bash
mkdir -p .aiwg/output-modes
```

For a personal profile shared across projects:

```bash
AIWG_USER_CONFIG="$(aiwg config path)"
mkdir -p "$AIWG_USER_CONFIG/output-modes"
```

Save YAML or JSON in the selected `output-modes/` directory. Project definitions override user definitions with the same stable ID. User definitions override adapted voice profiles and built-ins.

Profile location and activation scope are independent. For example, a personal profile can be enabled only for one invocation, while a project-owned profile can be enabled for a session.

## Start with a personal syntax profile

Save this as `personal-syntax.yaml`:

```yaml
id: personal-syntax
version: 1.0.0
description: Direct engineering prose with explicit claims and compact syntax.
kind: voice
stage: voice
order: 120
instructions: |
  Lead with the conclusion or required action.
  Prefer short subject-verb-object sentences.
  Put one main claim in each paragraph.
  Define a specialized term on first use.
  State constraints, failure conditions, and tradeoffs explicitly.
  Prefer concrete nouns and active verbs.
  Do not add decorative metaphors, filler transitions, or false certainty.
  Preserve the meaning, evidence strength, and cited support of the source.
provenance:
  source: Operator-authored personal style
  license: CC0-1.0
validation:
  level: advisory
protectedContent:
  - code
  - commands
  - citations
  - quoted-text
  - identifiers
  - machine-readable-blocks
contextCost: 96
```

Move the file into either `.aiwg/output-modes/` or `$(aiwg config path)/output-modes/`, then inspect and try it:

```bash
aiwg output-mode show personal-syntax
aiwg output-mode status --output-mode personal-syntax
aiwg run skill <name> --output-mode personal-syntax -- <skill-arguments>
```

After the invocation works, persist it only as broadly as needed:

```bash
aiwg output-mode enable personal-syntax --scope session
# or
aiwg output-mode enable personal-syntax --scope project
```

## Write useful instructions

Good style instructions are observable. Describe what a reviewer could identify in the resulting text:

- “Use one main clause per procedural step.”
- “Define acronyms at first use.”
- “Use imperative verbs for required actions.”
- “Put prerequisites before the procedure.”
- “Use `must` only for requirements and `may` only for permission.”

Avoid instructions that are purely subjective or impossible to test, such as “make it beautiful” or “sound smarter.” Replace them with sentence, vocabulary, organization, and audience rules.

State semantic invariants explicitly. A syntax mode should not change facts, confidence, requirements, citations, or code. If brevity conflicts with necessary qualifications, the qualifications win.

## Choose kind and stage

| Desired change | `kind` | Usual `stage` |
|---|---|---|
| tone, sentence rhythm, personal prose | `voice` | `voice` |
| restricted vocabulary or normative terminology | `controlled-language` | `controlled-language` |
| headings, section order, paragraph organization | `structure` | `structure` |
| Markdown, tables, or final rendering conventions | `presentation` | `presentation` |

Use one primary responsibility per profile. This makes profiles easier to compose and diagnose. A personal voice can compose with one controlled-language mode and one structure mode. Two non-voice modes of the same kind are rejected. Multiple voice modes require `mergeStrategy: weighted-voice` on at least one participating profile.

## Adapt an engineering language standard safely

Do not paste proprietary standards, controlled vocabularies, or licensed rule text into a distributable profile unless you have the right to do so. An adapter profile can refer to operator-managed rules:

```yaml
id: organization-engineering-language
version: 1.0.0
description: Adapter for the organization's approved engineering language rules.
kind: controlled-language
stage: controlled-language
order: 200
instructions: |
  Apply the operator-managed engineering language rules and approved terms.
  Do not claim conformance unless the configured validator succeeds.
provenance:
  source: Organization language adapter; rules supplied separately
  license: Internal-use adapter
validation:
  level: validated
  hook: organization-engineering-language-validator
protectedContent:
  - code
  - commands
  - citations
  - quoted-text
  - identifiers
  - machine-readable-blocks
```

`validated` and `conformance` profiles require a non-empty `validation.hook`. A `conformance` profile also requires `validation.standardVersion`. The consuming runtime must map the hook ID to a real validator; naming a hook alone does not implement validation.

## Profile field reference

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | Stable lowercase ID containing letters, numbers, dots, or hyphens |
| `version` | yes | Profile revision |
| `description` | yes | Human-readable purpose |
| `kind` | yes | `voice`, `controlled-language`, `structure`, or `presentation` |
| `stage` | yes | Deterministic composition stage |
| `instructions` | yes | Rules supplied to the transformer |
| `provenance` | yes | Source and license of the instructions |
| `validation` | yes | `advisory`, `validated`, or `conformance` plus required hook metadata |
| `order` | no | Tie-breaker within a stage; default is `0` |
| `requires` | no | IDs that must also be selected |
| `conflicts` | no | IDs that cannot be selected together |
| `protectedContent` | no | Literal classes the runtime must preserve |
| `contextCost` | no | Estimated instruction-token cost |
| `mergeStrategy` | no | `weighted-voice` for multi-voice composition |

`compatible` and `supersedes` are descriptive interoperability metadata in profile version 1; they do not silently add, remove, or reorder selected modes.

## Evolve a profile

Keep the ID stable for compatible instruction changes and increment `version`. Use a new ID when the purpose or constraints materially change. Test representative inputs that contain code, commands, citations, quotations, identifiers, and machine-readable blocks before enabling the profile at project scope.

For a quantified style derived from writing samples, first create or analyze a voice profile with `voice-create` or `voice-analyze`, then translate the desired observable rules into an output-mode profile. Voice profiles describe a voice in detail; output modes add selection, composition, protection, and runtime validation policy.
