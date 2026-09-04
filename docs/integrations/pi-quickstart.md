# Connect AIWG to Pi Coding Agent

For the complete first-time journey, start with
[Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Pi support is experimental. AIWG uses Pi's native prompt templates and Agent
Skills without adding an executable extension.

## Install and deploy

Install Pi and AIWG, then deploy from the project root:

```bash
npm install -g @mariozechner/pi-coding-agent
npm install -g aiwg
aiwg use all --provider pi
```

Restart Pi in the project and ask it to run `aiwg-regenerate`. Verify the
integration with:

```bash
aiwg doctor --provider pi
aiwg steward capabilities --provider pi
```

## Created resources

| Resource | Location | Purpose |
|---|---|---|
| Project context | `AGENTS.md` | Directs Pi to `WORKSPACE.md` and `AIWG.md` |
| Portable skills and roles | `.agents/skills/*/SKILL.md` | Pi's cross-agent Agent Skills surface |
| AIWG standard skills | `.pi/.aiwg/skills/` | Receipted AIWG-managed skill projection |
| Prompt templates | `.pi/prompts/*.md` | User-facing AIWG commands |

Pi searches `.pi/skills/` and `.agents/skills/` from the current directory up
to the repository root. Prompt templates are direct children of
`.pi/prompts/`; AIWG flattens command names where necessary to preserve Pi's
non-recursive prompt discovery.

## User scope

For user-level resources, Pi defaults to `~/.pi/agent`. If
`PI_CODING_AGENT_DIR` is set, both Pi and AIWG use that directory instead.
Preview either deployment without writes:

```bash
aiwg use all --provider pi --dry-run
aiwg use all --provider pi --global --dry-run
```

AIWG preserves user-authored Pi resources and trust decisions. It only owns
files recorded in its deployment receipts.

For exact paths, limitations, and recovery steps, see the
[Pi operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/pi.md).
