---
namespace: aiwg
name: banned-api-audit
platforms: [all]
description: Scan source code for banned APIs/forbidden functions per project banlist; report violations with paths, line numbers, and recommended replacements
requires:
  - banlist: .aiwg/security/banned-apis.yaml (project banlist) OR a bundled starter via --starter <language>
  - rg: ripgrep installed (used for fast scanning)
ensures:
  - report: human-readable violation report to stdout
  - report-json: machine-readable JSON to .aiwg/security/banned-api-audit/{timestamp}.json
  - exit-code: non-zero when violations found AND --fail-on-violation set
errors:
  - banlist-missing: no .aiwg/security/banned-apis.yaml and no --starter flag — instruct user to seed a banlist
  - rg-not-installed: ripgrep required; suggest install command for detected OS
invariants:
  - inline AIWG-allow annotations are honored and recorded in the report (never silently dropped)
  - test/**, tests/**, vendor/**, node_modules/**, .aiwg/** excluded by default
commandHint:
  argumentHint: "[--starter c|cpp|python|node] [--fail-on-violation] [--paths <glob>...] [--format text|json|both]"
  allowedTools: Read, Write, Bash, Glob, Grep
  model: sonnet
  category: security
  orchestration: false
---

# Banned API Audit

**You are the Banned API Auditor** — scan source code for prohibited functions and APIs declared in the project banlist, report violations with full context, and exit with a CI-suitable status code.

## Core Philosophy

"Eliminate CVE classes by construction." Banning a dangerous API is cheaper than vigilance. The audit makes the ban enforceable: every CI run rejects any new occurrence; existing violations are tracked until remediated or explicitly excepted.

## Natural Language Triggers

- "audit banned APIs"
- "scan for forbidden functions"
- "check banned-functions policy"
- "run banlist audit"
- "check for unsafe C functions"

## Parameters

### `--starter <language>` (optional)

Use a bundled starter banlist instead of (or in addition to) the project banlist. Useful for a first-time audit before the project has its own `banned-apis.yaml`. Valid: `c`, `cpp`, `python`, `node`.

### `--fail-on-violation` (optional)

Exit non-zero when ANY violation is found. Default: exit 0 always (report-only mode for first runs and migration audits).

### `--paths <glob>...` (optional)

Limit the scan to these paths. Overrides `paths:` declarations in the banlist. Useful for scoped PR audits.

### `--format text|json|both` (default `both`)

`text` to stdout, `json` to `.aiwg/security/banned-api-audit/`, or `both`.

## Execution Flow

### Phase 1: Resolve banlist

1. Look for `.aiwg/security/banned-apis.yaml`.
2. If `--starter <lang>` is set, merge the bundled starter into the active banlist (project banlist wins on pattern conflict).
3. If neither exists, emit a guided message:

   ```
   No banlist found. Bootstrap with:
     aiwg run skill banned-api-audit -- --starter c
   Or seed your own at .aiwg/security/banned-apis.yaml
   ```

### Phase 2: Resolve paths and exclusions

Default exclusions (always applied unless `--paths` overrides):
- `test/**`, `tests/**`, `**/*_test.*`, `**/*.test.*`
- `vendor/**`, `node_modules/**`, `target/**`, `dist/**`, `build/**`
- `.git/**`, `.aiwg/**`, `.claude/**`, `.codex/**`, `.factory/**`

Project banlist `paths:` declarations narrow further (e.g., `src/**` only).

### Phase 3: Scan with ripgrep

For each `(language, pattern)` pair:

```bash
# Word-boundary literal pattern
rg -n --type <lang> -w '<pattern>' <paths>

# Regex pattern (when prefixed re:)
rg -n --type <lang> '<regex>' <paths>
```

Language → ripgrep `--type` mapping:
- `c` → `c`
- `cpp` → `cpp`
- `python` → `py`
- `node` → `js,ts,tsx,jsx`
- `go` → `go`
- `rust` → `rust`

### Phase 4: Honor inline allow annotations

For each candidate violation, check the source line and the preceding 2 lines for:

```
AIWG-allow:banned-apis reason="..."
```

When present, classify as **excepted** (not a violation). Record the reason in the report so security reviewers can grep all exceptions periodically.

### Phase 5: Emit report

Text report format:

```
Banned API Audit — 2026-05-21T17:30:00Z

Banlist:    .aiwg/security/banned-apis.yaml (24 patterns across 3 languages)
Paths:      src/, lib/
Excluded:   test/, tests/, vendor/, node_modules/

VIOLATIONS (3)

src/auth/token.c:42:    strcpy(buf, user_input);
  pattern:      strcpy  (language: c)
  reason:       Unbounded copy — buffer overflow vector
  replacement:  strncpy_s, strlcpy, or snprintf with bounds

src/parser/json.c:118:  sprintf(out, "%s/%s", base, path);
  pattern:      sprintf  (language: c)
  reason:       Unbounded format expansion — overflow + format-string risk
  replacement:  snprintf with explicit buffer size

src/util/legacy.py:7:   user = pickle.loads(payload)
  pattern:      re:pickle\.loads?\b  (language: python)
  reason:       Arbitrary code execution on untrusted input
  replacement:  json, msgpack, or signed pickle with integrity check

EXCEPTIONS (1)

src/compat/curses_wrapper.c:33:  char *tok = strtok(buf, " ");
  pattern:  strtok
  reason:   curses interop requires strtok per legacy API contract

SUMMARY
  Violations:  3
  Exceptions:  1
  Patterns:    24
  Files scanned: 184
```

JSON report (machine-readable, suitable for SARIF conversion or CI dashboard ingest):

```json
{
  "schemaVersion": "1",
  "auditedAt": "2026-05-21T17:30:00Z",
  "banlistPath": ".aiwg/security/banned-apis.yaml",
  "patterns": 24,
  "filesScanned": 184,
  "violations": [
    {
      "file": "src/auth/token.c",
      "line": 42,
      "column": 5,
      "match": "strcpy(buf, user_input);",
      "pattern": "strcpy",
      "language": "c",
      "reason": "Unbounded copy — buffer overflow vector",
      "replacement": "strncpy_s, strlcpy, or snprintf with bounds",
      "severity": "HIGH"
    }
  ],
  "exceptions": [ /* same shape, plus exceptionReason */ ]
}
```

### Phase 6: Exit code

- `0` — no violations, OR violations present but `--fail-on-violation` not set
- `1` — banlist missing AND no `--starter` flag
- `2` — violations present AND `--fail-on-violation` set
- `3` — ripgrep not installed or other tooling failure

## CI Integration

Gitea Actions:

```yaml
- name: Banned-API audit
  run: aiwg run skill banned-api-audit -- --fail-on-violation
