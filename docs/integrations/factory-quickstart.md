# Connect AIWG to Factory

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project’s main folder:

```bash
npm install -g aiwg
aiwg use all --provider factory
```

Restart Factory from that folder. Ask the Factory agent to run
`aiwg-regenerate`, preview and preserve existing project instructions, then
apply the tailored context. Ask it to report the project root, Factory/AGENTS
files it reads, installed frameworks, and one next AIWG action.

Use [Install Node.js and npm Safely](../getting-started/install-node.md) if the
first command is unavailable. Agent-only details live in the
[Factory operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/factory.md).
