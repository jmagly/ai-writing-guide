import { createHash, createPublicKey, randomUUID, verify, type KeyObject } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_RESOURCE_BASE_URL = "https://releases.aiwg.io";
export const AIWG_RELEASE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA8BsJ2vjuHBReexz328sknfL7MKUtxynX6MGfqFVMD38=
-----END PUBLIC KEY-----`;

const EXACT_VERSION_PATTERN = /^(?:19|20)\d{2}\.(?:[1-9]|1[0-2])\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
const CHANNEL_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SIGNATURE_PATTERN = /^(?:[A-Za-z0-9+/]{4}){21}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)$/;
const RELEASE_MANIFEST_SCHEMAS = new Set([
  "aiwg.resource-manifest/v1",
  "aiwg.resource-manifest/v2",
]);
const FORTEMI_MANIFEST_PATH = "raw/prebuilt/fortemi-core/framework/manifest.json";
const FORTEMI_EXPORT_PATH = "raw/prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json";
const MAX_SIGNED_METADATA_BYTES = 4 * 1024 * 1024;
const MAX_FORTEMI_EXPORT_BYTES = 64 * 1024 * 1024;
const MAX_RAW_RESOURCE_BYTES = 16 * 1024 * 1024;
const MAX_SIGNATURE_BYTES = 64 * 1024;
const MAX_COMPLETION_MARKER_BYTES = 4 * 1024;
const MAX_CHANNEL_CACHE_CANDIDATES = 128;
const MAX_RELEASE_CACHE_CANDIDATES = 32;
// A cold lightweight-CLI install downloads the signed release manifest
// (~2 MiB) and Fortemi export (~11 MiB today). Fifteen seconds proved too
// aggressive on otherwise healthy container and remote-network paths. Keep a
// finite total-request bound, but allow normal first-run transfer variance.
const RESOURCE_FETCH_TIMEOUT_MS = 60_000;

type JsonRecord = Record<string, unknown>;

export type ResourceSource = "local" | "web" | "auto";
export type ResourceSelector =
  | { kind: "exact"; value: string }
  | { kind: "channel"; value: string };

export interface ResourceFetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  body?: {
    getReader(): {
      read(): Promise<{ done: boolean; value?: Uint8Array }>;
      cancel?(reason?: unknown): Promise<void>;
    };
  } | null;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ResourceFetcher = (
  input: string | URL,
  init?: {
    redirect?: "error";
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<ResourceFetchResponse>;

export interface WebReleaseOptions {
  selector?: string;
  offline?: boolean;
  baseUrl?: string;
  cacheRoot?: string;
  publicKeyPem?: string | Buffer;
  fetcher?: ResourceFetcher;
  /** Test/development escape hatch. HTTP remains restricted to loopback. */
  allowInsecureLoopbackHttp?: boolean;
}

export interface VerifiedReleaseDescriptor {
  path: string;
  size: number;
  sha256: string;
}

export interface VerifiedWebRelease {
  selector: string;
  selectorKind: ResourceSelector["kind"];
  version: string;
  manifestDigest: string;
  baseUrl: string;
  manifestUrl: string;
  cacheDir: string;
  releaseManifestPath: string;
  releaseSignaturePath: string;
  fortemiManifestPath: string;
  fortemiExportPath: string;
  fortemiManifestSha256: string;
  fortemiManifestSize: number;
  fortemiExportSha256: string;
  fortemiExportSize: number;
  channelSequence?: number;
  descriptors: ReadonlyMap<string, VerifiedReleaseDescriptor>;
}

export interface VerifiedRawResourceOptions
  extends Pick<WebReleaseOptions, "baseUrl" | "fetcher" | "allowInsecureLoopbackHttp"> {
  offline?: boolean;
}

interface DetachedSignature {
  schemaVersion: "aiwg.detached-signature/v1";
  algorithm: "Ed25519";
  keyId: string;
  payloadSha256: string;
  signature: string;
}

interface ChannelManifest {
  schemaVersion: "aiwg.channel-manifest/v1";
  channel: string;
  sequence: number;
  version: string;
  releaseManifest: string;
  releaseManifestSha256: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function publicKeyId(publicKey: KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" });
  return `sha256:${sha256(der)}`;
}

function loadTrustRoot(publicKeyPem: string | Buffer): KeyObject {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("AIWG web release trust root must be an Ed25519 public key");
  }
  return key;
}

function validateDetachedSignature(value: unknown, label: string): DetachedSignature {
  if (!isRecord(value) || value.schemaVersion !== "aiwg.detached-signature/v1" || value.algorithm !== "Ed25519") {
    throw new Error(`${label} has an unsupported detached-signature schema or algorithm`);
  }
  if (typeof value.keyId !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value.keyId)) {
    throw new Error(`${label} has an invalid keyId`);
  }
  if (typeof value.payloadSha256 !== "string" || !SHA256_PATTERN.test(value.payloadSha256)) {
    throw new Error(`${label} has an invalid payloadSha256`);
  }
  if (typeof value.signature !== "string" || !SIGNATURE_PATTERN.test(value.signature)) {
    throw new Error(`${label} has an invalid Ed25519 signature encoding`);
  }
  return value as unknown as DetachedSignature;
}

export function verifySignedResourceBytes(
  bytes: Uint8Array,
  signatureBytes: Uint8Array,
  publicKeyPem: string | Buffer = AIWG_RELEASE_PUBLIC_KEY_PEM,
  label = "AIWG release metadata",
): string {
  const publicKey = loadTrustRoot(publicKeyPem);
  const envelope = validateDetachedSignature(parseJson(signatureBytes, `${label} signature`), `${label} signature`);
  const digest = sha256(bytes);
  if (envelope.keyId !== publicKeyId(publicKey)) {
    throw new Error(`${label} signature keyId does not match the configured trust root`);
  }
  if (envelope.payloadSha256 !== digest) {
    throw new Error(`${label} signature payload digest does not match the exact bytes`);
  }
  const signature = Buffer.from(envelope.signature, "base64");
  if (signature.length !== 64 || !verify(null, bytes, publicKey, signature)) {
    throw new Error(`${label} signature verification failed`);
  }
  return digest;
}

export function parseResourceSelector(selector: string): ResourceSelector {
  if (EXACT_VERSION_PATTERN.test(selector)) return { kind: "exact", value: selector };
  if (CHANNEL_PATTERN.test(selector) && !/^v\d/.test(selector)) {
    return { kind: "channel", value: selector };
  }
  throw new Error(
    `Unsupported AIWG resource selector '${selector}'. This release supports exact calendar-semver versions or channel names only.`,
  );
}

function assertSafeRelativePath(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`${label} is not a safe relative path`);
  }
}

function descriptorFrom(value: unknown, descriptorPath: string): VerifiedReleaseDescriptor {
  if (!isRecord(value)) throw new Error(`release descriptor for ${descriptorPath} must be an object`);
  assertSafeRelativePath(value.path, `release descriptor path for ${descriptorPath}`);
  if (!Number.isSafeInteger(value.size) || (value.size as number) < 0) {
    throw new Error(`release descriptor size for ${value.path} is invalid`);
  }
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    throw new Error(`release descriptor digest for ${value.path} is invalid`);
  }
  return { path: value.path, size: value.size as number, sha256: value.sha256 };
}

function validateReleaseManifest(
  value: unknown,
  version: string,
): { manifest: JsonRecord; descriptors: Map<string, VerifiedReleaseDescriptor> } {
  if (!isRecord(value) || typeof value.schemaVersion !== "string" || !RELEASE_MANIFEST_SCHEMAS.has(value.schemaVersion)) {
    throw new Error("release manifest has an unsupported schemaVersion");
  }
  if (value.version !== version) throw new Error("release manifest version does not match the resolved version");
  if (value.schemaVersion === "aiwg.resource-manifest/v2") {
    const compatibility = value.compatibility;
    if (
      !isRecord(compatibility) ||
      compatibility.schemaVersion !== "aiwg.resource-compatibility/v1" ||
      compatibility.resourceSchema !== "aiwg.resource-manifest/v2" ||
      !isRecord(compatibility.cli) ||
      typeof compatibility.cli.minimumVersion !== "string" ||
      !EXACT_VERSION_PATTERN.test(compatibility.cli.minimumVersion) ||
      !Array.isArray(compatibility.cli.knownIncompatibleRanges) ||
      !compatibility.cli.knownIncompatibleRanges.every((range) => typeof range === "string")
    ) {
      throw new Error("release manifest v2 compatibility metadata is invalid");
    }
  }
  if (!Array.isArray(value.bundles)) throw new Error("release manifest bundles must be an array");
  if (!Array.isArray(value.files)) throw new Error("release manifest files must be an array");

  const descriptors = new Map<string, VerifiedReleaseDescriptor>();
  const add = (descriptor: VerifiedReleaseDescriptor): void => {
    if (descriptors.has(descriptor.path)) throw new Error(`duplicate release descriptor path: ${descriptor.path}`);
    descriptors.set(descriptor.path, descriptor);
  };

  for (const bundle of value.bundles) {
    if (!isRecord(bundle) || typeof bundle.filename !== "string" || !/^[a-z0-9-]+\.tar\.zst$/.test(bundle.filename)) {
      throw new Error("release manifest contains an unsafe bundle filename");
    }
    add(descriptorFrom({ path: `bundles/${bundle.filename}`, size: bundle.size, sha256: bundle.sha256 }, bundle.filename));
  }
  for (const file of value.files) add(descriptorFrom(file, "file"));
  return { manifest: value, descriptors };
}

function validateChannelManifest(value: unknown, channel: string): ChannelManifest {
  if (!isRecord(value) || value.schemaVersion !== "aiwg.channel-manifest/v1") {
    throw new Error(`channel ${channel} has an unsupported schemaVersion`);
  }
  if (value.channel !== channel) throw new Error(`channel metadata name does not match '${channel}'`);
  if (!Number.isSafeInteger(value.sequence) || (value.sequence as number) < 1) {
    throw new Error(`channel ${channel} has an invalid sequence`);
  }
  if (typeof value.version !== "string" || !EXACT_VERSION_PATTERN.test(value.version)) {
    throw new Error(`channel ${channel} has an invalid exact version`);
  }
  const expectedPath = `/resources/${value.version}/manifest.json`;
  if (value.releaseManifest !== expectedPath) {
    throw new Error(`channel ${channel} has an invalid release manifest path`);
  }
  if (typeof value.releaseManifestSha256 !== "string" || !SHA256_PATTERN.test(value.releaseManifestSha256)) {
    throw new Error(`channel ${channel} has an invalid release manifest digest`);
  }
  return value as unknown as ChannelManifest;
}

function validateFortemiFiles(
  manifestBytes: Uint8Array,
  exportBytes: Uint8Array,
): void {
  const manifest = parseJson(manifestBytes, "Fortemi Core manifest");
  if (!isRecord(manifest) || manifest.schema_version !== "aiwg.fortemi.prebuilt.v1") {
    throw new Error("Fortemi Core manifest has an unsupported schema_version");
  }
  if (manifest.backend !== "fortemi-core" || manifest.graph !== "framework") {
    throw new Error("Fortemi Core manifest backend or graph is invalid");
  }
  if (manifest.export_path !== "aiwg-fortemi-index-v2.json" || manifest.export_schema_version !== "aiwg.fortemi.index.export.v2") {
    throw new Error("Fortemi Core manifest export path or schema is invalid");
  }
  if (typeof manifest.export_checksum !== "string" || !SHA256_PATTERN.test(manifest.export_checksum)) {
    throw new Error("Fortemi Core manifest export checksum is invalid");
  }
  if (!Number.isSafeInteger(manifest.item_count) || (manifest.item_count as number) < 1) {
    throw new Error("Fortemi Core manifest item_count is invalid");
  }
  if (sha256(exportBytes) !== manifest.export_checksum) {
    throw new Error("Fortemi Core export checksum does not match its nested manifest");
  }

  const exported = parseJson(exportBytes, "Fortemi Core index export");
  if (!isRecord(exported) || exported.schema_version !== "aiwg.fortemi.index.export.v2") {
    throw new Error("Fortemi Core index export has an unsupported schema_version");
  }
  if (!isRecord(exported.source) || exported.source.graph !== "framework") {
    throw new Error("Fortemi Core index export graph is invalid");
  }
  if (!Array.isArray(exported.items) || exported.items.length !== manifest.item_count) {
    throw new Error("Fortemi Core index export item count does not match its nested manifest");
  }
  if (exported.items.some((item) => isRecord(item) && Array.isArray(item.chunks) && item.chunks.length > 0)) {
    throw new Error("Fortemi Core CLI index must not contain discovery/search chunks");
  }
}

function platformCacheRoot(): string {
  if (process.env.XDG_CACHE_HOME) return process.env.XDG_CACHE_HOME;
  if (process.platform === "win32") {
    return process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  }
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Caches");
  return path.join(os.homedir(), ".cache");
}

export function getResourceCacheRoot(cacheRoot?: string): string {
  return path.resolve(cacheRoot ?? path.join(platformCacheRoot(), "aiwg", "resources"));
}

function normalizeBaseUrl(baseUrl: string, allowInsecureLoopbackHttp: boolean): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid AIWG resource base URL: ${baseUrl}`);
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback && allowInsecureLoopbackHttp)) {
    throw new Error("AIWG web resources require HTTPS; insecure HTTP is allowed only for loopback with the explicit test/development option");
  }
  if (url.username || url.password || url.search || url.hash) throw new Error("AIWG resource base URL must be a clean origin");
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}

