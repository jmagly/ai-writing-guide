import {
  SessionContractError,
  assertSessionProviderId,
  type AuthorizedScope,
  type SessionAcquisitionMode,
  type SessionProviderId,
  type SessionSourceAdapter,
  type SessionSourceOperation,
  type SourceDescriptor,
} from './contracts.js';

export interface SourceCapabilityReport {
  provider: SessionProviderId;
  classification: SessionSourceAdapter['disposition'];
  state: 'available' | 'unavailable' | 'inaccessible' | 'version-unknown'
    | 'schema-unsupported' | 'degraded';
  evidence: {
    adapterVersion: string;
    sourceSchemaVersion?: string;
    verifiedAt: string;
    reference?: string;
  };
  supportedOperations: readonly SessionSourceOperation[];
  acquisitionModes: readonly SessionAcquisitionMode[];
  reason: string | null;
  remediation: string | null;
}

export class SessionSourceAdapterRegistry {
  private readonly adapters = new Map<SessionProviderId, SessionSourceAdapter>();

  register(adapter: SessionSourceAdapter): void {
    const provider = assertSessionProviderId(adapter.provider);
    if (this.adapters.has(provider)) throw new Error(`session adapter already registered: ${provider}`);
    this.adapters.set(provider, adapter);
  }

  get(providerInput: string): SessionSourceAdapter {
    const provider = assertSessionProviderId(providerInput);
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new SessionContractError('SOURCE_NOT_AUTHORIZED', `no session adapter is registered for ${provider}`);
    }
    return adapter;
  }

  assertOperation(providerInput: string, operation: SessionSourceOperation): SessionSourceAdapter {
    const adapter = this.get(providerInput);
    if (!adapter.supportedOperations.includes(operation)) {
      throw new SessionContractError(
        'UNSUPPORTED_OPERATION',
        `${operation} is unsupported for provider ${adapter.provider}`,
      );
    }
    return adapter;
  }

  async *discover(providerInput: string, scope: AuthorizedScope): AsyncIterable<SourceDescriptor> {
    const adapter = this.assertOperation(providerInput, 'discover');
    if (scope.allowedRoots.length === 0 && (scope.authorizedAccounts?.length ?? 0) === 0) {
      throw new SessionContractError(
        'SOURCE_NOT_AUTHORIZED',
        'discovery requires at least one explicitly authorized root or account',
      );
    }
    yield* adapter.discover({
      ...scope,
      allowedRoots: [...scope.allowedRoots],
      authorizedAccounts: scope.authorizedAccounts ? [...scope.authorizedAccounts] : undefined,
    });
  }

  report(
    providerInput: string,
    input: Omit<SourceCapabilityReport, 'provider' | 'classification'
      | 'supportedOperations' | 'acquisitionModes'>,
  ): SourceCapabilityReport {
    const adapter = this.get(providerInput);
    return Object.freeze({
      provider: adapter.provider,
      classification: adapter.disposition,
      supportedOperations: Object.freeze([...adapter.supportedOperations]),
      acquisitionModes: Object.freeze([...adapter.acquisitionModes]),
      ...input,
    });
  }
}

export function redactSourceLocator(locator: string): string {
  const leaf = locator.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) ?? '<source>';
  return `<session-source>/${leaf.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
