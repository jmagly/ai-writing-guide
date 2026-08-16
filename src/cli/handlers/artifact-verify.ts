import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  bootstrapTrustRoot,
  parseTrustState,
  verifyRootTransition,
  writeTrustState,
} from '../../security/artifact-trust.js';
import { verifyArtifact, type ArtifactVerificationResult } from '../../security/artifact-verifier.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

const MAX_BYTES = 32 * 1024 * 1024;
const DEFAULT_STATE = '.aiwg/security/artifact-trust-state.json';

function usage(): string {
  return [
    'aiwg verify — Verify cross-asset provenance using explicit trust policy',
    '',
    'Usage:',
    '  aiwg verify <artifact> --attestation <file-or-https-url> --policy <root.json>',
    '      [--state <file>] [--root-fingerprint <sha256>] [--material <uri>=<file>]...',
    '      [--asset-type <type> --namespace <name> --channel <name>]',
    '      [--offline] [--json] [--allow-policy-exempt] [--no-write-state]',
    '  aiwg verify trust bootstrap --root <file> --fingerprint <sha256> [--state <file>]',
    '  aiwg verify trust update --current <file> --next <file> [--state <file>]',
    '  aiwg verify trust status [--state <file>] [--json]',
    '',
    'Trust is never inferred from DSSE keyid or embedded outer public keys.',
  ].join('\n');
}

