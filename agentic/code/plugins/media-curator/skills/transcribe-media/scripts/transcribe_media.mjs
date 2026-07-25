#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, basename, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIARIZATION_MODEL = 'pyannote/speaker-diarization-community-1';
const DEFAULT_CREDENTIAL_PROVIDER = 'env:HF_TOKEN';

export function sha256Hex(bufferOrString) {
  return createHash('sha256').update(bufferOrString).digest('hex');
}

export function sha256Urn(bufferOrString) {
  return `sha256:${sha256Hex(bufferOrString)}`;
}

export function formatTimestamp(value) {
  if (typeof value === 'string' && /^\d\d:\d\d:\d\d\.\d{3}$/.test(value)) return value;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`Invalid timestamp value: ${value}`);
  const msTotal = Math.round(seconds * 1000);
  const hours = Math.floor(msTotal / 3_600_000);
  const minutes = Math.floor((msTotal % 3_600_000) / 60_000);
  const secs = Math.floor((msTotal % 60_000) / 1000);
  const ms = msTotal % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function canonicalTranscriptPayload(segments) {
  return segments.map((segment) => {
    const fields = [segment.id, segment.start, segment.end];
    if (segment.speaker) fields.push(segment.speaker);
    fields.push(segment.text);
    return fields.join('\t');
  }).join('\n');
}

export function normalizeWhisperxSegments(native) {
  const inputSegments = Array.isArray(native.segments) ? native.segments : [];
  return inputSegments
    .filter((segment) => typeof segment?.text === 'string' && segment.text.trim().length > 0)
    .map((segment, index) => {
      const speaker = typeof segment.speaker === 'string' && segment.speaker.trim()
        ? segment.speaker.trim()
        : 'SPEAKER_00';
      return {
        id: `seg-${String(index + 1).padStart(6, '0')}`,
        start: formatTimestamp(segment.start ?? 0),
        end: formatTimestamp(segment.end ?? segment.start ?? 0),
        speaker,
        text: segment.text.trim().replace(/\s+/g, ' '),
      };
    });
}

export function buildTranscriptSidecar({ native, mediaPath, nativePath, options = {}, degradedReason = null }) {
  const absMedia = resolve(mediaPath);
  const sourceHash = sha256Urn(readFileSync(absMedia));
  const segments = normalizeWhisperxSegments(native);
  if (segments.length === 0) throw new Error('WhisperX output did not contain usable transcript segments');
  const canonicalPayload = canonicalTranscriptPayload(segments);
  const transcriptHash = sha256Urn(canonicalPayload);
  const speakers = new Set(segments.map((segment) => segment.speaker));
  const hasOnlyFallbackSpeaker = speakers.size === 1 && speakers.has('SPEAKER_00');
  const limitations = [
    'Machine transcript may contain word errors, omissions, and hallucinated punctuation',
    'Speaker diarization is anonymous clustering, not verified speaker identification',
  ];
  if (hasOnlyFallbackSpeaker) {
    limitations.push('No diarization labels were available; all segments use SPEAKER_00 fallback');
  } else {
    limitations.push('Speaker labels are provisional until reviewed or mapped with evidence');
  }
  if (degradedReason) limitations.push(degradedReason);
  return {
    schema: 'aiwg.media.transcript.v1',
    source: {
      path: options.sourcePath ?? mediaPath,
      url: options.sourceUrl ?? null,
      title: options.title ?? null,
      sha256: sourceHash,
    },
    transcript: {
      sha256: transcriptHash,
      language: options.language ?? native.language ?? null,
      generated_at: options.generatedAt ?? new Date().toISOString(),
      tool: {
        name: 'whisperx',
        version: options.toolVersion ?? native.version ?? null,
        adapter: 'aiwg-whisperx-local',
        mode: speakers.size > 1 ? 'transcription-alignment-diarization' : 'transcription-alignment',
        model: options.model ?? null,
        diarization_model: options.diarizationModel ?? null,
        device: options.device ?? null,
        compute_type: options.computeType ?? null,
        speaker_constraints: {
          min_speakers: options.minSpeakers ?? null,
          max_speakers: options.maxSpeakers ?? null,
        },
      },
      quality: {
        status: degradedReason ? 'degraded-diarization-failed' : 'machine-generated',
        limitations,
      },
    },
    segments,
    provenance: {
      wasDerivedFrom: sourceHash,
      generatedEntity: transcriptHash,
      activity: options.activity ?? 'transcribe-media',
      used: [mediaPath, ...(nativePath ? [nativePath] : [])],
      adapter: 'whisperx-local',
      credential_provider: options.credentialProvider ? sanitizeCredentialProvider(options.credentialProvider) : null,
    },
  };
}

