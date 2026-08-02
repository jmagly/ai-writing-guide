import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthHandler } from "../../../../src/cli/handlers/auth.js";
import { MemoryCredentialStore } from "../../../../src/auth/credential-store.js";
import { allHandlers } from "../../../../src/cli/handlers/index.js";

const context = (args: string[]) => ({ args, rawArgs: ["auth", ...args], cwd: "/fixture", frameworkRoot: "/fixture" });
const config = { baseUrl: "https://releases.example.test", clientId: "aiwg-cli", scopes: ["releases:read"], requestTimeoutMs: 1000 };
afterEach(() => vi.restoreAllMocks());

describe("auth command", () => {
  it("is registered", () => expect(allHandlers.some((handler) => handler.id === "auth")).toBe(true));

  it("prints status metadata without credentials", async () => {
    const store = new MemoryCredentialStore();
    store.value = { accessToken: "aiwg_at_fixture_secret", refreshToken: "aiwg_rt_fixture_secret", tokenType: "Bearer", scope: ["releases:read"], expiresAt: "2030-01-01T00:00:00Z" };
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line) => output.push(String(line)));
    const handler = createAuthHandler({ store, config, now: () => new Date("2029-01-01T00:00:00Z"), fetcher: vi.fn(async () => new Response(JSON.stringify({ sub: "acct_fixture", email: "fixture@example.test", plan: "pro", access_reason: "subscription" }), { status: 200 })) });
    expect((await handler.execute(context(["status", "--json"]))).exitCode).toBe(0);
    expect(output.join("\n")).toContain("acct_fixture");
    expect(output.join("\n")).not.toMatch(/aiwg_[ar]t_/);
  });

  it("documents stable exit codes", async () => {
    const output: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line) => output.push(String(line)));
    await createAuthHandler().execute(context(["--help"]));
    expect(output.join("\n")).toContain("3 not authenticated");
  });
});