function resourceUrl(base: URL, relativePath: string): string {
  assertSafeRelativePath(relativePath, "resource URL path");
  const prefix = base.pathname.replace(/\/$/, "");
  const url = new URL(base.toString());
  url.pathname = `${prefix}/${relativePath}`;
  return url.toString();
}

async function fetchBytes(
  fetcher: ResourceFetcher,
  url: string,
  label: string,
  maxBytes: number,
): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error(`${label} has an invalid network size limit`);
  const controller = new AbortController();
  let timedOut = false;
  let timeout: NodeJS.Timeout;
  const timeoutFailure = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      const error = new Error(`${label} request timed out after ${RESOURCE_FETCH_TIMEOUT_MS}ms`);
      controller.abort(error);
      reject(error);
    }, RESOURCE_FETCH_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([
      fetcher(url, {
        redirect: "error",
        headers: { "accept-encoding": "identity" },
        signal: controller.signal,
      }),
      timeoutFailure,
    ]);
    if (!response.ok) throw new Error(`${label} fetch failed (${response.status}): ${url}`);
    const contentLength = response.headers.get("content-length");
    let declaredLength: number | undefined;
    if (contentLength !== null) {
      declaredLength = Number(contentLength);
      if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > maxBytes) {
        controller.abort();
        throw new Error(`${label} response size is invalid`);
      }
    }

    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let total = 0;
      try {
        for (;;) {
          const { done, value } = await Promise.race([reader.read(), timeoutFailure]);
          if (done) break;
          if (!(value instanceof Uint8Array)) throw new Error(`${label} returned a non-byte stream chunk`);
          total += value.byteLength;
          if (total > maxBytes) {
            controller.abort();
            if (reader.cancel) await reader.cancel(`${label} exceeded its fixed size limit`).catch(() => {});
            throw new Error(`${label} exceeds the maximum permitted size`);
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        if (controller.signal.aborted && reader.cancel) await reader.cancel().catch(() => {});
      }
      if (declaredLength !== undefined && total !== declaredLength) {
        throw new Error(`${label} response length does not match content-length`);
      }
      return Buffer.concat(chunks, total);
    }

    // Compatibility for controlled test fetchers that expose only
    // arrayBuffer(). Requiring a bounded content-length prevents an
    // unbounded fallback for ordinary network responses.
    if (declaredLength === undefined) {
      throw new Error(`${label} response has no bounded stream or content-length`);
    }
    const bytes = Buffer.from(await Promise.race([response.arrayBuffer(), timeoutFailure]));
    if (bytes.length > maxBytes || bytes.length !== declaredLength) {
      controller.abort();
      throw new Error(`${label} response size is invalid`);
    }
    return bytes;
  } catch (error) {
    if (timedOut) throw new Error(`${label} request timed out after ${RESOURCE_FETCH_TIMEOUT_MS}ms`);
    throw error;
  } finally {
    clearTimeout(timeout!);
  }
}