export function buildPlan({ status, mediaPath, outputPath = null, sourceHash = null, adapter = 'whisperx', reason, nextSteps = [], credentialProvider = null }) {
  return {
    schema: 'aiwg.media.transcript-plan.v1',
    status,
    source: { path: mediaPath ?? null, sha256: sourceHash },
    output: { path: outputPath },
    adapter,
    reason,
    credential_provider: credentialProvider ? sanitizeCredentialProvider(credentialProvider) : null,
    next_steps: nextSteps,
    quality: {
      limitations: [
        'No transcript hash exists until segment text is available',
        'No speaker identity should be inferred from missing or provisional diarization output',
      ],
    },
  };
}

export function parseCredentialProvider(provider = DEFAULT_CREDENTIAL_PROVIDER) {
  if (provider === 'none') return { type: 'none', name: 'none' };
  const separator = provider.indexOf(':');
  if (separator === -1) throw new Error('Credential provider must be "none" or "<type>:<name>"; token values are not accepted');
  const type = provider.slice(0, separator);
  const name = provider.slice(separator + 1);
  if (!type || !name) throw new Error('Credential provider type and name are required');
  if (type !== 'env') throw new Error(`Unsupported credential provider "${type}". Use env:<VARIABLE> supplied by an operator or vault wrapper.`);
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(name)) throw new Error('Environment credential provider name is invalid');
  return { type, name };
}

export function sanitizeCredentialProvider(provider) {
  const parsed = parseCredentialProvider(provider);
  return { type: parsed.type, name: parsed.name };
}

export function resolveCredential(provider = DEFAULT_CREDENTIAL_PROVIDER, env = process.env) {
  const parsed = parseCredentialProvider(provider);
  if (parsed.type === 'none') return { parsed, present: false, value: null };
  const value = env[parsed.name];
  return { parsed, present: typeof value === 'string' && value.length > 0, value: value ?? null };
}

