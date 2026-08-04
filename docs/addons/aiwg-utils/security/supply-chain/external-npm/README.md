# External NPM Supply-Chain Audit Index

Generated: 2026-05-23

Manifest/lockfile version inventory refreshed: 2026-08-01

Individual linked reports retain their own audit dates and evidence. A newer
version in this index does not imply that its linked report has been re-audited.

Parent: #1443

This directory tracks external npm package audit evidence for the current dependency-audit wave:

- #1444: root runtime dependencies
- #1445: optional native and peer dependencies
- #1446: root dev-tooling dependencies
- #1447: shipped nested npm manifests
- #1448: reusable template, commands, and upstream issue draft

| Package | Version | Tracking | Native/Binary/Lifecycle Surface | Status | Report |
|---|---:|---|---|---|---|
| `@modelcontextprotocol/sdk` | `1.30.0` | #1444, #1447, #1973 | no | complete | [report](modelcontextprotocol__sdk.md) |
| `chalk` | `4.1.2` | #1444 | no | complete | [report](chalk.md) |
| `chokidar` | `4.0.3` | #1444 | no | complete | [report](chokidar.md) |
| `commander` | `12.1.0` | #1444, #1447 | no | complete | [report](commander.md) |
| `glob` | `13.0.6` | #1444 | no | complete | [report](glob.md) |
| `graceful-fs` | `4.2.11` | #1444 | no | complete | [report](graceful-fs.md) |
| `js-yaml` | `4.3.0` | #1444, #1447 | no | complete | [report](js-yaml.md) |
| `listr2` | `8.3.3` | #1444 | no | complete | [report](listr2.md) |
| `ora` | `5.4.1` | #1444 | no | complete | [report](ora.md) |
| `yaml` | `2.9.0` | #1444 | no | complete | [report](yaml.md) |
| `zod` | `3.25.76` | #1444 | no | complete | [report](zod.md) |
| `@hono/node-server` | `2.0.11` | #1973 | no | complete | [report](hono__node-server.md) |
| `hnswlib-node` | `3.0.0` | #1445 | yes | complete | [report](hnswlib-node.md) |
| `hono` | `4.12.31` | #1445 | no | complete | [report](hono.md) |
| `node-pty` | `1.1.0` | #1445 | yes | complete | [report](node-pty.md) |
| `ws` | `8.21.1` | #1445 | no | complete | [report](ws.md) |
| `@xenova/transformers` | `2.17.2` | #1445 | yes | complete | [report](xenova__transformers.md) |
| `better-sqlite3` | `12.8.0` | #1445 | yes | complete | [report](better-sqlite3.md) |
| `@matric/eval-client` | `0.1.0` | #1447 | no | complete | [report](matric__eval-client.md) |
| `tsx` | `4.21.0` | #1446, #1447 | yes | complete | [report](tsx.md) |
| `typescript` | `5.9.3` | #1446, #1447 | no | complete | [report](typescript.md) |
| `@types/js-yaml` | `4.0.9` | #1446, #1447 | no | complete | [report](types__js-yaml.md) |
| `@types/node` | `22.19.2` | #1446, #1447 | no | complete | [report](types__node.md) |
| `@types/semver` | `7.7.1` | #1446 | no | complete | [report](types__semver.md) |
| `@vitest/coverage-v8` | `2.1.9` | #1446 | no | complete | [report](vitest__coverage-v8.md) |
| `@vitest/ui` | `2.1.9` | #1446 | no | complete | [report](vitest__ui.md) |
| `@xterm/headless` | `6.0.0` | #1446 | no | complete | [report](xterm__headless.md) |
| `cli-table3` | `0.6.5` | #1446 | no | complete | [report](cli-table3.md) |
| `graphology` | `0.26.0` | #1446 | no | complete | [report](graphology.md) |
| `graphology-operators` | `1.6.1` | #1446 | no | complete | [report](graphology-operators.md) |
| `graphology-shortest-path` | `2.1.0` | #1446 | no | complete | [report](graphology-shortest-path.md) |
| `graphology-traversal` | `0.3.1` | #1446 | no | complete | [report](graphology-traversal.md) |
| `graphology-types` | `0.24.8` | #1446 | no | complete | [report](graphology-types.md) |
| `simple-statistics` | `7.8.8` | #1446 | no | complete | [report](simple-statistics.md) |
| `vitest` | `2.1.9` | #1446 | no | complete | [report](vitest.md) |

## Evidence Utilities

- Per-package report template: [_template.md](_template.md)
- Standard audit commands: [_commands.md](_commands.md)
- Upstream issue/PR draft template: [_upstream-issue-template.md](_upstream-issue-template.md)

## Shared Verification

- Lockfile and manifest evidence came from `package.json`, `package-lock.json`, `agentic/code/addons/droid-bridge/package-lock.json`, and `tools/eval/package-lock.json`.
- Registry evidence came from `npm view <pkg>@<version> ... --json` on 2026-05-23.
- Commands in [_commands.md](_commands.md) avoid running untrusted lifecycle scripts during metadata inspection.
- Provenance expectation: every report records manifest usage context, lockfile version, repository URL, audited ref or `gitHead` where exposed, lifecycle/native behavior, dependency-source findings, registry signature evidence, findings, clean checks, and follow-up routing.
