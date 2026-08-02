import fs from "node:fs";
import path from "node:path";
import type { AuthClientConfig } from "./types.js";

export const DEFAULT_AUTH_BASE_URL = "https://releases.aiwg.io";
export const DEFAULT_AUTH_CLIENT_ID = "aiwg-cli";
export const DEFAULT_AUTH_SCOPES = ["releases:read", "profile:read"];

function cleanOrigin(value: string, allowLoopbackHttp = false): string {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "[::1]", "::1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowLoopbackHttp && loopback && url.protocol === "http:")) {
    throw new Error("AIWG authentication requires HTTPS; HTTP is allowed only for explicitly enabled loopback tests");
  }
  if (url.username || url.password || url.search || url.hash) throw new Error("AIWG authentication URL must be a clean origin");
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function authConfigFromEnvironment(env: NodeJS.ProcessEnv = process.env): AuthClientConfig {
  const baseUrl = cleanOrigin(
    env.AIWG_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL,
    env.AIWG_AUTH_ALLOW_INSECURE_LOOPBACK_HTTP === "1",
  );
  const clientId = env.AIWG_AUTH_CLIENT_ID || DEFAULT_AUTH_CLIENT_ID;
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(clientId)) throw new Error("AIWG auth client ID is invalid");
  const scopes = (env.AIWG_AUTH_SCOPES || DEFAULT_AUTH_SCOPES.join(" ")).split(/\s+/).filter(Boolean);
  if (!scopes.length || scopes.some((scope) => !/^[a-z][a-z0-9._:-]{1,63}$/.test(scope))) throw new Error("AIWG auth scopes are invalid");
  return { baseUrl, clientId, scopes, requestTimeoutMs: 30_000 };
}

export function explicitResourceToken(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.AIWG_RESOURCE_TOKEN_FILE) {
    const pathname = path.resolve(env.AIWG_RESOURCE_TOKEN_FILE);
    const stat = fs.lstatSync(pathname);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
      throw new Error("AIWG_RESOURCE_TOKEN_FILE must be a non-symlink regular file with mode 0600");
    }
    return fs.readFileSync(pathname, "utf8").trim() || null;
  }
  return env.AIWG_RESOURCE_TOKEN?.trim() || null;
}
