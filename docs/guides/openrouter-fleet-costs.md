---
audience: agent-operator
publication: public
stable_id: aiwg.guide.openrouter-fleet-costs
---

# OpenRouter fleet cost observation

`aiwg cost-report --fleet` reports month-to-date spend for a fleet whose bots use separate OpenRouter keys. AIWG is an observer: it reads usage and correlates it with local activity. OpenRouter remains the source of truth and the enforcement point for limits and caps.

## Configure the fleet

Create `~/.config/aiwg/fleet.yaml` with references only:

```yaml
provider: openrouter
fleet:
  - bot: quickbooksbot
    machine: eride
    key_ref: openrouter-eride-quickbooksbot
    monthly_cap: 10
  - bot: hermesclaw
    machine: oci
    key_ref: openrouter-oci-hermesclaw
    monthly_cap: 10
```

Never put a key, token, authorization header, or other credential in this file. The command rejects credential-like fields and values.

For each `key_ref`, use one of these credential locations:

- `~/.config/aiwg/keys/<key_ref>`, owned by the current user with mode `0600`; the `keys` directory must use mode `0700`, and symlinks are rejected. This is the preferred interactive-workstation path.
- `AIWG_OPENROUTER_KEY_<KEY_REF>`, uppercased with punctuation converted to underscores. For example, `openrouter-eride-quickbooksbot` maps to `AIWG_OPENROUTER_KEY_OPENROUTER_ERIDE_QUICKBOOKSBOT`. Environment injection is intended for a CI or container secret store; do not export long-lived keys in an interactive shell.

## Run the report

```bash
aiwg cost-report --fleet
aiwg cost-report --fleet --json
aiwg cost-report --fleet --config ./fleet.yaml
aiwg cost-report --key openrouter-eride-quickbooksbot --monthly-cap 10
```

The table contains `bot | machine | spend MTD | cap | % used | top-3 expensive sessions`. The configured cap is displayed for comparison; AIWG does not enforce it.

OpenRouter's current-key endpoint supplies per-key monthly usage. The generation endpoint is lookup-by-ID, so session and model/tier correlation is available when `.aiwg/activity.log` entries include generation metadata:

```text
## [2026-08-13 15:00] query | bot=quickbooksbot session=invoice-a generation_id=gen-example
```

Without tagged generation IDs, per-bot MTD spend still reports correctly and the top-session column is empty. Missing activity logs are treated as empty.

## Security and failure behavior

- Credential values are used only in bearer headers and are never included in report data, logs, or errors.
- One inaccessible key produces an `observation-error` row without exposing the key.
- `cap-near-limit`, `cap-exceeded`, and `single-session-spike` are observation flags, not enforcement actions.
- A missing fleet file returns setup guidance instead of a stack trace.

## OpenRouter API contracts

- [Get current API key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)
- [Get generation metadata](https://openrouter.ai/docs/api/api-reference/generations/get-generation)
