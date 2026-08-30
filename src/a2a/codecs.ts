import type {
  A2AProtocolVersion,
  Artifact,
  JsonValue,
  Message,
  MessagePart,
  PushNotificationConfig,
  Task,
  TaskState,
  TaskStatus,
} from './types.js';

export function encodePushNotificationConfig(
  version: A2AProtocolVersion,
  config: PushNotificationConfig
): Record<string, unknown> {
  assertNonEmptyString(version, '$.url', config.url);
  if (version === '0.3') {
    return {
      ...(config.configId ? { configId: config.configId } : {}),
      url: config.url,
      ...(config.secret ? { secret: config.secret } : {}),
      ...(config.eventTypes ? { eventTypes: config.eventTypes } : {}),
      ...(config.metadata ? { metadata: config.metadata } : {}),
      ...(config.token ? { token: config.token } : {}),
      ...(config.authentication ? { authentication: config.authentication } : {}),
    };
  }
  const token = config.token ?? config.secret;
  return {
    ...(config.configId ? { id: config.configId } : {}),
    url: config.url,
    ...(token ? { token } : {}),
    ...(config.authentication ? { authentication: config.authentication } : {}),
  };
}

export function decodePushNotificationConfig(
  version: A2AProtocolVersion,
  input: unknown,
  path = '$'
): PushNotificationConfig {
  const obj = objectAt(version, path, input);
  const result: PushNotificationConfig = {
    url: stringAt(version, `${path}.url`, obj.url),
  };
  // The deployed 0.3 sandbox predates the stable field rename and returns
  // `id`; accept that compatibility spelling while continuing to encode the
  // documented 0.3 `configId` shape.
  const id = version === '1.0' ? obj.id : (obj.configId ?? obj.id);
  assignOptionalString(
    version,
    result,
    'configId',
    id,
    `${path}.${version === '1.0' || obj.configId === undefined ? 'id' : 'configId'}`
  );
  assignOptionalString(version, result, 'token', obj.token, `${path}.token`);
  if (version === '0.3') {
    assignOptionalString(version, result, 'secret', obj.secret, `${path}.secret`);
    if (obj.eventTypes !== undefined) {
      const values = arrayAt(version, `${path}.eventTypes`, obj.eventTypes);
      if (!values.every(value => ['task', 'message', 'status', 'artifact'].includes(String(value)))) {
        fail(version, `${path}.eventTypes`, 'contains an unsupported normalized event type');
      }
      result.eventTypes = values as Array<'task' | 'message' | 'status' | 'artifact'>;
    }
    assignOptionalJsonObject(version, result, 'metadata', obj.metadata, `${path}.metadata`);
  } else if (result.token) {
    result.secret = result.token;
  }
  if (obj.authentication !== undefined) {
    const auth = objectAt(version, `${path}.authentication`, obj.authentication);
    result.authentication = {
      scheme: stringAt(version, `${path}.authentication.scheme`, auth.scheme),
      ...(auth.credentials !== undefined
        ? { credentials: stringAt(version, `${path}.authentication.credentials`, auth.credentials) }
        : {}),
    };
  }
  return result;
}

export class A2AWireValidationError extends Error {
  readonly protocolVersion: A2AProtocolVersion;
  readonly path: string;

  constructor(protocolVersion: A2AProtocolVersion, path: string, detail: string) {
    super(`Invalid A2A ${protocolVersion} payload at ${path}: ${detail}`);
    this.name = 'A2AWireValidationError';
    this.protocolVersion = protocolVersion;
    this.path = path;
  }
}

const LEGACY_STATES = new Set<TaskState>([
  'submitted', 'working', 'completed', 'failed', 'canceled',
  'input-required', 'rejected', 'auth-required',
]);

const V1_TO_STATE: Record<string, TaskState> = {
  TASK_STATE_SUBMITTED: 'submitted',
  TASK_STATE_WORKING: 'working',
  TASK_STATE_COMPLETED: 'completed',
  TASK_STATE_FAILED: 'failed',
  TASK_STATE_CANCELED: 'canceled',
  TASK_STATE_INPUT_REQUIRED: 'input-required',
  TASK_STATE_REJECTED: 'rejected',
  TASK_STATE_AUTH_REQUIRED: 'auth-required',
};

const STATE_TO_V1 = Object.fromEntries(
  Object.entries(V1_TO_STATE).map(([wire, normalized]) => [normalized, wire])
) as Record<TaskState, string>;

