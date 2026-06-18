# Cockpit Operator Wall Verification

- Issue: #1622
- Date: 2026-06-18
- Executor: mock-backed `http://127.0.0.1:8122`
- Bridge: `http://127.0.0.1:8120`

## Screenshots

- Desktop: `.aiwg/testing/cockpit-operator-wall-desktop-2026-06-18.png`
- Mobile: `.aiwg/testing/cockpit-operator-wall-mobile-2026-06-18.png`

## Evidence

- Home first viewport renders persistent status chrome:
  - Bridge state
  - stack count
  - running task count
  - pending approval count
  - host/docker/vm coverage
- Home renders an operator-wall board with StackCard-style cards for running
  stacks, topology glyphs, runtime labels, transport posture, drive/observe
  affordance text, task state, progress bars, and cost microcopy.
- Home renders a telemetry strip with instances, tasks, approvals, cost/quota,
  and host/docker/vm coverage.
- Home renders guided start and a visible Copy CLI affordance.
- Mobile screenshot confirms the first viewport remains readable and the Board
  stacks vertically without horizontal overflow.

## Commands

```bash
npm --prefix apps/cockpit/web run build
npm --prefix apps/cockpit/web run typecheck
npm --prefix apps/cockpit/web run test
npx vitest run test/integration/cockpit-bridge.test.js
npx tsc --noEmit
```

Additional launch verification:

```bash
node apps/cockpit/mock-executor/src/server.mjs
AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 node apps/cockpit/bridge/src/server.mjs
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 --window-size=1440,1000 --screenshot=/tmp/cockpit-operator-wall-desktop-loaded.png 'http://127.0.0.1:8120/?token=<token>'
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 --window-size=390,900 --screenshot=/tmp/cockpit-operator-wall-mobile-loaded.png 'http://127.0.0.1:8120/?token=<token>'
```
