/**
 * Research storage CLI — `aiwg research-store <subcommand>`
 *
 * Thin wrapper around `runSubsystemCli('research', ...)`. Used by
 * research-acquire / corpus-* skills (#968) so the research corpus
 * honors `.aiwg/storage.config` redirection (e.g., `roots.research`
 * pointing at a secondary drive — one of the headline use cases in #934).
 *
 * Note: AIWG already has many `research-*` commands (research-discover,
 * research-acquire, etc.). This new command is named `research-store`
 * to disambiguate — it's the storage primitive layer, not a workflow.
 *
 * @issue #934
 * @issue #968
 */

import { runSubsystemCli } from '../storage/subsystem-cli.js';

export async function main(args: string[]): Promise<void> {
  await runSubsystemCli('research', args, { displayName: 'research-store' });
}
