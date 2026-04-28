/**
 * Reflections CLI — `aiwg reflections <subcommand>`
 *
 * Thin subsystem wrapper around `runSubsystemCli('reflections', ...)`.
 * Used by the ralph-reflect / reflection-injection skills (#967) so
 * agent-loop reflections honor `.aiwg/storage.config` redirection.
 *
 * @issue #934
 * @issue #967
 */

import { runSubsystemCli } from '../storage/subsystem-cli.js';

export async function main(args: string[]): Promise<void> {
  await runSubsystemCli('reflections', args);
}
