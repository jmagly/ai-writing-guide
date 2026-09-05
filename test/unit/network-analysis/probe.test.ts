import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  probeNetworkAnalysisTools,
  type ProbeHost,
  type ProcessResult,
} from '../../../src/network-analysis/probe.js';

const fixtureRoot = path.resolve(import.meta.dirname, 'fixtures');
const tsharkVersion = readFileSync(path.join(fixtureRoot, 'tshark-4.6.8-version.txt'), 'utf8');
const tsharkHelp = readFileSync(path.join(fixtureRoot, 'tshark-4.6.8-help.txt'), 'utf8');
const tsharkFields = readFileSync(path.join(fixtureRoot, 'tshark-4.6.8-fields.txt'), 'utf8');
const tsharkStats = readFileSync(path.join(fixtureRoot, 'tshark-4.6.8-statistics.txt'), 'utf8');
const tsharkFormats = readFileSync(path.join(fixtureRoot, 'tshark-4.6.8-formats.txt'), 'utf8');
const capinfosVersion = readFileSync(path.join(fixtureRoot, 'capinfos-4.6.8-version.txt'), 'utf8');
const capinfosHelp = readFileSync(path.join(fixtureRoot, 'capinfos-4.6.8-help.txt'), 'utf8');
const termsharkVersion = readFileSync(path.join(fixtureRoot, 'termshark-2.4.0-version.txt'), 'utf8');
const termsharkHelp = readFileSync(path.join(fixtureRoot, 'termshark-2.4.0-help.txt'), 'utf8');

function host(options: {
  executable?: string[];
  outputs?: Record<string, ProcessResult>;
  calls?: { file: string; args: string[]; maxBufferBytes: number }[];
}): ProbeHost {
  const executable = new Set(options.executable ?? []);
  return {
    async isExecutable(file) {
      return executable.has(file);
    },
    async run(file, args, limits) {
      options.calls?.push({ file, args: [...args], maxBufferBytes: limits.maxBufferBytes });
      return options.outputs?.[`${file} ${args.join(' ')}`] ?? {
        exitCode: 0,
        stdout: '',
        stderr: '',
      };
    },
  };
}

function supportedHost(extraExecutables: string[] = []): ProbeHost {
  const executables = ['/opt/wireshark/bin/tshark', '/opt/wireshark/bin/capinfos', ...extraExecutables];
  return host({
    executable: executables,
    outputs: {
      '/opt/wireshark/bin/tshark -v': { exitCode: 0, stdout: tsharkVersion, stderr: '' },
      '/opt/wireshark/bin/tshark -h': { exitCode: 0, stdout: tsharkHelp, stderr: '' },
      '/opt/wireshark/bin/tshark -G fields': { exitCode: 0, stdout: tsharkFields, stderr: '' },
      '/opt/wireshark/bin/tshark -z help': { exitCode: 0, stdout: tsharkStats, stderr: '' },
      '/opt/wireshark/bin/tshark -F': { exitCode: 1, stdout: '', stderr: tsharkFormats },
      '/opt/wireshark/bin/capinfos -v': { exitCode: 0, stdout: capinfosVersion, stderr: '' },
      '/opt/wireshark/bin/capinfos -h': { exitCode: 0, stdout: capinfosHelp, stderr: '' },
      '/usr/local/bin/termshark --version': { exitCode: 0, stdout: termsharkVersion, stderr: '' },
      '/usr/local/bin/termshark --help': { exitCode: 0, stdout: termsharkHelp, stderr: '' },
    },
  });
}

