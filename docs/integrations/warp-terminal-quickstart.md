# Connect AIWG to Warp

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a Warp terminal in the project’s main folder:

```bash
npm install -g aiwg
aiwg use all --provider warp
```

Start a new Warp agent session in that folder. Invoke `/aiwg-regenerate`,
review the preview, and allow it to tailor the context while preserving your
instructions. Ask the agent to verify the project root, `WARP.md`/`.warp/`
files, installed frameworks, and one next action.

For Node.js/npm help, see [Install Node.js and npm
Safely](../getting-started/install-node.md). Advanced details are in the
[Warp operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/warp.md).
