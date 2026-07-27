---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.onboarding
---

# Agent-Run Onboarding

The user normally describes their goal in conversation. The agent owns the
setup commands, previews material changes, requests necessary approval, and
reports the verified result.

## Canonical first-run sequence

```bash
npm install -g aiwg
cd /path/to/project
aiwg use all --provider <provider>
```

Restart the provider in the project root, invoke `aiwg-regenerate`, and then
run the verification probe below. `all` is the preferred deployment default;
use a narrower framework only when the user explicitly requests reduced scope.

For an existing project, the regeneration selector should route to the
existing-project extraction path. For an already graph-based workspace, it
should use workspace regeneration. Preview, preserve protected operator
content, then apply.

## Preview

```bash
aiwg wizard --dry-run --goal "<user goal>"
```

Explain the proposed provider, framework, paths, and mutations before applying
the plan.

## Apply

```bash
aiwg wizard
```

Use non-interactive flags only when the required choices are already known:

```bash
aiwg wizard --non-interactive --profile beginner --provider codex
```

## Verify

```bash
aiwg status --probe --json
```

Report the engaged state, project root, deployed provider files, installed
frameworks/addons, and the next action from the probe. Do not make the user
interpret raw JSON.

## Recovery

If the probe reports `not-configured`, `partial`, or `needs-repair`, explain the
state in plain language, propose the smallest corrective action, and request
approval if it changes files outside the expected project scope.
