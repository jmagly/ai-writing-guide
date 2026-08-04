---
namespace: aiwg
name: schedule
platforms: [all]
description: Route recurring work to a provider-native scheduler or an explicitly external host scheduler
commandHint:
  argumentHint: "create|list|delete [provider-native options]"
  allowedTools: CronCreate, CronDelete, CronList
  model: haiku
  category: scheduling
  modelRole: efficiency
  modelTier: economy
---

# Schedule

Route scheduling requests without inventing an AIWG scheduler backend.

## Capability boundary

AIWG's production CLI does **not** expose `aiwg schedule`, `aiwg daemon`, or
`aiwg daemon schedule`. Never recommend or execute those commands.

There are three distinct states:

1. **Provider native** — use the provider's scheduling tools directly. In a
   Claude Code agent session these are `CronCreate`, `CronList`, and
   `CronDelete`.
2. **AIWG implemented** — no production scheduler implementation currently
   exists. Do not label this state as emulated.
3. **External trigger** — system cron, a systemd timer, or CI owns time and
   launches a reviewed, non-interactive provider command. AIWG may document the
   contract, but it does not own the clock.

## Routing

- When `CronCreate`/`CronList`/`CronDelete` are available, use them.
- Otherwise, explain that scheduling is external and ask which host mechanism
  the operator controls.
- Do not create a cron entry or CI workflow without explicit authorization.
- Keep prompts and reviewed configuration in files; do not place credentials,
  session material, or sensitive prompt text in process arguments.

## Provider-native operations

For Claude Code inside an agent session:

```text
CronCreate({ name: "daily-sync", schedule: "0 9 * * *", prompt: "Run the reviewed daily sync" })
CronList()
CronDelete({ name: "daily-sync" })
```

Outside that tool surface, report:

```text
No provider-native scheduler is available in this session.
Use an external scheduler (system cron, systemd timer, or CI) to launch a
reviewed provider command. AIWG does not provide a resident scheduler command.
```

## Safety

- Treat external scheduler configuration as an operator-owned deployment.
- Use absolute, reviewed workspace and prompt paths.
- Never embed tokens, cookies, browser profiles, or session data.
- Prefer stdin for provider prompts and use the platform's approved secret
  store or file-backed reference mechanism.
- Require an idempotency strategy and lock for mutation-capable jobs.

## Discovery terms

scheduled recurring task, cron, systemd timer, external trigger, provider-native scheduler
