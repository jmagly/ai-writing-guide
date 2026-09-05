import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeOfflineCapture, type OfflineAnalyzerHost, type PacketEvidenceBundle } from '../../../src/network-analysis/analyzer.js';
import type { EvidenceCitation } from '../../../src/network-analysis/citations.js';
import {
  createTermsharkHandoff,
  launchTermsharkHandoff,
  recordTermsharkReview,
  type TermsharkHandoffOptions,
} from '../../../src/network-analysis/termshark.js';

const temporaryDirectories: string[] = [];
const fixedTime = () => new Date('2026-09-05T22:30:00Z');
const tsharkPath = '/opt/wireshark/bin/tshark';

function pcapHeader(): Buffer {
  const header = Buffer.alloc(24);
  header.set([0xd4, 0xc3, 0xb2, 0xa1]);
  header.writeUInt16LE(2, 4);
  header.writeUInt16LE(4, 6);
  header.writeUInt32LE(65535, 16);
  header.writeUInt32LE(1, 20);
  return header;
}

async function fixture(): Promise<{
  root: string;
  capture: string;
  configRoot: string;
  profilePath: string;
  argvPath: string;
  termsharkPath: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'aiwg-termshark-test-'));
  temporaryDirectories.push(root);
  const capture = path.join(root, 'case capture.pcap');
  const configRoot = path.join(root, 'termshark-config');
  const profilePath = path.join(configRoot, 'termshark', 'profiles', 'case-review', 'termshark.toml');
  const argvPath = path.join(root, 'stub-argv.json');
  const termsharkPath = path.join(root, 'termshark-stub.mjs');
  await mkdir(path.dirname(profilePath), { recursive: true });
  await writeFile(capture, pcapHeader());
  await writeFile(profilePath, 'private_seed = "profile-secret-must-not-be-copied"\n');
  await writeFile(termsharkPath, [
    `#!${process.execPath}`,
    `import { writeFileSync } from 'node:fs';`,
    `writeFileSync(${JSON.stringify(argvPath)}, JSON.stringify(process.argv.slice(2)));`,
  ].join('\n'));
  await chmod(termsharkPath, 0o755);
  return { root, capture, configRoot, profilePath, argvPath, termsharkPath };
}

async function evidenceFor(capture: string, displayFilter = 'tcp'): Promise<PacketEvidenceBundle> {
  const analyzerHost: OfflineAnalyzerHost = {
    async run() {
      return {
        exitCode: 0,
        stderr: '',
        stdout: JSON.stringify([{
          _source: { layers: {
            'frame.number': ['7'],
            'frame.time_epoch': ['1788645600.125'],
            'frame.len': ['74'],
            'ip.src': ['192.0.2.10'],
            'ip.dst': ['198.51.100.20'],
            'tcp.srcport': ['443'],
            'tcp.dstport': ['55000'],
            'tcp.stream': ['3'],
          } },
        }]),
      };
    },
  };
  return analyzeOfflineCapture({
    capturePath: capture,
    tshark: { path: tsharkPath, version: '4.6.8' },
    recipe: { id: 'termshark-test', version: '1.0.0', displayFilter },
    authorizationRefs: ['authorization:test-owner'],
    now: fixedTime,
  }, analyzerHost);
}

