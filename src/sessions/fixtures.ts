import type { CapabilityDispositionSchema, SessionSourceAdapter } from './contracts.js';
import type { z } from 'zod';

export interface SessionAdapterFixture {
  provider: SessionSourceAdapter['provider'];
  disposition: z.infer<typeof CapabilityDispositionSchema>;
  synthetic: true;
  schemaVersion: string;
  adapterVersion: string;
  records: unknown[];
  unsupportedReason?: string;
}

export function defineSessionAdapterFixture(fixture: SessionAdapterFixture): SessionAdapterFixture {
  if (fixture.synthetic !== true) throw new Error('session fixtures must be synthetic or separately redacted');
  if (fixture.disposition === 'implemented' && fixture.records.length === 0) {
    throw new Error('implemented adapters require at least one synthetic fixture record');
  }
  if (fixture.disposition !== 'implemented' && !fixture.unsupportedReason) {
    throw new Error(`${fixture.disposition} fixtures require an explicit reason`);
  }
  return Object.freeze({ ...fixture, records: Object.freeze([...fixture.records]) }) as SessionAdapterFixture;
}

