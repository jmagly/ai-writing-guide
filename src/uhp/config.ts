import { isIP } from 'node:net';
import type { UhpConfig, UhpEndpointProfile, UhpLimits } from './types.js';
import { UHP_VERSION } from './types.js';

export const DEFAULT_UHP_LIMITS: UhpLimits = {
  requestTimeoutMs: 10 * 60_000,
  inactivityTimeoutMs: 45_000,
  maxTaskSeconds: 3_600,
  maxUploadBytes: 50 * 1024 * 1024,
  maxArtifactBytes: 100 * 1024 * 1024,
  maxArtifactCount: 100,
  maxRetries: 3,
};

const PROFILE_NAME = /^[a-z][a-z0-9_-]{0,63}$/;
const OBJECT_ID = /^(?:chrn_|resp_|hsess|cntr_|file_)[A-Za-z0-9_-]+$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

export function isUhpLoopback(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '::1' || host.startsWith('127.');
}

export function isUhpPrivateAddress(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (isUhpLoopback(host)) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    return a === 10 || a === 0 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return isIP(host) === 6 && (host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:'));
}

export function validateUhpEndpoint(endpoint: string, profile: Pick<UhpEndpointProfile, 'trust'>): URL {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('UHP endpoint must be an absolute URL'); }
  if (url.username || url.password) throw new Error('UHP endpoint must not contain inline credentials');
  if (url.hash) throw new Error('UHP endpoint must not contain a fragment');
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('UHP endpoint must use HTTPS');
  if (url.protocol === 'http:' && !(isUhpLoopback(url.hostname) && profile.trust?.allowInsecureLoopback === true)) {
    throw new Error('UHP endpoint requires TLS except explicitly allowed loopback development');
  }
  if (isUhpPrivateAddress(url.hostname)) {
    const permitted = isUhpLoopback(url.hostname)
      ? profile.trust?.allowInsecureLoopback === true
      : profile.trust?.allowPrivateNetwork === true;
    if (!permitted) throw new Error('UHP endpoint targets a private network outside the profile trust policy');
  }
  if (profile.trust?.allowedHosts?.length
    && !profile.trust.allowedHosts.some(host => host.toLowerCase() === url.hostname.toLowerCase())) {
    throw new Error(`UHP endpoint host '${url.hostname}' is not allowed by profile trust policy`);
  }
  return url;
}

export function validateUhpConfig(config: unknown): string[] {
  if (config === undefined || config === null) return [];
  if (typeof config !== 'object' || Array.isArray(config)) return ['uhp: must be an object'];
  const value = config as UhpConfig;
  const errors: string[] = [];
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') errors.push('uhp.enabled: must be boolean');
  if (value.profiles === undefined) return errors;
  if (!value.profiles || typeof value.profiles !== 'object' || Array.isArray(value.profiles)) return [...errors, 'uhp.profiles: must be an object'];
  for (const [name, raw] of Object.entries(value.profiles)) {
    const where = `uhp.profiles.${name}`;
    if (!PROFILE_NAME.test(name)) errors.push(`${where}: invalid profile name`);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(`${where}: must be an object`); continue; }
    const profile = raw as UhpEndpointProfile & Record<string, unknown>;
    for (const forbidden of ['token', 'bearer', 'apiKey', 'authorization']) {
      if (forbidden in profile) errors.push(`${where}.${forbidden}: inline credentials are forbidden`);
    }
    if (typeof profile.endpoint !== 'string') errors.push(`${where}.endpoint: required string`);
    else { try { validateUhpEndpoint(profile.endpoint, profile); } catch (error) { errors.push(`${where}.endpoint: ${(error as Error).message}`); } }
    if (profile.version !== UHP_VERSION) errors.push(`${where}.version: must be '${UHP_VERSION}'`);
    if (profile.experimental !== true) errors.push(`${where}.experimental: must be true`);
    if (!profile.credential || profile.credential.source !== 'env' || !/^[A-Z_][A-Z0-9_]*$/.test(profile.credential.name ?? '')) {
      errors.push(`${where}.credential: must be an env secret reference with an uppercase variable name`);
    }
    if (profile.defaultHarness !== undefined && !OBJECT_ID.test(profile.defaultHarness)) errors.push(`${where}.defaultHarness: malformed UHP harness id`);
    if (profile.defaultModel !== undefined && !MODEL_ID.test(profile.defaultModel)) errors.push(`${where}.defaultModel: malformed model id`);
    if (profile.limits) {
      for (const [key, limit] of Object.entries(profile.limits)) {
        if (!(key in DEFAULT_UHP_LIMITS) || !Number.isSafeInteger(limit) || Number(limit) <= 0) errors.push(`${where}.limits.${key}: must be a positive supported integer`);
      }
    }
  }
  return errors;
}

export function resolveUhpProfile(config: UhpConfig | undefined, name: string): UhpEndpointProfile {
  if (!config?.enabled) throw new Error('Experimental UHP transport is not enabled');
  const profile = config.profiles?.[name];
  if (!profile) throw new Error(`Unknown UHP endpoint profile '${name}'`);
  const errors = validateUhpConfig({ enabled: true, profiles: { [name]: profile } });
  if (errors.length) throw new Error(errors.join('\n'));
  return profile;
}

export function resolveUhpLimits(profile: UhpEndpointProfile): UhpLimits {
  return { ...DEFAULT_UHP_LIMITS, ...profile.limits };
}