describe('network analysis tool probe', () => {
  it('prefers explicit absolute configured paths and records provenance', async () => {
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
        termshark: '/usr/local/bin/termshark',
      },
      trustedSearchPaths: ['/usr/bin'],
      declaredProfilePaths: ['/project/profiles/network-analysis'],
      declaredConfigPaths: ['/project/configs/tshark.conf'],
      now: () => new Date('2026-09-05T12:00:00.000Z'),
    }, supportedHost(['/usr/local/bin/termshark']));

    expect(report.status).toBe('supported');
    expect(report.generatedAt).toBe('2026-09-05T12:00:00.000Z');
    expect(report.tools.tshark.path).toBe('/opt/wireshark/bin/tshark');
    expect(report.tools.tshark.trust).toBe('explicit-config');
    expect(report.tools.tshark.version).toBe('4.6.8');
    expect(report.tools.tshark.buildCapabilities).toContain('libpcap');
    expect(report.tools.tshark.featureDetection.outputFormats).toEqual(expect.arrayContaining(['fields', 'json']));
    expect(report.tools.tshark.featureDetection.statistics).toContain('conv');
    expect(report.tools.tshark.featureDetection.fields).toContain('frame.time_epoch');
    expect(report.tools.tshark.featureDetection.fields).not.toContain('protocol.only');
    expect(report.tools.tshark.featureDetection.captureFormats).toEqual(['pcap', 'pcapng']);
    expect(report.tools.tshark.featureDetection.writeFormats).toEqual(expect.arrayContaining(['pcap', 'pcapng']));
    expect(report.tools.capinfos.featureDetection.captureFormats).toEqual(expect.arrayContaining(['pcap', 'pcapng']));
    expect(report.tools.termshark.status).toBe('supported');
    expect(report.provenance.declaredProfilePaths).toEqual(['/project/profiles/network-analysis']);
    expect(report.provenance.declaredConfigPaths).toEqual(['/project/configs/tshark.conf']);
  });

  it('fails closed when an explicit path is invalid instead of falling back to trusted search paths', async () => {
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/bad/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
      trustedSearchPaths: ['/opt/wireshark/bin'],
    }, supportedHost());

    expect(report.status).toBe('missing');
    expect(report.tools.tshark.status).toBe('missing');
    expect(report.tools.tshark.path).toBeNull();
    expect(report.tools.tshark.diagnostics).toContain('Configured tshark path is not executable or does not exist: /bad/tshark');
  });

  it('does not resolve relative configured paths or ambient PATH entries', async () => {
    const report = await probeNetworkAnalysisTools({
      configuredPaths: { tshark: 'tshark' },
      trustedSearchPaths: ['relative-bin'],
    }, host({ executable: ['tshark', 'relative-bin/capinfos'] }));

    expect(report.tools.tshark.status).toBe('missing');
    expect(report.tools.capinfos.status).toBe('missing');
    expect(report.provenance.trustedSearchPaths).toEqual([]);
  });

  it('distinguishes malformed version output as unsupported', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-v') {
          return { exitCode: 0, stdout: 'unexpected version banner', stderr: '' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('unsupported');
    expect(report.tools.tshark.status).toBe('unsupported');
    expect(report.tools.tshark.diagnostics).toContain('Could not parse tshark version output.');
  });

  it('does not accept partial version stdout from a failed command', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-v') {
          return { exitCode: 1, stdout: tsharkVersion, stderr: 'failed during startup' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('unsupported');
    expect(report.tools.tshark.version).toBeNull();
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('exited with code 1');
  });

  it('reports missing required tools while allowing optional Termshark absence', async () => {
    const noTools = await probeNetworkAnalysisTools({}, host({ executable: [] }));

    expect(noTools.status).toBe('missing');
    expect(noTools.tools.tshark.status).toBe('missing');
    expect(noTools.tools.capinfos.status).toBe('missing');
    expect(noTools.tools.termshark.required).toBe(false);
    expect(noTools.tools.termshark.status).toBe('missing');

    const withoutTermshark = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, supportedHost());

    expect(withoutTermshark.status).toBe('supported');
    expect(withoutTermshark.tools.termshark.status).toBe('missing');
  });

  it('marks capability drift as partially capable', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-G fields') {
          return { exitCode: 0, stdout: 'F\tSource\tip.src\tFT_IPv4\tip\tBASE_NONE\t0x0', stderr: '' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('partially_capable');
    expect(report.tools.tshark.status).toBe('partially_capable');
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('field:frame.time_epoch');
  });

  it('records bounded command output budgets and output-limit failures distinctly', async () => {
    const calls: { file: string; args: string[]; maxBufferBytes: number }[] = [];
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, host({
      executable: ['/opt/wireshark/bin/tshark', '/opt/wireshark/bin/capinfos'],
      calls,
      outputs: {
        '/opt/wireshark/bin/tshark -v': { exitCode: 0, stdout: tsharkVersion, stderr: '' },
        '/opt/wireshark/bin/tshark -h': { exitCode: 0, stdout: tsharkHelp, stderr: '' },
        '/opt/wireshark/bin/tshark -G fields': { exitCode: null, stdout: '', stderr: '', outputLimited: true },
        '/opt/wireshark/bin/tshark -z help': { exitCode: 0, stdout: tsharkStats, stderr: '' },
        '/opt/wireshark/bin/tshark -F': { exitCode: 1, stdout: '', stderr: tsharkFormats },
        '/opt/wireshark/bin/capinfos -v': { exitCode: 0, stdout: capinfosVersion, stderr: '' },
        '/opt/wireshark/bin/capinfos -h': { exitCode: 0, stdout: capinfosHelp, stderr: '' },
      },
    }));

    const fieldsCall = calls.find(call => call.file === '/opt/wireshark/bin/tshark' && call.args.join(' ') === '-G fields');
    expect(fieldsCall?.maxBufferBytes).toBe(32 * 1024 * 1024);
    expect(report.tools.tshark.commands.some(command => command.outputLimited)).toBe(true);
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('exceeded the output limit');
    expect(report.status).toBe('partially_capable');
  });

  it('does not classify timed-out capability output as supported', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-z help') {
          return { exitCode: null, stdout: tsharkStats, stderr: '', timedOut: true };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('partially_capable');
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('timed out');
  });

  it('does not claim capture read support when synthetic smoke reads fail', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if ((file === '/opt/wireshark/bin/tshark' && args[0] === '-r') || file === '/opt/wireshark/bin/capinfos' && args.length === 1 && /empty\.pcap/.test(args[0] ?? '')) {
          return { exitCode: 2, stdout: '', stderr: 'not readable' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('partially_capable');
    expect(report.tools.tshark.featureDetection.captureFormats).toEqual([]);
    expect(report.tools.capinfos.featureDetection.captureFormats).toEqual([]);
    expect(report.tools.tshark.featureDetection.writeFormats).toEqual(expect.arrayContaining(['pcap', 'pcapng']));
  });

  it('does not infer statistics from fields output', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-z help') {
          return { exitCode: 0, stdout: 'expert\nprotocols', stderr: '' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('partially_capable');
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('statistics:conv');
  });

  it('does not record build capabilities from negative version output', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/opt/wireshark/bin/tshark' && args.join(' ') === '-v') {
          return { exitCode: 0, stdout: 'TShark (Wireshark) 4.6.8\nCompiled without libpcap, without Lua, without GnuTLS.', stderr: '' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.tools.tshark.buildCapabilities).not.toContain('libpcap');
    expect(report.tools.tshark.buildCapabilities).not.toContain('lua');
    expect(report.tools.tshark.buildCapabilities).not.toContain('gnutls');
  });

  it('treats newer arbitrary Termshark majors as managed optional drift', async () => {
    const probeHost = supportedHost(['/usr/local/bin/termshark']);
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
        termshark: '/usr/local/bin/termshark',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (file === '/usr/local/bin/termshark' && args.join(' ') === '--version') {
          return { exitCode: 0, stdout: 'termshark v3.0.0', stderr: '' };
        }
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('supported');
    expect(report.tools.termshark.status).toBe('partially_capable');
    expect(report.tools.termshark.version).toBe('3.0.0');
  });

  it('treats old maintained-branch drift as unsupported', async () => {
    const probeHost = supportedHost();
    const report = await probeNetworkAnalysisTools({
      configuredPaths: {
        tshark: '/opt/wireshark/bin/tshark',
        capinfos: '/opt/wireshark/bin/capinfos',
      },
    }, {
      ...probeHost,
      async run(file, args, limits) {
        if (args.join(' ') === '-v') return { exitCode: 0, stdout: `${file.includes('capinfos') ? 'Capinfos' : 'TShark'} (Wireshark) 4.2.14`, stderr: '' };
        return probeHost.run(file, args, limits);
      },
    });

    expect(report.status).toBe('unsupported');
    expect(report.tools.tshark.diagnostics.join('\n')).toContain('outside the maintained Wireshark branches');
  });
});