export function encodeMessage(version: A2AProtocolVersion, message: Message): Record<string, unknown> {
  assertNonEmptyString(version, '$.messageId', message.messageId);
  if (message.role !== 'user' && message.role !== 'agent') {
    fail(version, '$.role', 'must be user or agent');
  }
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    fail(version, '$.parts', 'must contain at least one part');
  }
  const out: Record<string, unknown> = {
    messageId: message.messageId,
    role: version === '1.0' ? (message.role === 'user' ? 'ROLE_USER' : 'ROLE_AGENT') : message.role,
    parts: message.parts.map((part, index) => encodePart(version, part, `$.parts[${index}]`)),
  };
  copyOptional(out, 'contextId', message.contextId);
  copyOptional(out, 'taskId', message.taskId);
  copyJsonObject(version, out, 'metadata', message.metadata, '$.metadata');
  copyStringArray(version, out, 'extensions', message.extensions, '$.extensions');
  copyStringArray(version, out, 'referenceTaskIds', message.referenceTaskIds, '$.referenceTaskIds');
  return out;
}

export function decodeMessage(
  version: A2AProtocolVersion,
  input: unknown,
  path = '$'
): Message {
  const obj = objectAt(version, path, input);
  const messageId = stringAt(version, `${path}.messageId`, obj.messageId);
  const role = decodeRole(version, obj.role, `${path}.role`);
  const partsRaw = arrayAt(version, `${path}.parts`, obj.parts);
  if (partsRaw.length === 0) fail(version, `${path}.parts`, 'must contain at least one part');
  const message: Message = {
    messageId,
    role,
    parts: partsRaw.map((part, index) => decodePart(version, part, `${path}.parts[${index}]`)),
  };
  assignOptionalString(version, message, 'contextId', obj.contextId, `${path}.contextId`);
  assignOptionalString(version, message, 'taskId', obj.taskId, `${path}.taskId`);
  assignOptionalJsonObject(version, message, 'metadata', obj.metadata, `${path}.metadata`);
  assignOptionalStringArray(version, message, 'extensions', obj.extensions, `${path}.extensions`);
  assignOptionalStringArray(version, message, 'referenceTaskIds', obj.referenceTaskIds, `${path}.referenceTaskIds`);
  return message;
}

export function encodeTask(version: A2AProtocolVersion, task: Task): Record<string, unknown> {
  assertNonEmptyString(version, '$.id', task.id);
  const out: Record<string, unknown> = {
    id: task.id,
    status: encodeStatus(version, task.status, '$.status'),
  };
  copyOptional(out, 'contextId', task.contextId);
  if (task.artifacts !== undefined) {
    out.artifacts = task.artifacts.map((artifact, index) => encodeArtifact(version, artifact, `$.artifacts[${index}]`));
  }
  if (task.history !== undefined) {
    out.history = task.history.map((message, index) => encodeMessageAt(version, message, `$.history[${index}]`));
  }
  copyJsonObject(version, out, 'metadata', task.metadata, '$.metadata');
  copyStringArray(version, out, 'extensions', task.extensions, '$.extensions');
  return out;
}

export function decodeTask(
  version: A2AProtocolVersion,
  input: unknown,
  path = '$'
): Task {
  const obj = objectAt(version, path, input);
  if (version === '1.0' && typeof obj.kind === 'string') {
    fail(version, `${path}.kind`, 'legacy kind discriminator is not valid in 1.0');
  }
  const task: Task = {
    id: stringAt(version, `${path}.id`, obj.id),
    status: decodeStatus(version, obj.status, `${path}.status`),
  };
  assignOptionalString(version, task, 'contextId', obj.contextId, `${path}.contextId`);
  if (obj.artifacts !== undefined) {
    task.artifacts = arrayAt(version, `${path}.artifacts`, obj.artifacts)
      .map((artifact, index) => decodeArtifact(version, artifact, `${path}.artifacts[${index}]`));
  }
  if (obj.history !== undefined) {
    task.history = arrayAt(version, `${path}.history`, obj.history)
      .map((message, index) => decodeMessage(version, message, `${path}.history[${index}]`));
  }
  assignOptionalJsonObject(version, task, 'metadata', obj.metadata, `${path}.metadata`);
  assignOptionalStringArray(version, task, 'extensions', obj.extensions, `${path}.extensions`);
  return task;
}

export function decodeSendMessageResponse(version: A2AProtocolVersion, input: unknown): Task {
  if (version === '0.3') return decodeTask(version, input);
  const obj = objectAt(version, '$', input);
  const members = ['task', 'message'].filter(key => obj[key] !== undefined);
  if (members.length !== 1) {
    fail(version, '$', 'send response must contain exactly one of task or message');
  }
  if (members[0] !== 'task') {
    fail(version, '$.message', 'AIWG mission dispatch requires a Task response');
  }
  return decodeTask(version, obj.task, '$.task');
}

