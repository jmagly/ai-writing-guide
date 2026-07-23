# @aiwg/cli

Lightweight AIWG CLI for signed, versioned resources from
[`releases.aiwg.io`](https://releases.aiwg.io/).

```bash
npm install --global @aiwg/cli

aiwg discover "architecture evolution"
aiwg show skill architecture-evolution
```

## Release status

This package follows AIWG CalVer in exact lockstep with the `aiwg` package.
It selects the signed `stable` web channel automatically when no resource
flags are supplied. Operators can still select an exact version or another
channel with `--aiwg-version`, force local resources with
`--resource-source local`, use verified caching, and perform warm offline
reads. The larger `aiwg` package remains the local/full distribution while
web parity is completed for mutating commands such as `use` and `regenerate`.

Resource bundles and precomputed indices are distributed by the release host,
not as additional npm packages.
