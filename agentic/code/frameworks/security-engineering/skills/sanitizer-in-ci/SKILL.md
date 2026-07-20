---
namespace: aiwg
name: sanitizer-in-ci
platforms: [all]
description: Detect language/toolchain and emit CI job recipes that build with runtime sanitizers (ASan/UBSan/MSan/TSan, race detectors, faulthandler)
requires:
  - toolchain: at least one supported language detected (C, C++, Rust, Go, Python, Node)
  - ci-platform: known CI platform (Gitea Actions, GitHub Actions, GitLab CI) — auto-detected from .github/.gitea/.gitlab files
ensures:
  - ci-recipe: emit ready-to-paste CI job(s) at .aiwg/security-engineering/sanitizers/{ci-platform}/{language}.yaml
  - suppression-template: emit a starter suppressions file for known acceptable false positives
  - operator-guide: emit OPERATOR.md explaining what each sanitizer catches and how to triage findings
errors:
  - no-supported-language: project has no language this skill can wire sanitizers for
  - unknown-ci-platform: no recognizable CI directory; emit recipes for all three with a chooser note
invariants:
  - never modifies existing CI files in place — always emits new files under .aiwg/ for operator review
  - emitted recipes do NOT replace test runs; they ADD a parallel sanitizer-enabled run
script:
  entrypoint: scripts/emit.mjs
  runtime: node
  cwd: project-root
  argsHint: "[--language c|cpp|rust|go|python|node|auto] [--ci gitea|github|gitlab|auto] [--coverage]"
commandHint:
  argumentHint: "[--language c|cpp|rust|go|python|node|auto] [--ci gitea|github|gitlab|auto] [--sanitizers asan,ubsan,msan,tsan,race,faulthandler] [--coverage]"
  allowedTools: Read, Write, Bash, Glob, Grep
  model: haiku
  category: security
  orchestration: false
  modelRole: efficiency
  modelTier: economy
---

# Sanitizer in CI

**You are the Sanitizer Integration Engineer** — detect what the project is built in, what its CI looks like, and emit recipes that wire compile-time sanitizers and runtime checkers into PR-gating jobs.

## Core Philosophy

"Catch the class of bugs the type system doesn't." Sanitizers find memory safety violations, undefined behavior, races, and unsafe deserialization at test time — finding bugs months before they become CVEs. The cost is one extra CI job per language; the value is every memory-safety incident you don't have.

## Natural Language Triggers

- "wire sanitizers into CI"
- "add ASan to the build"
- "enable UBSan"
- "set up runtime checkers"
- "race detector in CI"

## Language Coverage (cycle 1)

| Language | Sanitizers | Notes |
|----------|-----------|-------|
| C / C++  | ASan, UBSan, MSan, TSan | Compiler-driven; Clang preferred over GCC for breadth |
| Rust     | `RUSTFLAGS=-Zsanitizer=...`, miri (interpreter-mode UB checks) | Nightly required for compile-time sanitizers; miri runs on stable |
| Go       | `go test -race` (race detector), `go build -msan` (Linux/AMD64 only) | Race detector is the default; MSan needs CGO |
| Python   | `PYTHONFAULTHANDLER=1`, `-X dev`, `-W error` (warnings-as-errors) | Plus `pytest -W error::DeprecationWarning` |
| Node.js  | `--use-strict`, `--throw-deprecation`, `--unhandled-rejections=strict`, `--experimental-vm-modules` | No memory sanitizer; rely on UB caught by V8 + strict-mode flags |

Cycle-2 additions targeted: Swift, Java/JVM (HotSpot JFR + JNI checks), Ruby.

## Execution Flow

### Phase 1: Detect languages

Use the shared detection helper:

```bash
# agentic/code/frameworks/security-engineering/lib/toolchain-detect.sh
detect_languages  # outputs newline-separated language codes
```

Detection signals (per language):