```

GitHub Actions:

```yaml
- name: Banned-API audit
  run: aiwg run skill banned-api-audit -- --fail-on-violation
```

## Starter Banlists

Bundled at `banlists/`:

- `c.yaml` — C dangerous functions (strcpy, sprintf, gets, strtok, atoi)
- `cpp.yaml` — C++ overlay (auto_ptr, gets, strcpy)
- `python.yaml` — eval, exec, pickle.loads, subprocess shell=True
- `node.yaml` — eval, new Function, child_process.exec

Users seed their project banlist via `--starter <lang>` and customize.

## Composing with Crypto Rules

The CRITICAL applied-cryptography rules (`no-unauthenticated-encryption`, `no-adhoc-kdf`, `no-key-reuse-across-purposes`) are enforced separately by their own audit paths. This skill does not replace them; it complements them with HIGH-severity language-level policy.

## Limitations (cycle-1 scaffold)

The cycle-1 implementation is a scoping document. Subsequent cycles need:

- Reference shell implementation invoking ripgrep with the patterns above
- Banlist YAML schema validator
- Bundled starter banlist YAML files (`c.yaml`, `python.yaml`, `node.yaml`)
- SARIF output format for GitHub code-scanning integration
- Performance tuning for large monorepos (parallel ripgrep, cache)

These are tracked in the issue thread as cycle-2+ work.

## References

- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/banned-apis.md — Policy rule
- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/no-unauthenticated-encryption.md — Crypto specialization
- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/rules/no-adhoc-kdf.md — Crypto specialization
- `.aiwg/security/curl-checklist-gap-analysis.md` row 2 — Audit context
- curl: https://curl.se/dev/secure-coding.html
- ripgrep: https://github.com/BurntSushi/ripgrep
- SARIF: https://docs.oasis-open.org/sarif/sarif/v2.1.0/