export function encodeStatus(
  version: A2AProtocolVersion,
  status: TaskStatus,
  path = '$'
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    state: version === '1.0' ? STATE_TO_V1[status.state] : status.state,
  };
  if (!out.state) fail(version, `${path}.state`, `unsupported normalized state ${String(status.state)}`);
  if (status.message !== undefined) out.message = encodeMessageAt(version, status.message, `${path}.message`);
  if (status.timestamp !== undefined) {
    assertTimestamp(version, `${path}.timestamp`, status.timestamp);
    out.timestamp = status.timestamp;
  }
  copyStringArray(version, out, 'extensions', status.extensions, `${path}.extensions`);
  if (status.summary !== undefined) out.summary = status.summary;
  if (status.exitCode !== undefined) out[version === '0.3' ? 'exit_code' : 'exitCode'] = status.exitCode;
  return out;
}

export function decodeStatus(
  version: A2AProtocolVersion,
  input: unknown,
  path = '$'
): TaskStatus {
  const obj = objectAt(version, path, input);
  const rawState = stringAt(version, `${path}.state`, obj.state);
  const state = version === '1.0'
    ? V1_TO_STATE[rawState]
    : LEGACY_STATES.has(rawState as TaskState) ? rawState as TaskState : undefined;
  if (!state) fail(version, `${path}.state`, `unsupported state '${rawState}'`);
  const status: TaskStatus = { state };
  if (obj.message !== undefined) status.message = decodeMessage(version, obj.message, `${path}.message`);
  if (obj.timestamp !== undefined) {
    const timestamp = stringAt(version, `${path}.timestamp`, obj.timestamp);
    assertTimestamp(version, `${path}.timestamp`, timestamp);
    status.timestamp = timestamp;
  }
  assignOptionalStringArray(version, status, 'extensions', obj.extensions, `${path}.extensions`);
  if (obj.summary !== undefined) status.summary = stringAt(version, `${path}.summary`, obj.summary);
  const exitCode = version === '0.3' ? obj.exit_code : obj.exitCode;
  if (exitCode !== undefined) {
    if (typeof exitCode !== 'number' || !Number.isInteger(exitCode)) {
      fail(version, `${path}.${version === '0.3' ? 'exit_code' : 'exitCode'}`, 'must be an integer');
    }
    status.exitCode = exitCode;
  }
  return status;
}

export function encodeArtifact(
  version: A2AProtocolVersion,
  artifact: Artifact,
  path = '$'
): Record<string, unknown> {
  assertNonEmptyString(version, `${path}.artifactId`, artifact.artifactId);
  if (!Array.isArray(artifact.parts) || artifact.parts.length === 0) {
    fail(version, `${path}.parts`, 'must contain at least one part');
  }
  const out: Record<string, unknown> = {
    artifactId: artifact.artifactId,
    parts: artifact.parts.map((part, index) => encodePart(version, part, `${path}.parts[${index}]`)),
  };
  copyOptional(out, 'name', artifact.name);
  copyOptional(out, 'description', artifact.description);
  copyJsonObject(version, out, 'metadata', artifact.metadata, `${path}.metadata`);
  copyStringArray(version, out, 'extensions', artifact.extensions, `${path}.extensions`);
  return out;
}

export function decodeArtifact(
  version: A2AProtocolVersion,
  input: unknown,
  path = '$'
): Artifact {
  const obj = objectAt(version, path, input);
  const partsRaw = arrayAt(version, `${path}.parts`, obj.parts);
  if (partsRaw.length === 0) fail(version, `${path}.parts`, 'must contain at least one part');
  const artifact: Artifact = {
    artifactId: stringAt(version, `${path}.artifactId`, obj.artifactId),
    parts: partsRaw.map((part, index) => decodePart(version, part, `${path}.parts[${index}]`)),
  };
  assignOptionalString(version, artifact, 'name', obj.name, `${path}.name`);
  assignOptionalString(version, artifact, 'description', obj.description, `${path}.description`);
  assignOptionalJsonObject(version, artifact, 'metadata', obj.metadata, `${path}.metadata`);
  assignOptionalStringArray(version, artifact, 'extensions', obj.extensions, `${path}.extensions`);
  return artifact;
}

function encodeMessageAt(version: A2AProtocolVersion, message: Message, path: string): Record<string, unknown> {
  try {
    return encodeMessage(version, message);
  } catch (error) {
    if (error instanceof A2AWireValidationError) {
      throw new A2AWireValidationError(version, `${path}${error.path.slice(1)}`, error.message.split(': ').slice(1).join(': '));
    }
    throw error;
  }
}