- `c` — presence of `Makefile`, `CMakeLists.txt`, `*.c`/`*.h` in src
- `cpp` — `CMakeLists.txt` with `CXX`, `*.cpp`/`*.cc`/`*.hpp`, `meson.build`
- `rust` — `Cargo.toml`
- `go` — `go.mod`
- `python` — `pyproject.toml`, `setup.py`, `requirements*.txt`
- `node` — `package.json` with `dependencies` or `devDependencies`

### Phase 2: Detect CI platform

- `.github/workflows/` → GitHub Actions
- `.gitea/workflows/` → Gitea Actions (same syntax as GitHub)
- `.gitlab-ci.yml` → GitLab CI

If unclear, emit recipes for all three with a chooser comment.

### Phase 3: Emit per-language recipes

For each detected language, write to `.aiwg/security-engineering/sanitizers/{ci-platform}/{language}.yaml`.

Reference emitter:

```bash
agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/scripts/emit.sh \
  --language auto --ci auto
```

### Example: C/C++ on Gitea/GitHub Actions

```yaml
# .aiwg/security-engineering/sanitizers/github/c.yaml
# Add to your workflow OR copy into .github/workflows/sanitizers.yml
name: Sanitizers (C/C++)
on:
  pull_request:
  push:
    branches: [main]

jobs:
  asan-ubsan:
    runs-on: ubuntu-latest
    container: node:24@sha256:050bf2bbe33c1d6754e060bec89378a79ed831f04a7bb1a53fe45e997df7b3bb  # 24.15.0
    env:
      CC: clang
      CXX: clang++
      CFLAGS: "-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all"
      CXXFLAGS: "-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all"
      LDFLAGS: "-fsanitize=address,undefined"
      ASAN_OPTIONS: "abort_on_error=1:print_stacktrace=1:halt_on_error=1:detect_leaks=1"
      UBSAN_OPTIONS: "print_stacktrace=1:halt_on_error=1"
      LSAN_OPTIONS: "suppressions=.aiwg/security-engineering/sanitizers/lsan-suppressions.txt"
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4.3.1
      - name: Install clang
        run: apt-get update && apt-get install -y clang make cmake
      - name: Build with ASan + UBSan
        run: |
          # Adjust to your build system:
          # cmake: cmake -B build && cmake --build build
          # make:  make
          make
      - name: Run test suite under sanitizers
        run: make test
      - name: Upload sanitizer logs on failure
        if: failure()
        uses: actions/upload-artifact@b4b15b8c7c6ac21ea08fcf65892d2ee8f75cf882  # v4.4.3
        with:
          name: sanitizer-logs-c
          path: |
            build/Testing/Temporary/LastTest.log
            *.san.log

  msan:
    # MSan requires every dependency to be MSan-instrumented (including libc).
    # Most projects find this prohibitively expensive — enable only if you can build deps from source.
    runs-on: ubuntu-latest
    if: false  # set to true if your build allows MSan-instrumented deps
    # ... similar shape with -fsanitize=memory

  tsan:
    # TSan: thread races. Enable for multi-threaded code.
    runs-on: ubuntu-latest
    if: false  # enable for threaded projects
    # ... similar shape with -fsanitize=thread
```

### Example: Rust

```yaml
# .aiwg/security-engineering/sanitizers/github/rust.yaml
name: Sanitizers (Rust)
on: [pull_request, push]

jobs:
  asan:
    runs-on: ubuntu-latest
    env:
      RUSTFLAGS: "-Zsanitizer=address"
      RUSTDOCFLAGS: "-Zsanitizer=address"
      ASAN_OPTIONS: "abort_on_error=1:halt_on_error=1"
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - name: Install nightly toolchain
        run: |
          rustup toolchain install nightly --component rust-src
          rustup default nightly
      - name: Test with ASan
        run: cargo +nightly test -Zbuild-std --target x86_64-unknown-linux-gnu

  miri:
    runs-on: ubuntu-latest
    env:
      MIRIFLAGS: "-Zmiri-strict-provenance"
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - name: Install miri
        run: |
          rustup toolchain install nightly --component miri
          cargo +nightly miri setup
      - name: Run miri
        run: cargo +nightly miri test
```

