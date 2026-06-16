# Cockpit Operator Wall — Accessibility and Progressive Disclosure Reconciliation

**Issue**: roctinam/aiwg#1608
**Parent**: roctinam/aiwg#1588
**Status**: Baseline decision
**Related**: `cockpit-ux-design.md`, `../requirements/nfr-modules/cockpit-nfrs.md` (NFR-COCKPIT-05), UC-COCKPIT-003, concept art `docs/.public/blog/cockpit-control-plane.png`

## Decision

Adopt the June concept's dense "operator wall" only as the **power Board** view. The default landing experience remains the calm **Home / Guided Start** screen.

The visual direction is allowed only under these constraints:

1. Stack identity is never color-only. Every stack uses **accent + icon/shape + visible label**.
2. The board uses one keyboard model and one live-region strategy; it does not create six competing screen-reader streams.
3. Dark-theme tokens must pass WCAG 2.1 AA contrast before they can ship.
4. Motion is decorative, optional, and disabled under `prefers-reduced-motion`.
5. The Board is one click from Home and can be entered through explicit density/view controls; it is never the first-run default.

## Home to Board Progression

| Stage | Default user | Surface | Rule |
|---|---|---|---|
| First launch | Newcomer | Home / Guided Start | Show health, install state, and one primary "Start a session" action. No dense wall. |
| After first session | Returning operator | Home with Running summary | Show a compact "View Board" action when at least one stack exists. |
| Power use | Multi-stack operator | Stack Board | Dense, scan-first layout with density toggle and keyboard shortcuts exposed through menu/help, not inline instruction copy. |

The Board is a **progressive disclosure target**, not a replacement for Home. This preserves the Time-to-first-session KPI and keeps "friendly default, power on demand" intact.

## Stack Identity

Each stack card MUST include all three identity channels:

| Channel | Required form | Example |
|---|---|---|
| Text | Provider/session label visible in the header | `Codex / release-check` |
| Shape or icon | Stable per provider or runtime family | terminal, IDE, browser, sandbox, mission |
| Accent | Bounded palette token | `teal`, `blue`, `violet`, `green`, `amber`, `rose` |

Status also needs redundant channels:

| State | Text | Icon/shape | Accent use |
|---|---|---|---|
| Running | `Running` | play/heartbeat | accent border only |
| Waiting approval | `Needs approval` | shield/check gate | amber token |
| Observe only | `Observe only` | eye | neutral token |
| Drive enabled | `Drive enabled` | keyboard/controller | success token |
| Failed | `Failed` | alert triangle | error token |

Color may help scanning, but a monochrome screenshot must still communicate state.

## Live Region Strategy

The Board may show multiple live streams visually, but screen-reader behavior is constrained:

| Region | ARIA behavior | Notes |
|---|---|---|
| Global critical alert | `aria-live="assertive"` | At most one assertive region. Use only for destructive failure, security gate, or required approval. |
| Focused stack transcript | `aria-live="polite"` while focused | Only the selected/focused stack reads updates. |
| Unfocused stack transcripts | No live announcements | Visual updates only; expose "focus to read" and unread counters. |
| Aggregate activity charts | No live announcements by default | Summaries update on focus or explicit refresh. |
| Approval Inbox badge | Polite count change | Do not announce every underlying log line. |

This keeps calm-tech peripheral awareness without flooding assistive tech.

## Reduced Motion

All animated elements must have static equivalents:

| Element | Default | Reduced motion |
|---|---|---|
| Sparklines | Low-amplitude animation | Static last-N trend line |
| Log stream | Smooth append | Instant append, no scroll animation |
| Topology glyph glow | Subtle pulse | Static outline |
| Activity heatmap | Fade transition | Immediate state change |
| Progress segment | Sliding fill | Static percentage/text |

Implementation gate: CSS and component logic must honor `prefers-reduced-motion: reduce`.

## Contrast Tokens

These tokens are approved for the dark Board baseline. Ratios are against `base-950 #0B1220`; all listed values exceed WCAG AA for normal text (4.5:1).

| Token | Hex | Contrast |
|---|---:|---:|
| text-primary | `#F8FAFC` | 17.89 |
| text-secondary | `#CBD5E1` | 12.61 |
| accent-teal | `#5EEAD4` | 12.66 |
| accent-blue | `#93C5FD` | 10.38 |
| accent-violet | `#C4B5FD` | 10.14 |
| accent-green | `#86EFAC` | 13.33 |
| accent-amber | `#FDE68A` | 15.03 |
| accent-rose | `#FDA4AF` | 9.90 |
| neutral-line | `#E5E7EB` | 15.12 |

Panel glass and disabled text must be tested against the actual composited background, not token hex alone. Any opacity-based color needs rendered-DOM contrast validation before use.

## Keyboard Model

The Board uses a predictable two-level model:

1. **Board level**: tab order enters the Board once, then arrow keys move between stack cards in visual order. `Home` / `End` jump to first/last visible card.
2. **Card level**: `Enter` or `Space` enters the active card's controls. `Esc` returns to Board navigation.
3. **Transport controls**: tab order inside a card is `Observe/Drive mode`, `Attach`, `Pause/Resume`, `Stop`, `More`. Destructive actions require confirmation.
4. **Overflow**: if virtualization hides cards, the hidden range is represented by an accessible `+N more` control and a text count.
5. **Focus restoration**: closing a session, dialog, or confirmation returns focus to the invoking control.

## Acceptance Mapping

| #1608 criterion | Decision evidence |
|---|---|
| No color-only signaling | Stack identity and status tables require text + icon/shape + accent. |
| Live-region + reduced-motion strategy | Dedicated live-region and reduced-motion sections above. |
| AA contrast token set | Contrast table gives validated ratios for baseline dark tokens. |
| Keyboard focus/navigation model | Two-level Board/Card model above. |
| Calm Home default; dense Board power-on-demand | Home to Board progression table above. |
