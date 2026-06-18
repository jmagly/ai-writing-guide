# Cockpit Operator Wall Layout Review Pack

**Issues**: roctinam/aiwg#1622, roctinam/aiwg#1604, roctinam/aiwg#1605, roctinam/aiwg#1606, roctinam/aiwg#1607, roctinam/aiwg#1608
**Status**: Review-ready mock-layout decision pack
**Date**: 2026-06-18
**Inputs**: `.aiwg/working/cockpit-a1-eleven-stacks.png`, `.aiwg/working/cockpit-a2-mission-handoff.png`, `cockpit-ux-design.md`, `cockpit-operator-wall-design-system.md`, `cockpit-operator-wall-a11y-reconciliation.md`

## Purpose

The current Cockpit Home now renders an eleven-node radial operator wall with live runtime, approval, cost, and handoff data. This closes the first implementation gap, but #1622 also records an operator concern that the main screen still needs stronger fidelity to the design-spec image. This pack frames the remaining visual decision so an interactive review can pick the next layout adjustment without breaking the research-backed UX constraints.

## Research And Process Constraints

The recommendation below uses the local research corpus in `/home/roctinam/dev/research/research-papers` as the design floor:

| Corpus anchor | Design implication |
|---|---|
| REF-1407, Sheridan, human supervisory control | The wall should make one operator's many semi-autonomous processes visible at a glance. |
| REF-1408, Vicente and Rasmussen, ecological interface design | Visual structure should expose work-domain constraints: runtime isolation, control mode, gates, handoff, and cost. |
| REF-1410, Amershi et al., Human-AI Interaction Guidelines | The UI must show what agents can do, what they are doing, when to intervene, and how to correct or dismiss. |
| REF-1415, Shneiderman overview-zoom-details | The first viewport should provide overview first; stack details and logs can sit below or behind focus. |
| REF-1085, Tufte visual display integrity | Decorative topology is acceptable only when every visible region has a data role and does not distort state. |

These constraints align with the existing Cockpit UX decisions: friendly first-run defaults, power-on-demand, no color-only signaling, AA contrast, reduced motion, and one constrained live-region strategy.

## Design-Spec Image Read

### A1: Eleven Stacks

The A1 image is a centered hub-and-spoke topology with eleven peripheral stack glyphs. The main fidelity obligations are:

- Eleven distinct nodes must be visible as the dominant first-viewport signal.
- The central Cockpit hub must be visually stronger than every peripheral stack.
- Node identity should be shape-led, not text-card-led.
- Links should read as coordination paths, not chart decoration.
- The composition should have generous dark negative space and a shallow 3D control-plane feel.

### A2: Mission Handoff

The A2 image uses the same radial wall but emphasizes an orbital handoff arc. The main fidelity obligations are:

- The mission route should be visible as a stronger arc over the normal topology links.
- A handoff event should have a destination marker and state label.
- Peripheral nodes should remain legible while the arc carries the eye.
- The first viewport should still read as a control plane, not a static hero illustration.

## Current Implementation Assessment

Current implementation in `apps/cockpit/web/src/components/Welcome.tsx` and `apps/cockpit/web/src/styles.css`:

| Requirement | Current state | Assessment |
|---|---|---|
| Eleven visible nodes | `buildOrbitNodes` renders eleven `.orbit-node` buttons. | Meets structure. |
| Central command hub | `.central-hub` launches session and summarizes running/approvals. | Meets functional role; visual mass can increase. |
| Hub-and-spoke links | SVG ring, per-node lines, and handoff arc render behind controls. | Meets topology role. |
| Mission handoff arc | `.handoff-arc` plus one marker show route emphasis. | Partial; arc is present but can be more visually dominant. |
| Data-bound regions | Nodes bind to live inventory, runtime coverage, approvals, cost, library, actions, and sessions. | Meets design-system requirement. |
| First-viewport dominance | Compact hero lets the radial wall dominate connected-state Home. | Mostly meets; right-side detail rail still competes with image fidelity. |
| Accessibility | Buttons have labels; mobile stacks nodes; reduced-motion rule exists. | Meets baseline, pending full screen-reader/keyboard acceptance pass. |
| Image fidelity | Dark radial topology now matches the concept family. | Partial; current nodes are readable cards, while the image uses glyph-first objects. |

