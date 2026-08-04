import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import type { AuthClientConfig, AuthCredentials, AuthProfile, CredentialStore } from "./types.js";

export type AuthFetcher = typeof globalThis.fetch;
export type BrowserOpener = (url: string) => Promise<void>;

const random = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const createPkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json().catch(() => ({}));
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function oauthError(value: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof value.error === "string" ? value.error : fallback);
}

function toCredentials(value: Record<string, unknown>, now = new Date()): AuthCredentials {
  if (typeof value.access_token !== "string" || typeof value.refresh_token !== "string"
      || value.token_type !== "Bearer" || !Number.isSafeInteger(value.expires_in)) throw new Error("authorization server returned an invalid token response");
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    tokenType: "Bearer",
    scope: String(value.scope || "").split(/\s+/).filter(Boolean),
    expiresAt: new Date(now.getTime() + Number(value.expires_in) * 1000).toISOString(),
  };
}

export const defaultBrowserOpener: BrowserOpener = async (url) => {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd.exe" : "xdg-open";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "start", "", url] : [url];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
    child.once("error", reject);
    child.once("spawn", () => { child.unref(); resolve(); });
  });
};

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("authentication canceled"));
    const timer = setTimeout(resolve, ms);
    const abort = () => { clearTimeout(timer); reject(new Error("authentication canceled")); };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export class AuthClient {
  constructor(
    readonly config: AuthClientConfig,
    readonly store: CredentialStore,
    readonly fetcher: AuthFetcher = globalThis.fetch,
    readonly openBrowser: BrowserOpener = defaultBrowserOpener,
    readonly now: () => Date = () => new Date(),
    readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void> = wait,
  ) {}

  private async request(pathname: string, init: RequestInit): Promise<Response> {
    const signal = init.signal || AbortSignal.timeout(this.config.requestTimeoutMs);
    return this.fetcher(`${this.config.baseUrl}${pathname}`, { ...init, signal, redirect: "error" });
  }

  async loginBrowser(options: { signal?: AbortSignal; deviceLabel?: string } = {}): Promise<AuthCredentials> {
    const verifier = random(48);
    const state = random();
    let server: Server | undefined;
    const callback = new Promise<{ code: string; state: string }>((resolve, reject) => {
      server = createServer((request, response) => {
        try {
          const url = new URL(request.url || "/", "http://127.0.0.1");
          if (url.pathname !== "/callback" || !url.searchParams.get("code") || !url.searchParams.get("state")) {
            response.writeHead(400, { "content-type": "text/plain", "cache-control": "no-store" }); response.end("Invalid authorization callback"); return;
          }
          response.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }); response.end("AIWG authorization complete. You may close this window.");
          resolve({ code: url.searchParams.get("code")!, state: url.searchParams.get("state")! });
        } catch (error) { reject(error); }
      });
      server.once("error", reject);
      server.listen(0, "127.0.0.1");
    });
    try {
      const callbackServer = server;
      if (!callbackServer) throw new Error("loopback callback server was not created");
      await new Promise<void>((resolve, reject) => { callbackServer.once("listening", resolve); callbackServer.once("error", reject); });
      const address = callbackServer.address();
      if (!address || typeof address === "string") throw new Error("loopback callback did not bind a random port");
      const redirectUri = `http://127.0.0.1:${address.port}/callback`;
      const authorize = new URL(`${this.config.baseUrl}/oauth/authorize`);
      authorize.search = new URLSearchParams({
        client_id: this.config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        code_challenge: createPkceChallenge(verifier),
        code_challenge_method: "S256",
        state,
        scope: this.config.scopes.join(" "),
        ...(options.deviceLabel ? { device_label: options.deviceLabel } : {}),
      }).toString();
      await this.openBrowser(authorize.toString());
      const result = await Promise.race([
        callback,
        new Promise<never>((_, reject) => options.signal?.addEventListener("abort", () => reject(new Error("authentication canceled")), { once: true })),
      ]);
      if (result.state !== state) throw new Error("OAuth state mismatch");
      const response = await this.request("/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: result.code, code_verifier: verifier, client_id: this.config.clientId, redirect_uri: redirectUri }),
        signal: options.signal,
      });
      const value = await responseJson(response);
      if (!response.ok) throw oauthError(value, "authorization code exchange failed");
      const credentials = toCredentials(value, this.now());
      await this.store.save(credentials);
      return credentials;
    } finally {
      server?.closeAllConnections();
      server?.close();
    }
  }

  async loginDevice(options: { signal?: AbortSignal; deviceLabel?: string; onCode?: (value: Record<string, unknown>) => void } = {}): Promise<AuthCredentials> {
    const start = await this.request("/v1/auth/device/authorization", {
      method: "POST", headers: { "content-type": "application/json" }, signal: options.signal,
      body: JSON.stringify({ client_id: this.config.clientId, scope: this.config.scopes.join(" "), device_label: options.deviceLabel }),
    });
    const value = await responseJson(start);
    if (!start.ok || typeof value.device_code !== "string" || typeof value.expires_in !== "number" || typeof value.interval !== "number") {
      throw oauthError(value, "device authorization failed");
    }
    options.onCode?.(value);
    const deadline = this.now().getTime() + value.expires_in * 1000;
    let interval = value.interval;
    while (this.now().getTime() < deadline) {
      await this.sleep(interval * 1000, options.signal);
      if (this.now().getTime() >= deadline) break;
      const response = await this.request("/oauth/token", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal: options.signal,
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: value.device_code, client_id: this.config.clientId }),
      });
      const token = await responseJson(response);
      if (response.ok) {
        const credentials = toCredentials(token, this.now());
        await this.store.save(credentials);
        return credentials;
      }
      if (token.error === "authorization_pending") continue;
      if (token.error === "slow_down") { interval += 5; continue; }
      throw oauthError(token, "device authorization failed");
    }
    throw new Error("expired_token");
  }

  async refresh(credentials: AuthCredentials, signal?: AbortSignal): Promise<AuthCredentials> {
    const response = await this.request("/oauth/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal,
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: credentials.refreshToken, client_id: this.config.clientId }),
    });
    const value = await responseJson(response);
    if (!response.ok) throw oauthError(value, "refresh failed");
    const updated = toCredentials(value, this.now());
    await this.store.save(updated);
    return updated;
  }

  async status(signal?: AbortSignal): Promise<{ profile: AuthProfile; credentials: AuthCredentials }> {
    let credentials = await this.store.load();
    if (!credentials) throw new Error("not_authenticated");
    if (Date.parse(credentials.expiresAt) <= this.now().getTime() + 30_000) credentials = await this.refresh(credentials, signal);
    let response = await this.request("/v1/me", { headers: { authorization: `Bearer ${credentials.accessToken}` }, signal });
    if (response.status === 401) {
      credentials = await this.refresh(credentials, signal);
      response = await this.request("/v1/me", { headers: { authorization: `Bearer ${credentials.accessToken}` }, signal });
    }
    const value = await responseJson(response);
    if (!response.ok || typeof value.sub !== "string") throw oauthError(value, "status request failed");
    return { profile: value as unknown as AuthProfile, credentials };
  }

  async logout(signal?: AbortSignal): Promise<void> {
    const credentials = await this.store.load();
    try {
      if (credentials) await this.request("/oauth/revoke", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal,
        body: new URLSearchParams({ token: credentials.refreshToken, token_type_hint: "refresh_token" }),
      });
    } finally {
      await this.store.delete();
    }
  }
}
