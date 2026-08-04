import { AuthClient, defaultBrowserOpener, type BrowserOpener } from "../../auth/client.js";
import { authConfigFromEnvironment } from "../../auth/config.js";
import { createCredentialStore, type CommandRunner } from "../../auth/credential-store.js";
import type { AuthClientConfig, CredentialStore } from "../../auth/types.js";
import type { CommandHandler, HandlerContext, HandlerResult } from "./types.js";

function usage(): string {
  return [
    "Usage:",
    "  aiwg auth login [--device] [--device-label <label>] [--store native|file] [--allow-file-store]",
    "  aiwg auth status [--json] [--store native|file] [--allow-file-store]",
    "  aiwg auth logout [--all] [--store native|file] [--allow-file-store]",
    "",
    "Exit codes: 0 success; 2 invalid usage; 3 not authenticated; 4 authorization denied/expired; 5 credential store unavailable; 6 network/protocol failure.",
  ].join("\n");
}

function value(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const result = args[index + 1];
  if (!result || result.startsWith("--")) throw new Error(`${flag} requires a value`);
  return result;
}

function classify(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "not_authenticated") return 3;
  if (/access_denied|expired_token|authorization canceled/.test(message)) return 4;
  if (/credential|Keychain|Secret Service|Credential Manager/.test(message)) return 5;
  return 6;
}

interface AuthHandlerDependencies {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  runner?: CommandRunner;
  store?: CredentialStore;
  config?: AuthClientConfig;
  fetcher?: typeof globalThis.fetch;
  openBrowser?: BrowserOpener;
  now?: () => Date;
}

export function createAuthHandler(dependencies: AuthHandlerDependencies = {}): CommandHandler {
  return {
    id: "auth",
    name: "Authentication",
    description: "Log in, inspect access, and log out of paid AIWG web resources",
    category: "maintenance",
    aliases: [],

    async execute(ctx: HandlerContext): Promise<HandlerResult> {
      if (!ctx.args.length || ["help", "--help", "-h"].includes(ctx.args[0])) {
        console.log(usage());
        return { exitCode: 0 };
      }
      const [subcommand, ...args] = ctx.args;
      if (!["login", "status", "logout"].includes(subcommand)) return { exitCode: 2, message: usage() };
      try {
        const storeMode = value(args, "--store") || "native";
        if (!["native", "file"].includes(storeMode)) return { exitCode: 2, message: "--store must be native or file" };
        const allowFile = args.includes("--allow-file-store") || dependencies.env?.AIWG_AUTH_ALLOW_FILE_STORE === "1" || process.env.AIWG_AUTH_ALLOW_FILE_STORE === "1";
        const store = dependencies.store || createCredentialStore({
          platform: dependencies.platform,
          useFile: storeMode === "file",
          allowFile,
          runner: dependencies.runner,
        });
        if (store.metadata.provider === "file") console.error("Warning: using explicitly opted-in mode-0600 credential file fallback.");
        const config = dependencies.config || authConfigFromEnvironment(dependencies.env);
        const client = new AuthClient(config, store, dependencies.fetcher, dependencies.openBrowser, dependencies.now);

        if (subcommand === "login") {
          const deviceLabel = value(args, "--device-label");
          if (args.includes("--device")) {
            await client.loginDevice({
              signal: ctx.signal,
              deviceLabel,
              onCode(info) {
                console.log(`Open: ${String(info.verification_uri)}`);
                console.log(`Code: ${String(info.user_code)}`);
              },
            });
          } else {
            await client.loginBrowser({ signal: ctx.signal, deviceLabel });
          }
          console.log(`Authenticated. Credentials stored in ${store.metadata.location}.`);
          return { exitCode: 0 };
        }

        if (subcommand === "status") {
          const { profile, credentials } = await client.status(ctx.signal);
          const output = {
            authenticated: true,
            subject: profile.sub,
            account: profile.email || null,
            organization: profile.organization_id || null,
            scopes: profile.scope?.split(/\s+/).filter(Boolean) || credentials.scope,
            plan: profile.plan || null,
            accessReason: profile.access_reason || null,
            accessValidUntil: profile.access_valid_until || credentials.expiresAt,
            credentialStore: store.metadata,
          };
          if (args.includes("--json")) console.log(JSON.stringify(output));
          else {
            console.log(`subject: ${output.subject}`);
            console.log(`account: ${output.account || "(not supplied)"}`);
            console.log(`organization: ${output.organization || "(none)"}`);
            console.log(`scopes: ${output.scopes.join(" ")}`);
            console.log(`plan: ${output.plan || "(none)"}`);
            console.log(`access_reason: ${output.accessReason || "(unknown)"}`);
            console.log(`access_valid_until: ${output.accessValidUntil}`);
            console.log(`credential_location: ${store.metadata.location}`);
          }
          return { exitCode: 0 };
        }

        if (args.includes("--all")) {
          const opener = dependencies.openBrowser || defaultBrowserOpener;
          await opener(`${config.baseUrl}/account/security?revoke=all`);
        }
        await client.logout(ctx.signal);
        console.log(args.includes("--all")
          ? "Local credentials removed. Complete revoke-all in the opened account security page."
          : "Logged out and removed local credentials.");
        return { exitCode: 0 };
      } catch (error) {
        return { exitCode: classify(error), message: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export const authHandler = createAuthHandler();