function verifyDescriptor(bytes: Uint8Array, descriptor: VerifiedReleaseDescriptor, label = descriptor.path): void {
  if (bytes.byteLength !== descriptor.size || sha256(bytes) !== descriptor.sha256) {
    throw new Error(`release descriptor size or digest verification failed: ${label}`);
  }
}

function generationDir(cacheRoot: string, version: string, digest: string): string {
  return path.join(cacheRoot, "releases", version, digest);
}

function assertCacheDirectory(pathname: string, label: string): void {
  try {
    const stat = fs.lstatSync(pathname);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`${label} must be a real directory`);
    }
  } catch (error) {
    throw new Error(`${label} is missing or unsafe: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface BoundedFileReadOptions {
  label: string;
  maxBytes: number;
  expectedSize?: number;
  expectedSha256?: string;
}

/**
 * Read a bounded regular file through one descriptor. O_NOFOLLOW closes the
 * final-component symlink race on platforms that support it; lstat/fstat and
 * digest checks retain fail-closed behavior elsewhere.
 */
export function readVerifiedRegularFile(
  pathname: string,
  options: BoundedFileReadOptions,
): Buffer {
  const { label, maxBytes, expectedSize, expectedSha256 } = options;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error(`${label} has an invalid read limit`);
  }
  let initial: fs.Stats;
  try {
    initial = fs.lstatSync(pathname);
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (initial.isSymbolicLink() || !initial.isFile()) {
    throw new Error(`${label} must be a non-symlink regular file`);
  }
  if (initial.size > maxBytes || (expectedSize !== undefined && initial.size !== expectedSize)) {
    throw new Error(`${label} has an invalid size`);
  }

  const noFollow = typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
  const nonBlocking = typeof fs.constants.O_NONBLOCK === "number" ? fs.constants.O_NONBLOCK : 0;
  let descriptor: number;
  try {
    descriptor = fs.openSync(pathname, fs.constants.O_RDONLY | nonBlocking | noFollow);
  } catch (error) {
    throw new Error(`${label} could not be opened safely: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > maxBytes || (expectedSize !== undefined && stat.size !== expectedSize)) {
      throw new Error(`${label} has an invalid descriptor type or size`);
    }
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (count === 0) throw new Error(`${label} was truncated while being read`);
      offset += count;
    }
    const trailing = Buffer.alloc(1);
    if (fs.readSync(descriptor, trailing, 0, 1, offset) !== 0) {
      throw new Error(`${label} grew while being read`);
    }
    if (expectedSha256 !== undefined && sha256(bytes) !== expectedSha256) {
      throw new Error(`${label} digest does not match the signed release descriptor`);
    }
    return bytes;
  } finally {
    fs.closeSync(descriptor);
  }
}