## Mock Layout Options

### Option A: Current Radial Wall Plus Detail Rail

Keep the current connected-state Home: compact hero, radial topology left, live detail rail right, stack board and guided start below.

Best when:

- The first shippable v1 must preserve data density and obvious controls.
- Operator review values live state and clickable affordances over pure image fidelity.
- We need minimal implementation churn while #1621 live-matrix work remains open.

Tradeoffs:

- Peripheral nodes read more like cards than luminous glyphs.
- The right rail reduces the full-bleed image feel.
- Mission handoff is visible but not the primary visual event.

Recommended next adjustment if Option A is accepted:

- Increase central hub scale by roughly 15 percent.
- Reduce orbit-node copy weight and make glyphs visually larger.
- Keep the detail rail but make it narrower and lower-contrast.

### Option B: Full-Bleed Glyph-First Operator Wall

Make the radial wall span the first viewport width. Move live readout into a bottom overlay strip and convert peripheral nodes to glyph-first controls with labels appearing as compact captions or on focus.

Best when:

- The operator wants maximum fidelity to A1.
- The main screen should look immediately like the design-spec image.
- Detailed stack controls can move below the fold or behind focus.

Tradeoffs:

- More implementation risk: responsive geometry, focus states, and label overflow need another pass.
- Lower at-a-glance text density unless captions are carefully handled.
- Requires stronger automated visual checks to avoid blank or overlapping canvas-like failures.

Recommended next adjustment if Option B is selected:

- Remove the right detail rail from the first viewport.
- Place coverage, executor, control, quota, and gates in a five-item overlay strip inside the radial surface.
- Convert node cards to square or circular plinth controls with larger topology glyphs and one-line labels.

### Option C: Mission-Handoff Priority Wall

Use A2 as the primary composition: the mission route arc becomes dominant, the active source and destination nodes get stronger treatments, and the readout focuses on handoff state before general fleet inventory.

Best when:

- Cockpit's main promise should be cross-stack coordination more than inventory.
- Mission conductor work is ready to become the primary product signal.
- The user story is "send this result to another stack" rather than "monitor everything."

Tradeoffs:

- Less neutral as a Home surface; it biases toward a mission already in progress.
- Requires stronger backend handoff data or careful empty-state handling.
- Could over-emphasize one flow before host/docker/vm live matrix evidence is green.

Recommended next adjustment if Option C is selected:

- Keep eleven nodes but visually classify source, route, destination, and idle nodes.
- Elevate handoff status into the central hub.
- Make the side/bottom details describe route audit entries and pending gates.

## Recommendation

Use Option A as the shippable v1 baseline and schedule an operator review to choose between Option B and Option C for the next fidelity pass.

Rationale:

- Option A already satisfies the core research-backed requirements: overview first, visible agent state, intervention cues, data-bound topology, and accessible controls.
- Option B is closest to the A1 image, but it is primarily a visual-fidelity pass and needs careful keyboard/mobile validation.
- Option C is closest to the A2 image and likely the stronger long-term product story, but it should wait until mission-handoff data is reliable enough to avoid a decorative arc.

## Interactive Review Script

Use this sequence in the mock-layout session:

1. Show A1 and A2 design-spec images side by side.
2. Show the current running Home first viewport.
3. Ask which first impression matters most: "fleet overview", "image fidelity", or "mission handoff".
4. If "fleet overview", tune Option A.
5. If "image fidelity", build Option B mock.
6. If "mission handoff", build Option C mock.
7. Confirm mobile behavior separately: stacked list is acceptable only if the first screen still communicates hub, eleven stacks, and route state.

## Acceptance Checklist For #1622

- The connected-state first viewport visibly centers the Cockpit hub and eleven stack nodes.
- The layout can be traced to either A1, A2, or an explicit operator-approved hybrid.
- Every visible node has a data role, accessible name, and non-color identity channel.
- Mission handoff is either visually secondary by decision or made primary with real state binding.
- Desktop and mobile screenshots are captured to `/tmp` and referenced from evidence, not committed as repo binaries.
- `npm --prefix apps/cockpit run check` passes after any implementation change.

