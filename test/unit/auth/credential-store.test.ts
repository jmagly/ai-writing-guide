import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileCredentialStore,
  LinuxSecretServiceStore,
  MacOsKeychainStore,
  WindowsCredentialManagerStore,
  defaultCommandRunner,
  type CommandRunner,
} from "../../../src/auth/credential-store.js";

const credentials = {
  accessToken: "aiwg_at_fixture_access",
  refreshToken: "aiwg_rt_fixture_refresh",
  tokenType: "Bearer" as const,
  scope: ["releases:read"],
  expiresAt: "2030-01-01T00:00:00.000Z",
};
const temporary: string[] = [];
afterEach(async () => Promise.all(temporary.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true }))));

describe("credential stores", () => {
  it("does not surface EPIPE when a credential helper exits before consuming stdin", async () => {
    const result = await defaultCommandRunner(
      process.execPath,
      ["-e", "process.exit(0)"],
      "x".repeat(8 * 1024 * 1024),
    );
    expect(result.exitCode).toBe(0);
  });

  it.each([
    ["macOS", (run: CommandRunner) => new MacOsKeychainStore(run)],
    ["Linux", (run: CommandRunner) => new LinuxSecretServiceStore(run)],
    ["Windows", (run: CommandRunner) => new WindowsCredentialManagerStore(run)],
  ])("passes %s credential payload through stdin, never argv", async (_name, factory) => {
    const run = vi.fn<CommandRunner>().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
    await factory(run).save(credentials);
    const [, args, stdin] = run.mock.calls[0];
    expect(args.join(" ")).not.toContain(credentials.accessToken);
    expect(args.join(" ")).not.toContain(credentials.refreshToken);
    expect(stdin).toContain(credentials.accessToken);
  });

  it("requires explicit opt-in and enforces a private regular file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "aiwg-auth-test-")); temporary.push(root);
    const pathname = path.join(root, "credentials.json");
    await expect(new FileCredentialStore(pathname, false).save(credentials)).rejects.toThrow(/allow-file-store/i);
    const store = new FileCredentialStore(pathname, true);
    await store.save(credentials);
    expect((await fs.stat(pathname)).mode & 0o777).toBe(0o600);
    expect(await store.load()).toEqual(credentials);
    await fs.chmod(pathname, 0o644);
    await expect(store.load()).rejects.toThrow(/0600/);
  });
});
