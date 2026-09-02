# AIWG CLI

AIWG is designed to be used through an agent conversation. The command-line
interface is the execution layer used by agents, automation, and maintainers;
it is not the normal way a person selects or runs AIWG capabilities.

## What people normally type

People generally need the CLI only to install AIWG, connect it to a project,
check the installation, or repair it when the agent cannot. Start with
[Install, Connect, and Verify](../getting-started/install-connect-verify.md) or
use the concise [install and repair command guide](install-and-repair.md).

After setup, stay in your agent conversation and describe the outcome you
want. For example:

```text
Find the best AIWG capability for reviewing this service's security. Inspect
the selected capability before using it, explain any material changes, and
report the evidence when you finish.
```

If you already know an asset ID, include it without translating it into a CLI
command:

```text
Use the AIWG asset `npm-supply-chain-audit` to review this repository. Preview
the plan and ask before changing project files.
```

The agent resolves the asset, loads its instructions, runs the required tools,
and reports the result. You should not need to copy discovery, indexing,
orchestration, storage, session, or automation commands from documentation.

## Agent and automation references

The following references are intentionally written for agents, scripts, and
advanced operators. They contain exact flags, structured-output contracts, and
recovery procedures:

- [Complete CLI reference](reference.md)
- [Agent and automation usage guide](https://github.com/jmagly/aiwg/blob/main/docs/cli/agent-usage.md)
- [Capability discovery and retrieval contract](https://github.com/jmagly/aiwg/blob/main/docs/cli/discovery-and-retrieval.md)
- [Capability routing architecture and verification](https://github.com/jmagly/aiwg/blob/main/docs/cli/capability-routing.md)

Those pages explain implementation surfaces, not recommended end-user
workflows. If you are a person trying to accomplish a task, ask the agent in
plain language first and use the [installation documentation](../getting-started/install-connect-verify.md)
only when direct terminal interaction is actually required.
