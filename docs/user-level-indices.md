# User-Level Indices

AIWG supports shared user-level index sidecars for capabilities and other
personal or organization-wide corpora. These indices live outside any project
checkout and can be queried from any AIWG workspace.

Private project memory can also live under `~/.aiwg/projects/`; see
[`user-level-project-memory.md`](./user-level-project-memory.md) for the
manifest, index, and resolution order.

## Built-In User Capability Graph

Place custom user capabilities under `~/.aiwg`:

```text
~/.aiwg/skills/<name>/SKILL.md
~/.aiwg/agents/<name>.md
~/.aiwg/commands/<name>.md
~/.aiwg/rules/<name>.md
~/.aiwg/flows/<name>.yaml
~/.aiwg/runbooks/<name>.md
~/.aiwg/frameworks/<bundle>/...
```

Build and sync the shared graph:

```bash
aiwg index build --graph user --force
aiwg index sync --graph user
```

The local graph is stored in the XDG AIWG index sidecar:

```text
$XDG_DATA_HOME/aiwg/index/user/
$XDG_DATA_HOME/aiwg/index/fortemi-core/user/
```

If `XDG_DATA_HOME` is not set, AIWG uses `~/.local/share`.

## Custom Global Graphs

Named user-level graphs can be declared in `~/.aiwg/aiwg.config`. The concise
form is `indices.user.roots`:

```json
{
  "version": "1",
  "indices": {
    "user": {
      "enabled": true,
      "roots": {
        "personal": {
          "path": "~/.aiwg/indices/personal",
          "backend": "local"
        },
        "org": {
          "path": "~/.aiwg/indices/org",
          "backend": "fortemi-core"
        }
      }
    }
  }
}
```

For lower-level graph options, use `index.graphs`:

```json
{
  "version": "1",
  "index": {
    "graphs": {
      "user-research": {
        "scanDirs": ["~/.aiwg/indices/research"],
        "extensions": [".md", ".yaml", ".json"],
        "shared": true,
        "defaultBuild": false
      }
    }
  }
}
```

`indices.user.roots` entries are explicit-build user roots and are not included
in bare `aiwg index build` unless you also declare a full `index.graphs` entry.
Full graph definitions under `index.graphs` follow the normal graph policy:
`defaultBuild` defaults to `true`, so set `"defaultBuild": false` when the graph
should be built only by name.

Then build or query the graph from any project:

```bash
aiwg index build --graph user-research
aiwg index query "retrieval notes" --graph user-research --backend local --json
```

Project-local graph definitions take precedence over broad global defaults, and
built-in graph names cannot be overridden.

## Capability Discovery Precedence

Default capability discovery and show merge sidecar caches in this order:

1. `project` — project-local `.aiwg` capabilities
2. `user` — shared `~/.aiwg` capabilities
3. `framework` — packaged AIWG framework/addon/plugin capabilities

This means a project-local skill can override a user/global skill with the same
name, and a user/global skill can override a packaged capability by name.
JSON results include provenance:

```json
{
  "provenance": {
    "graph": "user",
    "scope": "user"
  }
}
```

When reproducibility requires a single source, name the intended graph and
asset ID in the agent conversation:

```text
Find the `custom-review` asset in my user-level AIWG graph, compare it with any
project-level asset of the same ID, and tell me which source you selected
before using it.
```

## Project Opt-Out

Security-sensitive or reproducibility-sensitive projects can disable user-level
capability sidecars by default in `.aiwg/aiwg.config`:

```json
{
  "version": "1",
  "index": {
    "userIndices": {
      "enabled": false
    }
  }
}
```

Explicit `--graph user` still works for operators who intentionally select the
user graph, but default merged capability discovery/show omits it.

## Security Notes

User-level indices are local operator state. Do not rely on them for
project-reproducible builds unless the project documents that dependency.
Prefer project-local `.aiwg` capabilities for workflows that must be reviewed,
versioned, and shared with collaborators.

Fortemi Core remains a static index/search cache. It does not scan the
filesystem; AIWG builds the local graph first, then exports/syncs it. Removing
`$XDG_DATA_HOME/aiwg/index/fortemi-core/user/` clears the Fortemi user cache
without deleting the local user graph or source files.
