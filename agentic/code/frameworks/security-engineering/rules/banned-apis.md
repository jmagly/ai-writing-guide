---
enforcement: high
id: banned-apis
severity: HIGH
applies_to: [all-agents, applied-cryptographer, security-auditor, code-reviewer]
tags: [forbidden-apis, banned-functions, language-policy, supply-chain]
---

# Banned APIs / Forbidden Functions

**Enforcement Level**: HIGH
**Scope**: Any code in a language declared in the project banlist
**Framework**: security-engineering

## Rule

Project banlists declared at `.aiwg/security/banned-apis.yaml` define APIs that MUST NOT appear in source files. Each banned entry has:

- **language** — the language scope (`c`, `cpp`, `python`, `node`, `go`, `rust`, ...)
- **pattern** — function/identifier name (exact match) or regex (when prefixed `re:`)
- **reason** — why the API is banned (CVE class, ergonomic footgun, deprecation)
- **replacement** — recommended safe alternative
- **paths** (optional) — globs limiting scope (e.g., `src/**`, excluding `test/`)
- **exceptions** (optional) — per-file or per-line opt-outs documented inline as `// AIWG-allow:banned-apis reason="..."`

A project that opts into this rule MUST have a banlist file. The bundled starter banlists at `agentic/code/frameworks/security-engineering/skills/banned-api-audit/banlists/` define defaults for C/C++, Python, and Node; projects copy and customize.

The applied-cryptography rules (`no-unauthenticated-encryption`, `no-adhoc-kdf`, `no-key-reuse-across-purposes`) are specialized instances of this pattern with CRITICAL severity — they enforce specific crypto-API bans regardless of project banlist state.

## Why

curl's "banned functions" practice is one of its foundational security controls: an explicit refusal to use `strcpy`, `sprintf`, `gets`, `strtok`, etc. enforced at CI gate. This eliminates entire CVE classes (buffer overflows, format-string bugs) by construction rather than vigilance. AIWG already does this for specific crypto APIs; generalizing the mechanism lets any project encode its own "we never use X" policy with the same enforcement weight.

Why this is its own rule rather than per-language lint configuration:

1. **Per-language linters scatter the policy** across `clang-tidy`, `ruff`, `eslint`, `golangci-lint`, etc. A unified AIWG-level rule centralizes the "what is forbidden" question.
2. **Cross-language bans exist** (e.g., "never deserialize untrusted input regardless of language") — the YAML banlist handles them uniformly.
3. **Exception annotations** (`AIWG-allow:`) follow the same convention across languages, auditable in one place.
4. **CI failure messages** point to a single policy document, not a thicket of linter rule IDs.

Source: curl 28-practice checklist gap analysis, Practice 2 ("Banned functions"). Audit: `.aiwg/security/curl-checklist-gap-analysis.md`.

## How to apply

### Detection

Run the audit skill:

```bash
aiwg run skill banned-api-audit
```

The skill reads `.aiwg/security/banned-apis.yaml`, walks the configured paths, and reports violations. Exit code is non-zero when violations are found, suitable for CI gating.

CI wiring (Gitea Actions example):

```yaml
- name: Banned-API audit
  run: aiwg run skill banned-api-audit -- --fail-on-violation
```

### Starter banlist (excerpt)

