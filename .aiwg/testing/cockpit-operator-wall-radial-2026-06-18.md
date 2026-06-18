# Cockpit Operator Wall Radial Verification

Date: 2026-06-18
Issue: #1622

## Scope

Verified the Home screen after replacing the first functional operator-wall
surface with a radial topology aligned to the design references:

- `.aiwg/working/cockpit-a1-eleven-stacks.png`
- `.aiwg/working/cockpit-a2-mission-handoff.png`

The implementation keeps the existing stack cards and telemetry below the fold,
but the first viewport now carries the design-spec topology: central Cockpit hub,
eleven connected nodes, mission handoff arc, runtime/provider labels, coverage,
approvals, cost, and control state.

## Verification

Commands:

```text
npm --prefix apps/cockpit run test:web
AIWG_COCKPIT_LIVE_REPORT=/tmp/cockpit-live-uat-identity-check npm run uat:cockpit-live
npm --prefix apps/cockpit/web run build
google-chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check --user-data-dir=/tmp/cockpit-chrome-profile-2 --window-size=1440,1100 --virtual-time-budget=5000 --screenshot=/tmp/cockpit-operator-wall-radial-2026-06-18.png http://127.0.0.1:8120
google-chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check --user-data-dir=/tmp/cockpit-chrome-profile-3 --window-size=390,900 --virtual-time-budget=5000 --screenshot=/tmp/cockpit-operator-wall-radial-mobile-2026-06-18.png http://127.0.0.1:8120
```

Results:

- Web typecheck passed.
- React rendered-DOM tests passed, including a regression asserting 11 radial
  topology controls from live status data.
- Web production build passed.
- Live UAT non-required mode still skips cleanly when no executor is reachable.
- Desktop headless Chrome screenshot rendered the radial map, central Cockpit
  hub, eleven nodes, mission handoff arc, details rail, and existing stack cards.
- Mobile headless Chrome screenshot rendered the responsive stacked topology
  without text overlap in the captured viewport.

Local screenshot artifacts:

- `/tmp/cockpit-operator-wall-radial-2026-06-18.png`
- `/tmp/cockpit-operator-wall-radial-mobile-2026-06-18.png`

PNG screenshots are intentionally not committed under `.aiwg/testing` so the
metadata-validation gate remains text-only.

## Remaining Delta

#1622 is materially closer to the design-spec images, but final closure still
needs operator review against the design baseline because the reference art has
image-level depth and icon styling that may need tuning beyond this functional
radial layout.
