import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AuthCredentials, CredentialStore, CredentialMetadata } from "./types.js";

export interface CommandResult { stdout: string; stderr: string; exitCode: number }
export type CommandRunner = (command: string, args: string[], stdin?: string) => Promise<CommandResult>;

export const defaultCommandRunner: CommandRunner = (command, args, stdin = "") => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  let outputBytes = 0;
  const collect = (target: Buffer[], chunk: Buffer) => {
    outputBytes += chunk.length;
    if (outputBytes > 1024 * 1024) child.kill();
    else target.push(chunk);
  };
  child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
  child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
  child.once("error", reject);
  child.once("close", (code) => resolve({
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
    exitCode: code ?? 1,
  }));
  child.stdin.end(stdin);
});

function parseCredentials(raw: string): AuthCredentials {
  const value = JSON.parse(raw) as Partial<AuthCredentials>;
  if (!value.accessToken?.startsWith("aiwg_at_") || !value.refreshToken?.startsWith("aiwg_rt_")
      || value.tokenType !== "Bearer" || !Array.isArray(value.scope) || !value.expiresAt) {
    throw new Error("stored AIWG credentials are invalid");
  }
  return value as AuthCredentials;
}

const SERVICE = "releases.aiwg.io";
const ACCOUNT = "aiwg-cli";

abstract class NativeCredentialStore implements CredentialStore {
  abstract readonly metadata: CredentialMetadata;
  constructor(protected readonly run: CommandRunner = defaultCommandRunner) {}
  abstract load(): Promise<AuthCredentials | null>;
  abstract save(credentials: AuthCredentials): Promise<void>;
  abstract delete(): Promise<void>;
  protected parse(raw: string): AuthCredentials { return parseCredentials(raw.trim()); }
}

export class MacOsKeychainStore extends NativeCredentialStore {
  readonly metadata = { provider: "macos-keychain", location: `Keychain:${SERVICE}/${ACCOUNT}` } as const;
  async load() {
    const result = await this.run("security", ["find-generic-password", "-a", ACCOUNT, "-s", SERVICE, "-w"]);
    return result.exitCode === 44 ? null : result.exitCode === 0 ? this.parse(result.stdout) : Promise.reject(new Error("macOS Keychain read failed"));
  }
  async save(credentials: AuthCredentials) {
    const result = await this.run("security", ["add-generic-password", "-U", "-a", ACCOUNT, "-s", SERVICE, "-w"], JSON.stringify(credentials));
    if (result.exitCode !== 0) throw new Error("macOS Keychain write failed");
  }
  async delete() { await this.run("security", ["delete-generic-password", "-a", ACCOUNT, "-s", SERVICE]); }
}

export class LinuxSecretServiceStore extends NativeCredentialStore {
  readonly metadata = { provider: "linux-secret-service", location: `SecretService:${SERVICE}/${ACCOUNT}` } as const;
  async load() {
    const result = await this.run("secret-tool", ["lookup", "service", SERVICE, "account", ACCOUNT]);
    return result.exitCode === 1 ? null : result.exitCode === 0 ? this.parse(result.stdout) : Promise.reject(new Error("Linux Secret Service read failed"));
  }
  async save(credentials: AuthCredentials) {
    const result = await this.run("secret-tool", ["store", `--label=AIWG ${SERVICE}`, "service", SERVICE, "account", ACCOUNT], JSON.stringify(credentials));
    if (result.exitCode !== 0) throw new Error("Linux Secret Service write failed");
  }
  async delete() { await this.run("secret-tool", ["clear", "service", SERVICE, "account", ACCOUNT]); }
}

const WINDOWS_READ = "$v=New-Object Windows.Security.Credentials.PasswordVault;try{$c=$v.Retrieve('releases.aiwg.io','aiwg-cli');$c.RetrievePassword();[Console]::Out.Write($c.Password)}catch{exit 1}";
const WINDOWS_WRITE = "$s=[Console]::In.ReadToEnd();$v=New-Object Windows.Security.Credentials.PasswordVault;$v.Add((New-Object Windows.Security.Credentials.PasswordCredential('releases.aiwg.io','aiwg-cli',$s)))";
const WINDOWS_DELETE = "$v=New-Object Windows.Security.Credentials.PasswordVault;try{$c=$v.Retrieve('releases.aiwg.io','aiwg-cli');$v.Remove($c)}catch{}";

export class WindowsCredentialManagerStore extends NativeCredentialStore {
  readonly metadata = { provider: "windows-credential-manager", location: `CredentialManager:${SERVICE}/${ACCOUNT}` } as const;
  private execute(script: string, stdin = "") { return this.run("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], stdin); }
  async load() { const result = await this.execute(WINDOWS_READ); return result.exitCode === 1 ? null : result.exitCode === 0 ? this.parse(result.stdout) : Promise.reject(new Error("Windows Credential Manager read failed")); }
  async save(credentials: AuthCredentials) { if ((await this.execute(WINDOWS_WRITE, JSON.stringify(credentials))).exitCode !== 0) throw new Error("Windows Credential Manager write failed"); }
  async delete() { await this.execute(WINDOWS_DELETE); }
}

export class FileCredentialStore implements CredentialStore {
  readonly metadata: CredentialMetadata;
  constructor(readonly pathname: string, readonly explicitlyAllowed: boolean) {
    this.pathname = path.resolve(pathname);
    this.metadata = { provider: "file", location: this.pathname };
  }
  private assertAllowed() { if (!this.explicitlyAllowed) throw new Error("credential file fallback requires --allow-file-store or AIWG_AUTH_ALLOW_FILE_STORE=1"); }
  async load() {
    this.assertAllowed();
    try {
      const stat = await fs.lstat(this.pathname);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error("credential file must be a non-symlink mode-0600 regular file");
      return parseCredentials(await fs.readFile(this.pathname, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async save(credentials: AuthCredentials) {
    this.assertAllowed();
    await fs.mkdir(path.dirname(this.pathname), { recursive: true, mode: 0o700 });
    const temporary = `${this.pathname}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(credentials)}\n`, { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, this.pathname);
    await fs.chmod(this.pathname, 0o600);
  }
  async delete() { this.assertAllowed(); await fs.unlink(this.pathname).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; }); }
}

export class MemoryCredentialStore implements CredentialStore {
  readonly metadata = { provider: "memory", location: "injected-memory-store" } as const;
  value: AuthCredentials | null = null;
  async load() { return this.value ? structuredClone(this.value) : null; }
  async save(value: AuthCredentials) { this.value = structuredClone(value); }
  async delete() { this.value = null; }
}

export function defaultCredentialFile(): string {
  const root = process.env.XDG_CONFIG_HOME || (process.platform === "win32" ? process.env.APPDATA : undefined) || path.join(os.homedir(), ".config");
  return path.join(root, "aiwg", "credentials", "resource-auth.json");
}

export function createCredentialStore(options: { platform?: NodeJS.Platform; useFile?: boolean; allowFile?: boolean; pathname?: string; runner?: CommandRunner } = {}): CredentialStore {
  if (options.useFile) return new FileCredentialStore(options.pathname || defaultCredentialFile(), options.allowFile === true);
  const platform = options.platform || process.platform;
  if (platform === "darwin") return new MacOsKeychainStore(options.runner);
  if (platform === "win32") return new WindowsCredentialManagerStore(options.runner);
  if (platform === "linux") return new LinuxSecretServiceStore(options.runner);
  throw new Error("no native credential store is available; explicitly opt in to the mode-0600 file fallback");
}
