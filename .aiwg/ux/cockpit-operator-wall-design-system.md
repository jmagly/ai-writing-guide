# Cockpit Operator Wall Design System

**Issues**: roctinam/aiwg#1604, roctinam/aiwg#1605, roctinam/aiwg#1606, roctinam/aiwg#1607
**Parent**: roctinam/aiwg#1588
**Status**: Elaboration baseline
**Related**: `cockpit-ux-design.md`, `cockpit-operator-wall-a11y-reconciliation.md`, concept art `docs/.public/blog/cockpit-control-plane.png`

## Decision

Adopt the June concept art as the Cockpit's **operator wall** power view: a dark, dense, multi-stack Board for operators already running one or more sessions. This file completes the open visual-system and component-library item from `cockpit-ux-design.md`; the accessibility and progressive-disclosure constraints remain owned by `cockpit-operator-wall-a11y-reconciliation.md`.

The Board is a real control surface, not decorative art. Every visible region either binds to an AIWG source of truth or is cut from v1.

## Visual Tokens

The dark baseline inherits the AA-checked text/accent colors from `cockpit-operator-wall-a11y-reconciliation.md`. The tokens below define component roles and pairing rules for implementation.

| Token | Value | Role | Pairing rule |
|---|---:|---|---|
| `base-950` | `#0B1220` | page and Board background | primary dark base |
| `base-900` | `#111827` | nav rail and top bar | text-primary / text-secondary |
| `panel-glass` | `rgba(15, 23, 42, 0.82)` | stack cards and telemetry panels | rendered contrast must be checked after composition |
| `panel-line` | `#334155` | subtle card borders | not the only state cue |
| `text-primary` | `#F8FAFC` | headings, active labels | AA on base-950 |
| `text-secondary` | `#CBD5E1` | metadata, inactive nav text | AA on base-950 |
| `neutral-line` | `#E5E7EB` | shape/icon fallback | AA on base-950 |
| `accent-teal` | `#5EEAD4` | stack accent 1 | pair with label + shape |
| `accent-blue` | `#93C5FD` | stack accent 2 | pair with label + shape |
| `accent-violet` | `#C4B5FD` | stack accent 3 | pair with label + shape |
| `accent-green` | `#86EFAC` | stack accent 4 | pair with label + shape |
| `accent-amber` | `#FDE68A` | warning / needs approval | pair with warning icon + text |
| `accent-rose` | `#FDA4AF` | destructive / failed | pair with alert icon + text |

Per-stack accent assignment is deterministic per session id, with provider family as the stable tiebreaker. Accent is never the identity by itself; the UI always combines accent + topology shape + visible provider/session label.

## Component Inventory

