# Participating writing consumers

Writer sidecars are discovered as `writer-<id>` modes from project and user profile stores. They remain inactive until selected. Project definitions override user definitions, using the existing output-mode resolver and scope precedence. A sidecar and a mode file defining the same ID in one scope are rejected. When the reserved `writer-` namespace participates in a multi-voice stack, both modes must declare an explicit merge strategy; writer sidecars do not silently blend. Existing non-writer blend resolution is preserved.

```
aiwg output-mode list
aiwg output-mode enable writer-my-writer --scope project
aiwg output-mode status
aiwg output-mode disable writer-my-writer --scope project
aiwg output-mode clear --scope session
aiwg run my-script --output-mode writer-my-writer
```

Selection does not intercept provider responses. `aiwg run` delivers the selected mode descriptions through its existing environment contract; arbitrary scripts do not acquire a text transformer. A nested `aiwg run` resolves its own project/session/invocation selection. It does not treat inherited mode environment variables as authority to override that selection. JSON, tool and protocol outputs stay unchanged.

## Application API

`applyWritingConsumer(input, request)` resolves the existing mode stack and applies it only when `format: 'prose'` and an explicit `runtime.transform` callback are supplied. It delegates transformations and validation to `applyOutputModes`. Provider and consumer names are caller-supplied labels, not evidence of a hosted model call.

The returned state distinguishes selected modes, delivery to the local transform callback, retained applied modes, mandatory validated modes, and fallback. Advisory modes are not labeled validated merely because their callback returned. Unsupported consumers receive unchanged content and a usable instruction export. A returned instruction export is not proof that a provider consumed it. No automatic provider interception is claimed.

## MCP resources

- `aiwg://writer-profiles/catalog` lists scoped IDs, revisions and counts, without sample prose or author display names.
- `aiwg://writer-profiles/project/<id>` explicitly reads the project profile through its shared-export policy.
- `aiwg://writer-profiles/user/<id>` explicitly reads the user profile through the same policy, without project fallback.

Resources bind project lookup to the MCP server's detected project root. Reads omit private/unapproved samples and opaque legacy payloads. Private backup export remains an explicit local CLI/API operation. The general artifact/file tools retain their own existing access policy; these resource rules do not revoke a user's direct filesystem access.

Inventory at the implementation baseline found no voice resource registered in the current `src/mcp/server.mjs`. The earlier voice-framework addon commit `c1c9bbe0f` introduced YAML profiles and Python loading; it did not register an MCP voice resource. These resources extend the existing MCP resource mechanism while preserving the old loaders.

## Coverage boundary

The API callback is a participating transformation path. The CLI selects/inspects/exports configuration and delivers instruction data to scripts. The new MCP resources inspect/export profiles. Neither configuration delivery path proves downstream application or validation. Channel adapters and revision workflows report their own retained transformation evidence; unsupported downstream consumers keep an explicit instruction-export fallback.
