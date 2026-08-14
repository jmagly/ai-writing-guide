---
title: npm package budget review — August 2026
audience: maintainer
status: accepted
issue: 2084
---

# npm package budget review — August 2026

## Decision

Keep the complete local corpus, local documentation, compiled CLI, and runtime
tools in the `aiwg` package. Exclude `docs/.public/` because it is a generated
documentation-site staging tree, not an input to local AIWG execution or
offline discovery.

Retain the 23,000 KB packed-size limit. Set the file-count limit to 5,500 so it
measures unexpected proliferation without forcing removal of inspectable local
capabilities. The post-cleanup package contains 5,412 files, leaving 88 files
of headroom (1.60%).

## Measurements

Measured with `npm pack --dry-run --json` from `aiwg@2026.8.8` source.

| Metric | Before | After | Budget | Change |
| --- | ---: | ---: | ---: | ---: |
| Packed size | 24,751.9 KB | 13,668.4 KB | 23,000 KB | -11,083.5 KB (-44.78%) |
| Unpacked size | 65.23 MB | 54.35 MB | 68.36 MB | -10.88 MB (-16.68%) |
| File count | 5,421 | 5,412 | 5,500 | -9 (-0.17%) |

## Capability inventory

The original file count was dominated by capability-bearing content, not
temporary build output:

| Package area | Files | Unpacked size | Purpose |
| --- | ---: | ---: | --- |
| `agentic/` | 3,900 | 26.63 MB | Offline frameworks, addons, plugins, agents, skills, flows, and templates |
| `docs/` | 710 | 18.60 MB | Local references used by `@$AIWG_ROOT/docs/...` links, including research and operator guidance |
| `dist/` | 549 | 5.69 MB | Compiled CLI and library modules |
| `tools/` | 219 | 2.72 MB | Runtime deployment, provider, daemon, and orchestration tools |

Deleting enough of these files to meet the former 5,000-file limit would break
documented local references or remove shipped capabilities. Bundling them into
an opaque archive would also make the corpus less inspectable. The reviewed
5,500 limit preserves those properties while retaining a narrow regression
margin.

## Excluded staging output

`docs/.public/` contained 10 generated site assets totaling 10.89 MB unpacked,
including blog hero images between 1.3 MB and 1.8 MB each. The site deployment
continues to build and publish this tracked tree from the repository. It is not
needed in an installed npm package, and no runtime path reads it.

No framework, addon, plugin, provider, local documentation source, prebuilt
Fortemi index, or web-backed replacement was removed.

## Verification

Run:

```bash
npm run check:budgets
npm run lint:tarball
npm run lint:package-license-boundary
```

Packed-install, provider-deployment, and corpus-discovery tests remain the
capability gates for release publication.