function encodePart(version: A2AProtocolVersion, part: MessagePart, path: string): Record<string, unknown> {
  const common: Record<string, unknown> = {};
  copyJsonObject(version, common, 'metadata', part.metadata, `${path}.metadata`);
  copyOptional(common, version === '0.3' ? 'mimeType' : 'mediaType', part.mediaType);
  if (version === '0.3') {
    if (part.type === 'text') return { kind: 'text', text: part.text, ...common };
    if (part.type === 'data') return { kind: 'data', data: part.data, ...common };
    assertFileOneOf(version, path, part);
    return {
      kind: 'file',
      ...(part.raw !== undefined ? { bytes: part.raw } : { uri: part.url }),
      ...(part.filename !== undefined ? { name: part.filename } : {}),
      ...common,
    };
  }
  if (part.type === 'text') return { text: part.text, ...common };
  if (part.type === 'data') return { data: part.data, ...common };
  assertFileOneOf(version, path, part);
  return {
    ...(part.raw !== undefined ? { raw: part.raw } : { url: part.url }),
    ...(part.filename !== undefined ? { filename: part.filename } : {}),
    ...common,
  };
}

function decodePart(version: A2AProtocolVersion, input: unknown, path: string): MessagePart {
  const obj = objectAt(version, path, input);
  if (version === '0.3') return decodeLegacyPart(obj, path);
  return decodeV1Part(obj, path);
}

function decodeLegacyPart(obj: Record<string, unknown>, path: string): MessagePart {
  if (['raw', 'url', 'mediaType'].some(key => obj[key] !== undefined)) {
    fail('0.3', path, 'contains A2A 1.0 part fields');
  }
  const kind = stringAt('0.3', `${path}.kind`, obj.kind);
  const metadata = optionalJsonObject('0.3', obj.metadata, `${path}.metadata`);
  if (kind === 'text') {
    return { type: 'text', text: stringAt('0.3', `${path}.text`, obj.text), ...optionalCommon(obj, metadata, 'mimeType') };
  }
  if (kind === 'data') {
    if (!hasOwn(obj, 'data')) fail('0.3', `${path}.data`, 'is required');
    assertJsonValue('0.3', `${path}.data`, obj.data);
    return { type: 'data', data: obj.data as JsonValue, ...optionalCommon(obj, metadata, 'mimeType') };
  }
  if (kind !== 'file') fail('0.3', `${path}.kind`, `unsupported kind '${kind}'`);
  const members = ['bytes', 'uri'].filter(key => obj[key] !== undefined);
  if (members.length !== 1) fail('0.3', path, 'file part must contain exactly one of bytes or uri');
  const raw = obj.bytes !== undefined ? stringAt('0.3', `${path}.bytes`, obj.bytes) : undefined;
  if (raw !== undefined) assertBase64('0.3', `${path}.bytes`, raw);
  return {
    type: 'file',
    ...(raw !== undefined ? { raw } : { url: stringAt('0.3', `${path}.uri`, obj.uri) }),
    ...(obj.name !== undefined ? { filename: stringAt('0.3', `${path}.name`, obj.name) } : {}),
    ...optionalCommon(obj, metadata, 'mimeType'),
  };
}

function decodeV1Part(obj: Record<string, unknown>, path: string): MessagePart {
  if (['kind', 'mimeType', 'bytes', 'uri'].some(key => obj[key] !== undefined)) {
    fail('1.0', path, 'contains legacy A2A 0.3 part fields');
  }
  const members = ['text', 'raw', 'url', 'data'].filter(key => hasOwn(obj, key));
  if (members.length !== 1) fail('1.0', path, 'Part must contain exactly one of text, raw, url, or data');
  const metadata = optionalJsonObject('1.0', obj.metadata, `${path}.metadata`);
  const common = optionalCommon(obj, metadata, 'mediaType');
  switch (members[0]) {
    case 'text':
      return { type: 'text', text: stringAt('1.0', `${path}.text`, obj.text), ...common };
    case 'data':
      assertJsonValue('1.0', `${path}.data`, obj.data);
      return { type: 'data', data: obj.data as JsonValue, ...common };
    case 'raw': {
      const raw = stringAt('1.0', `${path}.raw`, obj.raw);
      assertBase64('1.0', `${path}.raw`, raw);
      return {
        type: 'file', raw,
        ...(obj.filename !== undefined ? { filename: stringAt('1.0', `${path}.filename`, obj.filename) } : {}),
        ...common,
      };
    }
    case 'url':
      return {
        type: 'file', url: stringAt('1.0', `${path}.url`, obj.url),
        ...(obj.filename !== undefined ? { filename: stringAt('1.0', `${path}.filename`, obj.filename) } : {}),
        ...common,
      };
    default:
      fail('1.0', path, 'unknown Part member');
  }
}

