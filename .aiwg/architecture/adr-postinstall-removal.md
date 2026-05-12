# ADR: Remove `postinstall` Lifecycle Script from `package.json`

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: #1279 (parent epic #1278 — supply-chain hardening campaign, May 2026)
**Audit Finding**: F1
**Threat Scenario**: S3 — worm propagation via compromised lifecycle hook (highest residual risk in the threat model)

## Context

AIWG's `package.json` historically declared a `scripts.postinstall` hook that ran `node ./bin/postinstall.mjs` after every `npm install -g aiwg`. The script body was benign: it tried `aiwg --version`, and on failure printed shell-specific `export PATH="$(npm config get prefix)/bin:$PATH"` guidance plus an `npx aiwg` fallback.

The May 2026 supply-chain hardening audit (referencing the Aikido report on the second Shai-Hulud / "Mini Shai-Hulud" worm event of 2026-05-12) flagged this as finding F1 — the single highest-residual-risk primitive in AIWG's package. The reasoning:

1. **The risk is the capability, not the current body.** A `postinstall` hook executes arbitrary code on every install machine before the operator ever invokes the CLI. If AIWG's npm releases are ever compromised — through maintainer-token theft, registry-side tampering, or a compromised CI signing key — the postinstall hook becomes the worm-propagation primitive that turns one compromised release into N infected developer machines within minutes.

2. **The Shai-Hulud worms (March 2026 and May 2026)** both used npm `postinstall` hooks as the propagation vector. Packages with no postinstall hook were not propagation amplifiers even when their dependency trees were touched, because there is no install-time execution surface to hijack.

3. **The UX value of the existing script is real but small.** It surfaces a one-time PATH-setup hint that is also recoverable from any documentation surface (`README`, `aiwg doctor`, `npm`'s own postinstall stderr output, the `npx aiwg` fallback).

The trade between (a) one-time install-time UX hint and (b) elimination of a worm-propagation capability is decisively in favor of (b).

## Decision

1. **Remove `scripts.postinstall`** from `package.json`. AIWG ships with no install-time execution surface.
2. **Delete `bin/postinstall.mjs`** from the published tarball. Retaining it as an opt-in `npx aiwg-pathcheck` fallback was considered (see Alternatives) and rejected — the maintenance cost and the operator-discovery problem outweigh the marginal UX win.
3. **Migrate the PATH-guidance UX to two surfaces**:
   - **`aiwg doctor`** — gains a PATH sub-step that probes `aiwg --version` on every invocation. On failure it prints the same shell-specific `export PATH` line + `source ~/.zshrc`/`.bashrc` + `npx aiwg` fallback the postinstall script printed. On success it is silent. Doctor's exit code is not affected (the check is informational, not a hard fail).
   - **`README.md`** — gains a concise "Installation Troubleshooting" section near the top (between the install snippet and "What AIWG Is"), documenting `which aiwg`, `npm config get prefix`, the shell-rc append, and the `npx aiwg` fallback.
4. **No `aiwg --help` text modification.** The common-case operator (PATH works) should not see clutter.
5. **No first-failed-command shell wrapper.** Out of scope.

## Consequences

### Positive

- **Removes the worm-amplifier capability entirely.** A compromised AIWG release no longer has an install-time execution surface, full stop. This collapses S3 (the highest-residual-risk threat-model scenario) to negligible.
- **Aligns AIWG with the post-Shai-Hulud npm hygiene baseline.** Packages without lifecycle hooks are categorically harder to weaponize.
- **Simplifies the published surface.** One less file in the tarball, one less script in `package.json`, no install-time stderr noise.

### Negative

- **Users with a misconfigured `PATH` no longer see guidance at install time.** They see it the first time they run `aiwg <anything>` (a `command not found` from the shell), or when they run `aiwg doctor` (which prints the same guidance). The discovery delay is real but small — `command not found` is a common and immediately-actionable signal.
- **`npm install -g aiwg` stderr is quieter.** Previously a successful install printed a "✓ aiwg installed successfully!" line and a hint list. That confirmation now lives in the README and in `aiwg --version` / `aiwg doctor`.

### Neutral

- The `bin/postinstall.mjs` source is preserved in git history. If a future need to restore the UX surfaces (e.g., a different platform's package manager allows opt-in install hooks with a clearer security model), the code is recoverable.

## Alternatives Considered

### A. Retain `bin/postinstall.mjs` as an opt-in `npx aiwg-pathcheck`

Add a `bin` entry like `"aiwg-pathcheck": "bin/postinstall.mjs"` so operators can run `npx aiwg-pathcheck` after install. **Rejected** because:

- The discovery problem is worse than the original. Operators who don't know their PATH is broken also don't know to run `npx aiwg-pathcheck`.
- It increases the published bin surface for a check that `aiwg doctor` already performs.
- Operator decision (issue #1279 comment, 2026-05-12) was explicit: delete the file, don't retain.

### B. Modify `aiwg --help` to include PATH-setup guidance

**Rejected** because it imposes clutter on the 95%+ case where PATH works. The README + doctor surfaces are sufficient.

### C. Ship a first-failed-command shell wrapper that intercepts `command not found: aiwg`

**Rejected** as out-of-scope (would require modifying the user's shell config at install time, which is precisely the kind of capability this ADR removes).

### D. Keep the postinstall hook and add static analysis to detect future malicious modifications

**Rejected** because static analysis is reactive — it only catches the next attack after one has been identified. The capability-removal approach is preventive: there is no execution surface to attack.

## References

- Issue #1279 — A1: Remove postinstall lifecycle script
- Issue #1278 — Parent epic: supply-chain hardening campaign (May 2026)
- Audit finding F1 — `.aiwg/security/supply-chain-audit-2026-05.md` (highest residual risk)
- Threat scenario S3 — `.aiwg/security/threat-model-supply-chain.md` (worm propagation via lifecycle hook)
- Aikido security report, 2026-05-12 — Mini Shai-Hulud event ("the second worm")
- Shai-Hulud worm (March 2026) — first major npm-postinstall worm in the AIWG hardening corpus
- `tools/cli/doctor.mjs` — new PATH sub-step (commit landing alongside this ADR)
- `README.md` — new "Installation Troubleshooting" section
