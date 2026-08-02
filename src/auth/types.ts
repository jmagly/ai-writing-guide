export interface AuthCredentials {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  scope: string[];
  expiresAt: string;
}

export interface CredentialMetadata {
  provider: "macos-keychain" | "windows-credential-manager" | "linux-secret-service" | "file" | "memory";
  location: string;
}

export interface CredentialStore {
  readonly metadata: CredentialMetadata;
  load(): Promise<AuthCredentials | null>;
  save(credentials: AuthCredentials): Promise<void>;
  delete(): Promise<void>;
}

export interface AuthProfile {
  sub: string;
  email?: string;
  organization_id?: string;
  scope?: string;
  plan?: string;
  access_reason?: string;
  access_valid_until?: string;
}

export interface AuthClientConfig {
  baseUrl: string;
  clientId: string;
  scopes: string[];
  requestTimeoutMs: number;
}
