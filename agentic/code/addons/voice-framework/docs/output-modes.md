# Composable output modes

Output modes are provider-neutral presentation constraints selected at runtime. With no configured mode, the effective mode is `unaltered`: AIWG adds no instructions and performs no post-processing.

## Commands and scopes

```bash
aiwg output-mode list
aiwg output-mode show asd-ste
aiwg output-mode enable wittgenstein-inspired --scope session
aiwg output-mode disable wittgenstein-inspired --scope session
aiwg output-mode clear --scope session
aiwg output-mode status
aiwg run skill <name> --output-mode asd-ste --output-mode wittgenstein-inspired -- <args>
```

Invocation modes exist only for one command. Session state is runtime state outside provider startup files. Project state is stored in `.aiwg/output-modes.yaml`. Direct invocation selection overrides session selection, which overrides project selection for the same stable ID.

Profiles resolve in this order: project `.aiwg/output-modes/`, user `~/.config/aiwg/output-modes/`, adapted built-in voice profiles, then built-in output modes. Unknown modes fail safe.

## Composition and precedence

Modes execute deterministically by stage: semantic, voice, controlled language, structure, then presentation. Numeric `order` and stable ID break ties. Two modes of the same kind require a declared merge strategy; adapted voice profiles use the existing weighted-voice strategy. Explicit conflicts and missing requirements stop execution with a diagnostic.

Output modes are lower authority than user instructions, project policy, safety, factuality, accuracy, and citation requirements. Profiles declare protected content such as code, commands, citations, quotations, identifiers, and machine-readable blocks. A mode cannot authorize changing those literals or weakening a higher-authority rule.

## Authoring and licensing

Create YAML or JSON matching `schemas/output-mode-profile.schema.json`. Include stable identity, provenance, license, stage, validation level, and protected-content declarations. Do not embed proprietary rules or vocabulary without distribution rights.

The built-in `asd-ste` entry is an adapter, not bundled ASD-STE text. It remains advisory until an operator supplies a licensed ruleset, approved terminology, a standard version, and a successful validator. Only that complete validator-backed configuration may claim conformance. `wittgenstein-inspired` is labeled as general stylistic guidance and must never impersonate or falsely attribute output.

## Migration from `voice-apply`

Existing voice profiles remain valid and appear in `output-mode list` through an adapter. Use direct `voice-apply` when transforming a specific file. Use output modes when a voice must compose with controlled-language, structure, or presentation constraints at invocation, session, or project scope.
