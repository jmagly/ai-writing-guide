# Network analysis release checklist

Complete this checklist for every release that changes the addon, runtime,
schemas, recipes, supported tools, fixtures, or framework handoffs.

## Contracts and compatibility

- [ ] Schema identities, catalog entries, exported types, examples, and
  migrations agree.
- [ ] Recipe fields compile against the checked probe inventories; missing
  required fields and unsupported majors fail closed.
- [ ] The dated TShark, Capinfos, Termshark, OS, and Node support matrix was
  reviewed against official sources and qualification evidence.
- [ ] Any deprecation names its replacement, migration, support window, and
  planned removal release.

## Safety and data handling

- [ ] No path starts live capture, selects an interface, changes privileges,
  uses a shell command string, uploads payload, or transfers a capture.
- [ ] Source and derived identity, bounds, partial/error states, redaction,
  disclosure, retention, cleanup, and limitations remain explicit.
- [ ] Operator examples avoid root execution and unrestricted acquisition.
- [ ] Threat-model controls and the approved construction gate remain satisfied.

## Evidence and tests

- [ ] The synthetic fixture generator is byte-for-byte deterministic and its
  manifest hashes match tracked files.
- [ ] Unit, integration, and `npm run test:conformance:network-analysis` pass.
- [ ] The machine-readable `conformance-report.v1.json` says `pass`, identifies the
  release gate, and records any installed-tool skip without claiming coverage.
- [ ] Every command/example is executed by a test or derived from a tracked,
  tested fixture.

## Distribution and documentation

- [ ] Project-scoped provider deployments round-trip canonical skill content;
  user-scoped provider adapters pass their existing deployment conformance, and
  every provider declared in `manifest.json` is reviewed.
- [ ] `npm pack --dry-run --json` contains runtime JavaScript and declarations,
  addon content, schemas, framework handoffs, compatibility docs, conformance
  report, and third-party notices.
- [ ] The tarball contains no TShark, Wireshark, Termshark, raw capture corpus,
  credentials, profiles, caches, or case evidence.
- [ ] README, public addon catalog, discovery phrases, provider guidance,
  integration index, compatibility matrix, third-party notices, changelogs, and
  this checklist are aligned.
