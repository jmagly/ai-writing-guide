# Connect AIWG to OpenClaw

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project or OpenClaw workspace you intend to use:

```bash
npm install -g aiwg
aiwg use all --provider openclaw
```

Restart OpenClaw for that workspace. Ask the agent to run `aiwg-regenerate`,
show the proposed project context, preserve existing instructions, and apply
it. Verify the workspace path, OpenClaw skill/rule paths, installed frameworks,
and one next AIWG action.

If Node.js/npm are not working, follow the [safe installation
guide](../getting-started/install-node.md). Agent/operator details are in the
[OpenClaw operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/openclaw.md).
