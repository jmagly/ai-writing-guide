# Connect AIWG to OpenAI Codex

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Codex is the **provider** in this guide. Complete the
[safe Node.js setup](../getting-started/install-node.md) first if needed.

From a terminal opened in the project’s main folder:

```bash
npm install -g aiwg
aiwg use all --provider codex
```

Close and reopen Codex in that folder. In the Codex conversation, ask it to run
`aiwg-regenerate`, preview the project-tailored context, preserve your existing
instructions, and apply the result. Then ask whether AIWG is active and request
the project root, `AGENTS.md`/provider files, installed frameworks, and next
action as evidence.

Success means Codex reports the intended project, follows the `AGENTS.md`
bootstrap into `WORKSPACE.md` and `AIWG.md`, and can recommend one AIWG action.
Agents can retrieve the
[Codex operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/codex.md)
for advanced configuration.
