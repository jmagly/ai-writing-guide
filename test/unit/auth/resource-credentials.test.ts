import { describe, expect, it } from "vitest";
import { createResourceCredentialProvider } from "../../../src/auth/resource-credentials.js";
import { MemoryCredentialStore } from "../../../src/auth/credential-store.js";

describe("resource credential precedence", () => {
  it("prefers the explicit compatibility token over the credential store", async () => {
    const store = new MemoryCredentialStore();
    store.value = { accessToken: "aiwg_at_stored", refreshToken: "aiwg_rt_stored", tokenType: "Bearer", scope: [], expiresAt: "2030-01-01T00:00:00Z" };
    expect(await createResourceCredentialProvider({ AIWG_RESOURCE_TOKEN: "explicit-fixture" }, store)()).toBe("explicit-fixture");
  });
});
