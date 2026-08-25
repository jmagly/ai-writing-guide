/**
 * Versioned capability contract for scalable storage and index backends.
 *
 * This contract describes semantics; it does not make optional capabilities
 * available. Consumers must negotiate before using anything beyond the
 * required baseline.
 *
 * @issue #2193
 */

export const STORAGE_BACKEND_CONTRACT = 'aiwg.storage-backend/v1' as const;
export type StorageBackendContractVersion = typeof STORAGE_BACKEND_CONTRACT;

export type StorageBackendKind =
  | 'json-filesystem'
  | 'graphology'
  | 'sqlite'
  | 'fortemi-core-static'
  | 'fortemi-server'
  | 'postgres-direct'
  | 'postgres-postgrest'
  | 'mysql';

export type StorageCapability =
  | 'read'
  | 'atomic-batch'
  | 'consistent-snapshot'
  | 'change-cursor'
  | 'tombstones'
  | 'idempotency-keys'
  | 'recursive-traversal'
  | 'set-operations'
  | 'filtered-query'
  | 'cursor-pagination'
  | 'health'
  | 'readiness'
  | 'backup'
  | 'restore'
  | 'telemetry'
  | 'tenant-isolation'
  | 'subsystem-isolation'
  | 'tls';

export type Durability = 'process' | 'filesystem' | 'wal' | 'replicated';
export type Availability = 'local-process' | 'single-host' | 'remote-service';
export type Isolation = 'none' | 'snapshot' | 'serializable';
export type BackendMaturity = 'supported' | 'alpha' | 'advanced' | 'deferred';

export interface StorageBackendDescriptor {
  contract: StorageBackendContractVersion;
  backend: StorageBackendKind;
  implementationVersion: string;
  schemaVersion: string;
  maturity: BackendMaturity;
  capabilities: readonly StorageCapability[];
  durability: Durability;
  availability: Availability;
  isolation: Isolation;
  /** Whether this backend stores authoritative user data or a rebuildable view. */
  dataClass: 'canonical' | 'regenerable-index' | 'static-cache' | 'remote-persistence';
}

export interface CapabilityRequest {
  contract: string;
  required: readonly StorageCapability[];
  acceptedSchemaVersions?: readonly string[];
}

export interface CapabilityReceipt {
  contract: StorageBackendContractVersion;
  backend: StorageBackendKind;
  schemaVersion: string;
  capabilities: readonly StorageCapability[];
}

export class StorageCapabilityError extends Error {
  readonly code = 'AIWG_STORAGE_CAPABILITY_NEGOTIATION_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'StorageCapabilityError';
  }
}

/** Fail-closed negotiation. Unknown major contracts and missing capabilities never degrade silently. */
export function negotiateStorageCapabilities(
  descriptor: StorageBackendDescriptor,
  request: CapabilityRequest,
): CapabilityReceipt {
  if (request.contract !== STORAGE_BACKEND_CONTRACT) {
    throw new StorageCapabilityError(
      `unsupported storage contract "${request.contract}"; backend provides ${STORAGE_BACKEND_CONTRACT}`,
    );
  }
  if (
    request.acceptedSchemaVersions?.length &&
    !request.acceptedSchemaVersions.includes(descriptor.schemaVersion)
  ) {
    throw new StorageCapabilityError(
      `backend schema ${descriptor.schemaVersion} is not in the accepted schema set`,
    );
  }
  const available = new Set(descriptor.capabilities);
  const missing = [...new Set(request.required)].filter(capability => !available.has(capability));
  if (missing.length) {
    throw new StorageCapabilityError(
      `backend ${descriptor.backend} lacks required capabilities: ${missing.sort().join(', ')}`,
    );
  }
  return {
    contract: STORAGE_BACKEND_CONTRACT,
    backend: descriptor.backend,
    schemaVersion: descriptor.schemaVersion,
    capabilities: [...descriptor.capabilities].sort(),
  };
}

export interface LogicalRecordIdentity {
  tenant: string;
  subsystem: string;
  path: string;
}

export interface VersionedRecord<T> {
  identity: LogicalRecordIdentity;
  sourceRevision: string;
  digest: string;
  value?: T;
  tombstone?: { deletedAt: string; reason?: string };
}

export interface AtomicMutation<T> {
  operation: 'upsert' | 'delete';
  record: VersionedRecord<T>;
  idempotencyKey: string;
  expectedRevision?: string;
}

export interface BatchReceipt {
  batchId: string;
  committed: boolean;
  highWaterMark: string;
  recordReceipts: readonly {
    identity: LogicalRecordIdentity;
    sourceRevision: string;
    digest: string;
  }[];
}

export interface SnapshotHandle {
  id: string;
  highWaterMark: string;
  openedAt: string;
  expiresAt?: string;
}

export interface ChangePage<T> {
  snapshot?: SnapshotHandle;
  records: readonly VersionedRecord<T>[];
  nextCursor?: string;
  highWaterMark: string;
}

const BASELINE: readonly StorageCapability[] = ['read', 'subsystem-isolation'];

export const STORAGE_BACKEND_MATRIX: Readonly<Record<StorageBackendKind, StorageBackendDescriptor>> = {
  'json-filesystem': descriptor('json-filesystem', 'supported', BASELINE, 'filesystem', 'single-host', 'none', 'regenerable-index'),
  graphology: descriptor('graphology', 'supported', BASELINE, 'process', 'local-process', 'none', 'regenerable-index'),
  sqlite: descriptor('sqlite', 'supported', [...BASELINE, 'atomic-batch', 'consistent-snapshot', 'tombstones', 'idempotency-keys', 'filtered-query', 'cursor-pagination', 'backup', 'restore'], 'wal', 'single-host', 'serializable', 'regenerable-index'),
  'fortemi-core-static': descriptor('fortemi-core-static', 'supported', ['read', 'filtered-query', 'recursive-traversal', 'set-operations'], 'filesystem', 'single-host', 'snapshot', 'static-cache'),
  'fortemi-server': descriptor('fortemi-server', 'alpha', [...BASELINE, 'filtered-query', 'health', 'tls', 'tenant-isolation'], 'replicated', 'remote-service', 'none', 'remote-persistence'),
  'postgres-direct': descriptor('postgres-direct', 'advanced', [], 'replicated', 'remote-service', 'none', 'canonical'),
  'postgres-postgrest': descriptor('postgres-postgrest', 'advanced', [], 'replicated', 'remote-service', 'none', 'canonical'),
  mysql: descriptor('mysql', 'deferred', [], 'replicated', 'remote-service', 'none', 'canonical'),
};

function descriptor(
  backend: StorageBackendKind,
  maturity: BackendMaturity,
  capabilities: readonly StorageCapability[],
  durability: Durability,
  availability: Availability,
  isolation: Isolation,
  dataClass: StorageBackendDescriptor['dataClass'],
): StorageBackendDescriptor {
  return {
    contract: STORAGE_BACKEND_CONTRACT,
    backend,
    implementationVersion: '1.0.0',
    schemaVersion: '1',
    maturity,
    capabilities,
    durability,
    availability,
    isolation,
    dataClass,
  };
}