function valueAfter(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function resolve(cwd: string, file: string): string {
  return path.isAbsolute(file) ? file : path.resolve(cwd, file);
}

function checkedRead(file: string): Buffer {
  const bytes = readFileSync(file);
  if (bytes.length > MAX_BYTES) throw new Error(`${file} exceeds the ${MAX_BYTES}-byte safety limit`);
  return bytes;
}

async function readLocation(location: string, cwd: string, offline: boolean, signal?: AbortSignal): Promise<Buffer> {
  if (!/^https?:\/\//i.test(location)) return checkedRead(resolve(cwd, location));
  if (offline) throw new Error('offline mode forbids network locations');
  if (!location.startsWith('https://')) throw new Error('remote verification inputs must use HTTPS');
  const response = await fetch(location, { redirect: 'follow', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  if (!response.ok || !response.url.startsWith('https://')) throw new Error(`HTTPS input failed closed (${response.status})`);
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BYTES) throw new Error('remote input exceeds the safety limit');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error('remote input exceeds the safety limit');
  return bytes;
}

function renderHuman(outcome: ArtifactVerificationResult): string {
  return [
    `${outcome.status}: ${outcome.artifact.name}`,
    `  SHA-256: ${outcome.artifact.sha256}`,
    `  Policy: ${outcome.policy ?? 'unavailable'}`,
    `  Identities: ${outcome.identities.join(', ') || 'none'}`,
    `  Root version: ${outcome.rootVersion ?? 'unavailable'}`,
    ...outcome.diagnostics.map(diagnostic => `  ${diagnostic.code}: ${diagnostic.message}`),
  ].join('\n');
}

async function trustCommand(ctx: HandlerContext): Promise<HandlerResult> {
  const action = ctx.args[1];
  const stateFile = resolve(ctx.cwd, valueAfter(ctx.args, '--state') ?? DEFAULT_STATE);
  if (action === 'status') {
    if (!existsSync(stateFile)) return { exitCode: 1, message: `Trust state not found: ${stateFile}` };
    const state = parseTrustState(checkedRead(stateFile));
    return {
      exitCode: 0,
      message: ctx.args.includes('--json') ? JSON.stringify(state, null, 2) : `Root v${state.rootVersion} ${state.rootSha256}\nTrusted time: ${state.trustedTime}\nChannels: ${Object.keys(state.channels).length}`,
      rawOutput: ctx.args.includes('--json'),
    };
  }
  if (action === 'bootstrap') {
    const rootFile = valueAfter(ctx.args, '--root');
    const fingerprint = valueAfter(ctx.args, '--fingerprint');
    if (!rootFile || !fingerprint) return { exitCode: 1, message: 'trust bootstrap requires --root and --fingerprint' };
    const bootstrapped = bootstrapTrustRoot(checkedRead(resolve(ctx.cwd, rootFile)), fingerprint);
    writeTrustState(stateFile, bootstrapped.state);
    return { exitCode: 0, message: `Bootstrapped trust root v${bootstrapped.root.signed.version} at ${stateFile}` };
  }
  if (action === 'update') {
    const current = valueAfter(ctx.args, '--current');
    const next = valueAfter(ctx.args, '--next');
    if (!current || !next) return { exitCode: 1, message: 'trust update requires --current and --next' };
    if (!existsSync(stateFile)) return { exitCode: 1, message: `Trust state not found: ${stateFile}` };
    const transition = verifyRootTransition(
      checkedRead(resolve(ctx.cwd, current)),
      checkedRead(resolve(ctx.cwd, next)),
      parseTrustState(checkedRead(stateFile)),
    );
    writeTrustState(stateFile, transition.state);
    return { exitCode: 0, message: `Updated trust root to v${transition.state.rootVersion} at ${stateFile}` };
  }
  return { exitCode: 1, message: usage() };
}

export const artifactVerifyHandler: CommandHandler = {
  id: 'verify',
  name: 'Artifact Verification',
  description: 'Verify cross-asset DSSE provenance and manage trust roots',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (ctx.args.includes('--help') || ctx.args.includes('-h') || ctx.args.length === 0) return { exitCode: 0, message: usage() };
    try {
      if (ctx.args[0] === 'trust') return await trustCommand(ctx);
      const artifactLocation = ctx.args[0];
      const rootFile = valueAfter(ctx.args, '--policy');
      if (!rootFile) return { exitCode: 1, message: `--policy <root.json> is required\n\n${usage()}` };
      const offline = ctx.args.includes('--offline');
      const attestationLocation = valueAfter(ctx.args, '--attestation') ?? `${artifactLocation}.aiwg-attestation.json`;
      const [artifactBytes, attestationBytes] = await Promise.all([
        readLocation(artifactLocation, ctx.cwd, offline, ctx.signal),
        readLocation(attestationLocation, ctx.cwd, offline, ctx.signal),
      ]);
      const rootBytes = checkedRead(resolve(ctx.cwd, rootFile));
      const stateFile = resolve(ctx.cwd, valueAfter(ctx.args, '--state') ?? DEFAULT_STATE);
      let state = existsSync(stateFile) ? parseTrustState(checkedRead(stateFile)) : undefined;
      if (!state && !offline) {
        const fingerprint = valueAfter(ctx.args, '--root-fingerprint');
        if (fingerprint) state = bootstrapTrustRoot(rootBytes, fingerprint).state;
      }
      const materials = new Map<string, Uint8Array>();
      for (let index = 0; index < ctx.args.length; index += 1) {
        if (ctx.args[index] !== '--material') continue;
        const spec = ctx.args[index + 1] ?? '';
        const separator = spec.lastIndexOf('=');
        if (separator <= 0) throw new Error('--material must use <uri>=<file>');
        materials.set(spec.slice(0, separator), checkedRead(resolve(ctx.cwd, spec.slice(separator + 1))));
      }
      const outcome = await verifyArtifact({
        artifactBytes,
        artifactName: /^https:\/\//.test(artifactLocation) ? new URL(artifactLocation).pathname.split('/').pop() ?? artifactLocation : path.basename(artifactLocation),
        attestation: JSON.parse(attestationBytes.toString('utf8')),
        rootBytes,
        state,
        materials,
        ...(
          valueAfter(ctx.args, '--asset-type') && valueAfter(ctx.args, '--namespace') && valueAfter(ctx.args, '--channel')
            ? { expectedScope: {
              assetType: valueAfter(ctx.args, '--asset-type')!,
              namespace: valueAfter(ctx.args, '--namespace')!,
              channel: valueAfter(ctx.args, '--channel')!,
            } }
            : {}
        ),
        offline,
      });
      if (outcome.status === 'verified' && outcome.nextState && !ctx.args.includes('--no-write-state')) writeTrustState(stateFile, outcome.nextState);
      const json = ctx.args.includes('--json');
      const processExit = outcome.status === 'policy-exempt' && ctx.args.includes('--allow-policy-exempt') ? 0 : outcome.exitCode;
      return { exitCode: processExit, message: json ? JSON.stringify(outcome, null, 2) : renderHuman(outcome), rawOutput: json };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { exitCode: 27, message: ctx.args.includes('--json') ? JSON.stringify({
        schemaVersion: 'aiwg.verify.result.v1', status: 'malformed', exitCode: 27,
        artifact: { name: ctx.args[0] ? path.basename(ctx.args[0]) : 'unknown', sha256: '0'.repeat(64) },
        identities: [], diagnostics: [{ code: 'CLI_INPUT_ERROR', message }],
      }, null, 2) : `malformed: ${message}`, rawOutput: ctx.args.includes('--json') };
    }
  },
};
