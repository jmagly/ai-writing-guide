#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outRoot = path.join(root, '.aiwg', 'security-engineering', 'fuzzing');

function argValue(args, name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

function detectCi() {
  if (fs.existsSync(path.join(root, '.gitea', 'workflows'))) return 'gitea';
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) return 'github';
  if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) return 'gitlab';
  return 'github';
}

function detectLanguages() {
  const langs = [];
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) langs.push('rust');
  if (fs.existsSync(path.join(root, 'go.mod'))) langs.push('go');
  if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'requirements.txt'))) langs.push('python');
  if (fs.existsSync(path.join(root, 'package.json'))) langs.push('node');
  if (fs.existsSync(path.join(root, 'CMakeLists.txt')) || fs.existsSync(path.join(root, 'Makefile'))) langs.push('c');
  return langs.length ? langs : ['c'];
}

function harness(lang) {
  if (lang === 'rust') return `#![no_main]\nuse libfuzzer_sys::fuzz_target;\n\nfuzz_target!(|data: &[u8]| {\n    let _ = data;\n});\n`;
  if (lang === 'python') return `import atheris\nimport sys\n\ndef TestOneInput(data: bytes) -> None:\n    _ = data\n\natheris.Setup(sys.argv, TestOneInput)\natheris.Fuzz()\n`;
  if (lang === 'node') return `module.exports.fuzz = function (data) {\n  void data;\n};\n`;
  if (lang === 'go') return `package fuzz\n\nimport \"testing\"\n\nfunc FuzzParse(f *testing.F) {\n    f.Fuzz(func(t *testing.T, data []byte) {\n        _ = data\n    })\n}\n`;
  return `#include <stddef.h>\n#include <stdint.h>\n\nint LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {\n    (void)data;\n    (void)size;\n    return 0;\n}\n`;
}

function recipe(lang, seconds, options = {}) {
  if (lang === 'go') return `name: Fuzz (Go)\non: [pull_request, push]\njobs:\n  native-fuzz:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n      - uses: actions/setup-go@0aaccfd150d50ccaeb58ebd88d36e91967a5f35b\n        with:\n          go-version-file: go.mod\n      - run: go test -run=^$ -fuzz=Fuzz -fuzztime=${seconds}s ./...\n`;
  const afl = options.afl ? `\n  aflplusplus:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n      - run: sudo apt-get update && sudo apt-get install -y afl++ clang\n      - run: echo \"Wire AFL++ build target for ${lang}; budget ${seconds}s\"\n` : '';
  const coverage = options.coverage ? `\n      - name: Coverage hook\n        run: echo \"Wire gcov/llvm-cov or language-native coverage for ${lang} fuzz target\"\n` : '';
  return `name: Fuzz (${lang})\non: [pull_request, push]\njobs:\n  fuzz:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5\n      - name: Run short-form fuzzing\n        run: |\n          echo \"Wire ${lang} fuzz target here; budget ${seconds}s per target\"\n${coverage}${afl}`;
}

const args = process.argv.slice(2);
const ci = argValue(args, '--ci', 'auto') === 'auto' ? detectCi() : argValue(args, '--ci', 'github');
const seconds = Number(argValue(args, '--seconds-per-target', '120'));
const langArg = argValue(args, '--language', 'auto');
const languages = langArg === 'auto' ? detectLanguages() : langArg.split(',').map((s) => s.trim()).filter(Boolean);
const coverage = args.includes('--coverage');
const afl = args.includes('--afl') || args.includes('--aflplusplus') || args.includes('--oss-fuzz');
for (const lang of languages) {
  const langDir = path.join(outRoot, lang);
  fs.mkdirSync(langDir, { recursive: true });
  const ext = lang === 'python' ? 'py' : lang === 'node' ? 'js' : lang === 'rust' ? 'rs' : lang === 'go' ? 'go' : 'c';
  fs.writeFileSync(path.join(langDir, `fuzz_parse.${ext}`), harness(lang));
  fs.mkdirSync(path.join(outRoot, ci), { recursive: true });
  fs.writeFileSync(path.join(outRoot, ci, `${lang}.yaml`), recipe(lang, seconds, { coverage, afl }));
}
fs.writeFileSync(path.join(outRoot, 'merge_corpus.sh'), `#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -lt 2 ]; then
  echo "usage: merge_corpus.sh <fuzzer-binary> <corpus-dir> [seed-dir ...]" >&2
  exit 2
fi
fuzzer="$1"
corpus="$2"
shift 2
mkdir -p "$corpus"
"$fuzzer" -merge=1 "$corpus" "$@"
`);
fs.writeFileSync(path.join(outRoot, 'OSS-FUZZ.md'), '# OSS-Fuzz Integration\n\nAdd project.yaml, Dockerfile, and build.sh after confirming stable fuzz targets. AFL++ recipes are emitted with --afl or --oss-fuzz for projects that maintain AFL-compatible harnesses.\n');
console.log(`Emitted fuzzing scaffolds for: ${languages.join(', ')}`);
