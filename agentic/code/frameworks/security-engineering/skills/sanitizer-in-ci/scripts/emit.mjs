#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outRoot = path.join(root, '.aiwg', 'security-engineering', 'sanitizers');

function argValue(args, name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

function detectLanguages() {
  const langs = [];
  const exists = (p) => fs.existsSync(path.join(root, p));
  if (exists('Cargo.toml')) langs.push('rust');
  if (exists('go.mod')) langs.push('go');
  if (exists('pyproject.toml') || exists('setup.py') || exists('requirements.txt')) langs.push('python');
  if (exists('package.json')) langs.push('node');
  if (exists('CMakeLists.txt') || exists('Makefile')) langs.push('c');
  return langs.length ? langs : ['c'];
}

function detectCi() {
  if (fs.existsSync(path.join(root, '.gitea', 'workflows'))) return 'gitea';
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) return 'github';
  if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) return 'gitlab';
  return 'github';
}

function recipe(language, options = {}) {
  const coverage = Boolean(options.coverage);
  if (language === 'rust') return `name: Sanitizers (Rust)
on: [pull_request, push]
jobs:
  miri:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - run: rustup toolchain install nightly --component miri
      - run: cargo +nightly miri test
`;
  if (language === 'go') return `name: Sanitizers (Go)
on: [pull_request, push]
jobs:
  race:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-go@0aaccfd150d50ccaeb58ebd88d36e91967a5f35b
        with:
          go-version-file: go.mod
      - run: go test -race -count=1 ./...
`;
  if (language === 'python') return `name: Runtime Checks (Python)
on: [pull_request, push]
jobs:
  warnings:
    runs-on: ubuntu-latest
    env:
      PYTHONFAULTHANDLER: "1"
      PYTHONDEVMODE: "1"
      PYTHONWARNINGS: "error"
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065
      - run: python -m pytest
`;
  if (language === 'node') return `name: Runtime Checks (Node)
on: [pull_request, push]
jobs:
  strict-runtime:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version-file: .nvmrc
      - run: node --unhandled-rejections=strict --throw-deprecation ./node_modules/.bin/vitest run
`;
  return `name: Sanitizers (C/C++)
on: [pull_request, push]
jobs:
  asan-ubsan:
    runs-on: ubuntu-latest
    env:
      CC: clang
      CXX: clang++
      CFLAGS: "-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all"
      CXXFLAGS: "-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all"
      LDFLAGS: "-fsanitize=address,undefined"
      ASAN_OPTIONS: "abort_on_error=1:print_stacktrace=1:halt_on_error=1:detect_leaks=1"
      UBSAN_OPTIONS: "print_stacktrace=1:halt_on_error=1"
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
      - run: sudo apt-get update && sudo apt-get install -y clang make cmake
      - run: make
      - run: make test
${coverage ? `      - name: Generate coverage (gcov/llvm-cov)
        run: |
          llvm-profdata --version || true
          gcov --version || true
` : ``}`;
}

const args = process.argv.slice(2);
const coverage = args.includes('--coverage');
const ci = argValue(args, '--ci', 'auto') === 'auto' ? detectCi() : argValue(args, '--ci', 'github');
const langArg = argValue(args, '--language', 'auto');
const languages = langArg === 'auto' ? detectLanguages() : langArg.split(',');
for (const lang of languages) {
  const dir = path.join(outRoot, ci);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${lang}.yaml`), recipe(lang, { coverage }));
}
fs.writeFileSync(path.join(outRoot, 'lsan-suppressions.txt'), '# Add intentional leak suppressions here with issue links.\n');
fs.writeFileSync(path.join(outRoot, 'OPERATOR.md'), '# Sanitizer CI Operator Notes\n\nReview emitted YAML before copying into live CI. Jobs use pinned actions and intentionally run as additional PR gates, not replacements for the main test suite. Keep suppressions rare and require issue links.\n');
console.log(`Emitted sanitizer recipes: ${languages.map((l) => `.aiwg/security-engineering/sanitizers/${ci}/${l}.yaml`).join(', ')}`);