export function loadResourceTrustRootFile(pathname: string): Buffer {
  const bytes = readVerifiedRegularFile(path.resolve(pathname), {
    label: "AIWG resource trust root file",
    maxBytes: MAX_SIGNATURE_BYTES,
  });
  loadTrustRoot(bytes);
  return bytes;
}

function verifyCachedGeneration(
  cacheRoot: string,
  version: string,
  digest: string,
  selector: ResourceSelector,
  publicKeyPem: string | Buffer,
  baseUrl: URL,
  expectedDigest?: string,
  channelSequence?: number,
): VerifiedWebRelease {
  if (!SHA256_PATTERN.test(digest)) throw new Error("cached release generation has an invalid digest directory");
  const cacheDir = generationDir(cacheRoot, version, digest);
  const releaseManifestPath = path.join(cacheDir, "manifest.json");
  const releaseSignaturePath = path.join(cacheDir, "manifest.sig");
  const fortemiManifestPath = path.join(cacheDir, FORTEMI_MANIFEST_PATH);
  const fortemiExportPath = path.join(cacheDir, FORTEMI_EXPORT_PATH);
  assertCacheDirectory(cacheDir, "cached release generation");
  const completionBytes = readVerifiedRegularFile(path.join(cacheDir, "complete.json"), {
    label: "cached release completion marker",
    maxBytes: MAX_COMPLETION_MARKER_BYTES,
  });
  const completion = parseJson(completionBytes, "cached release completion marker");
  if (
    !isRecord(completion) ||
    completion.schemaVersion !== "aiwg.resource-cache-generation/v1" ||
    completion.version !== version ||
    completion.manifestSha256 !== digest
  ) {
    throw new Error("cached release completion marker does not match its generation");
  }
  const manifestBytes = readVerifiedRegularFile(releaseManifestPath, {
    label: "cached release manifest",
    maxBytes: MAX_SIGNED_METADATA_BYTES,
    expectedSha256: digest,
  });
  const signatureBytes = readVerifiedRegularFile(releaseSignaturePath, {
    label: "cached release signature",
    maxBytes: MAX_SIGNATURE_BYTES,
  });
  const verifiedDigest = verifySignedResourceBytes(manifestBytes, signatureBytes, publicKeyPem, "cached release manifest");
  if (verifiedDigest !== digest || (expectedDigest && verifiedDigest !== expectedDigest)) {
    throw new Error("cached release manifest digest does not match the selected generation");
  }
  const { descriptors } = validateReleaseManifest(parseJson(manifestBytes, "cached release manifest"), version);
  const fortemiManifestDescriptor = descriptors.get(FORTEMI_MANIFEST_PATH);
  const fortemiExportDescriptor = descriptors.get(FORTEMI_EXPORT_PATH);
  if (!fortemiManifestDescriptor || !fortemiExportDescriptor) {
    throw new Error("cached release manifest does not commit to the required Fortemi Core files");
  }
  const nestedManifestBytes = readVerifiedRegularFile(fortemiManifestPath, {
    label: "cached Fortemi Core manifest",
    maxBytes: MAX_SIGNED_METADATA_BYTES,
    expectedSize: fortemiManifestDescriptor.size,
    expectedSha256: fortemiManifestDescriptor.sha256,
  });
  const exportBytes = readVerifiedRegularFile(fortemiExportPath, {
    label: "cached Fortemi Core export",
    maxBytes: MAX_FORTEMI_EXPORT_BYTES,
    expectedSize: fortemiExportDescriptor.size,
    expectedSha256: fortemiExportDescriptor.sha256,
  });
  validateFortemiFiles(nestedManifestBytes, exportBytes);
  return {
    selector: selector.value,
    selectorKind: selector.kind,
    version,
    manifestDigest: verifiedDigest,
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    manifestUrl: resourceUrl(baseUrl, `resources/${version}/manifest.json`),
    cacheDir,
    releaseManifestPath,
    releaseSignaturePath,
    fortemiManifestPath,
    fortemiExportPath,
    fortemiManifestSha256: fortemiManifestDescriptor.sha256,
    fortemiManifestSize: fortemiManifestDescriptor.size,
    fortemiExportSha256: fortemiExportDescriptor.sha256,
    fortemiExportSize: fortemiExportDescriptor.size,
    ...(channelSequence === undefined ? {} : { channelSequence }),
    descriptors,
  };
}