| Component | Purpose | Primary source | A11y / reduced-motion rule |
|---|---|---|---|
| `NavRail` | global destination map | documented IA in `cockpit-ux-design.md` | icon + text label in expanded/focused state; active state not color-only |
| `TopBar` | health, density, search/discover, CLI copy | UC-001, UC-011, `aiwg discover`, `aiwg doctor` | controls have names; no auto-announced polling chatter |
| `StackBoard` | multi-stack power view | UC-002, UC-006 | two-level Board/Card keyboard model |
| `StackCard` | one running stack/executor | executor-registry, ralph/mc/serve status | mode and state are text + icon + accent |
| `TopologyGlyph` | stack/runtime family marker | executor `kind`, provider, runtime family | static under reduced motion; ornamental layers `aria-hidden` |
| `Sparkline` | recent activity trend | `activity-log`, serve/ralph/mc status samples | static last-N line under reduced motion |
| `LogStream` | focused/unfocused live transcript | PTY bridge / screen-reader / executor stream | only focused stack is polite live region |
| `FlowMiniGraph` | handoff/Mission topology | Mission conductor (#1546), activity-log links | graph has text summary; animation optional |
| `TransportBar` | observe, attach, pause, stop, more | UC-005, UC-012 capabilities | destructive actions confirm with blast radius |
| `SegmentProgress` | loop/Mission progress | ralph cycle, mc/Mission status | percentage/text required |
| `TelemetryStrip` | bottom coordination + observability | UC-007..010, activity-log, cost-report | panels are keyboard reachable summaries, not decoration |
| `ApprovalBadge` | pending HITL count | `hitl-prompt/v1`, UC-009 | badge includes count text and polite count change |

## Topology And Accent Semantics

`TopologyGlyph` encodes runtime family, not provider brand. Provider identity remains text in the card header. This keeps the glyph useful across custom providers and prevents color/brand-only recognition.

| Runtime family | Glyph shape | Examples |
|---|---|---|
| Host CLI | terminal slab | Codex, Claude Code, OpenCode |
| IDE extension | split-pane frame | VS Code shell, Cursor-like host |
| Desktop shell | window frame | Tauri desktop shell |
| Managed sandbox | stacked cube | agentic-sandbox executor |
| Mission conductor | connected node hub | cross-stack Mission / handoff |
| Background daemon | ring core | daemon task / long-running service |

Decorative glow, depth, and stacked layers are `aria-hidden`. The semantic name exposed to assistive tech is the runtime family plus label, for example `Managed sandbox, Codex release-check, Running`.

## StackBoard

`StackBoard` replaces the fixed six-up concept with a responsive power surface.

| Stack count | Layout | Behavior |
|---:|---|---|
| 0 | empty state | explicit "Start a session" affordance; links to UC-004 |
| 1 | single wide card | transcript and controls visible by default |
| 2-3 | balanced grid | all cards visible; no virtualization |
| 4-6 | dense grid | compact transcripts; density toggle available |
| 7-10 | virtualized grid + focus rail | visible cards remain stable; `+N more` control exposes hidden range |
| >10 | operator filter required | filter by provider, state, Mission, approval, or cost risk before expanding |

The Board is entered from Home through an explicit View Board action or from the Running Agents destination. It is not first-run default. Cards are bound one-to-one to executor-registry entries; polling is per card so one stalled stack cannot freeze siblings.

## StackCard

Every `StackCard` region maps to a use case and real source.

| Region | UI content | UC | Source of truth |
|---|---|---|---|
| Header | provider/session label, runtime family, started-at | UC-002, UC-006 | inventory + executor-registry |
| Status badge | Running, Needs approval, Observe only, Drive enabled, Failed | UC-002, UC-005, UC-009, UC-012 | ralph/mc/serve status + capability probe |
| Observe/Drive badge | current mode and capability gate | UC-005 | attach capability from PTY bridge / stack adapter |
| Topology glyph | runtime family shape + accent | UC-002, UC-006 | executor `kind`, provider metadata |
| Activity sparkline | last-N status/activity samples | UC-002, UC-006 | `activity-log`, ralph/mc/serve polling |
| Log stream | latest visible output | UC-005 | PTY bridge / screen-reader / executor stream |
| Flow mini graph | current handoff or Mission fan-out | UC-007, UC-008 | Mission conductor (#1546) + linked activity-log entries |
| Transport bar | Attach, Pause/Resume, Stop, More | UC-005, UC-012 | per-stack lifecycle capability matrix |
| Segment progress | cycle, step, or Mission completion status | UC-002, UC-008, UC-012 | ralph cycle, mc status, Mission conductor |
| Cost microcopy | current session cost/headroom if available | UC-010 | `cost-report`, `metrics-tokens`, #1187 aggregation |

Observe/Drive is not implied by a play icon. The badge is always visible:

| Capability | Badge | Controls |
|---|---|---|
| Observe-only | `Observe only` + eye icon | Attach allowed; input disabled |
| Drive-capable, not driving | `Observing` + eye icon | Drive action available behind confirm |
| Driving | `Drive enabled` + keyboard icon | input active; hand-back visible |
| Driver conflict | `Observe only - driver active` + lock icon | drive disabled until conflict clears |

## TelemetryStrip

The concept's bottom row becomes four real panels. No ornamental-only panel ships in v1.

| Panel | Decision | UC | Source |
|---|---|---|---|
| Coordination hub | live handoff/Mission topology | UC-007, UC-008 | executor-registry, Mission conductor (#1546), linked `activity-log` entry |
| Aggregate activity | fleet activity over time | UC-002, UC-006 | `activity-log`, ralph/mc/serve status samples |
| Cost donut | cost and quota, not stack mix | UC-010 | `cost-report`, `metrics-tokens`, #1187 |
| Utilization heatmap | stack activity by time bucket | UC-002, UC-006, UC-010 | activity-log + running-state samples |

The coordination hub is the live handoff/Mission surface. Selecting an edge opens the linked audit entry that records source session, target session, payload reference, operator, and timestamp. Mission nodes show worker progress and route raised gates to the Approval Inbox.

The cost donut uses text labels, threshold icons, and pattern/segment changes in addition to color. Near-limit state is `Near limit` with amber accent + warning icon + remaining budget text. Exceeded/error state is `Limit reached` or `Metrics unavailable` with rose/neutral treatment and source freshness.

## Approval Inbox Placement

Approval Inbox is a first-class IA destination and also appears as a global badge.

1. Primary home: `NavRail` destination `Approvals`.
2. Global awareness: `ApprovalBadge` in the top bar and on the nav item.
3. Contextual surfaces: StackCards and Mission panels link to the specific pending gate.
4. No batch approve in v1. Each gate opens its full prompt, action, blast radius, source stack, and decision controls.

This resolves the concept-art gap where the bottom strip had no Approval Inbox home.

## NavRail And Global Chrome

The Cockpit rail has seven reachable destinations. Icons are implementation choices, but the mapping is fixed.

| Destination | Icon family | Source / purpose |
|---|---|---|
| Home / Inventory | home/grid | UC-001 health, install inventory |
| Running Board | layers | UC-002/006 StackBoard |
| Sessions | terminal/window | UC-004/005 per-session view |
| Coordinate | graph nodes | UC-007/008 handoff + Mission |
| Approvals | shield/check | UC-009 unified HITL inbox; pending-count badge required |
| Cost & Quota | chart/donut | UC-010 cost-report surface |
| Deploy / Explore | package/search | UC-011 deploy plus capability discovery |

The bottom orb is the **live session switcher**. It is always visible when at least one session is running, shows the current focused session or `N running`, and opens a switcher filtered to active sessions. It is not a hidden eighth destination; it shortcuts Running Board/Sessions.

The top bar contains:

| Element | Binding | Behavior |
|---|---|---|
| Health pill | `aiwg doctor`, runtime status, bridge health | green/amber/rose icon + text; opens Home health detail |
| Density toggle | Board compact/comfortable/focus | persists per workspace; never changes first-run default |
| View toggle | Board/list/focus | list is accessible fallback for dense Board |
| Discover/search | `aiwg discover` + artifact index | search results show type, source, and action |
| Copy CLI command | command preview for every mutable action | copies the equivalent `aiwg ...` command or marks "UI-only observe" when no command exists |

Every mutable UI action exposes a Copy CLI command affordance before or after confirmation, preserving CLI-always without making the CLI mandatory.

## Acceptance Mapping

| Issue | Criterion | Evidence |
|---|---|---|
| #1604 | token set + component inventory | Visual Tokens and Component Inventory sections |
| #1604 | bounded accent palette with AA pairings | token table plus inherited contrast evidence from a11y reconciliation |
| #1604 | topology glyph + accent semantics | Topology And Accent Semantics |
| #1604 | reduced-motion + AA notes | Component Inventory plus linked a11y reconciliation |
| #1605 | StackCard spec mapped to UC + source | StackCard region table |
| #1605 | Observe/Drive badge + gate | Observe/Drive badge rules |
| #1605 | StackBoard responsive 1..~10 | StackBoard layout table |
| #1605 | identity by accent + shape + label | Visual Tokens and Topology sections |
| #1606 | each bottom panel bound or cut | TelemetryStrip table |
| #1606 | live handoff/Mission node hub + audit link | TelemetryStrip coordination hub decision |
| #1606 | cost donut bound to cost-report/#1187, not color-only | TelemetryStrip cost decision |
| #1606 | Approval Inbox placement | Approval Inbox Placement |
| #1607 | all seven IA destinations reachable, Inbox badge | NavRail mapping |
| #1607 | bottom orb role | live session switcher decision |
| #1607 | top-bar health/density/view/discover/search | top bar table |
| #1607 | Copy CLI command affordance | top bar Copy CLI command row |