function optionalCommon(
  obj: Record<string, unknown>,
  metadata: Record<string, JsonValue> | undefined,
  mediaKey: 'mimeType' | 'mediaType'
): { mediaType?: string; metadata?: Record<string, JsonValue> } {
  return {
    ...(obj[mediaKey] !== undefined ? { mediaType: stringAt(mediaKey === 'mimeType' ? '0.3' : '1.0', `$.${mediaKey}`, obj[mediaKey]) } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function decodeRole(version: A2AProtocolVersion, input: unknown, path: string): 'user' | 'agent' {
  const role = stringAt(version, path, input);
  if (version === '0.3') {
    if (role === 'user' || role === 'agent') return role;
  } else {
    if (role === 'ROLE_USER') return 'user';
    if (role === 'ROLE_AGENT') return 'agent';
  }
  fail(version, path, `unsupported role '${role}'`);
}

function assertFileOneOf(version: A2AProtocolVersion, path: string, part: Extract<MessagePart, { type: 'file' }>): void {
  if ((part.raw === undefined) === (part.url === undefined)) {
    fail(version, path, 'normalized file part must contain exactly one of raw or url');
  }
  if (part.raw !== undefined) assertBase64(version, `${path}.raw`, part.raw);
}

function objectAt(version: A2AProtocolVersion, path: string, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(version, path, 'must be an object');
  return value as Record<string, unknown>;
}

function arrayAt(version: A2AProtocolVersion, path: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) fail(version, path, 'must be an array');
  return value;
}

function stringAt(version: A2AProtocolVersion, path: string, value: unknown): string {
  if (typeof value !== 'string') fail(version, path, 'must be a string');
  return value;
}

function assertNonEmptyString(version: A2AProtocolVersion, path: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) fail(version, path, 'must be a non-empty string');
}

function assertTimestamp(version: A2AProtocolVersion, path: string, value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
    fail(version, path, 'must be an RFC 3339 timestamp');
  }
}

function assertBase64(version: A2AProtocolVersion, path: string, value: string): void {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail(version, path, 'must be canonical base64');
  }
}

function assertJsonValue(version: A2AProtocolVersion, path: string, value: unknown): void {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(version, path, 'JSON numbers must be finite');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(version, `${path}[${index}]`, entry));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) assertJsonValue(version, `${path}.${key}`, entry);
    return;
  }
  fail(version, path, 'must be a JSON value');
}

function optionalJsonObject(
  version: A2AProtocolVersion,
  value: unknown,
  path: string
): Record<string, JsonValue> | undefined {
  if (value === undefined) return undefined;
  const obj = objectAt(version, path, value);
  assertJsonValue(version, path, obj);
  return obj as Record<string, JsonValue>;
}

function copyOptional(out: Record<string, unknown>, key: string, value: string | undefined): void {
  if (value !== undefined) out[key] = value;
}

function copyJsonObject(
  version: A2AProtocolVersion,
  out: Record<string, unknown>,
  key: string,
  value: Record<string, JsonValue> | undefined,
  path: string
): void {
  if (value === undefined) return;
  assertJsonValue(version, path, value);
  out[key] = value;
}

function copyStringArray(
  version: A2AProtocolVersion,
  out: Record<string, unknown>,
  key: string,
  value: string[] | undefined,
  path: string
): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) {
    fail(version, path, 'must be an array of strings');
  }
  out[key] = [...value];
}

function assignOptionalString<T extends object, K extends keyof T>(
  version: A2AProtocolVersion,
  out: T,
  key: K,
  value: unknown,
  path: string
): void {
  if (value !== undefined) out[key] = stringAt(version, path, value) as T[K];
}

function assignOptionalJsonObject<T extends object, K extends keyof T>(
  version: A2AProtocolVersion,
  out: T,
  key: K,
  value: unknown,
  path: string
): void {
  const parsed = optionalJsonObject(version, value, path);
  if (parsed !== undefined) out[key] = parsed as T[K];
}

function assignOptionalStringArray<T extends object, K extends keyof T>(
  version: A2AProtocolVersion,
  out: T,
  key: K,
  value: unknown,
  path: string
): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) {
    fail(version, path, 'must be an array of strings');
  }
  out[key] = [...value] as T[K];
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function fail(version: A2AProtocolVersion, path: string, detail: string): never {
  throw new A2AWireValidationError(version, path, detail);
}
