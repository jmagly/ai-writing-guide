<div align="center">

<a href="https://aiwg.io"><img src="https://aiwg.io/assets/badges/aiwg-hero-dark.png" alt="AIWG — multi-agent AI framework · one source of truth · 10 platforms" width="680"></a>

# @aiwg/cli

**The lightweight, web-first AIWG command line**

Use signed, versioned AIWG skills, agents, commands, rules, and framework
metadata without installing the full local resource corpus into every project.

```bash
npm install --global @aiwg/cli

aiwg discover "architecture evolution"
aiwg show skill architecture-evolution
```

[![npm version](https://img.shields.io/npm/v/%40aiwg%2Fcli/latest?label=%40aiwg%2Fcli&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/@aiwg/cli)
[![npm downloads](https://img.shields.io/npm/dm/%40aiwg%2Fcli?color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/@aiwg/cli)
[![full distribution](https://img.shields.io/npm/v/aiwg/latest?label=aiwg&color=CB3837&logo=npm&style=flat-square)](https://www.npmjs.com/package/aiwg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/jmagly/aiwg/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%E2%89%A520.0.0-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Signed Resources](https://img.shields.io/badge/resources-signed-00a67d?style=flat-square)](https://releases.aiwg.io/)

[**Quick Start**](#quick-start) · [**How It Works**](#how-it-works) · [**CLI Guide**](#cli-guide) · [**JavaScript API**](#javascript-api) · [**Security**](#security-model) · [**Troubleshooting**](#installation-troubleshooting)

</div>

---

## What This Package Is

`@aiwg/cli` is the executable AIWG runtime without the bundled framework
corpus. It is designed for operators, automation, and web-connected agentic
systems that need to find and read AIWG resources without copying a large npm
package or deploying framework files into every project.

The package includes:

- the `aiwg` executable;
- the supported JavaScript API used by the executable;
- signed web-release verification and cache logic;
- the Fortemi Core query runtime;
- provider capability and model metadata required by the CLI;
- command routing, configuration, and runtime support code.

The package does **not** include:

- the full `agentic/code` framework corpus;
- local framework templates and generated documentation;
- precomputed project deployments;
- Cockpit, which remains the separate `@aiwg/cockpit` package;
- a project `.aiwg` directory.

After installation, ordinary `discover` and `show` calls automatically use the
signed `stable` resource channel at
[`releases.aiwg.io`](https://releases.aiwg.io/). No source flag, project
initialization, or framework deployment is required.

## Choose the Right AIWG Distribution

AIWG publishes three packages in exact CalVer lockstep:

| Package | Best for | Resource model | Install |
|---|---|---|---|
| `@aiwg/cli` | Web-connected agents, CI, lightweight global use, read-only discovery | Signed release host by default | `npm i -g @aiwg/cli` |
| `aiwg` | Full local operation, framework deployment, authoring, offline-first projects | Bundled local corpus by default; web mode optional | `npm i -g aiwg` |
| `@aiwg/cockpit` | Optional local control plane and operator UI | Installed separately or through the full CLI | `npm i -g @aiwg/cockpit` |

Choose `@aiwg/cli` when you primarily need to search, inspect, route, or consume
AIWG resources. Choose `aiwg` when you need to deploy frameworks into provider
directories, author against the complete source corpus, or operate without a
previously warmed web cache.

Both CLI packages expose the same `aiwg` executable name. Install one globally
at a time unless you deliberately manage separate npm prefixes.

## Quick Start

### Install

```bash
npm install --global @aiwg/cli
aiwg --version
```

AIWG uses npm-compatible Calendar Versioning:

```text
YYYY.M.PATCH
```

The lightweight package version always matches the corresponding full `aiwg`
release exactly.

### Find a capability

```bash
aiwg discover "architecture evolution"
```

Discovery searches the precomputed Fortemi Core index published with the signed
AIWG release. Results may include skills, agents, commands, rules, flows,
templates, and supporting documentation.

Use structured output for scripts or agent tooling:

```bash
aiwg discover "release publication verification" \
  --format json \
  --pretty
```

Limit or filter results:

```bash
aiwg discover "incident response timeline" \
  --type skill,agent \
  --limit 5 \
  --format json
```

### Read a resource

Take the type and name from discovery, then fetch the full verified body:

```bash
aiwg show skill architecture-evolution
```

Other examples:

```bash
aiwg show agent architecture-designer
aiwg show command issue-audit
aiwg show rule ci-green-before-done
```

The downloaded body is verified against the signed release manifest before it
is returned or stored in the cache.

### Pin a release for one call

```bash
aiwg discover "deployment rollback" --aiwg-version 2026.7.19
aiwg show skill flow-deploy-to-production --aiwg-version 2026.7.19
```

An exact version does not follow later channel updates. This is useful for
reproducible automation, audits, and long-running agent sessions.

### Warm the cache, then work offline

```bash
# Online: verifies and caches signed metadata, index, and the selected body.
aiwg discover "architecture evolution"
aiwg show skill architecture-evolution

# Offline: performs no network fetch and fails closed if required bytes are absent.
aiwg discover "architecture evolution" --offline
aiwg show skill architecture-evolution --offline
```

Offline mode is intentionally strict. It never treats an incomplete or corrupt
cache as trusted data.

## How It Works

```text
operator or agent
       |
       | aiwg discover / aiwg show
       v
@aiwg/cli command router
       |
       | signed channel manifest
       v
releases.aiwg.io/resources/channels/stable.json
       |
       | immutable release manifest + detached Ed25519 signature
       v
releases.aiwg.io/resources/<version>/
       |
       +-- precomputed Fortemi Core search index
       +-- immutable raw resource files
       +-- linked discovery pages and manifests
       |
       v
verified local cache
```

The first request for a release normally downloads:

1. the signed channel metadata;
2. the immutable release manifest and signature;
3. the precomputed Fortemi Core index and its committed metadata;
4. requested raw resource bodies as `show` needs them.

Every release descriptor includes a byte size and SHA-256 digest. Channel and
release metadata are verified with the public key embedded in the package.
Channel sequence checks reject rollback and same-sequence equivocation. Raw
files are accepted only when they match a descriptor committed by the verified
manifest.

The cache is a performance and offline facility, not a substitute trust root.
Cached generations are revalidated before use.

## Why Web-First

Traditional AIWG installations carry the complete corpus so deployment and
local authoring work anywhere. That remains valuable, but it is unnecessary
for many agent sessions.

The lightweight model provides:

- **smaller distribution footprint** — executable runtime rather than the full
  framework tree;
- **no project deployment requirement** — discovery works in an empty
  directory;
- **version selection per call** — use stable, another signed channel, or an
  exact CalVer release;
- **consistent search behavior** — the CLI downloads the precomputed index and
  queries it through Fortemi Core;
- **browser and chat interoperability** — the same release tree also exposes
  linked discovery pages for web-connected agents that cannot run the CLI;
- **verified caching** — warm reads remain available offline without accepting
  uncommitted bytes.

This is not a hosted command-execution service. Search and resource delivery
move to the web; project mutation and provider deployment remain local
operations.

## CLI Guide

### `aiwg discover`

Find resources by intent rather than filename:

```bash
aiwg discover "<phrase>" [options]
```

Common options:

| Option | Meaning |
|---|---|
| `--type <kinds>` | Comma-separated result types such as `skill,agent,command,rule` |
| `--limit <n>` | Maximum number of results |
| `--format json\|text` | Machine-readable or human-readable output |
| `--json` | JSON output shorthand |
| `--pretty` / `--compact` | JSON presentation |
| `--resource-source local\|web\|auto` | Override package-aware source selection |
| `--aiwg-version <selector>` | Signed channel name or exact CalVer |
| `--offline` | Read only previously verified cache content |
| `--backend fortemi-core` | Explicitly select the web-compatible query backend |

Examples:

```bash
aiwg discover "requirements review"
aiwg discover "forensics evidence preservation" --type skill,agent
aiwg discover "marketing campaign intake" --limit 3 --json --pretty
aiwg discover "release flow" --aiwg-version stable
aiwg discover "release flow" --aiwg-version 2026.7.19
```

### `aiwg show`

Stream the full body of a discovered resource:

```bash
aiwg show <type> <name> [options]
```

Examples:

```bash
aiwg show skill release-publication-verify
aiwg show agent security-architect
aiwg show command address-issues
aiwg show rule delivery-policy
```

When names are ambiguous, use the stable identifier or exact path returned by
JSON discovery:

```bash
result=$(aiwg discover "deployment" --json --compact)
echo "$result"
aiwg show skill flow-deploy-to-production --json
```

`show` will not fetch arbitrary URLs or filesystem paths in web mode. It can
read only immutable `raw/` resources committed by the verified release
manifest.

### Resource source behavior

The default depends on the installed package:

| Installed package | Default source |
|---|---|
| `@aiwg/cli` | `web` |
| `aiwg` | `local` |

Override the default for one command:

```bash
aiwg discover "architecture" --resource-source web
aiwg discover "architecture" --resource-source local
aiwg discover "architecture" --resource-source auto
```

`auto` may use available project and package context. Use an explicit source
when reproducibility matters.

Because `@aiwg/cli` intentionally contains no corpus, forcing `local` requires
an independently configured local AIWG root. If none exists, use web mode or
install the full `aiwg` package.

### Version and channel selection

Selectors accept:

- a signed channel, such as `stable` or `canary`;
- an exact npm-compatible AIWG CalVer, such as `2026.7.19`.

```bash
aiwg discover "test strategy" --aiwg-version stable
aiwg discover "test strategy" --aiwg-version 2026.7.19
```

Channel metadata is signed and sequence-numbered. The CLI rejects a channel
sequence lower than the last verified sequence and rejects conflicting content
for an already-seen sequence.

### Help, version, and diagnostics

```bash
aiwg help
aiwg --version
aiwg version
aiwg doctor
aiwg runtime-info
```

The package contains the shared CLI runtime, so help lists the broader AIWG
command surface. Commands that require the local framework corpus, templates,
or deployment source files are not made web-capable merely by installing the
lightweight package. See [Current Scope](#current-scope-and-limitations).

## Search and Output

### Human-readable use

```bash
aiwg discover "risk management"
```

The text format is suited to interactive shell use. It shows ranked candidates
and enough identity information to make the next `show` call.

### JSON use

```bash
aiwg discover "risk management" --format json --pretty
```

JSON output includes query metadata, resolved source, selected release, and
ranked results. Treat additive fields as forward-compatible. Scripts should
select the fields they need instead of comparing complete serialized output.

Example with `jq`:

```bash
aiwg discover "risk management" --json --compact \
  | jq '.results[] | {type, name, path, score}'
```

Fetch the first discovered skill:

```bash
name=$(
  aiwg discover "risk management" --type skill --json --compact \
    | jq -r '.results[0].name'
)
aiwg show skill "$name"
```

### Exit behavior

The CLI exits nonzero for invalid selectors, unavailable cold offline data,
signature failures, digest mismatches, unsafe resource paths, unsupported
source/backend combinations, and ordinary command errors. Automation should
check the exit code before consuming output.

## JavaScript API

`@aiwg/cli` exports the supported command router and signed resource helpers.
Do not import private `dist/` paths.

### Run CLI commands in process

```js
import { run } from '@aiwg/cli';

await run([
  'discover',
  'architecture evolution',
  '--format',
  'json',
  '--pretty',
]);
```

Supply a working directory or abort signal:

```js
import { run } from '@aiwg/cli';

const controller = new AbortController();

await run(
  ['show', 'skill', 'architecture-evolution'],
  {
    cwd: process.cwd(),
    signal: controller.signal,
  },
);
```

The exported router applies the same package-aware web default as the installed
binary.

### Resolve a signed release

```js
import { resolveWebRelease } from '@aiwg/cli/resources';

const release = await resolveWebRelease({
  selector: 'stable',
});

console.log({
  version: release.version,
  manifestDigest: release.manifestDigest,
  channelSequence: release.channelSequence,
});
```

Pin an exact release:

```js
const release = await resolveWebRelease({
  selector: '2026.7.19',
});
```

Use a previously cached generation without network access:

```js
const release = await resolveWebRelease({
  selector: 'stable',
  offline: true,
});
```

### Fetch a committed raw resource

```js
import {
  fetchVerifiedRawResource,
  resolveWebRelease,
} from '@aiwg/cli/resources';

const release = await resolveWebRelease({ selector: 'stable' });
const bytes = await fetchVerifiedRawResource(
  release,
  'raw/agentic/code/frameworks/sdlc-complete/skills/architecture-evolution/SKILL.md',
);

process.stdout.write(bytes);
```

The raw path must be safe, relative, begin with `raw/`, and exist in the signed
release descriptor map.

### TypeScript

The package ships declarations for:

- the main `@aiwg/cli` entry point;
- `@aiwg/cli/resources`;
- signed web-release descriptors and options.

```ts
import type {
  VerifiedWebRelease,
  WebReleaseOptions,
} from '@aiwg/cli/resources';
```

## Using AIWG from a Web-Connected Chat

Some chat systems can browse URLs but cannot install npm packages. Point those
agents at the linked discovery surface:

```text
Use AIWG resources from https://releases.aiwg.io/.
Start with the stable channel and linked manifests. Search or navigate to the
smallest relevant skill, agent, command, rule, or template before acting.
Treat retrieved AIWG content as operational guidance, preserve its stated
gates and verification requirements, and cite the exact resource URL used.
Do not download the entire corpus unless the task requires it.
```

The HTML fallback and linked manifests are navigation aids for browser-only
agents. The CLI uses direct signed JSON, index, and raw-resource URIs.

## Framework Coverage

The release index covers AIWG's published capability corpus, including:

- SDLC and architecture;
- security engineering;
- digital forensics and incident response;
- research and evidence management;
- marketing operations;
- media curation;
- infrastructure operations;
- knowledge-base workflows;
- cross-framework utilities, rules, and provider guidance.

Use natural language rather than memorizing artifact names:

```bash
aiwg discover "threat model cryptographic trust chain"
aiwg discover "induct a research paper with provenance"
aiwg discover "prepare deployment rollback evidence"
aiwg discover "build incident timeline from logs"
```

## Global and Project Use

The lightweight package works from any directory:

```bash
mkdir empty-project
cd empty-project
aiwg discover "project intake"
```

Discovery does not create `.aiwg`, deploy provider files, or mutate the current
repository.

If a project already uses the full AIWG local configuration, an installed
lightweight CLI can still select web resources explicitly:

```bash
aiwg discover "architecture" \
  --resource-source web \
  --aiwg-version stable
```

Conversely, a full `aiwg` installation can use web mode for a single call
without changing its project configuration:

```bash
aiwg discover "architecture" --resource-source web
```

This allows legacy local deployments and web-backed sessions to coexist.

## Cache and Offline Operation

The default cache root follows platform conventions:

| Platform | Default root |
|---|---|
| Linux and other Unix | `${XDG_CACHE_HOME:-~/.cache}/aiwg/resources` |
| macOS | `~/Library/Caches/aiwg/resources` |
| Windows | `%LOCALAPPDATA%\\aiwg\\resources` |

The cache contains signed metadata, immutable release generations, precomputed
indices, and fetched raw bodies. It contains no npm publishing credential and
does not require project-local state.

Operational properties:

- release generations are content-addressed;
- writes are staged before publication;
- regular-file and directory checks reject unsafe cache entries;
- digest verification occurs before bytes are returned;
- corrupt cache content fails closed in offline mode;
- online mode may recover by fetching and verifying fresh immutable bytes.

To use a custom cache location:

```bash
export AIWG_RESOURCE_CACHE_ROOT=/var/cache/aiwg/resources
aiwg discover "architecture evolution"
```

For shared CI caches, preserve filesystem ownership and do not allow
untrusted jobs to write into a cache consumed by privileged jobs.

## Configuration

Most users need no configuration. The defaults are:

```text
resource source: web
release selector: stable
release origin:  https://releases.aiwg.io
query backend:   fortemi-core
```

Command-line flags are the preferred way to make per-call choices.

Advanced environment settings:

| Variable | Purpose |
|---|---|
| `AIWG_RESOURCE_BASE_URL` | Override the clean HTTPS release origin |
| `AIWG_RESOURCE_CACHE_ROOT` | Override cache location |
| `AIWG_RESOURCE_TRUST_ROOT_FILE` | Load a nonempty public PEM trust root |
| `XDG_CACHE_HOME` | Standard cache root override |
| `AIWG_LOG_LEVEL` | CLI logging level |
| `NO_UPDATE_NOTIFIER` | Disable update notices in automation |

`AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP=1` is a test/development escape
hatch. Insecure HTTP remains restricted to loopback. Production release origins
must use HTTPS.

Do not point the CLI at an arbitrary resource server and assume it is trusted.
A custom server must publish manifests and signatures compatible with the
configured public trust root.

## Security Model

The web distribution is designed to fail closed.

### Signed channels

Mutable channel names resolve through detached Ed25519 signatures and monotonic
sequence numbers. The CLI rejects:

- invalid signatures;
- sequence rollback;
- conflicting data for an already observed sequence;
- channel metadata bound to another release manifest.

### Immutable releases

Each release has a signed manifest that commits to every supported resource by
path, size, and SHA-256 digest. Exact-version selection avoids mutable channel
movement entirely.

### Raw resources

`show` fetches only safe relative paths under `raw/` that are present in the
verified manifest. Arbitrary URL fetches, path traversal, absolute paths, and
uncommitted files are rejected.

### Network policy

- HTTPS is mandatory for production origins.
- Redirects are rejected for signed resource fetches.
- Metadata, indices, signatures, and raw resources have fixed size limits.
- Requests have a finite timeout.
- Offline mode performs no network recovery.

### npm supply chain

AIWG publishes `@aiwg/cli` from GitHub Actions using npm trusted publishing and
OIDC provenance. Inspect the current release:

```bash
npm view @aiwg/cli@latest dist.attestations --json
npm view @aiwg/cli@latest dist.integrity
```

Versions are CalVer-locked to the full `aiwg` package and release workflows
verify that the package metadata, executable, declarations, license, and README
are present.

Consumer verification guidance:

- [Release verification](https://github.com/jmagly/aiwg/blob/main/docs/releases/verifying.md)
- [Supply-chain overview](https://github.com/jmagly/aiwg/blob/main/docs/security/supply-chain-overview.md)
- [Security policy](https://github.com/jmagly/aiwg/blob/main/SECURITY.md)

## Current Scope and Limitations

The lightweight package provides production web parity for:

- `aiwg discover`;
- `aiwg show`;
- the corresponding supported JavaScript API;
- signed release selection, verification, caching, and offline reads.

The package ships the shared command runtime, so `aiwg help` exposes commands
also used by the full distribution. Commands that need the local corpus or
project templates—including framework deployment and regeneration workflows—
are not automatically converted into remote mutation operations.

For these workflows, install the full package:

```bash
npm uninstall --global @aiwg/cli
npm install --global aiwg

aiwg use sdlc
aiwg regenerate
```

Web mode is intentionally a resource transport and discovery abstraction. It
does not grant a remote service permission to modify your project.

## Common Recipes

### Discover and fetch the best matching skill

```bash
query="deploy production with rollback gates"
name=$(
  aiwg discover "$query" --type skill --limit 1 --json --compact \
    | jq -r '.results[0].name'
)
aiwg show skill "$name"
```

### Pin an automation job

```bash
AIWG_VERSION=2026.7.19

aiwg discover "release verification" \
  --aiwg-version "$AIWG_VERSION" \
  --format json \
  --compact
```

### Prewarm CI for offline execution

```bash
export AIWG_RESOURCE_CACHE_ROOT="$PWD/.cache/aiwg/resources"

aiwg discover "security review" --aiwg-version 2026.7.19
aiwg show skill security-gate --aiwg-version 2026.7.19

# A later network-isolated step:
aiwg discover "security review" --aiwg-version 2026.7.19 --offline
```

### Compare stable with an exact release

```bash
aiwg discover "architecture evolution" \
  --aiwg-version stable \
  --json --pretty > stable.json

aiwg discover "architecture evolution" \
  --aiwg-version 2026.7.19 \
  --json --pretty > pinned.json

diff -u pinned.json stable.json
```

### Use the lightweight API in a Node script

```js
import { run } from '@aiwg/cli';

await run([
  'discover',
  'incident evidence preservation',
  '--type',
  'skill,agent',
  '--limit',
  '5',
  '--json',
  '--pretty',
]);
```

## Installation Troubleshooting

### Requirements

- Node.js 20 or newer;
- npm or another package manager capable of installing npm packages;
- HTTPS access to npmjs.org for installation;
- HTTPS access to `releases.aiwg.io` for cold web-resource reads.

Confirm versions:

```bash
node --version
npm --version
```

### `aiwg` command not found

Check the npm global prefix:

```bash
npm config get prefix
which aiwg
```

Add the prefix's `bin` directory to your shell `PATH`, or use:

```bash
npx --package @aiwg/cli aiwg --version
```

### npm `EACCES`

Do not default to `sudo npm install -g`. Prefer a user-owned Node installation
through a version manager, or configure a user-owned npm prefix:

```bash
npm config set prefix ~/.local
export PATH="$HOME/.local/bin:$PATH"
npm install --global @aiwg/cli
```

Persist the `PATH` update in the shell startup file appropriate for your
system.

### First discovery is slower than later calls

A cold install downloads and verifies release metadata plus the precomputed
Fortemi index. Later calls use the verified cache. The request remains bounded
by a finite timeout.

If a first request fails:

```bash
curl -I https://releases.aiwg.io/
aiwg discover "architecture evolution" --aiwg-version stable
```

Check proxy, DNS, TLS interception, and firewall policy. Do not disable
signature verification to work around a network problem.

### Cold offline failure

This is expected:

```text
AIWG resource channel stable is not cached; offline mode cannot fetch it
```

Run the command once online without `--offline`, then repeat offline.

### Corrupt cache failure

Offline mode refuses corrupt data. Reconnect and rerun the command online so
the CLI can fetch a fresh, verified immutable generation. If diagnosing the
cache manually, preserve it first when the failure may indicate filesystem
tampering.

### Local source not found

`@aiwg/cli` does not ship the local corpus. Remove
`--resource-source local`, select `web`, configure a legitimate local AIWG
root, or install the full `aiwg` package.

### Web backend error

Web discovery requires the Fortemi Core backend:

```bash
aiwg discover "architecture" \
  --resource-source web \
  --backend fortemi-core
```

The local backend remains available only with local resources.

### Wrong package is providing `aiwg`

```bash
which aiwg
npm list --global --depth=0 | grep aiwg
aiwg --version
```

If both `aiwg` and `@aiwg/cli` were installed into the same prefix, the most
recent install owns the shared executable link. Remove both, then install the
distribution you intend to use.

## Migrating Between Distributions

From full AIWG to the lightweight package:

```bash
npm uninstall --global aiwg
npm install --global @aiwg/cli
aiwg discover "architecture evolution"
```

Existing project files are not removed. The new executable defaults discovery
to web resources.

From the lightweight package to full AIWG:

```bash
npm uninstall --global @aiwg/cli
npm install --global aiwg
aiwg doctor
```

The full package defaults to its bundled local corpus. You can still request
web resources per call:

```bash
aiwg discover "architecture evolution" --resource-source web
```

## Versioning and Releases

`@aiwg/cli` follows the exact version of the main AIWG release:

```text
aiwg@2026.7.19
@aiwg/cli@2026.7.19
@aiwg/cockpit@2026.7.19
```

Stable releases use npm's `latest` tag. Pre-release channels may use `next` or
another documented release tag. Historical package versions remain
installable by exact CalVer:

```bash
npm install --global @aiwg/cli@2026.7.19
```

The npm package version and selected resource version are separate choices:

```bash
# Install a known CLI runtime.
npm install --global @aiwg/cli@2026.7.19

# Select signed resources for one command.
aiwg discover "architecture" --aiwg-version 2026.7.19
```

Compatibility metadata in newer signed manifests allows the CLI to fail
clearly when a resource release is known to be incompatible with the installed
runtime.

Release surfaces:

- [npm package](https://www.npmjs.com/package/@aiwg/cli)
- [GitHub releases](https://github.com/jmagly/aiwg/releases)
- [signed resource host](https://releases.aiwg.io/)
- [release announcements](https://github.com/jmagly/aiwg/tree/main/docs/releases)

## Development

`@aiwg/cli` is built from the main AIWG repository. It is not maintained as an
independent source fork.

```bash
git clone https://github.com/jmagly/aiwg.git
cd aiwg
npm ci
npm run build:cli
npm run package:cli
```

The staged package is written to:

```text
dist/packages/cli/
```

Inspect the exact tarball:

```bash
npm pack ./dist/packages/cli --dry-run
```

Relevant validation:

```bash
npm run check:versions
npm run build:cli
npm run package:cli
npx vitest run --config config/vitest.config.js \
  test/integration/cli-package-webmode.test.ts
```

Package invariants include:

- CalVer lockstep with `aiwg`;
- runtime dependency lockstep with `aiwg`;
- no bundled `agentic/`, `docs/`, templates, tools, or application trees;
- executable, license, API declarations, provider metadata, and this dedicated
  README present in the tarball;
- configuration-free signed web discovery and `show`;
- warm offline behavior;
- bounded package size.

## Documentation

- [AIWG project README](https://github.com/jmagly/aiwg#readme)
- [Web-backed resources guide](https://github.com/jmagly/aiwg/blob/main/docs/install/web-backed-resources.md)
- [CLI reference](https://github.com/jmagly/aiwg/blob/main/docs/cli-reference.md)
- [Release verification](https://github.com/jmagly/aiwg/blob/main/docs/releases/verifying.md)
- [Supply-chain overview](https://github.com/jmagly/aiwg/blob/main/docs/security/supply-chain-overview.md)
- [Agentic install runbook](https://github.com/jmagly/aiwg/blob/main/docs/agentic-install-runbook.md)

## Community and Support

- [GitHub issues](https://github.com/jmagly/aiwg/issues)
- [Discussions](https://github.com/jmagly/aiwg/discussions)
- [Discord](https://discord.gg/BuAusFMxdA)
- [Telegram](https://t.me/+oJg9w2lE6A5lOGFh)
- [AIWG website](https://aiwg.io)

For a security vulnerability, follow
[`SECURITY.md`](https://github.com/jmagly/aiwg/blob/main/SECURITY.md) rather than
opening a public issue.

## License

MIT. See the
[AIWG license](https://github.com/jmagly/aiwg/blob/main/LICENSE).

The package includes its own copy of `LICENSE` in every published tarball.
