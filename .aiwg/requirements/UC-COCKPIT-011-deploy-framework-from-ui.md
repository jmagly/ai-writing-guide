# UC-COCKPIT-011: Deploy a Framework / Addon from the UI

**Phase**: Inception
**Priority**: P1
**Status**: Draft
**Persona**: Newcomer, Solo power user, Ops/fleet operator
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/intake/cockpit-intake.md §In-scope (install/inventory), `use` skill, `cli-secondary` rule

## Reasoning

1. **Problem analysis**: Deploying a framework/addon means remembering `aiwg use <name> [--provider …]` and its flags. Newcomers don't know the catalog or the provider matrix; this is a friction point the friendly UI should remove.
2. **Constraint identification**: Per `cli-secondary` / `self-maintenance`, deployment must route through the `use` skill / `aiwg use` (which carries validation, conflict resolution, registry update, doctor verification) — Cockpit must not hand-copy files. The action is a real mutation, so it honors `human-authorization` and `delivery-policy`.
3. **Alternative consideration**: (a) Cockpit writes provider dirs directly (forbidden — bypasses registry/gates); (b) Cockpit presents a guided picker (framework/addon + provider) and invokes the `use` skill/`aiwg use` under the hood, then refreshes inventory (chosen); (c) CLI-only (status quo).
4. **Decision rationale**: A guided picker over the real `use` path gives newcomers a safe, discoverable deploy without weakening the validation the CLI/skill provides.
5. **Risk assessment**: Accidental/overbroad deploy (mitigated: confirm step showing target provider + what changes, per human-authorization); registry drift (mitigated: deploy only via `aiwg use`, then re-probe inventory via UC-COCKPIT-001).

## Primary Actor

Operator deploying an AIWG framework or addon to one or more providers.

## Goal

Select a framework/addon and target provider(s) from a guided UI and deploy it through the real `aiwg use` path, then see updated inventory — without memorizing CLI flags or bypassing validation.

## Preconditions

- Cockpit launched; AIWG CLI available; catalog/inventory readable (`aiwg list`, catalog).

## Main Success Scenario

1. Operator opens "Deploy"; Cockpit shows available frameworks/addons (from catalog/`list`) and detected/eligible providers.
2. Operator picks an item + target provider(s); Cockpit shows a confirm summary of what will deploy and where.
3. On confirm, Cockpit invokes the `use` skill / `aiwg use <name> --provider <p>` under the hood (never hand-copies).
4. Cockpit streams progress and surface any `WARNING:`-class context-pipeline output prominently (e.g., non-managed twin warnings, #1579).
5. On success, Cockpit re-probes and refreshes the inventory view (UC-COCKPIT-001); writes an `activity-log` deploy entry.

## Alternative Flows

**A1 — Provider-specific notes**: Cockpit surfaces provider caveats (e.g., Codex 32KB AGENTS.md cap) before confirm.

**A2 — Remove/undeploy**: same guided flow wrapping `aiwg remove`, with confirm.

## Exception Flows

**E1 — Deploy fails / partial**: Cockpit shows the error, points to `aiwg doctor`, and does not report success; inventory reflects actual state after re-probe.

**E2 — Conflict / already-current**: Cockpit reports no-op or conflict from `aiwg use` rather than forcing.

## Postconditions

- Any deployment went through `aiwg use` (registry + gates intact); inventory reflects real on-disk state; deploy is audited.

## Acceptance Criteria

- [ ] Deploy is performed only by invoking the `use` skill / `aiwg use` — Cockpit never writes provider directories directly (cli-secondary).
- [ ] A confirm step names the item + target provider(s) and what will change before any mutation (human-authorization); honors `delivery-policy`.
- [ ] `WARNING:`-class deploy output (e.g. #1579 non-managed twin) renders prominently, not buried.
- [ ] On success, inventory is re-probed and refreshed (UC-COCKPIT-001) and a deploy `activity-log` entry is written.
- [ ] Failures/partials (E1) and conflicts (E2) are surfaced truthfully; success is never reported for a failed deploy.