function cachedDigests(cacheRoot: string, version: string): string[] {
  const root = path.join(cacheRoot, "releases", version);
  if (!fs.existsSync(root)) return [];
  assertCacheDirectory(root, `cached release ${version} directory`);
  const digests = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SHA256_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (digests.length > MAX_RELEASE_CACHE_CANDIDATES) {
    throw new Error(`cached release ${version} exceeds ${MAX_RELEASE_CACHE_CANDIDATES} candidate generations`);
  }
  return digests;
}

function channelGenerationRoot(cacheRoot: string, channel: string): string {
  return path.join(cacheRoot, "channels", channel);
}

interface CachedChannelCandidate {
  name: string;
  sequence: number;
  digest: string;
}

function cachedChannelCandidates(cacheRoot: string, channel: string): CachedChannelCandidate[] {
  const root = channelGenerationRoot(cacheRoot, channel);
  if (!fs.existsSync(root)) return [];
  assertCacheDirectory(root, `cached channel ${channel} directory`);
  const candidates: CachedChannelCandidate[] = [];
  let directory: fs.Dir | undefined;
  try {
    directory = fs.opendirSync(root);
    for (;;) {
      const entry = directory.readSync();
      if (!entry) break;
      if (!entry.isDirectory()) continue;
      const match = /^([1-9]\d*)-([0-9a-f]{64})$/.exec(entry.name);
      if (!match) continue;
      const sequence = Number(match[1]);
      if (!Number.isSafeInteger(sequence) || sequence < 1 || String(sequence) !== match[1]) continue;
      candidates.push({ name: entry.name, sequence, digest: match[2] });
      if (candidates.length > MAX_CHANNEL_CACHE_CANDIDATES) {
        throw new Error(`cached channel ${channel} exceeds ${MAX_CHANNEL_CACHE_CANDIDATES} candidate generations`);
      }
    }
  } finally {
    directory?.closeSync();
  }
  return candidates.sort((left, right) =>
    right.sequence - left.sequence || left.digest.localeCompare(right.digest),
  );
}

function readCachedChannel(
  cacheRoot: string,
  channel: string,
  publicKeyPem: string | Buffer,
): { manifest: ChannelManifest; bytes: Buffer; signatureBytes: Buffer; digest: string } | null {
  const valid: Array<{
    manifest: ChannelManifest;
    bytes: Buffer;
    signatureBytes: Buffer;
    digest: string;
  }> = [];
  let corrupt = false;
  for (const candidate of cachedChannelCandidates(cacheRoot, channel)) {
    const dir = path.join(channelGenerationRoot(cacheRoot, channel), candidate.name);
    try {
      assertCacheDirectory(dir, `cached channel ${channel} generation`);
      const bytes = readVerifiedRegularFile(path.join(dir, "channel.json"), {
        label: `cached channel ${channel}`,
        maxBytes: MAX_SIGNED_METADATA_BYTES,
        expectedSha256: candidate.digest,
      });
      const signatureBytes = readVerifiedRegularFile(path.join(dir, "channel.sig"), {
        label: `cached channel ${channel} signature`,
        maxBytes: MAX_SIGNATURE_BYTES,
      });
      const digest = verifySignedResourceBytes(bytes, signatureBytes, publicKeyPem, `cached channel ${channel}`);
      const manifest = validateChannelManifest(parseJson(bytes, `cached channel ${channel}`), channel);
      if (candidate.name !== `${manifest.sequence}-${digest}`) {
        throw new Error(`cached channel ${channel} generation name does not match its signed metadata`);
      }
      valid.push({ manifest, bytes, signatureBytes, digest });
    } catch {
      corrupt = true;
    }
  }
  valid.sort((left, right) =>
    right.manifest.sequence - left.manifest.sequence ||
    left.digest.localeCompare(right.digest),
  );
  if (
    valid.length > 1 &&
    valid[0].manifest.sequence === valid[1].manifest.sequence &&
    valid[0].digest !== valid[1].digest
  ) {
    throw new Error(`cached channel ${channel} sequence ${valid[0].manifest.sequence} has conflicting signed metadata`);
  }
  if (valid.length > 0) return valid[0];
  if (corrupt) throw new Error(`cached channel ${channel} is corrupt and cannot be used offline`);
  return null;
}

