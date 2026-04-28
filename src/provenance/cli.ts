/**
 * Provenance CLI — `aiwg provenance <subcommand>`
 *
 * Thin wrapper around `runSubsystemCli('provenance', ...)`. Used by
 * provenance-create / provenance-query / provenance-report /
 * provenance-validate / auto-provenance skills (#968) so W3C PROV
 * records honor `.aiwg/storage.config` redirection.
 *
 * @issue #934
 * @issue #968
 */

import { runSubsystemCli } from '../storage/subsystem-cli.js';

export async function main(args: string[]): Promise<void> {
  await runSubsystemCli('provenance', args);
}