function options(
  evidence: PacketEvidenceBundle,
  files: Awaited<ReturnType<typeof fixture>>,
  overrides: Partial<TermsharkHandoffOptions> = {},
): TermsharkHandoffOptions {
  const context = (evidence.capture.analysis_contexts as Array<{ context_digest: string }>)[0];
  return {
    evidence,
    capturePath: files.capture,
    contextDigest: context.context_digest,
    displayFilter: 'tcp',
    termshark: { status: 'supported', path: files.termsharkPath, version: '2.4.0', diagnostics: [] },
    tsharkPath,
    configRoot: files.configRoot,
    profile: { name: 'case-review', path: files.profilePath },
    focus: { frame: 7, stream: { protocol: 'tcp', id: 3 } },
    now: fixedTime,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('optional Termshark operator handoff (#2274)', () => {
  it('preserves TShark evidence when Termshark is missing or incompatible', async () => {
    const files = await fixture();
    const evidence = await evidenceFor(files.capture);
    const original = structuredClone(evidence);
    const missing = await createTermsharkHandoff(options(evidence, files, {
      termshark: { status: 'missing', path: null, version: null, diagnostics: ['not installed'] },
    }));
    const incompatible = await createTermsharkHandoff(options(evidence, files, {
      termshark: { status: 'unsupported', path: files.termsharkPath, version: '2.3.0', diagnostics: [] },
    }));

    expect(missing).toMatchObject({ status: 'unavailable', command: null, completionClaim: 'operator-returned-notes-only' });
    expect(missing.diagnostics.join(' ')).toContain('TShark evidence remains valid');
    expect(incompatible).toMatchObject({ status: 'incompatible', command: null });
    expect(evidence).toEqual(original);
  });

  it('builds a safe argv command with capture, filter, focus, and profile identity', async () => {
    const files = await fixture();
    const evidence = await evidenceFor(files.capture);
    const handoff = await createTermsharkHandoff(options(evidence, files));

    expect(handoff.status).toBe('ready');
    expect(handoff.captureDigest).toBe(evidence.capture.capture_digest);
    expect(handoff.tsharkVersion).toBe('4.6.8');
    expect(handoff.command).toEqual({
      file: files.termsharkPath,
      args: ['-r', files.capture, '-Y', '(tcp) && (frame.number == 7) && (tcp.stream == 3)', '-C', 'case-review'],
      shell: false,
    });
    expect(handoff.profile).toMatchObject({ name: 'case-review', path: files.profilePath, digest: expect.stringMatching(/^sha256:/) });
    expect(JSON.stringify(handoff)).not.toContain('profile-secret-must-not-be-copied');
    expect(handoff.commandPreview).toContain("'-C' 'case-review'");
  });

  it('rejects mismatched identity, unproven focus, and profile paths outside the config root', async () => {
    const files = await fixture();
    const evidence = await evidenceFor(files.capture);
    await expect(createTermsharkHandoff(options(evidence, files, { displayFilter: 'udp' }))).rejects.toThrow('display filter');
    await expect(createTermsharkHandoff(options(evidence, files, { tsharkPath: '/other/tshark' }))).rejects.toThrow('TShark path');
    await expect(createTermsharkHandoff(options(evidence, files, { focus: { frame: 999 } }))).rejects.toThrow('frame focus is absent');
    await expect(createTermsharkHandoff(options(evidence, files, { focus: { stream: { protocol: 'tcp', id: 99 } } }))).rejects.toThrow('stream focus is absent');

    const outside = path.join(files.root, 'outside-profile.toml');
    await writeFile(outside, 'safe = true\n');
    await expect(createTermsharkHandoff(options(evidence, files, { profile: { name: 'outside', path: outside } }))).rejects.toThrow('below the config root');
    const linked = path.join(files.configRoot, 'linked-profile.toml');
    await symlink(outside, linked);
    await expect(createTermsharkHandoff(options(evidence, files, { profile: { name: 'linked', path: linked } }))).rejects.toThrow('below the config root');

    await writeFile(files.capture, Buffer.concat([pcapHeader(), Buffer.from('changed')]));
    await expect(createTermsharkHandoff(options(evidence, files))).rejects.toThrow('capture does not match');
  });

  it('launches the reviewed argv through a stub without an interactive terminal and detects later mutation', async () => {
    const files = await fixture();
    const evidence = await evidenceFor(files.capture);
    const handoff = await createTermsharkHandoff(options(evidence, files));

    await expect(launchTermsharkHandoff(handoff, { explicitOperatorAction: false } as any)).rejects.toThrow('explicit operator action');
    await expect(launchTermsharkHandoff(handoff, { explicitOperatorAction: true })).resolves.toEqual({ exitCode: 0, signal: null });
    expect(JSON.parse(await readFile(files.argvPath, 'utf8'))).toEqual(handoff.command?.args);
    expect((await stat(path.join(files.configRoot, 'cache'))).isDirectory()).toBe(true);
    expect((await stat(path.join(files.configRoot, 'data'))).isDirectory()).toBe(true);

    const changedCommand = { ...handoff, command: { file: '/bin/false', args: [], shell: false as const } };
    await expect(launchTermsharkHandoff(changedCommand, { explicitOperatorAction: true })).rejects.toThrow('reviewed tool');

    await writeFile(files.profilePath, 'private_seed = "changed"\n');
    await expect(launchTermsharkHandoff(handoff, { explicitOperatorAction: true })).rejects.toThrow('profile identity changed');
    await writeFile(files.profilePath, 'private_seed = "profile-secret-must-not-be-copied"\n');

    await writeFile(files.capture, Buffer.concat([pcapHeader(), Buffer.from('mutated-after-review')]));
    await expect(launchTermsharkHandoff(handoff, { explicitOperatorAction: true })).rejects.toThrow('no longer matches');
  });

  it('records only operator-returned notes with evidence-backed packet locators', async () => {
    const files = await fixture();
    const evidence = await evidenceFor(files.capture);
    const handoff = await createTermsharkHandoff(options(evidence, files));
    const citation = (evidence.evidence_items[1].citations as EvidenceCitation[])[0];
    const note = recordTermsharkReview(handoff, evidence, {
      analyst: 'operator:test',
      note: 'Frame 7 confirms the reviewed metadata pattern.',
      citations: [citation],
      recordedAt: '2026-09-05T22:35:00Z',
    });
    expect(note).toMatchObject({ source: 'operator-returned-note', citations: [citation] });

    const invented = structuredClone(citation);
    if (invented.locator.type === 'frame') invented.locator.frame_number = 999;
    expect(() => recordTermsharkReview(handoff, evidence, {
      analyst: 'operator:test', note: 'unsupported', citations: [invented],
    })).toThrow('not present in the evidence bundle');
  });
});
