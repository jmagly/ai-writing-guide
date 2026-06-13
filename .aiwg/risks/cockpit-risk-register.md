# Risk Register — AIWG Cockpit

**Phase**: Inception
**Status**: Draft
**Related**: @.aiwg/management/cockpit-vision.md, @.aiwg/security/cockpit-threat-model.md, @.aiwg/requirements/nfr-modules/cockpit-nfrs.md

Risk levels: Critical / High / Medium / Low. Security risks (S/I/T/E/R/D ids) are sourced from the threat model; product/technical/coordination risks (P/X ids) are added here.

## Security risks (from threat model)

| ID | Risk | Sev | Mitigation | Retire-by (PoC at Elaboration) |
|----|------|-----|------------|-------------------------------|
| E1 | HITL-gate bypass via Cockpit-issued destructive Mission | Critical | AIWG core re-validates a fresh approval token; Cockpit relays, never mints | PoC: relayed-approval round-trip rejects forged/expired tokens |
| E2 | Cross-stack privilege escalation (dispatch to X with Y's creds) | Critical | Attach binds to each stack's native auth; Mission conductor validates per-worker scope (#1546) | PoC: scope-violation dispatch is refused |
| E3 | Marketplace UX agent escalates UI→core dispatch scope | Critical | Agents sandboxed to display/interaction; dispatch only via human-authorization-gated bridge endpoints authed to the operator session | PoC: sandboxed agent cannot reach a dispatch endpoint |
| I1 | Provider credentials leak into UI state | Critical | Never store credentials; opaque attach-handles only; CI lint bans token-shaped browser-storage writes | PoC: lint + storage audit green |
| I5 | Marketplace agent exfiltrates source via connect-src | Critical | Adoption-gate static analysis; strict CSP connect-src 'self'; respect-repo-access-manifest | PoC: CSP blocks off-origin fetch |
| T1 | Activity-log tampering hides a dispatch | Critical | Append-only contract; no delete/rewrite API; provenance tags; hash-chain ADR | ADR + tamper test |
| T3 | Marketplace agent supply-chain tampering (Shai-Hulud pattern) | Critical | Content-hash pinning (dependency-source-policy + ci-action-pinning); re-review on hash change | PoC: hash-change blocks load pending review |
| S3 | HITL approval forgery (script claims operator authority) | Critical | Native-UX confirm where supported; CSRF-protected POST re-verified by core; all approvals logged | PoC with E1 |
| S1 | Local-server origin spoof / CSRF from local process or site | High | 127.0.0.1 bind, Origin allow-list, SameSite=Strict, CSRF double-submit, no CORS wildcard | PoC: spoofed origin rejected |
| D1 | Cockpit crash mid-Mission destabilizes a stack (overlay-isolation breach) | High | Fire-and-track not fire-and-hold; registry owns persistence; idempotent reattach; no exclusive locks | PoC: kill-bridge isolation test (NFR-01) |
| T2 | Mission/dispatch payload tampering in transit | High | HMAC-signed payloads per-install; schema validation; core re-validates pre-execute | PoC: tampered payload rejected |
| R2 | Marketplace-agent action mis-attributed to operator | High | Per-action provenance tag on every activity-log entry | Verified by NFR-08 coverage |

## Product / technical / coordination risks

| ID | Risk | Sev | Mitigation | Retire-by |
|----|------|-----|------------|-----------|
| P1 | "Non-nerf" promise fails for some provider (Cockpit subtly alters native behavior) | Critical | Per-provider capability-parity checklist as ABM gate (NFR-02); observe-only fallback where drive can't be proven safe | Parity checklist passes per integrated stack |
| P2 | Scope creep into "rebuild AIWG CLI/Mission Control in a GUI" instead of overlay | High | Vision non-goals + option-matrix decision: Cockpit is a GUI over the existing substrate, not a reimplementation | Architecture review at ABM |
| X1 | Providers lack a usable programmatic session interface → attach impossible for some stacks | High | Capability matrix per provider; graceful observe-only / last-known-logs fallback; document tiers | Spike: enumerate attach-capable vs observe-only providers |
| X2 | serve executor-registry / #1546 not mature enough to be the coordination seam | High | Validate the seam early; if gaps, file upstream issues and scope v1 to supported stacks | Spike against serve executor-registry |
| X3 | Coordination semantics (cross-stack handoff) ambiguous / lossy | Medium | Define handoff contract in elaboration ADR; start with explicit operator-mediated handoff before automation | Handoff ADR + PoC |
| P3 | Newcomer simplicity vs power-user depth tension produces a cluttered UI | Medium | Progressive disclosure; friendly default home + power surfaces behind it; UX agent review | UX design + usability check |
| P4 | UI-stack choice locks in maintenance cost / portability problems | Medium | UI-stack ADR weighing portability (Linux/macOS/Windows), local-server model, team familiarity | UI-stack ADR |
| X4 | Marketplace UX agents add license/quality/security liability | Medium | Adoption gate (license+quality+security); prefer AIWG's own UX team where parity exists | Adoption-gate doc + first-agent review |
| X5 | Multi-channel distribution expands the supply-chain surface (curl-installer, Homebrew, winget, Docker each a trust artifact) | High | One SetupManifest as source of truth; pin + checksum/signature every channel; reproducible-from-manifest; obey ci-action-pinning / dependency-source-policy / npm-supply-chain-audit | Signed/pinned install PoC + supply-chain audit per channel |
| P5 | "Front with UX" silently erodes CLI parity (capabilities land UI-only) | High | CLI parity is a permanent NFR-09 invariant; CLI-parity checklist (0 removed); UI surfaces equivalent CLI commands (cli-secondary) | CLI-parity checklist as a release gate |
| X6 | Newcomer installer must bootstrap prerequisites (e.g. Node) it cannot assume present | Medium | SetupManifest platform-route bootstraps only-if-absent with show-before-run + recovery; Docker path needs zero host deps | Per-target clean-machine install walkthrough (UC-013) |
| X7 | Multi-package monorepo (base `aiwg` + `@aiwg/cockpit`) adds release/version-skew + base-bloat risk | High | npm workspaces; CI guard fails on base size/dep regression; single SetupManifest composes channels | Workspace split PoC + base-footprint CI guard |
| P6 | Opt-in `@aiwg/cockpit` drifts out of contract with installed `aiwg` core | High | Compatible-range pin + runtime version check in the lazy `aiwg cockpit` stub; monorepo lockstep | Version-coherence check in stub |
| X8 | Home-scope runtime docs dir (`~/.aiwg/cockpit/runtime/`) growth / retention / secrets hygiene | Medium | Route via `resolveStorage`; activity-log append-only + no-secrets rules; retention policy | Runtime-store lifecycle spec |
| X9 | Wrong launch cwd loads the wrong project context into a spawned agent | Medium | Always show + audit the launch cwd; sensible default (`~/` system-wide vs chosen project); respect-repo-access-manifest | Launch-context UX review |
| X11 | Depends on extending agentic-sandbox (direct+managed sessions, multiplexer backends) | High | Spike + scope like #1546/X2; file upstream issue; scope v1 to supported backends | Extend-agentic-sandbox spike + issue |
| X12 | Multiplexer heterogeneity (screen/zellij/tmux behavioral differences) leaks through the interface | Medium | Absorb behind the agentic-sandbox interface; per-backend conformance suite | Per-backend conformance tests |
| X13 | agentic-sandbox lacks a local-host execution target (only docker/VM today) — can't run AIWG's base level | High | Extend agentic-sandbox with a host target (#1589); full host→docker→VM spectrum, operator-selectable | Host-target backend in #1589 |
| P8 | Host-target instances are least-isolated (full host access) — implicit/wrong tier choice raises blast radius | Medium | Isolation tier is an explicit, shown, audited per-launch choice; sensible default; respect-repo-access-manifest | Isolation-tier UX + audit |

## Top risks to retire in Elaboration (PoCs / spikes)
1. **D1 / NFR-01** overlay-isolation kill-bridge test (the core promise).
2. **P1 / NFR-02** per-provider non-nerf capability parity.
3. **E1+S3** relayed-approval token integrity (HITL cannot be forged/bypassed via Cockpit).
4. **X1 / X2** provider attach-capability + serve executor-registry seam maturity.