```yaml
# .aiwg/security/banned-apis.yaml
version: 1
languages:
  c:
    - pattern: strcpy
      reason: "Unbounded copy — buffer overflow vector"
      replacement: "strncpy_s, strlcpy, or snprintf with bounds"
    - pattern: sprintf
      reason: "Unbounded format expansion — overflow + format-string risk"
      replacement: "snprintf with explicit buffer size"
    - pattern: gets
      reason: "Reads unbounded input from stdin — removed from C11 for cause"
      replacement: "fgets(buf, sizeof(buf), stdin)"
    - pattern: strtok
      reason: "Non-reentrant, modifies input — thread-unsafe"
      replacement: "strtok_r (POSIX) or strtok_s (C11 annex K)"
    - pattern: 're:\batoi\s*\('
      reason: "No error reporting — silent failure on malformed input"
      replacement: "strtol with errno + endptr check"
  python:
    - pattern: eval
      reason: "Arbitrary code execution if input is attacker-influenced"
      replacement: "ast.literal_eval for literals, dedicated parser otherwise"
    - pattern: exec
      reason: "Arbitrary code execution"
      replacement: "Explicit dispatch table or sandboxed runtime"
    - pattern: 're:pickle\.loads?\b'
      reason: "Arbitrary code execution on untrusted input"
      replacement: "json, msgpack, or signed pickle with integrity check"
      paths: ["src/**", "lib/**"]
    - pattern: 're:subprocess\.(?:call|run|Popen)\([^)]*shell=True'
      reason: "Shell injection on user-controlled args"
      replacement: "shell=False with argument list"
  node:
    - pattern: eval
      reason: "Arbitrary code execution"
      replacement: "JSON.parse or dedicated parser"
    - pattern: 're:new\s+Function\s*\('
      reason: "Equivalent to eval"
      replacement: "Explicit dispatch"
    - pattern: 're:child_process\.exec(?!File)'
      reason: "Shell injection on string concatenation"
      replacement: "child_process.execFile with argv array"
```

### Per-file exception

When a banned API is genuinely required (legacy interop, perf-critical isolated section), the inline annotation opts out for that line:

```c
// AIWG-allow:banned-apis reason="curses interop requires strtok per legacy API contract"
char *tok = strtok(buf, " ");
```

The audit skill records all exceptions in its report; security reviewers can grep them periodically.

### Composing with applied-cryptography rules

The CRITICAL crypto-API rules (`no-unauthenticated-encryption` etc.) remain primary. They enforce cryptographic correctness regardless of project banlist state. The `banned-apis` rule is the configurable HIGH-severity layer for project-specific policy and language footguns that aren't cryptographic primitives.

## Detection Patterns

The audit skill uses ripgrep with per-language file globs:

```bash
# C/C++
rg -n --type c --type cpp -w 'strcpy|sprintf|gets|strtok' src/

# Python (word-boundary + regex support)
rg -n --type py 'eval\s*\(|exec\s*\(' src/

# Node/TypeScript
rg -n --type js --type ts 'eval\s*\(|new\s+Function\s*\(' src/
```

Patterns prefixed `re:` in the banlist are passed through to ripgrep as full regexes; bare patterns become word-boundary literals.

## Acceptable Exceptions

Three exception categories beyond inline annotations:

1. **Test code** — bans typically scope to `src/**` and `lib/**`. Tests may legitimately call banned APIs to verify safe-wrapper behavior. Default starter banlists exclude `test/**` and `tests/**`.
2. **Generated code** — emitted by code generators; banlist `paths` can exclude `**/generated/**`.
3. **Vendored third-party code** — `vendor/**` and `node_modules/**` are excluded by default; the project's dep-source policy (`dependency-source-policy`) governs vendored code separately.

## Rationale

The economic asymmetry: ~5 minutes to add a banlist entry vs ~weeks of incident response for a buffer-overflow CVE. Banlists also encode institutional memory — "we tried `pickle.loads` once, here's the postmortem" lives as a banlist comment forever.

## References

- `no-unauthenticated-encryption`, `no-adhoc-kdf`, `no-key-reuse-across-purposes` — CRITICAL crypto specializations
- `crypto-flag-verification` — companion CLI-flag enforcement
- `dependency-source-policy` — bans non-registry dep sources (different layer)
- `agentic/code/frameworks/security-engineering/skills/banned-api-audit/SKILL.md` — enforcement skill
- `.aiwg/security/curl-checklist-gap-analysis.md` row 2
- curl: https://curl.se/dev/secure-coding.html (Banned functions)
- CWE-242 (Use of Inherently Dangerous Function)
- CERT C: STR07-C, ENV33-C

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-21
