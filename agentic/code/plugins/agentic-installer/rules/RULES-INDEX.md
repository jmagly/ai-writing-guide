# Agentic Installer Rules Index

Safety and authoring rules for the `setup.aiwg.io/v1` SetupManifest language and the installer-agent addon.

---

## Agentic Installer Rules (2 rules — active with agentic-installer addon)

### HIGH

#### installer-safety
**Summary**: 7 mandatory safety behaviors for installer-agent and setup-run: show before run, confirm destructive operations, validate schema before execution, treat agentic steps as exception-handling only, collect all required params before execution…
**Full rule**: @$AIWG_ROOT/agentic/code/addons/agentic-installer/rules/installer-safety.md

#### installer-authoring
**Summary**: 5 authoring rules for SetupManifest files and script templates: script-first design (agentic steps are exception handling only), always source lib scripts in bash/PowerShell templates, manifests describe while scripts act, one manifest per…
**Full rule**: @$AIWG_ROOT/agentic/code/addons/agentic-installer/rules/installer-authoring.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|-----------|---------------|
| **Executing a manifest** | installer-safety (rules 1, 2, 3, 5, 7) |
| **Generating a manifest** | installer-authoring (all), installer-safety (rules 4, 6) |
| **Writing script templates** | installer-authoring (rule 2) |
| **Agentic steps** | installer-safety (rule 4), installer-authoring (rule 1) |
| **Recovery procedures** | installer-safety (rule 2), installer-authoring (rule 5) |
| **Secrets handling** | installer-safety (rule 6) |
| **Platform filtering** | installer-safety (rule 7) |
| **Hub/chain manifests** | installer-authoring (rule 4) |

---

*Generated from agentic-installer manifest.json — 2 rules*
*Full rule files: @$AIWG_ROOT/agentic/code/addons/agentic-installer/rules/*
