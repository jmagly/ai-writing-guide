# Signed Web Resources

AIWG agents and automation can resolve versioned assets from the signed release
service when the local package does not contain the requested resource. Normal
users do not need to select resource channels or run lookup commands.

Ask your agent:

```text
Use AIWG's signed web resources for this task. Resolve an appropriate released
version, verify its manifest and asset digest before loading it, and report the
version and stable asset ID you used.
```

If you already know the asset, include its stable ID:

```text
Load AIWG asset `architecture-evolution` from a verified signed release, then
use it for this project. Tell me which release and digest were verified.
```

For installation and provider setup, follow
[Install, Connect, and Verify](../getting-started/install-connect-verify.md).
Agents, scripts, and advanced operators can use the
[web-resource CLI contract](https://github.com/jmagly/aiwg/blob/main/docs/cli/web-backed-resources.md) for exact selectors,
offline behavior, authentication, and structured output.
