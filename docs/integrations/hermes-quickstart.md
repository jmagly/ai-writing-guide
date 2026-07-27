# Connect AIWG to Hermes

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project folder attached to the Hermes workspace:

```bash
npm install -g aiwg
aiwg use all --provider hermes
```

Restart or reload Hermes with that project attached. Ask the Hermes agent to
run `aiwg-regenerate`, preview the tailored context, preserve your instructions,
and apply it. Then ask for the project root, Hermes context files, installed
frameworks, and one next action as verification.

For safe Node.js/npm setup, see [Install Node.js and npm
Safely](../getting-started/install-node.md). Advanced agents can retrieve the
[Hermes operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/hermes.md).
