import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(__dirname, '../../..');
const bannedAudit = join(repo, 'agentic/code/frameworks/security-engineering/skills/banned-api-audit/scripts/audit.mjs');
const sanitizerEmit = join(repo, 'agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/scripts/emit.mjs');
const fuzzingEmit = join(repo, 'agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/scripts/emit.mjs');
const reportScript = join(repo, 'agentic/code/frameworks/security-engineering/skills/security-report/scripts/report.mjs');
const trackScript = join(repo, 'agentic/code/frameworks/security-engineering/skills/security-disclosure-track/scripts/track.mjs');
const dfirReadinessSkill = join(repo, 'agentic/code/frameworks/security-engineering/skills/dfir-readiness/SKILL.md');

const temps: string[] = [];
function tempProject(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('security-engineering DFIR readiness bridge', () => {
  it('documents readiness triggers, boundaries, and forensics handoff', () => {
    const body = readFileSync(dfirReadinessSkill, 'utf8');
    for (const phrase of [
      'DFIR readiness',
      'incident response readiness',
      'evidence preservation readiness',
      'chain of custody readiness',
      'IOC readiness',
      'forensic report readiness',
    ]) {
      expect(body).toContain(phrase);
    }
    expect(body).toContain('security-engineering');
    expect(body).toContain('sdlc-complete');
    expect(body).toContain('forensics-complete');
    expect(body).toContain('aiwg use forensics');
    expect(body).toContain('.aiwg/security-engineering/incident-readiness/');
  });
});

describe('security-engineering executable skills', () => {
  it('banned-api-audit finds violations, honors exclusions, and emits JSON/SARIF', () => {
    const dir = tempProject('aiwg-banned-api-');
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'src', 'bad.c'), 'void f(char *d, char *s) { strcpy(d, s); }\n');
    writeFileSync(join(dir, 'tests', 'ignored.c'), 'void f(char *d, char *s) { strcpy(d, s); }\n');

    const result = spawnSync('node', [bannedAudit, '--starter', 'c', '--format', 'sarif', '--fail-on-violation'], {
      cwd: dir,
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    const outDir = join(dir, '.aiwg/security/banned-api-audit');
    const sarif = readdirSync(outDir).find((f) => f.endsWith('.sarif'));
    expect(sarif).toBeTruthy();
    const body = readFileSync(join(outDir, sarif!), 'utf8');
    expect(body).toContain('src/bad.c');
    expect(body).not.toContain('tests/ignored.c');
  });

  it('banned-api-audit rejects banlists that violate the published schema contract', () => {
    const dir = tempProject('aiwg-banned-api-invalid-');
    mkdirSync(join(dir, '.aiwg/security'), { recursive: true });
    writeFileSync(join(dir, '.aiwg/security/banned-apis.yaml'), [
      "version: 2",
      "languages:",
      "  c:",
      "    - pattern: strcpy",
      "      reason: unsafe copy",
      "      replacement: bounded copy",
      "      severity: SEVERE",
      "",
    ].join("\n"));

    const result = spawnSync('node', [bannedAudit, '--format', 'json'], { cwd: dir, encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Banlist validation failed');
    expect(result.stderr).toContain('version must be 1');
    expect(result.stderr).toContain('severity must be LOW');
  });

  it('sanitizer-in-ci emits recipes and operator notes', () => {
    const dir = tempProject('aiwg-sanitizer-');
    writeFileSync(join(dir, 'go.mod'), 'module example.com/x\n');
    const result = spawnSync('node', [sanitizerEmit, '--language', 'go', '--ci', 'github', '--coverage'], { cwd: dir, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(existsSync(join(dir, '.aiwg/security-engineering/sanitizers/github/go.yaml'))).toBe(true);
    expect(readFileSync(join(dir, '.aiwg/security-engineering/sanitizers/OPERATOR.md'), 'utf8')).toContain('Sanitizer CI Operator Notes');
  });

  it('fuzzing-in-ci emits Go native fuzz recipe, harness, and merge helper', () => {
    const dir = tempProject('aiwg-fuzzing-');
    writeFileSync(join(dir, 'go.mod'), 'module example.com/x\n');
    const result = spawnSync('node', [fuzzingEmit, '--language', 'go', '--ci', 'github', '--seconds-per-target', '5'], { cwd: dir, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const harness = readFileSync(join(dir, '.aiwg/security-engineering/fuzzing/go/fuzz_parse.go'), 'utf8');
    expect(harness).toContain('import "testing"');
    const recipe = readFileSync(join(dir, '.aiwg/security-engineering/fuzzing/github/go.yaml'), 'utf8');
    expect(recipe).toContain('go test -run=^$ -fuzz=Fuzz -fuzztime=5s ./...');
    expect(readFileSync(join(dir, '.aiwg/security-engineering/fuzzing/merge_corpus.sh'), 'utf8')).toContain('-merge=1');
  });

  it('security-report creates a redacted custody record and disclosure-track appends lifecycle entries', () => {
    const dir = tempProject('aiwg-disclosure-');
    writeFileSync(join(dir, 'SECURITY.md'), 'Report privately to security@example.com. We acknowledge within 24 hours. Coordinated disclosure window is 90 days.\n');
    const intake = spawnSync('node', [reportScript, '--json'], { cwd: dir, encoding: 'utf8' });
    expect(intake.status).toBe(0);
    const parsed = JSON.parse(intake.stdout);
    expect(parsed.caseId).toMatch(/^SEC-/);
    expect(existsSync(join(dir, parsed.custodyRecord))).toBe(true);

    const track = spawnSync('node', [trackScript, parsed.caseId, '--stage', 'triage', '--decision', 'validated'], { cwd: dir, encoding: 'utf8' });
    expect(track.status).toBe(0);
    const record = readFileSync(join(dir, parsed.custodyRecord), 'utf8');
    expect(record).toContain('Lifecycle Transition: triage');
    expect(record).toContain('Contact hash');
  });
});