export function commandExists(command) {
  const result = process.platform === 'win32'
    ? spawnSync('where', [command], { stdio: 'ignore' })
    : spawnSync('sh', ['-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command], { stdio: 'ignore' });
  return result.status === 0;
}

export function detectCompute() {
  return {
    gpu: commandExists('nvidia-smi'),
    ffmpeg: commandExists('ffmpeg'),
    tools: {
      whisperx: commandExists('whisperx'),
      whisper_cpp: commandExists('whisper-cpp'),
      whisper: commandExists('whisper'),
      vosk_transcriber: commandExists('vosk-transcriber'),
    },
  };
}

export function preflight(options, env = process.env) {
  const errors = [];
  const warnings = [];
  let sourceHash = null;
  if (!options.media) {
    errors.push('Missing --media path');
  } else {
    try {
      accessSync(options.media, constants.R_OK);
      sourceHash = sha256Urn(readFileSync(resolve(options.media)));
    } catch (error) {
      errors.push(`Media file is not readable: ${error.message}`);
    }
  }
  if (options.output) {
    try {
      const outDir = dirname(resolve(options.output));
      mkdirSync(outDir, { recursive: true });
      accessSync(outDir, constants.W_OK);
    } catch (error) {
      errors.push(`Output path is not writable: ${error.message}`);
    }
  }
  const compute = detectCompute();
  if (options.adapter === 'whisperx' && !compute.tools.whisperx) errors.push('whisperx executable is not available on PATH');
  if (!compute.ffmpeg) warnings.push('ffmpeg was not detected; video/audio decoding may fail depending on WhisperX installation');
  let credential = null;
  if (options.diarize) {
    try {
      credential = resolveCredential(options.credentialProvider ?? DEFAULT_CREDENTIAL_PROVIDER, env);
      if (!credential.present) errors.push(`Credential provider ${credential.parsed.type}:${credential.parsed.name} is not available for gated diarization model access`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return {
    ok: errors.length === 0,
    adapter: options.adapter,
    diarize: Boolean(options.diarize),
    source: { path: options.media ?? null, sha256: sourceHash },
    output: { path: options.output ?? null },
    compute,
    credential_provider: options.diarize && credential ? sanitizeCredentialProvider(options.credentialProvider ?? DEFAULT_CREDENTIAL_PROVIDER) : null,
    errors,
    warnings,
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === 'diarize') {
      args.diarize = true;
      continue;
    }
    if (key === 'no-diarize') {
      args.diarize = false;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function optionNumber(value, name) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
  return n;
}

function normalizeOptions(raw, defaults = {}) {
  return {
    adapter: raw.adapter ?? 'whisperx',
    media: raw.media,
    output: raw.output,
    sourceUrl: raw['source-url'],
    sourcePath: raw['source-path'],
    title: raw.title,
    language: raw.language,
    model: raw.model ?? 'base',
    device: raw.device ?? 'cpu',
    computeType: raw['compute-type'] ?? 'int8',
    diarize: raw.diarize ?? defaults.defaultDiarize ?? false,
    diarizationModel: raw['diarization-model'] ?? DEFAULT_DIARIZATION_MODEL,
    minSpeakers: optionNumber(raw['min-speakers'], '--min-speakers'),
    maxSpeakers: optionNumber(raw['max-speakers'], '--max-speakers'),
    credentialProvider: raw['credential-provider'] ?? DEFAULT_CREDENTIAL_PROVIDER,
    workDir: raw['work-dir'] ?? '.aiwg/media/transcripts/.whisperx',
    input: raw.input,
    outputFormat: raw.format ?? 'text',
    activity: defaults.activity ?? 'transcribe-media',
    generatedAt: raw['generated-at'],
    toolVersion: raw['tool-version'],
    planOutput: raw['plan-output'],
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function sourceHashFor(mediaPath) {
  try {
    return sha256Urn(readFileSync(resolve(mediaPath)));
  } catch {
    return null;
  }
}

async function runChild(command, args, options) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd: process.cwd(), env: options.env, stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', (error) => resolvePromise({ code: 127, error }));
    child.on('exit', (code, signal) => resolvePromise({ code: code ?? (signal ? 128 : 1), signal }));
  });
}

function findWhisperxJson(workDir, mediaPath) {
  if (!existsSync(workDir)) return null;
  const mediaStem = basename(mediaPath, extname(mediaPath));
  const files = readdirSync(workDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fullPath = join(workDir, file);
      return { fullPath, file, mtimeMs: statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files.find((entry) => basename(entry.file, '.json') === mediaStem)?.fullPath ?? files[0]?.fullPath ?? null;
}

function whisperxArgs(options) {
  const args = [
    options.media,
    '--output_dir', options.workDir,
    '--output_format', 'json',
    '--model', options.model,
    '--device', options.device,
    '--compute_type', options.computeType,
  ];
  if (options.language) args.push('--language', options.language);
  if (options.diarize) {
    args.push('--diarize', '--diarize_model', options.diarizationModel);
    if (options.minSpeakers) args.push('--min_speakers', String(options.minSpeakers));
    if (options.maxSpeakers) args.push('--max_speakers', String(options.maxSpeakers));
  }
  return args;
}

async function commandPreflight(options) {
  const result = preflight(options);
  if (options.outputFormat === 'json') printJson(result);
  else if (result.ok) process.stdout.write('preflight ok\n');
  else process.stderr.write(`preflight failed:\n${result.errors.map((error) => `- ${error}`).join('\n')}\n`);
  return result.ok ? 0 : 2;
}

async function commandConvert(options) {
  if (!options.input) throw new Error('convert-whisperx requires --input <native.json>');
  if (!options.media) throw new Error('convert-whisperx requires --media <file>');
  if (!options.output) throw new Error('convert-whisperx requires --output <sidecar.json>');
  const native = JSON.parse(readFileSync(resolve(options.input), 'utf8'));
  const sidecar = buildTranscriptSidecar({ native, mediaPath: options.media, nativePath: options.input, options });
  writeJson(options.output, sidecar);
  printJson({ ok: true, output: options.output, transcript_sha256: sidecar.transcript.sha256 });
  return 0;
}

async function commandRun(options) {
  if (!options.media) throw new Error('run requires --media <file>');
  if (!options.output) throw new Error('run requires --output <sidecar.json>');
  const checked = preflight(options);
  if (!checked.ok) {
    const status = checked.errors.some((error) => error.includes('Credential provider')) ? 'blocked-credential-missing' : 'blocked-tooling-missing';
    const plan = buildPlan({
      status,
      mediaPath: options.media,
      outputPath: options.output,
      sourceHash: checked.source.sha256,
      adapter: options.adapter,
      reason: checked.errors.join('; '),
      credentialProvider: options.diarize ? options.credentialProvider : null,
      nextSteps: status === 'blocked-credential-missing'
        ? [`Set ${sanitizeCredentialProvider(options.credentialProvider).name} through an operator or vault wrapper before running diarization`]
        : ['Install whisperx and ffmpeg, or provide a human/native transcript sidecar'],
    });
    const planPath = options.planOutput ?? options.output.replace(/\.json$/i, '.plan.json');
    writeJson(planPath, plan);
    printJson({ ok: false, status, plan: planPath });
    return 2;
  }
  mkdirSync(resolve(options.workDir), { recursive: true });
  const childEnv = { ...process.env };
  if (options.diarize) {
    const credential = resolveCredential(options.credentialProvider);
    childEnv.HF_TOKEN = credential.value;
    childEnv.HUGGING_FACE_HUB_TOKEN = credential.value;
  }
  const result = await runChild('whisperx', whisperxArgs(options), { env: childEnv });
  const nativePath = findWhisperxJson(resolve(options.workDir), options.media);
  if (result.code !== 0 && !nativePath) {
    const plan = buildPlan({
      status: 'blocked-tool-run-failed',
      mediaPath: options.media,
      outputPath: options.output,
      sourceHash: sourceHashFor(options.media),
      adapter: options.adapter,
      reason: `whisperx exited with code ${result.code}`,
      credentialProvider: options.diarize ? options.credentialProvider : null,
      nextSteps: ['Inspect WhisperX stderr and rerun after fixing model, compute, or media decoding errors'],
    });
    const planPath = options.planOutput ?? options.output.replace(/\.json$/i, '.plan.json');
    writeJson(planPath, plan);
    printJson({ ok: false, status: plan.status, plan: planPath });
    return result.code || 1;
  }
  const native = JSON.parse(readFileSync(nativePath, 'utf8'));
  const degradedReason = result.code === 0 ? null : `WhisperX exited with code ${result.code} after writing partial transcription/alignment output; diarization is degraded`;
  const sidecar = buildTranscriptSidecar({ native, mediaPath: options.media, nativePath, options, degradedReason });
  writeJson(options.output, sidecar);
  printJson({ ok: true, output: options.output, transcript_sha256: sidecar.transcript.sha256, status: sidecar.transcript.quality.status });
  return 0;
}

function usage() {
  return `Usage:
  transcribe_media.mjs preflight --media <file> --output <sidecar.json> [--diarize]
  transcribe_media.mjs convert-whisperx --input <native.json> --media <file> --output <sidecar.json>
  transcribe_media.mjs run --media <file> --output <sidecar.json> [--diarize] [--credential-provider env:HF_TOKEN]
`;
}

export async function main(argv = process.argv.slice(2), defaults = {}) {
  const raw = parseArgs(argv);
  const command = raw._[0] ?? 'run';
  const options = normalizeOptions(raw, defaults);
  try {
    if (command === '--help' || command === '-h' || raw.help) {
      process.stdout.write(usage());
      return 0;
    }
    if (command === 'preflight') return await commandPreflight(options);
    if (command === 'convert-whisperx') return await commandConvert(options);
    if (command === 'run') return await commandRun(options);
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await main();
  process.exitCode = code;
}
