# Connect AIWG to OpenHuman

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project’s main folder:

```bash
npm install -g aiwg
aiwg use all --provider openhuman
```

Restart OpenHuman for that project. Ask the agent to run `aiwg-regenerate`,
preview the tailored context, preserve existing instructions, and apply it.
Then verify the project root, OpenHuman context files, installed frameworks,
and one next AIWG action.

Use the [safe Node.js/npm guide](../getting-started/install-node.md) if the
terminal commands are unavailable. Agents can read the
[OpenHuman operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/openhuman.md).
