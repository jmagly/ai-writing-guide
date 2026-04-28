/**
 * Memory CLI — `aiwg memory <subcommand>`
 *
 * Thin subsystem wrapper around `runSubsystemCli('memory', ...)` for
 * the `memory` storage subsystem. Subcommands and behavior live in
 * `src/storage/subsystem-cli.ts` so memory and reflections share the
 * same implementation.
 *
 * @issue #934
 * @issue #966
 */

import { runSubsystemCli } from '../storage/subsystem-cli.js';

export async function main(args: string[]): Promise<void> {
  await runSubsystemCli('memory', args);
}
