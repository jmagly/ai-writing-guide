import { describe, expect, it } from 'vitest';
import {
  STORAGE_BACKEND_CONTRACT,
  STORAGE_BACKEND_MATRIX,
  StorageCapabilityError,
  negotiateStorageCapabilities,
} from '../../../src/storage/backend-contract.js';

describe('scalable storage backend contract (#2193)', () => {
  it('maps every planned backend onto a versioned maturity and data class', () => {
    expect(Object.keys(STORAGE_BACKEND_MATRIX)).toEqual([
      'json-filesystem', 'graphology', 'sqlite', 'fortemi-core-static',
      'fortemi-server', 'postgres-direct', 'postgres-postgrest', 'mysql',
    ]);
    for (const descriptor of Object.values(STORAGE_BACKEND_MATRIX)) {
      expect(descriptor.contract).toBe(STORAGE_BACKEND_CONTRACT);
      expect(descriptor.schemaVersion).toBe('1');
      expect(descriptor.dataClass).toBeTruthy();
    }
  });

  it('returns a deterministic receipt when all required capabilities exist', () => {
    const receipt = negotiateStorageCapabilities(STORAGE_BACKEND_MATRIX.sqlite, {
      contract: STORAGE_BACKEND_CONTRACT,
      required: ['read', 'atomic-batch', 'consistent-snapshot'],
      acceptedSchemaVersions: ['1'],
    });
    expect(receipt.backend).toBe('sqlite');
    expect(receipt.capabilities).toEqual([...receipt.capabilities].sort());
  });

  it('fails closed for unknown contracts, schemas, and missing capabilities', () => {
    expect(() => negotiateStorageCapabilities(STORAGE_BACKEND_MATRIX.sqlite, {
      contract: 'aiwg.storage-backend/v2', required: ['read'],
    })).toThrow(StorageCapabilityError);
    expect(() => negotiateStorageCapabilities(STORAGE_BACKEND_MATRIX.sqlite, {
      contract: STORAGE_BACKEND_CONTRACT, required: ['read'], acceptedSchemaVersions: ['2'],
    })).toThrow(/not in the accepted schema set/);
    expect(() => negotiateStorageCapabilities(STORAGE_BACKEND_MATRIX['json-filesystem'], {
      contract: STORAGE_BACKEND_CONTRACT, required: ['atomic-batch', 'tls'],
    })).toThrow(/atomic-batch, tls/);
  });

  it('does not advertise unproven live or future capabilities', () => {
    expect(STORAGE_BACKEND_MATRIX['fortemi-server'].maturity).toBe('alpha');
    expect(STORAGE_BACKEND_MATRIX['fortemi-server'].capabilities).not.toContain('atomic-batch');
    expect(STORAGE_BACKEND_MATRIX['postgres-direct'].capabilities).toEqual([]);
    expect(STORAGE_BACKEND_MATRIX.mysql.maturity).toBe('deferred');
  });
});