### Example: Go

```yaml
# .aiwg/security-engineering/sanitizers/github/go.yaml
name: Sanitizers (Go)
on: [pull_request, push]

jobs:
  race-detector:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-go@0aaccfd150d50ccaeb58ebd88d36e91967a5f35b  # v5.4.0
        with:
          go-version-file: go.mod
      - name: Test with race detector
        run: go test -race -count=1 ./...
```

### Example: Python

```yaml
# .aiwg/security-engineering/sanitizers/github/python.yaml
name: Runtime Checks (Python)
on: [pull_request, push]

jobs:
  faulthandler-and-warnings:
    runs-on: ubuntu-latest
    env:
      PYTHONFAULTHANDLER: "1"
      PYTHONDEVMODE: "1"  # equivalent to python -X dev
      PYTHONWARNINGS: "error"  # warnings-as-errors
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065  # v5.6.0
        with:
          python-version-file: .python-version
      - name: Install deps
        run: pip install -e .[dev]
      - name: Test with dev mode + faulthandler
        run: pytest -W error
```

### Phase 4: Emit suppression files

For C/C++, write `.aiwg/security-engineering/sanitizers/lsan-suppressions.txt` with documented categories:

```
# LeakSanitizer suppressions
# Each entry MUST have a reason comment. Unjustified entries are reviewed quarterly.

# Third-party library known leak (upstream tracker: <link>)
# leak:libfoo

# OpenSSL one-time init leak — by design, lives until process exit
# leak:OPENSSL_init_crypto
```

### Phase 5: Emit operator guide

`.aiwg/security-engineering/sanitizers/OPERATOR.md`:

```markdown
# Sanitizer Operator Guide

## What each sanitizer catches

- **ASan (AddressSanitizer)**: heap/stack overflow, use-after-free, double-free, memory leaks
- **UBSan (UndefinedBehaviorSanitizer)**: signed overflow, null deref, OOB shifts, misaligned reads
- **MSan (MemorySanitizer)**: uninitialized memory reads
- **TSan (ThreadSanitizer)**: data races, deadlocks
- **Race (Go)**: data races in goroutines
- **faulthandler (Python)**: segfaults in C extensions; emits Python tracebacks

## Triage workflow

1. Sanitizer fails in CI → download the log artifact
2. Identify the access (e.g., `READ of size 4 at 0x...`)
3. Match to source via the stack trace
4. Decide: real bug → fix; false positive → suppression entry with link to upstream issue

## Suppressions policy

Every suppression entry MUST cite a reason. Quarterly review removes obsolete ones.
```

## Composition

- `dev-idempotent-builds.md` rule — sanitizer CI jobs MUST use pinned action SHAs and pinned container digests
- `ci-action-pinning.md` rule — same
- `fuzzing-in-ci` skill — complementary; fuzzing generates inputs that sanitizers then validate

## Implementation Status

- `scripts/emit.sh` emits recipe files under `.aiwg/security-engineering/sanitizers/{ci-platform}/`.
- Recipes are starter templates; project-specific tuning is still required for build commands, dependencies, and suppression paths.
- MSan/TSan remain conditional because enabling them requires project-specific instrumentation of all dependencies.
- OSS-Fuzz integration lives in `fuzzing-in-ci`, not here.

## References

- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/SKILL.md — Companion fuzzing skill
- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/lib/toolchain-detect.sh — Shared detection
- `.aiwg/security/curl-checklist-gap-analysis.md` row 14
- AddressSanitizer: https://github.com/google/sanitizers/wiki/AddressSanitizer
- UBSan: https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html
- Rust sanitizers: https://doc.rust-lang.org/beta/unstable-book/compiler-flags/sanitizer.html
- Go race detector: https://go.dev/doc/articles/race_detector
