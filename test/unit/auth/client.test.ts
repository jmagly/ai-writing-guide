import { describe, expect, it, vi } from "vitest";
import { AuthClient } from "../../../src/auth/client.js";
import { MemoryCredentialStore } from "../../../src/auth/credential-store.js";

const config = { baseUrl: "https://releases.example.test", clientId: "aiwg-cli", scopes: ["releases:read"], requestTimeoutMs: 1000 };
const token = { access_token: "aiwg_at_fixture_access", refresh_token: "aiwg_rt_fixture_refresh", token_type: "Bearer", scope: "releases:read", expires_in: 3600 };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

describe("AuthClient", () => {
  it("completes browser PKCE on a random loopback port", async () => {
    const store = new MemoryCredentialStore();
    let authorizeUrl = "";
    const opener = vi.fn(async (raw: string) => {
      authorizeUrl = raw;
      const authorize = new URL(raw);
      const callback = new URL(authorize.searchParams.get("redirect_uri")!);
      callback.searchParams.set("code", "fixture-code");
      callback.searchParams.set("state", authorize.searchParams.get("state")!);
      await fetch(callback);
    });
    const fetcher = vi.fn(async () => json(token));
    await new AuthClient(config, store, fetcher, opener, () => new Date("2029-01-01T00:00:00Z")).loginBrowser();
    const authorize = new URL(authorizeUrl);
    const redirect = new URL(authorize.searchParams.get("redirect_uri")!);
    expect(redirect.hostname).toBe("127.0.0.1");
    expect(Number(redirect.port)).toBeGreaterThan(0);
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(store.value?.accessToken).toBe("aiwg_at_fixture_access");
  });

  it("rejects a browser callback whose state does not match", async () => {
    const opener = async (raw: string) => {
      const authorize = new URL(raw);
      const callback = new URL(authorize.searchParams.get("redirect_uri")!);
      callback.search = "?code=fixture-code&state=wrong-state";
      await fetch(callback);
    };
    await expect(new AuthClient(config, new MemoryCredentialStore(), vi.fn(), opener).loginBrowser()).rejects.toThrow(/state mismatch/i);
  });

  it("polls a device grant through pending and slow-down responses", async () => {
    const store = new MemoryCredentialStore();
    const responses = [
      json({ device_code: "fixture-device", user_code: "ABCD-EFGH", verification_uri: "https://example.test/device", expires_in: 600, interval: 1 }),
      json({ error: "authorization_pending" }, 400),
      json({ error: "slow_down" }, 400),
      json(token),
    ];
    const fetcher = vi.fn(async () => responses.shift()!);
    const sleep = vi.fn(async () => undefined);
    const client = new AuthClient(config, store, fetcher, vi.fn(), () => new Date("2029-01-01T00:00:00Z"), sleep);
    await client.loginDevice();
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 1000, 6000]);
    expect(store.value?.accessToken).toBe("aiwg_at_fixture_access");
  });

  it.each(["access_denied", "expired_token"])("preserves device-flow %s errors", async (oauthError) => {
    const responses = [
      json({ device_code: "fixture-device", user_code: "ABCD-EFGH", verification_uri: "https://example.test/device", expires_in: 600, interval: 1 }),
      json({ error: oauthError }, 400),
    ];
    const client = new AuthClient(config, new MemoryCredentialStore(), vi.fn(async () => responses.shift()!), vi.fn(), () => new Date("2029-01-01T00:00:00Z"), async () => undefined);
    await expect(client.loginDevice()).rejects.toThrow(oauthError);
  });

  it("expires device authorization at the server deadline", async () => {
    let now = Date.parse("2029-01-01T00:00:00Z");
    const responses = [
      json({ device_code: "fixture-device", user_code: "ABCD-EFGH", verification_uri: "https://example.test/device", expires_in: 1, interval: 1 }),
      json({ error: "authorization_pending" }, 400),
    ];
    const client = new AuthClient(config, new MemoryCredentialStore(), vi.fn(async () => responses.shift()!), vi.fn(), () => new Date(now), async () => { now += 1000; });
    await expect(client.loginDevice()).rejects.toThrow("expired_token");
  });

  it("refreshes once after a 401 and never exposes refresh credentials in status headers", async () => {
    const store = new MemoryCredentialStore();
    store.value = { accessToken: "aiwg_at_old", refreshToken: "aiwg_rt_old", tokenType: "Bearer", scope: [], expiresAt: "2030-01-01T00:00:00Z" };
    const fetcher = vi.fn(async (url: string | URL) => String(url).endsWith("/oauth/token") ? json(token) :
      fetcher.mock.calls.filter(([seen]) => String(seen).endsWith("/v1/me")).length === 1 ? json({}, 401) : json({ sub: "acct_fixture", plan: "pro" }));
    const client = new AuthClient(config, store, fetcher, vi.fn(), () => new Date("2029-01-01T00:00:00Z"));
    expect((await client.status()).profile.plan).toBe("pro");
    const headerDump = JSON.stringify(fetcher.mock.calls.map(([, init]) => init?.headers));
    expect(headerDump).not.toContain("aiwg_rt_");
  });

  it("deletes local credentials even when revocation fails", async () => {
    const store = new MemoryCredentialStore();
    store.value = { accessToken: "aiwg_at_old", refreshToken: "aiwg_rt_old", tokenType: "Bearer", scope: [], expiresAt: "2030-01-01T00:00:00Z" };
    const client = new AuthClient(config, store, vi.fn(async () => { throw new Error("fixture outage"); }));
    await expect(client.logout()).rejects.toThrow("fixture outage");
    expect(store.value).toBeNull();
  });
});
