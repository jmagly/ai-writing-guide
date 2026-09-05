import { execFile as execFileCallback } from 'node:child_process';
import { access, constants, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export const NETWORK_ANALYSIS_PROBE_SCHEMA = 'aiwg.network-analysis.probe.v1' as const;

export type ProbeToolName = 'tshark' | 'capinfos' | 'termshark';
export type ProbeStatus = 'supported' | 'partially_capable' | 'unsupported' | 'missing';
export type PathTrust = 'explicit-config' | 'trusted-search-path';

export interface NetworkAnalysisToolPaths {
  tshark?: string;
  capinfos?: string;
  termshark?: string;
}

export interface NetworkAnalysisProbeOptions {
  configuredPaths?: NetworkAnalysisToolPaths;
  trustedSearchPaths?: string[];
  declaredProfilePaths?: string[];
  declaredConfigPaths?: string[];
  now?: () => Date;
}

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  outputLimited?: boolean;
}

export interface ProbeHost {
  isExecutable(file: string): Promise<boolean>;
  run(file: string, args: readonly string[], limits: ProbeCommandLimits): Promise<ProcessResult>;
}

export interface ProbeCommandLimits {
  timeoutMs: number;
  maxBufferBytes: number;
}

export interface VersionPolicy {
  verifiedAt: string;
  wiresharkStable: string;
  wiresharkOldStable: string;
  maintainedBranches: string[];
  minimumSupportedTshark: string;
  termsharkLatest: string;
  termsharkOptionalRisk: 'aged-release-managed';
  sources: string[];
}

export interface ResolvedExecutable {
  path: string;
  trust: PathTrust;
}

export interface ProbeCommandRecord {
  args: string[];
  exitCode: number | null;
  timedOut: boolean;
  outputLimited: boolean;
  maxBufferBytes: number;
}

export interface ToolFeatureDetection {
  outputFormats: string[];
  statistics: string[];
  fields: string[];
  captureFormats: string[];
  writeFormats: string[];
}

export interface ToolProbe {
  name: ProbeToolName;
  status: ProbeStatus;
  required: boolean;
  path: string | null;
  trust: PathTrust | null;
  version: string | null;
  buildCapabilities: string[];
  featureDetection: ToolFeatureDetection;
  commands: ProbeCommandRecord[];
  diagnostics: string[];
}

export interface NetworkAnalysisProbeReport {
  schema: typeof NETWORK_ANALYSIS_PROBE_SCHEMA;
  generatedAt: string;
  status: ProbeStatus;
  tools: Record<ProbeToolName, ToolProbe>;
  provenance: {
    configuredPaths: NetworkAnalysisToolPaths;
    trustedSearchPaths: string[];
    declaredProfilePaths: string[];
    declaredConfigPaths: string[];
    pathPolicy: string;
    executionPolicy: string;
    versionPolicy: VersionPolicy;
  };
}

interface ToolSpec {
  name: ProbeToolName;
  required: boolean;
  versionArgs: string[];
  capabilityCommands: readonly string[][];
}

interface CapabilityOutput {
  args: string[];
  output: string;
}

const TOOL_SPECS: Record<ProbeToolName, ToolSpec> = {
  tshark: {
    name: 'tshark',
    required: true,
    versionArgs: ['-v'],
    capabilityCommands: [['-h'], ['-G', 'fields'], ['-z', 'help'], ['-F']],
  },
  capinfos: {
    name: 'capinfos',
    required: true,
    versionArgs: ['-v'],
    capabilityCommands: [['-h']],
  },
  termshark: {
    name: 'termshark',
    required: false,
    versionArgs: ['--version'],
    capabilityCommands: [['--help']],
  },
};

export const CURRENT_NETWORK_ANALYSIS_VERSION_POLICY: VersionPolicy = {
  verifiedAt: '2026-09-05',
  wiresharkStable: '4.6.8',
  wiresharkOldStable: '4.4.18',
  maintainedBranches: ['4.6', '4.4'],
  minimumSupportedTshark: '4.4.0',
  termsharkLatest: '2.4.0',
  termsharkOptionalRisk: 'aged-release-managed',
  sources: [
    'https://www.wireshark.org/download.html',
    'https://www.wireshark.org/docs/wsug_html_chunked/ChIntroReleaseLifeCycle.html',
    'https://github.com/gcla/termshark/releases',
  ],
};

