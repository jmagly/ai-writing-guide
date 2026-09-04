---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.pi
---

# Pi Coding Agent Operational Reference

Pi support is experimental and resource-first. AIWG projects context, Agent
Skills, and prompt templates onto Pi's native discovery surfaces. It does not
install executable Pi extensions in this milestone.

## Install and deploy

```bash
npm install -g @mariozechner/pi-coding-agent
npm install -g aiwg
cd /path/to/project
aiwg use all --provider pi
```

Run Pi from the project root, then invoke the generated `aiwg-regenerate`
prompt or ask Pi to regenerate AIWG context.

## Deployment contract

| AIWG artifact | Pi path | Support |
|---|---|---|
| Context | `AGENTS.md` | Native startup context |
| Agent roles | `.agents/skills/*/SKILL.md` | Agent Skills projection |
| Kernel skills | `.agents/skills/*/SKILL.md` | Cross-agent native discovery |
| Standard skills | `.pi/.aiwg/skills/*/SKILL.md` | AIWG-managed Pi skill projection |
| Commands | `.pi/prompts/*.md` | Native prompt templates |
| Rules | `AGENTS.md` managed section | Aggregated context; no standalone rule directory |
| Behaviors | — | Unsupported; `.pi/extensions/` is reserved for future executable integration |

At user scope, the Pi resource root is
`${PI_CODING_AGENT_DIR:-~/.pi/agent}`. Project deployment remains rooted in
the selected project. Setting `PI_CODING_AGENT_DIR` changes configuration
location; it is not treated as proof that a Pi session is active.

## Capability boundaries

- No built-in MCP surface is assumed.
- No built-in subagent, task, cron, structured-question, or resident-daemon
  feature is advertised.
- AIWG Mission Control can coordinate work externally where configured.
- Static AIWG commands become prompt templates; runtime behavior is not
  fabricated when Pi lacks a native capability.

Inspect the authoritative capability record with:

```bash
aiwg steward capabilities --provider pi
```

## Diagnostics and recovery

```bash
pi --version
aiwg doctor --provider pi
aiwg use all --provider pi --dry-run
aiwg use all --provider pi --force
```

If prompts are missing, confirm they are direct children of `.pi/prompts/`.
If skills are missing, start Pi within the repository and verify
`.agents/skills/*/SKILL.md`. For relocated user resources, verify that the same
`PI_CODING_AGENT_DIR` is present in both the deployment shell and the Pi
process.
