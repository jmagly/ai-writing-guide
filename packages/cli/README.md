# @aiwg/cli

Lightweight AIWG CLI for signed, versioned resources from
[`releases.aiwg.io`](https://releases.aiwg.io/).

```bash
npm install --global @aiwg/cli@next

aiwg discover "architecture evolution" \
  --resource-source web \
  --aiwg-version canary
```

## Release status

This package follows AIWG CalVer in exact lockstep with the `aiwg` package.
The current beta supports signed web-backed `discover` and `show`, exact or
channel resource selection, verified caching, and warm offline reads. The
larger `aiwg` package remains the local/full distribution while web parity is
completed for mutating commands such as `use` and `regenerate`.

Resource bundles and precomputed indices are distributed by the release host,
not as additional npm packages.
