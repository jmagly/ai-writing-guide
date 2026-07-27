# Connect AIWG to Claude Code

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Claude Code is the **provider** in this guide. Complete the
[safe Node.js setup](../getting-started/install-node.md) first if `node` and
`npm` are not already working.

From a terminal opened in the project’s main folder, install AIWG and deploy
the complete system:

```bash
npm install -g aiwg
aiwg use all --provider claude
```

Close and reopen Claude Code in that folder. In the Claude Code conversation,
type `/aiwg-regenerate`, review its preview, and let it tailor the project
context. Then ask whether AIWG is active and request the project root, deployed
Claude files, installed frameworks, and next action as evidence.

Success means Claude Code reports the intended project, reads `CLAUDE.md` and
the shared workspace context, and can recommend one AIWG action. For advanced
flags and recovery, agents can read the
[Claude operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/claude.md).
