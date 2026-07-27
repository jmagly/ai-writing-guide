# Connect AIWG to OpenCode

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project’s main folder:

```bash
npm install -g aiwg
aiwg use all --provider opencode
```

Restart OpenCode from that folder. In the agent conversation, invoke
`/aiwg-regenerate`, review the preview, and let it tailor the context while
preserving project-authored instructions. Ask it to verify the project root,
`.opencode/` and `AGENTS.md` context, installed frameworks, and next action.

For Node.js/npm help, start with [Install Node.js and npm
Safely](../getting-started/install-node.md). Advanced details live in the
[OpenCode operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/opencode.md).