export function createDefaultProbeHost(): ProbeHost {
  return {
    async isExecutable(file) {
      try {
        await access(file, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    },
    async run(file, args, limits) {
      const configRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-network-probe-'));
      try {
        const result = await execFile(file, [...args], {
          timeout: limits.timeoutMs,
          maxBuffer: limits.maxBufferBytes,
          killSignal: 'SIGKILL',
          shell: false,
          env: isolatedProbeEnv(configRoot),
        });
        return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
      } catch (error: any) {
        return {
          exitCode: typeof error?.code === 'number' ? error.code : null,
          stdout: typeof error?.stdout === 'string' ? error.stdout : '',
          stderr: typeof error?.stderr === 'string' ? error.stderr : String(error?.message ?? ''),
          timedOut: error?.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' && error?.killed === true,
          outputLimited: error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
        };
      } finally {
        await rm(configRoot, { recursive: true, force: true });
      }
    },
  };
}

export async function probeNetworkAnalysisTools(
  options: NetworkAnalysisProbeOptions = {},
  host: ProbeHost = createDefaultProbeHost(),
): Promise<NetworkAnalysisProbeReport> {
  const tools = {
    tshark: await probeTool(TOOL_SPECS.tshark, options, host),
    capinfos: await probeTool(TOOL_SPECS.capinfos, options, host),
    termshark: await probeTool(TOOL_SPECS.termshark, options, host),
  };

  return {
    schema: NETWORK_ANALYSIS_PROBE_SCHEMA,
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    status: overallStatus(tools),
    tools,
    provenance: {
      configuredPaths: { ...(options.configuredPaths ?? {}) },
      trustedSearchPaths: normalizeTrustedSearchPaths(options.trustedSearchPaths ?? []),
      declaredProfilePaths: explicitAbsoluteList(options.declaredProfilePaths ?? []),
      declaredConfigPaths: explicitAbsoluteList(options.declaredConfigPaths ?? []),
      pathPolicy: 'explicit absolute configured paths take precedence; invalid explicit paths fail closed; ambient cwd and user PATH are never searched implicitly',
      executionPolicy: 'bounded execFile execution only; isolated clean environment; no shell, installs, privilege changes, ambient profiles, user configs, or packet capture',
      versionPolicy: CURRENT_NETWORK_ANALYSIS_VERSION_POLICY,
    },
  };
}

async function probeTool(
  spec: ToolSpec,
  options: NetworkAnalysisProbeOptions,
  host: ProbeHost,
): Promise<ToolProbe> {
  const diagnostics: string[] = [];
  const resolved = await resolveExecutable(spec.name, options, host, diagnostics);
  if (!resolved) return emptyTool(spec, diagnostics);

  const versionLimits = limitsFor(spec.name, spec.versionArgs);
  const versionResult = await host.run(resolved.path, spec.versionArgs, versionLimits);
  const commands: ProbeCommandRecord[] = [commandRecord(spec.versionArgs, versionResult, versionLimits)];
  recordCommandFailure(spec.name, spec.versionArgs, versionResult, diagnostics);
  const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`;
  const version = commandSucceeded(versionResult) ? parseToolVersion(spec.name, versionOutput) : null;
  if (!version) diagnostics.push(`Could not parse ${spec.name} version output.`);

  const capabilityOutputs: CapabilityOutput[] = [];
  for (const args of spec.capabilityCommands) {
    const limits = limitsFor(spec.name, args);
    const result = await host.run(resolved.path, args, limits);
    commands.push(commandRecord(args, result, limits));
    capabilityOutputs.push({ args: [...args], output: `${result.stdout}\n${result.stderr}` });
    recordCommandFailure(spec.name, args, result, diagnostics);
  }

  const buildCapabilities = detectBuildCapabilities(versionOutput);
  const featureDetection = detectFeatures(spec.name, capabilityOutputs);
  featureDetection.captureFormats = await detectReadCaptureFormats(spec.name, resolved.path, host, commands, diagnostics);
  const status = classifyTool(spec, version, featureDetection, diagnostics);

  return {
    name: spec.name,
    status,
    required: spec.required,
    path: resolved.path,
    trust: resolved.trust,
    version,
    buildCapabilities,
    featureDetection,
    commands,
    diagnostics,
  };
}

async function resolveExecutable(
  name: ProbeToolName,
  options: NetworkAnalysisProbeOptions,
  host: ProbeHost,
  diagnostics: string[],
): Promise<ResolvedExecutable | null> {
  const explicit = options.configuredPaths?.[name];
  if (explicit !== undefined) {
    if (!path.isAbsolute(explicit)) {
      diagnostics.push(`Configured ${name} path is not absolute: ${explicit}`);
      return null;
    }
    if (!await host.isExecutable(explicit)) {
      diagnostics.push(`Configured ${name} path is not executable or does not exist: ${explicit}`);
      return null;
    }
    return { path: explicit, trust: 'explicit-config' };
  }

  for (const directory of normalizeTrustedSearchPaths(options.trustedSearchPaths ?? [])) {
    const candidate = path.join(directory, name);
    if (await host.isExecutable(candidate)) return { path: candidate, trust: 'trusted-search-path' };
  }

  diagnostics.push(`No trusted executable found for ${name}.`);
  return null;
}

function normalizeTrustedSearchPaths(paths: readonly string[]): string[] {
  return paths.filter(path.isAbsolute);
}

function explicitAbsoluteList(paths: readonly string[]): string[] {
  return paths.filter(path.isAbsolute);
}

function emptyTool(spec: ToolSpec, diagnostics: string[]): ToolProbe {
  return {
    name: spec.name,
    status: 'missing',
    required: spec.required,
    path: null,
    trust: null,
    version: null,
    buildCapabilities: [],
    featureDetection: {
      outputFormats: [],
      statistics: [],
      fields: [],
      captureFormats: [],
      writeFormats: [],
    },
    commands: [],
    diagnostics,
  };
}

function commandRecord(args: readonly string[], result: ProcessResult, limits: ProbeCommandLimits): ProbeCommandRecord {
  return {
    args: [...args],
    exitCode: result.exitCode,
    timedOut: result.timedOut === true,
    outputLimited: result.outputLimited === true,
    maxBufferBytes: limits.maxBufferBytes,
  };
}

function limitsFor(name: ProbeToolName, args: readonly string[]): ProbeCommandLimits {
  if (name === 'tshark' && args.join(' ') === '-G fields') {
    return { timeoutMs: 10000, maxBufferBytes: 32 * 1024 * 1024 };
  }
  if (name === 'tshark' && args.join(' ') === '-z help') {
    return { timeoutMs: 5000, maxBufferBytes: 4 * 1024 * 1024 };
  }
  return { timeoutMs: 3000, maxBufferBytes: 2 * 1024 * 1024 };
}

function isolatedProbeEnv(configRoot: string): NodeJS.ProcessEnv {
  return {
    XDG_CONFIG_HOME: configRoot,
    WIRESHARK_CONFIG_DIR: configRoot,
    TERM: 'dumb',
    LANG: 'C',
    LC_ALL: 'C',
    PATH: '',
  };
}

async function detectReadCaptureFormats(
  name: ProbeToolName,
  executable: string,
  host: ProbeHost,
  commands: ProbeCommandRecord[],
  diagnostics: string[],
): Promise<string[]> {
  if (name === 'termshark') return [];
  const smokeRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-network-capture-smoke-'));
  try {
    const captures = [
      { format: 'pcap', file: path.join(smokeRoot, 'empty.pcap'), content: emptyPcap() },
      { format: 'pcapng', file: path.join(smokeRoot, 'empty.pcapng'), content: emptyPcapng() },
    ];
    await Promise.all(captures.map(capture => writeFile(capture.file, capture.content)));
    const supported: string[] = [];
    for (const capture of captures) {
      const args = name === 'tshark' ? ['-r', capture.file, '-q'] : [capture.file];
      const limits = limitsFor(name, ['read-smoke']);
      const result = await host.run(executable, args, limits);
      commands.push(commandRecord(args, result, limits));
      recordCommandFailure(name, args, result, diagnostics);
      if (commandSucceeded(result)) supported.push(capture.format);
    }
    return supported;
  } finally {
    await rm(smokeRoot, { recursive: true, force: true });
  }
}

function emptyPcap(): Buffer {
  return Buffer.from([
    0xd4, 0xc3, 0xb2, 0xa1,
    0x02, 0x00,
    0x04, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0xff, 0xff, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00,
  ]);
}

function emptyPcapng(): Buffer {
  return Buffer.from([
    0x0a, 0x0d, 0x0d, 0x0a,
    0x1c, 0x00, 0x00, 0x00,
    0x4d, 0x3c, 0x2b, 0x1a,
    0x01, 0x00,
    0x00, 0x00,
    0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff,
    0x1c, 0x00, 0x00, 0x00,
  ]);
}

function parseToolVersion(name: ProbeToolName, output: string): string | null {
  const patterns: Record<ProbeToolName, RegExp[]> = {
    tshark: [/\bTShark \(Wireshark\) ([0-9]+(?:\.[0-9]+){1,2})\b/i, /\bTShark ([0-9]+(?:\.[0-9]+){1,2})\b/i],
    capinfos: [/\bCapinfos \(Wireshark\) ([0-9]+(?:\.[0-9]+){1,2})\b/i, /\bCapinfos ([0-9]+(?:\.[0-9]+){1,2})\b/i],
    termshark: [/\btermshark v?([0-9]+(?:\.[0-9]+){1,2})\b/i],
  };
  for (const pattern of patterns[name]) {
    const match = output.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function detectBuildCapabilities(output: string): string[] {
  const capabilities = new Set<string>();
  const checks: [string, RegExp][] = [
    ['libpcap', /\bwith libpcap\b/i],
    ['nghttp2', /\bwith nghttp2\b/i],
    ['brotli', /\bwith brotli\b/i],
    ['zstd', /\bwith zstd\b/i],
    ['lua', /\bwith Lua\b/],
    ['gnutls', /\bwith GnuTLS\b/],
    ['maxminddb', /\bwith MaxMind DB\b/i],
  ];
  for (const [capability, pattern] of checks) {
    if (pattern.test(output)) capabilities.add(capability);
  }
  return [...capabilities].sort();
}

function detectFeatures(name: ProbeToolName, outputs: readonly CapabilityOutput[]): ToolFeatureDetection {
  const outputFor = (args: readonly string[]) => outputs
    .filter(item => item.args.join(' ') === args.join(' '))
    .map(item => item.output)
    .join('\n');
  return {
    outputFormats: name === 'tshark' ? detectOutputFormats(outputFor(['-h'])) : [],
    statistics: name === 'tshark' ? detectStatistics(outputFor(['-z', 'help'])) : [],
    fields: name === 'tshark' ? detectFields(outputFor(['-G', 'fields'])) : [],
    captureFormats: [],
    writeFormats: name === 'tshark' ? detectFormats(outputFor(['-F'])) : [],
  };
}

function detectOutputFormats(output: string): string[] {
  return uniqueMatches(output, /\b(?:ek|fields|json|jsonraw|pdml|ps|psml|tabs|text)\b/g);
}

function detectStatistics(output: string): string[] {
  return uniqueMatches(output, /\b(?:conv|endpoints|io,stat|protocols|expert|flow|http|http2|dns|icmp|udp|tcp)\b/g);
}

function detectFields(output: string): string[] {
  const fields = new Set<string>();
  for (const line of output.split(/\r?\n/)) {
    const columns = line.split('\t');
    if (columns[0] === 'F' && columns[2]) fields.add(columns[2]);
  }
  return [...fields].sort();
}

function detectFormats(output: string): string[] {
  const formats = new Set<string>();
  for (const token of uniqueMatches(output, /\b(?:pcapng|pcap|erf|snoop|ngsniffer|netmon|libpcap|modpcap)\b/gi)) {
    formats.add(token.toLowerCase());
  }
  return [...formats].sort();
}

function commandSucceeded(result: ProcessResult): boolean {
  return result.exitCode === 0 && result.timedOut !== true && result.outputLimited !== true;
}

function recordCommandFailure(
  name: ProbeToolName,
  args: readonly string[],
  result: ProcessResult,
  diagnostics: string[],
): void {
  const command = `${name} ${args.map(arg => path.basename(arg) === arg ? arg : '<temp>').join(' ')}`;
  if (result.timedOut) diagnostics.push(`${command} timed out.`);
  if (result.outputLimited) diagnostics.push(`${command} exceeded the output limit.`);
  if (result.exitCode !== 0 && !isExpectedNonZeroCommand(name, args)) {
    diagnostics.push(`${command} exited with code ${result.exitCode ?? 'unknown'}.`);
  }
}

function isExpectedNonZeroCommand(name: ProbeToolName, args: readonly string[]): boolean {
  return name === 'tshark' && args.join(' ') === '-F';
}

function uniqueMatches(output: string, pattern: RegExp): string[] {
  return [...new Set([...output.matchAll(pattern)].map(match => match[0]))].sort();
}

function classifyTool(
  spec: ToolSpec,
  version: string | null,
  features: ToolFeatureDetection,
  diagnostics: string[],
): ProbeStatus {
  if (!version) return 'unsupported';
  if (diagnostics.some(diagnostic => /exited with code|timed out|exceeded the output limit/.test(diagnostic))) {
    return 'partially_capable';
  }
  if (spec.name === 'termshark') return version === CURRENT_NETWORK_ANALYSIS_VERSION_POLICY.termsharkLatest
    ? 'supported'
    : 'partially_capable';
  if (!CURRENT_NETWORK_ANALYSIS_VERSION_POLICY.maintainedBranches.some(branch => version.startsWith(`${branch}.`))) {
    diagnostics.push(`${spec.name} ${version} is outside the maintained Wireshark branches.`);
    return 'unsupported';
  }
  const missingRequiredFeatures = spec.name === 'tshark'
    ? requiredTsharkFeaturesMissing(features)
    : requiredCapinfosFeaturesMissing(features);
  if (missingRequiredFeatures.length > 0) {
    diagnostics.push(`Missing feature detections: ${missingRequiredFeatures.join(', ')}.`);
    return 'partially_capable';
  }
  return 'supported';
}

function requiredTsharkFeaturesMissing(features: ToolFeatureDetection): string[] {
  const missing: string[] = [];
  for (const format of ['json', 'fields']) {
    if (!features.outputFormats.includes(format)) missing.push(`output:${format}`);
  }
  if (!features.statistics.includes('conv')) missing.push('statistics:conv');
  if (!features.fields.includes('frame.time_epoch')) missing.push('field:frame.time_epoch');
  for (const format of ['pcap', 'pcapng']) {
    if (!features.captureFormats.includes(format)) missing.push(`capture-read:${format}`);
  }
  return missing;
}

function requiredCapinfosFeaturesMissing(features: ToolFeatureDetection): string[] {
  const missing: string[] = [];
  for (const format of ['pcap', 'pcapng']) {
    if (!features.captureFormats.includes(format)) missing.push(`capture-read:${format}`);
  }
  return missing;
}

function overallStatus(tools: Record<ProbeToolName, ToolProbe>): ProbeStatus {
  const required = [tools.tshark, tools.capinfos];
  if (required.some(tool => tool.status === 'missing')) return 'missing';
  if (required.some(tool => tool.status === 'unsupported')) return 'unsupported';
  if (required.some(tool => tool.status === 'partially_capable')) return 'partially_capable';
  return 'supported';
}
