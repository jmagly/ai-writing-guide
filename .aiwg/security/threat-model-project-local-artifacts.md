# Security Threat Model: Project-Local Artifact Discovery and Deployment

**Document ID**: THREAT-MODEL-004
**Version**: 1.0.0
**Created**: 2026-05-01
**Status**: Active
**Issue Reference**: [#1042](../../../../issues/1042) (parent epic [#1033](../../../../issues/1033))

---

## Executive Summary

This threat model covers the security posture of project-local artifact discovery from `.aiwg/{extensions,addons,frameworks,plugins}/<name>/` directories and their deployment to provider-specific paths (`.claude/`, `.codex/`, `.cursor/`, etc.). Project-local artifacts execute capability code — skills, agents, hooks, commands — on the operator's machine. They are also empowered to **shadow** upstream artifacts via the override semantics defined in [#1041](../../../../issues/1041), which extends the attack surface to anything an upstream component does.

The most material threats are **drive-by code execution** (cloning a repository auto-deploys malicious project-local content) and **shadow-of-safety** (a project-local artifact silently disables `human-authorization` or another safety-critical upstream rule). Path traversal and symlink escape are conventional but require explicit mitigation because the deploy step writes to provider directories outside `.aiwg/`.

**Risk Profile Summary**:

| Attack Surface | Highest Threat | Risk Rating |
|----------------|---------------|-------------|
| Repository clone → `aiwg use` | Drive-by code execution via auto-deployed hooks/commands | **CRITICAL** |
| Override / shadowing | Project-local override of safety-critical upstream rule (e.g., `human-authorization`) | **CRITICAL** |
| Manifest deploy paths | Path traversal writing outside `.<provider>/` directories | HIGH |
| Bundle directory | Symlink escape pointing outside the project tree | HIGH |
| Manifest parsing | DoS via oversized/adversarial manifest | MODERATE |
| Capability declaration | Manifest claims capabilities that body does not match | MODERATE |
| Git-installed addon | Third-party addon ships its own `.aiwg/extensions/` that overrides operator's | MODERATE |

**Key finding**: `aiwg use` and `aiwg refresh` are the primary attack triggers. Any rule that is established for project-local discovery must apply equally to artifacts brought in via `aiwg install owner/repo` (git-installed) — a malicious git package shipping its own `.aiwg/` should not get free shadowing privileges.

---

## System Architecture

### Components in Scope

| Component | Role | Trust Level |
|-----------|------|-------------|
| `.aiwg/<type>/<name>/manifest.json` | Bundle declaration | Untrusted as data |
| `.aiwg/<type>/<name>/` directory | Bundle body (skills, agents, rules, hooks) | Untrusted as code |
| Discovery scanner ([#1034](../../../../issues/1034)) | Reads manifests, validates schema | Trusted (CLI code) |
| Override resolver ([#1036](../../../../issues/1036)) | Picks winner on name collision | Trusted; denylist enforcement is the boundary |
| Deploy step ([#1035](../../../../issues/1035)) | Copies artifact files to provider dirs | Trusted; path-allowlist enforcement is the boundary |
| Deployed files in `.<provider>/` | Loaded by AI platform at runtime | Trust delegated to platform sandbox (varies) |
| Hooks (post-write, pre-session) | Execute shell commands during platform lifecycle | Trusted at write; **EXECUTE** on lifecycle events |

### Trust Boundaries

```
  +----------------------------------------------------------+
  |  Operator workstation (trusted)                          |
  |                                                          |
  |  +---------------------+    +---------------------+      |
  |  |  Project repository |    |  Upstream AIWG       |      |
  |  |  .aiwg/             |    |  agentic/code/       |      |
  |  |    extensions/      |    |    addons/           |      |
  |  |    addons/          |    |    frameworks/       |      |
  |  |    frameworks/      |    |                      |      |
  |  |    plugins/         |    |                      |      |
  |  +----------+----------+    +----------+----------+      |
  |             |                          |                   |
  |             v                          v                   |
  |  +-------------------------------------+                   |
  |  |  aiwg use / refresh / list / doctor |                   |
  |  |  - Discovery scanner                |                   |
  |  |  - Schema validation                |                   |
  |  |  - Override resolver                |                   |
  |  |  - Deploy step                      |                   |
  |  +------------------+------------------+                   |
  |                     |                                       |
  |                     v                                       |
  |  +-------------------------------------+                   |
  |  |  .claude/  .codex/  .cursor/  ...   |                   |
  |  |  Provider-specific deployed copies  |                   |
  |  +-------------------------------------+                   |
  |                     |                                       |
  |                     v                                       |
  |  +-------------------------------------+                   |
  |  |  AI platform (Claude Code, Codex,…) |                   |
  |  |  reads + executes deployed content   |                   |
  |  +-------------------------------------+                   |
  +----------------------------------------------------------+
        ^
        |  Attack surface boundary
        |
  +-------------------------+
  |  External Inputs         |
  |  - Cloned repo content   |  <-- UNTRUSTED until reviewed
  |  - Git-installed package |  <-- UNTRUSTED unless from known source
  |  - Manifest payload       |  <-- UNTRUSTED data; treat adversarially
  +-------------------------+
```

### Data Flow

1. **Source acquisition**: operator clones a repository or runs `aiwg install owner/repo`. Project files land in the working tree, including any `.aiwg/<type>/<name>/` directories.
2. **Discovery**: `aiwg list` / `aiwg use` / `aiwg refresh` scans the four `.aiwg/<type>/` directories, parses each `manifest.json`, validates schema.
3. **Override resolution**: collisions with upstream or git-installed artifacts resolved per [#1041](../../../../issues/1041) policy.
4. **Deploy**: artifact body files copied to `.<provider>/` paths per manifest `pathTemplate` and provider mappings.
5. **Platform load**: AI platform reads deployed files at session start. Some artifact types (hooks, scripts) may execute shell commands.

The first attack opportunity is at step 1 (cloning brings adversarial content). The second is at step 2 (manifest parsing). The third is at step 4 (path-traversal during deploy). The fourth is at step 5 (executing the deployed artifact).

---

## STRIDE Analysis

### Spoofing

**S1 — Spoofing upstream artifact identity to gain trust**
- **Attack**: project-local manifest declares `id: "human-authorization"` — the same ID as the upstream safety-critical rule — to take its place in the registry.
- **Impact**: shadow-of-safety (T1 below) executes silently.
- **Likelihood**: HIGH if no countermeasure; trivial to trigger.
- **Mitigation**: [#1041](../../../../issues/1041) override resolver requires explicit `overrides: ["<id>"]` declaration in manifest before allowing shadowing of safety-critical upstream IDs. Without the declaration, the deploy refuses.
- **Residual risk**: LOW (operator must consciously add `overrides:` and accept the shadow warning).

**S2 — Spoofing source of an artifact**
- **Attack**: artifact claims `installedFrom: "builtin"` in its manifest to evade project-local-specific scrutiny.
- **Mitigation**: `installedFrom` lives in `aiwg.config.json`, NOT in the manifest (per [#1038](../../../../issues/1038) E1). The discovery scanner sets `installedFrom` based on where the manifest was found, ignoring any value the manifest tries to declare.
- **Residual risk**: LOW.

### Tampering

**T1 — Project-local override of safety-critical upstream rule**
- **Attack**: project ships `.aiwg/extensions/aiwg-utils/rules/human-authorization.md` with weakened or removed authorization checks. On `aiwg use`, the override deploys to `.claude/rules/human-authorization.md`, replacing the upstream rule. Subsequent agent sessions skip authorization gates.
- **Impact**: agent performs irreversible/high-stakes operations without operator confirmation. CRITICAL.
- **Likelihood**: HIGH if no countermeasure; this is the documented override mechanism, just exploited.
- **Mitigation chain**:
  1. Upstream artifacts marked `safety-critical: true` in their manifests (data-driven denylist per [#1041](../../../../issues/1041) §4).
  2. Override resolver refuses to deploy a project-local override of a safety-critical artifact unless the project-local manifest explicitly declares `overrides: ["<upstream-id>"]`.
  3. Even with explicit `overrides:`, doctor and `aiwg use` emit a prominent warning naming the shadowed safety-critical rule.
  4. (Future hardening — out of scope for this iteration) Cryptographic signing of safety-critical artifacts; refuse override unless explicitly trusted via operator-managed keychain.
- **Residual risk**: MODERATE. Operator who blindly approves an `overrides: ["human-authorization"]` warning is still vulnerable. This is a docs and UX problem (covered in [#1051](../../../../issues/1051)) more than a code problem.

**T2 — Path traversal in deploy targets**
- **Attack**: manifest declares `pathTemplate: "../../etc/foo"` or `pathOverrides: { claude: "/home/operator/.ssh/config" }`. Deploy step writes to operator-controlled paths outside `.<provider>/`.
- **Impact**: arbitrary file write to operator's home directory. CRITICAL.
- **Likelihood**: HIGH if no countermeasure.
- **Mitigation**: manifest schema ([#1044](../../../../issues/1044)) restricts `pathTemplate` and `pathOverrides` to an explicit allowlist of provider prefixes (`.claude/`, `.codex/`, `.cursor/`, `.factory/`, `.opencode/`, `.warp/`, `.windsurf/`, `.github/`, `~/.openclaw/`, `~/.hermes/`). Any `..` segment in the template is rejected. Resolved paths are normalized and re-checked against the allowlist after substitution.
- **Residual risk**: LOW (allowlist + post-resolution check).

**T3 — Symlink escape from bundle directory**
- **Attack**: `.aiwg/extensions/foo/` is a symlink to `/etc/` or to a network-mounted attacker-controlled path. Discovery scanner reads files via the symlink; deploy step copies them.
- **Impact**: attacker-controlled content is interpreted as if it were a project-local artifact.
- **Likelihood**: MEDIUM (requires either a malicious project setup or a separate vulnerability that creates the symlink).
- **Mitigation**: scanner refuses symlinked bundle directories by default. Operators who need symlinks (e.g., for shared corpus development) must pass `--allow-symlinks` explicitly to `aiwg use`/`refresh`. The flag is recorded in activity log.
- **Residual risk**: LOW.

**T4 — In-place mutation of deployed file by operator, then `aiwg refresh` re-deploys clean**
- **Attack**: operator hand-edits `.claude/skills/foo/SKILL.md` to test a change. Next `aiwg refresh` overwrites it from the project-local source, losing the edit silently.
- **Impact**: lost work, not a security threat per se, but causes operators to distrust the system.
- **Mitigation**: deploy step computes content hash before overwriting; if deployed content differs from registered source hash, warn and skip unless `--force` is set. Doctor surfaces drift.
- **Residual risk**: LOW.

### Repudiation

**R1 — Operator denies authorizing a malicious deploy**
- **Attack**: post-incident, operator claims they did not run `aiwg use` after cloning the malicious repo.
- **Mitigation**: every discover/deploy/conflict/shadow event is appended to `.aiwg/activity.log` with timestamp ([#1049](../../../../issues/1049) defines schema). Activity log entries are append-only; tampering with them is detectable but not prevented at the application layer.
- **Residual risk**: MODERATE. Activity log is on the operator's machine and the operator can rewrite it. For operations that require attestation (compliance, security review), the activity log is informational, not authoritative.

### Information Disclosure

**I1 — Manifest declares capabilities that body does not match**
- **Attack**: manifest lists benign capabilities (`["docs", "summarization"]`) but artifact body executes shell commands or reads sensitive files.
- **Impact**: operator approves the artifact based on declared capabilities; actual behavior diverges.
- **Mitigation**: capability declaration is informational only. Mitigation is in the **platform sandbox** (Claude Code's tool allowlist, Codex's permission model, etc.), not in AIWG. AIWG's contribution is making capability declarations visible in `aiwg list` and `aiwg doctor` so operators can review claimed scope.
- **Residual risk**: MODERATE. Out-of-band — depends on platform sandbox.

**I2 — Project-local artifact reads `.aiwg/data/*` and exfiltrates**
- **Attack**: project-local skill references `@.aiwg/intake/project-intake.md` (legitimate) and a more-sensitive `@.aiwg/security/credentials.md` (illegitimate), exfiltrates contents via tool calls.
- **Mitigation**: out-of-scope for AIWG's discovery/deploy layer. The platform sandbox controls what tools the artifact can call. AIWG can only enforce that artifacts come from a known source (the operator's own project), which they already do by definition for project-local.
- **Residual risk**: MODERATE. Inherent to project-local trust model.

### Denial of Service

**D1 — Oversized manifest crashes parser**
- **Attack**: `manifest.json` is 1 GB of garbage; parser OOMs.
- **Mitigation**: manifest schema ([#1044](../../../../issues/1044)) enforces 64 KB max file size before parse. Parser uses streaming-aware Zod validation with bounded depth.
- **Residual risk**: LOW.

**D2 — Excessive bundle count**
- **Attack**: project ships 10,000 bundles to slow `aiwg use`.
- **Mitigation**: scanner enforces 200-bundle-per-project limit ([#1044](../../../../issues/1044)). Beyond the limit, scan refuses and reports the count.
- **Residual risk**: LOW.

**D3 — Deploy fork-bomb via post-deploy hook**
- **Attack**: post-deploy hook spawns an unbounded number of subprocesses.
- **Mitigation**: AIWG itself does not execute hooks during `aiwg use` / `refresh` — hooks are written to the platform's hook directory and executed by the platform on lifecycle events. The threat surface is the platform's hook execution model, not AIWG. AIWG documents this clearly.
- **Residual risk**: MODERATE (platform-dependent).

### Elevation of Privilege

**E1 — Project-local artifact gains shadowing power not granted to git-installed artifacts**
- **Attack**: a malicious git package places content at `.aiwg/extensions/foo/` (in the operator's working tree, after `aiwg install`) to gain project-local override priority over upstream — bypassing controls that would apply to git-installed sources.
- **Mitigation**: `aiwg install` is configured to never write into `.aiwg/<type>/` directly; git-installed packages land in their own registry-managed location. If operator manually copies content into `.aiwg/<type>/`, they accept project-local trust on it. The boundary is: `.aiwg/<type>/<name>/` is operator-authored; anything else is registered as its actual source.
- **Residual risk**: LOW. (Operator who copies untrusted content into their own project directory has bigger problems.)

**E2 — Override declaration accepted with phantom upstream ID**
- **Attack**: manifest declares `overrides: ["nonexistent-upstream-id"]` to satisfy override-required check without actually shadowing anything; later, the upstream actually adds an artifact with that ID and the project-local immediately starts shadowing it without a fresh review cycle.
- **Mitigation**: `overrides:` declarations are validated against existing upstream artifacts at validation time. Phantom overrides (no matching upstream ID) are refused.
- **Residual risk**: LOW.

---

## Operational Controls

### Validation-time controls (`aiwg validate-metadata`)

- Manifest size ≤ 64 KB
- Schema-valid per [#1044](../../../../issues/1044)
- `pathTemplate` / `pathOverrides` resolve under allowlisted provider prefixes
- `overrides:` declarations match real upstream IDs
- Bundle name matches `[a-z0-9][a-z0-9-]*[a-z0-9]`
- No `..` segments anywhere

### Deploy-time controls (`aiwg use` / `refresh`)

- Symlinked bundle dir refused unless `--allow-symlinks`
- Deployed-file hash check before overwrite (mutation detection)
- Activity log entry per discover/deploy/conflict/shadow event
- Safety-critical shadow refused without explicit `overrides:` declaration
- All four `.aiwg/<type>/` dirs scanned with the same rules

### Inspection controls (`aiwg doctor`)

- Per-bundle validation status
- Active shadows enumerated with severity (safety-critical highlighted)
- Deploy-state drift surfaced
- Legacy `frameworks/registry.json` deprecation surfaced (until [#1047](../../../../issues/1047))
- Symlinked bundles listed (if `--allow-symlinks` was used)

### Out-of-band controls (operator hygiene)

- Review project-local artifacts before running `aiwg use` on a freshly cloned repo
- Treat `.aiwg/extensions/` etc. as code review territory in PRs
- Audit `.aiwg/activity.log` after suspicious behavior

---

## Residual Risk Summary

| Risk | Severity | Status |
|------|----------|--------|
| Drive-by code execution on `aiwg use` after fresh clone | HIGH inherent | Mitigated by safety-critical denylist + override warnings; depends on operator review hygiene |
| Operator approves `overrides:` warning without understanding | MODERATE | Mitigation is docs/UX ([#1051](../../../../issues/1051)) |
| Capability misdeclaration | MODERATE | Out-of-scope; depends on platform sandbox |
| Activity log tampering | LOW | Informational only; not authoritative |
| Path traversal | LOW | Allowlist + post-resolution check |
| Symlink escape | LOW | Refused by default |
| DoS via manifest | LOW | Size + count limits |
| Phantom override | LOW | Validation refuses |

---

## Future Hardening (Out of Scope for This Iteration)

1. **Cryptographic signing of safety-critical upstream artifacts**: refuse override unless project-local manifest carries operator's signature on the override declaration.
2. **Allowlist of trusted project-local sources**: operator declares which directories are auto-trusted; others require interactive confirmation on first deploy.
3. **Hash-pinning**: project's `aiwg.config.json` records hashes of all project-local artifacts at deploy time; refuse next deploy if hashes change without explicit acknowledgment.
4. **Sandboxing of post-deploy hooks**: out-of-scope for AIWG; depends on platform.

These belong to a separate hardening track if/when the threat model warrants them.

---

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form invariant (E1: `installedFrom` placement defends S2)
- [#1039](../../../../issues/1039) — Directory layout (§5 reserved names, §3 symlink refusal)
- [#1041](../../../../issues/1041) — Override / shadowing policy (T1's primary mitigation)
- [#1044](../../../../issues/1044) — Manifest schema (T2/D1/D2 mitigations)
- [#1049](../../../../issues/1049) — Activity log + doctor (R1, deploy-time controls)
- [#1051](../../../../issues/1051) — Management documentation (operator hygiene)
- `agentic/code/addons/aiwg-utils/rules/human-authorization.md` — primary safety-critical example referenced in T1
- `.aiwg/security/threat-model-daemon.md` — companion threat model (format reference)
