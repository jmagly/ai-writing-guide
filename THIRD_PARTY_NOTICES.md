# Third-party notices

AIWG-authored source is distributed under the MIT license in [`LICENSE`](LICENSE). AIWG also declares runtime dependencies that retain their own licenses. This notice does not replace those licenses or change their terms.

## Fortemi Core

- Package: `@fortemi/core@2026.7.15`
- License declared by the package: `AGPL-3.0-only`
- Source: <https://github.com/Fortemi/fortemi-react/tree/5cab4ea2d3d4bb985ea0d38f8bcb1ea790b32cf7/packages/core>
- Source tag: <https://github.com/Fortemi/fortemi-react/tree/v2026.7.15/packages/core>
- Registry integrity: `sha512-49GThHQHzLFD2BbjgXB7AUznRrwtWo8MsH6IcFMhSmCKj/h+Q5j18EBpkwPHJfC5E7crp+rVzy/GcrT/PF1SXA==`

AIWG uses the `@fortemi/core/aiwg-index` and `@fortemi/core/aiwg-index-shard` entry points and selected validation/archive exports from the package root. These modules execute in the AIWG Node.js process.

## Bytecask Core

- Reviewed package: `@bytecask/core@2026.7.5`
- License declared by the package: `AGPL-3.0-only`
- Source: <https://github.com/jmagly/bytecask/tree/bef7ba9590e74f8bfcd724e65928f2f84a5667d4/packages/core>
- Source tag: <https://github.com/jmagly/bytecask/tree/v2026.7.5/packages/core>
- Registry integrity: `sha512-CsLJqmw8lNuBxRLGdRzoDdZ4/2iQlluueaiiYOR+l39NOdoG5cfDel/g71QDopRpVEHJOw7hQ3QngmWmi5IjBw==`

Fortemi declares Bytecask as a runtime dependency. The reviewed AIWG lockfile resolves version `2026.7.5`; downstream npm resolution can select a later compatible version. Inspect the installed version with:

```bash
npm ls @fortemi/core @bytecask/core
```

Each installed dependency package includes its own `LICENSE` and `package.json`. To inspect the exact source reference for a different resolved version, run `npm view @fortemi/core@<version> repository license` or `npm view @bytecask/core@<version> repository license`.

## Unified Harness Protocol schema

- Vendored file: `schemas/uhp/uhp-2026-08-11.schema.json`
- Upstream: <https://github.com/HarnessRouter/harnessrouter/blob/db78b957492766a5a5c76bc9981a9234f4546f5f/protocol/schema/uhp-2026-08-11.schema.json>
- Protocol version: `2026-08-11`
- Upstream license: Apache-2.0
- Vendored SHA-256: `c9a22b0e4752bfe407c08930dec9b4f1f6aaa862878c4e540a75274241b31c3a`

The schema is vendored unchanged to make UHP fixture and compatibility tests
offline and version-pinned. AIWG's experimental client does not imply UHP
server conformance.

## Optional network-analysis tools

The `network-analysis` addon interoperates with separately installed tools. No
Wireshark, TShark, Capinfos, or Termshark executable or source is copied into the
AIWG npm archives.

- Wireshark project tools: TShark and Capinfos
- Upstream: <https://www.wireshark.org/download.html>
- Upstream license: GNU General Public License version 2 or later
- Termshark upstream: <https://github.com/gcla/termshark>
- Termshark license: MIT

Operators install and update these programs independently. AIWG discovers only
explicit executable paths or trusted search roots and does not change host
capture permissions.

## Distribution boundary

The `aiwg` and `@aiwg/cli` npm archives do not copy Fortemi or Bytecask object code into their own tarballs. npm resolves those packages separately during installation. AIWG does, however, intentionally import Fortemi in-process at runtime, so separate archive delivery is not by itself a legal conclusion about whether execution forms a combined work.

The reviewed architecture and unresolved legal questions are recorded in [`docs/contributing/fortemi-agpl-runtime-boundary.md`](docs/contributing/fortemi-agpl-runtime-boundary.md). Operators who modify an AGPL-covered package or expose a modified version for remote network interaction should review the GNU AGPL requirements and obtain qualified legal advice for their distribution and deployment model.
