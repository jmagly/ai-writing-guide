# First Success: Verify AIWG Is Working

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Use this recipe before depending on AIWG for project work.

For full installation from a fresh machine or fresh project, use the
[Agentic Install Runbook](../agentic-install-runbook.md) first.

You stay in the chat. The agent checks the deployment state, runs the status probe, and reports back. You do not need to type the probe commands yourself — they are the agent's tool, not yours.

## Do This

Open your AI tool in the project folder and ask the agent:

```text
Is AIWG active in this workspace? Read aiwg status --probe and report the
engaged state, project root, deployed frameworks, and next action. If
discovery is reachable, also confirm AIWG can search the installed
capability set.
```

The agent runs the probe, reads any deployed providers (`.claude/`, `.codex/`, `.cursor/`, etc.), and gives you a short answer with the engagement state plus one next action.

If you want a deeper sweep, ask:

```text
Run a workspace health check. Cover installation, PATH, deployed frameworks,
provider files, and one discovery query so I know AIWG can find its own
capabilities.
```

## You Should See

A short answer that says one of:

- **Engaged** — AIWG is deployed, the probe reports a configured state, and the agent can search the capability index. Build on this.
- **Partial** — AIWG is installed but the current project is not configured. The agent will name the wizard or `aiwg use` action that finishes setup.
- **Needs repair** — Something is broken. The agent will run diagnostics and propose the fix.

You do not need to interpret raw probe JSON yourself. The agent does that.

## What You Actually Type

If AIWG is not installed at all, install it once:

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
```

After that, the user-side commands you might run by hand are limited to:

- `aiwg wizard` — guided setup when starting from scratch
- `aiwg use all --provider <provider>` — deploy the preferred complete system
- `aiwg doctor` — when a human wants a direct health readout outside the chat
- `aiwg refresh` — keep the install current

Everything else — the probe, discovery, capability inspection, the index — is what the agent calls during the conversation when you ask it to verify or look something up.

## If That Did Not Work

If the agent reports the wrong project, ask:

```text
I may be in the wrong folder. Tell me what evidence you see for the current
project scope and what folder I should run AIWG from.
```

If the agent says AIWG is not installed or not on PATH, install or fix PATH:

```bash
npm install -g aiwg
```

Or, if `aiwg` is installed but unreachable, see the [Installation Troubleshooting](https://github.com/jmagly/aiwg/blob/main/README.md#installation-troubleshooting) section in the README.

If the probe reports `not-configured` or `partial`, ask the agent for the one
action that will finish setup. Usually that is the agentic installer, `aiwg
wizard`, or `aiwg use all --provider <provider>`.

If the probe reports `needs-repair`, ask:

```text
Run aiwg doctor and tell me which check failed. Propose the smallest fix.
```

## Next

Once verification succeeds, pick one focused recipe: [Find One Capability](first-success-find-capability.md) or [Start A Project Intake](first-success-start-intake.md).

## Related

- [Start Here](start-here.md)
- [Agentic Install Runbook](../agentic-install-runbook.md)
- [Beginner Language Map](language-map.md)
- [Provider Handoff](provider-handoff.md)
- [Scope And Recovery](scope-and-recovery.md)