function installGeneration(stageDir: string, targetDir: string): void {
  fsyncTree(stageDir);
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  try {
    fs.renameSync(stageDir, targetDir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if ((code === "EEXIST" || code === "ENOTEMPTY") && fs.existsSync(targetDir)) {
      fs.rmSync(stageDir, { recursive: true, force: true });
      return;
    }
    throw error;
  }
  fsyncDirectory(path.dirname(targetDir));
}

function fsyncDirectory(directory: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(directory, "r");
    fs.fsyncSync(descriptor);
  } catch {
    // Some platforms/filesystems do not support directory fsync.
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function fsyncTree(root: string): void {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const pathname = path.join(root, entry.name);
    if (entry.isDirectory()) {
      fsyncTree(pathname);
      fsyncDirectory(pathname);
      continue;
    }
    if (!entry.isFile()) continue;
    const descriptor = fs.openSync(pathname, "r");
    try {
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  }
  fsyncDirectory(root);
}

function cacheChannel(
  cacheRoot: string,
  manifest: ChannelManifest,
  bytes: Uint8Array,
  signatureBytes: Uint8Array,
  digest: string,
): void {
  const root = channelGenerationRoot(cacheRoot, manifest.channel);
  const stagingRoot = path.join(cacheRoot, ".staging", "channels");
  fs.mkdirSync(stagingRoot, { recursive: true });
  const stage = fs.mkdtempSync(path.join(stagingRoot, `${manifest.channel}-`));
  try {
    fs.writeFileSync(path.join(stage, "channel.json"), bytes, { flag: "wx" });
    fs.writeFileSync(path.join(stage, "channel.sig"), signatureBytes, { flag: "wx" });
    const target = path.join(root, `${manifest.sequence}-${digest}`);
    if (fs.existsSync(target)) {
      let matches = false;
      try {
        assertCacheDirectory(target, `cached channel ${manifest.channel} generation`);
        matches =
          readVerifiedRegularFile(path.join(target, "channel.json"), {
            label: `cached channel ${manifest.channel}`,
            maxBytes: MAX_SIGNED_METADATA_BYTES,
          }).equals(Buffer.from(bytes)) &&
          readVerifiedRegularFile(path.join(target, "channel.sig"), {
            label: `cached channel ${manifest.channel} signature`,
            maxBytes: MAX_SIGNATURE_BYTES,
          }).equals(Buffer.from(signatureBytes));
      } catch {
        matches = false;
      }
      if (!matches) fs.rmSync(target, { recursive: true, force: true });
    }
    installGeneration(stage, target);
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
}

async function fetchAndCacheRelease(
  base: URL,
  fetcher: ResourceFetcher,
  cacheRoot: string,
  selector: ResourceSelector,
  version: string,
  publicKeyPem: string | Buffer,
  expectedDigest?: string,
  channelSequence?: number,
): Promise<VerifiedWebRelease> {
  if (expectedDigest) {
    try {
      return verifyCachedGeneration(cacheRoot, version, expectedDigest, selector, publicKeyPem, base, expectedDigest, channelSequence);
    } catch {
      // Re-fetch a damaged or absent generation into a fresh stage.
    }
  } else {
    for (const digest of cachedDigests(cacheRoot, version)) {
      try {
        return verifyCachedGeneration(cacheRoot, version, digest, selector, publicKeyPem, base, undefined, channelSequence);
      } catch {
        // Try another complete signed generation before using the network.
      }
    }
  }

  const prefix = `resources/${version}`;
  const manifestUrl = resourceUrl(base, `${prefix}/manifest.json`);
  const manifestBytes = await fetchBytes(fetcher, manifestUrl, "release manifest", MAX_SIGNED_METADATA_BYTES);
  const signatureBytes = await fetchBytes(fetcher, resourceUrl(base, `${prefix}/manifest.sig`), "release manifest signature", MAX_SIGNATURE_BYTES);
  const manifestDigest = verifySignedResourceBytes(manifestBytes, signatureBytes, publicKeyPem, "release manifest");
  if (expectedDigest && manifestDigest !== expectedDigest) {
    throw new Error("signed channel release manifest digest does not match the fetched release manifest");
  }
  const { descriptors } = validateReleaseManifest(parseJson(manifestBytes, "release manifest"), version);
  const fortemiManifestDescriptor = descriptors.get(FORTEMI_MANIFEST_PATH);
  const fortemiExportDescriptor = descriptors.get(FORTEMI_EXPORT_PATH);
  if (!fortemiManifestDescriptor || !fortemiExportDescriptor) {
    throw new Error("release manifest does not commit to the required Fortemi Core files");
  }
  if (fortemiManifestDescriptor.size > MAX_SIGNED_METADATA_BYTES || fortemiExportDescriptor.size > MAX_FORTEMI_EXPORT_BYTES) {
    throw new Error("release manifest commits to an oversized Fortemi Core file");
  }

  const nestedManifestBytes = await fetchBytes(
    fetcher,
    resourceUrl(base, `${prefix}/${FORTEMI_MANIFEST_PATH}`),
    "Fortemi Core manifest",
    fortemiManifestDescriptor.size,
  );
  const exportBytes = await fetchBytes(
    fetcher,
    resourceUrl(base, `${prefix}/${FORTEMI_EXPORT_PATH}`),
    "Fortemi Core index export",
    fortemiExportDescriptor.size,
  );
  verifyDescriptor(nestedManifestBytes, fortemiManifestDescriptor);
  verifyDescriptor(exportBytes, fortemiExportDescriptor);
  validateFortemiFiles(nestedManifestBytes, exportBytes);

  const stagingRoot = path.join(cacheRoot, ".staging", "releases");
  fs.mkdirSync(stagingRoot, { recursive: true });
  const stage = fs.mkdtempSync(path.join(stagingRoot, `${version}-`));
  try {
    fs.mkdirSync(path.join(stage, path.dirname(FORTEMI_MANIFEST_PATH)), { recursive: true });
    fs.writeFileSync(path.join(stage, "manifest.json"), manifestBytes, { flag: "wx" });
    fs.writeFileSync(path.join(stage, "manifest.sig"), signatureBytes, { flag: "wx" });
    fs.writeFileSync(path.join(stage, FORTEMI_MANIFEST_PATH), nestedManifestBytes, { flag: "wx" });
    fs.writeFileSync(path.join(stage, FORTEMI_EXPORT_PATH), exportBytes, { flag: "wx" });
    fs.writeFileSync(path.join(stage, "complete.json"), JSON.stringify({
      schemaVersion: "aiwg.resource-cache-generation/v1",
      version,
      manifestSha256: manifestDigest,
    }) + "\n", { flag: "wx" });
    const target = generationDir(cacheRoot, version, manifestDigest);
    if (fs.existsSync(target)) {
      try {
        verifyCachedGeneration(
          cacheRoot,
          version,
          manifestDigest,
          selector,
          publicKeyPem,
          base,
          expectedDigest,
          channelSequence,
        );
      } catch {
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
    installGeneration(stage, target);
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }

  const verified = verifyCachedGeneration(
    cacheRoot,
    version,
    manifestDigest,
    selector,
    publicKeyPem,
    base,
    expectedDigest,
    channelSequence,
  );
  return { ...verified, manifestUrl };
}

function resolveOfflineExact(
  cacheRoot: string,
  selector: ResourceSelector,
  version: string,
  publicKeyPem: string | Buffer,
  baseUrl: URL,
  expectedDigest?: string,
  channelSequence?: number,
): VerifiedWebRelease {
  const digests = expectedDigest ? [expectedDigest] : cachedDigests(cacheRoot, version);
  let corrupt = false;
  for (const digest of digests) {
    try {
      return verifyCachedGeneration(cacheRoot, version, digest, selector, publicKeyPem, baseUrl, expectedDigest, channelSequence);
    } catch {
      corrupt = true;
    }
  }
  if (corrupt) throw new Error(`Cached AIWG resource release ${version} is corrupt; offline mode fails closed`);
  throw new Error(`AIWG resource release ${version} is not cached; offline mode cannot fetch it`);
}

export async function resolveWebRelease(options: WebReleaseOptions = {}): Promise<VerifiedWebRelease> {
  const selector = parseResourceSelector(options.selector ?? "stable");
  const cacheRoot = getResourceCacheRoot(options.cacheRoot);
  const publicKeyPem = options.publicKeyPem ?? AIWG_RELEASE_PUBLIC_KEY_PEM;
  const base = normalizeBaseUrl(options.baseUrl ?? DEFAULT_RESOURCE_BASE_URL, options.allowInsecureLoopbackHttp === true);
  // Validate injected trust material before reading cache or making requests.
  loadTrustRoot(publicKeyPem);

  if (selector.kind === "exact") {
    if (options.offline) return resolveOfflineExact(cacheRoot, selector, selector.value, publicKeyPem, base);
    const fetcher = options.fetcher ?? (globalThis.fetch as unknown as ResourceFetcher);
    if (!fetcher) throw new Error("No fetch implementation is available for AIWG web resources");
    return fetchAndCacheRelease(base, fetcher, cacheRoot, selector, selector.value, publicKeyPem);
  }

  if (options.offline) {
    const cached = readCachedChannel(cacheRoot, selector.value, publicKeyPem);
    if (!cached) throw new Error(`AIWG resource channel ${selector.value} is not cached; offline mode cannot fetch it`);
    return resolveOfflineExact(
      cacheRoot,
      selector,
      cached.manifest.version,
      publicKeyPem,
      base,
      cached.manifest.releaseManifestSha256,
      cached.manifest.sequence,
    );
  }

  const fetcher = options.fetcher ?? (globalThis.fetch as unknown as ResourceFetcher);
  if (!fetcher) throw new Error("No fetch implementation is available for AIWG web resources");
  const channelPrefix = `resources/channels/${selector.value}`;
  const channelBytes = await fetchBytes(fetcher, resourceUrl(base, `${channelPrefix}.json`), `channel ${selector.value}`, MAX_SIGNED_METADATA_BYTES);
  const channelSignatureBytes = await fetchBytes(fetcher, resourceUrl(base, `${channelPrefix}.sig`), `channel ${selector.value} signature`, MAX_SIGNATURE_BYTES);
  const channelDigest = verifySignedResourceBytes(channelBytes, channelSignatureBytes, publicKeyPem, `channel ${selector.value}`);
  const channel = validateChannelManifest(parseJson(channelBytes, `channel ${selector.value}`), selector.value);
  const prior = readCachedChannel(cacheRoot, selector.value, publicKeyPem);
  if (prior && channel.sequence < prior.manifest.sequence) {
    throw new Error(`channel ${selector.value} sequence rollback detected (${channel.sequence} < ${prior.manifest.sequence})`);
  }
  if (
    prior &&
    channel.sequence === prior.manifest.sequence &&
    (
      channelDigest !== prior.digest ||
      channel.version !== prior.manifest.version ||
      channel.releaseManifestSha256 !== prior.manifest.releaseManifestSha256
    )
  ) {
    throw new Error(`channel ${selector.value} sequence ${channel.sequence} has conflicting signed metadata`);
  }

  const release = await fetchAndCacheRelease(
    base,
    fetcher,
    cacheRoot,
    selector,
    channel.version,
    publicKeyPem,
    channel.releaseManifestSha256,
    channel.sequence,
  );
  cacheChannel(cacheRoot, channel, channelBytes, channelSignatureBytes, channelDigest);
  return release;
}

export async function fetchVerifiedRawResource(
  release: VerifiedWebRelease,
  resourcePath: string,
  options: VerifiedRawResourceOptions = {},
): Promise<Buffer> {
  assertSafeRelativePath(resourcePath, "raw resource path");
  if (!resourcePath.startsWith("raw/")) throw new Error("web show may fetch only immutable raw resource paths");
  const descriptor = release.descriptors.get(resourcePath);
  if (!descriptor) throw new Error(`release manifest does not commit to raw resource '${resourcePath}'`);
  if (descriptor.size > MAX_RAW_RESOURCE_BYTES) {
    throw new Error(`raw resource '${resourcePath}' exceeds the fixed ${MAX_RAW_RESOURCE_BYTES}-byte limit`);
  }
  const rawCacheDir = path.join(release.cacheDir, "raw-bodies");
  const rawCachePath = path.join(rawCacheDir, descriptor.sha256);
  if (fs.existsSync(rawCacheDir)) assertCacheDirectory(rawCacheDir, "cached raw resource directory");
  if (fs.existsSync(rawCachePath)) {
    try {
      const cached = readVerifiedRegularFile(rawCachePath, {
        label: `cached raw resource ${resourcePath}`,
        maxBytes: MAX_RAW_RESOURCE_BYTES,
        expectedSize: descriptor.size,
        expectedSha256: descriptor.sha256,
      });
      return cached;
    } catch (error) {
      if (options.offline) {
        throw new Error(`Cached raw resource '${resourcePath}' is corrupt; offline mode fails closed`);
      }
    }
  } else if (options.offline) {
    throw new Error(`Raw resource '${resourcePath}' is not cached; offline mode cannot fetch it`);
  }
  const base = normalizeBaseUrl(options.baseUrl ?? release.baseUrl, options.allowInsecureLoopbackHttp === true);
  const fetcher = options.fetcher ?? (globalThis.fetch as unknown as ResourceFetcher);
  if (!fetcher) throw new Error("No fetch implementation is available for AIWG web resources");
  const bytes = await fetchBytes(
    fetcher,
    resourceUrl(base, `resources/${release.version}/${resourcePath}`),
    `raw resource ${resourcePath}`,
    Math.min(descriptor.size, MAX_RAW_RESOURCE_BYTES),
  );
  verifyDescriptor(bytes, descriptor);
  const stagingRoot = path.join(release.cacheDir, ".raw-staging");
  fs.mkdirSync(stagingRoot, { recursive: true });
  const stage = path.join(stagingRoot, `${descriptor.sha256}-${process.pid}-${randomUUID()}`);
  try {
    fs.writeFileSync(stage, bytes, { flag: "wx" });
    const descriptorFd = fs.openSync(stage, "r");
    try {
      fs.fsyncSync(descriptorFd);
    } finally {
      fs.closeSync(descriptorFd);
    }
    fs.mkdirSync(rawCacheDir, { recursive: true });
    if (fs.existsSync(rawCachePath)) {
      try {
        readVerifiedRegularFile(rawCachePath, {
          label: `cached raw resource ${resourcePath}`,
          maxBytes: MAX_RAW_RESOURCE_BYTES,
          expectedSize: descriptor.size,
          expectedSha256: descriptor.sha256,
        });
      } catch {
        fs.rmSync(rawCachePath, { force: true });
      }
    }
    try {
      fs.renameSync(stage, rawCachePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      fs.rmSync(stage, { force: true });
    }
    fsyncDirectory(rawCacheDir);
  } catch (error) {
    fs.rmSync(stage, { force: true });
    throw error;
  }
  return bytes;
}

export function createWebReleaseTestOptions(
  baseUrl: string,
  overrides: Omit<WebReleaseOptions, "baseUrl" | "allowInsecureLoopbackHttp"> = {},
): WebReleaseOptions {
  return {
    ...overrides,
    baseUrl,
    allowInsecureLoopbackHttp: true,
  };
}
