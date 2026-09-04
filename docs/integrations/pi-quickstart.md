# Connect AIWG to Pi Coding Agent

> Upstream baseline: Pi Coding Agent 0.85.0, commit
> [`47236c84450656043dd8fb21c8513d1421505ae3`](https://github.com/earendil-works/pi/commit/47236c84450656043dd8fb21c8513d1421505ae3),
> verified 2026-09-04.

Pi is an experimental AIWG deployment provider. AIWG installs declarative
context, skills, prompt templates, and a reviewed trust-gated policy extension;
it does not install Pi packages or credentials. Start with [Install, Connect, and
Verify](../getting-started/install-connect-verify.md) for the general AIWG
setup journey.

## Install, preview, and deploy

Pi 0.85.0 requires Node.js 22.19 or newer and is published as
[`@earendil-works/pi-coding-agent`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json).

```bash
npm install -g @earendil-works/pi-coding-agent
npm install -g aiwg
cd /path/to/project

aiwg use all --provider pi --dry-run
aiwg use all --provider pi
```

Here, AIWG's `--provider pi` selects the **coding-agent integration**. It is
not Pi's own `--provider` option, which selects an LLM backend such as
OpenRouter. Pi documents its model flags in the [coding-agent
README](https://github.com/earendil-works/pi/tree/main/packages/coding-agent#providers--models).

## Trust and verification

Project-local settings, extensions, skills, and prompts are trust-gated;
context files such as `AGENTS.md` load independently of that decision. In
interactive Pi, run `/trust` and restart after approving the project.
Non-interactive modes do not show the trust dialog, so every automated
invocation must choose explicitly between `--approve` and `--no-approve`;
see Pi's [project trust
documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#project-trust).

```bash
pi
# In Pi: /trust, approve, then restart

aiwg doctor --provider pi
aiwg steward capabilities --provider pi
```

For a bounded, non-interactive check that loads trusted project resources:

```bash
PI_CODING_AGENT_SESSION_DIR="$(mktemp -d)" \
  pi --approve --mode json -p "List the AIWG skills available in this project"
```

This may call the selected model and consume tokens. Use `--no-approve` when
testing without project-local resources.

## Installed resources

| Resource | Location | Purpose |
|---|---|---|
| Project context | `AGENTS.md` | Directs Pi to `WORKSPACE.md` and `AIWG.md` |
| Portable skills and roles | `.agents/skills/*/SKILL.md` | Pi's shared Agent Skills surface |
| AIWG-managed skills | `.pi/.aiwg/skills/` | Receipted AIWG projection |
| Prompt templates | `.pi/prompts/*.md` | User-facing AIWG commands |
| Policy bridge | `.pi/extensions/aiwg-bridge.ts` | Fail-closed headless command policy |

Pi discovers project skills in `.pi/skills/` and `.agents/skills/`, as
documented in [Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md).
Prompt templates live in `.pi/prompts/`; AIWG flattens generated prompt names
because Pi's [prompt-template
discovery](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md)
is non-recursive.

## Refresh and remove

```bash
aiwg refresh --provider pi --dry-run
aiwg refresh --provider pi
aiwg list
aiwg remove <installed-framework-or-addon> --dry-run
aiwg remove <installed-framework-or-addon>
```

`aiwg remove` operates on an installed framework or addon, not on a provider
alone. Repeat it for each installed item you intend to remove. AIWG only removes
receipted files and preserves operator-owned `.pi/settings.json`, prompts,
skills, extensions, packages, sessions, and Pi's trust decisions.

For user scope, session handling, OpenRouter examples, limitations, and
troubleshooting, see the [Pi operational
reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/pi.md).

External Ralph can launch Pi with `--provider pi`; pass a Pi-native
`provider/model` identifier using `--model`, and optionally `--thinking` and
`--tools`. Session ingestion supports authorized Pi v3 JSONL roots; see
[Pi session acquisition](../providers/pi-sessions.md).
