import { explicitResourceToken } from "./config.js";
import { createCredentialStore } from "./credential-store.js";
import type { CredentialStore } from "./types.js";

/**
 * Resolve credentials for protected release downloads. Explicit compatibility
 * inputs take precedence over interactive-login credentials.
 */
export function createResourceCredentialProvider(
  env: NodeJS.ProcessEnv = process.env,
  store?: CredentialStore,
): () => Promise<string | null> {
  return async () => {
    const explicit = explicitResourceToken(env);
    if (explicit) return explicit;
    const selected = store ?? createCredentialStore();
    try {
      return (await selected.load())?.accessToken ?? null;
    } catch (error) {
      // A workstation without the platform keychain helper must retain access
      // to public releases. Invalid/corrupt stored credentials still fail loud.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  };
}
