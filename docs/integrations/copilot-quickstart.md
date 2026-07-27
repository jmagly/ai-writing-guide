# Connect AIWG to GitHub Copilot

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the VS Code workspace’s main project folder:

```bash
npm install -g aiwg
aiwg use all --provider copilot
```

Reload VS Code. In Copilot Chat, ask it to run `aiwg-regenerate`, preview the
project context, preserve team-authored instructions, and apply the result.
Then ask Copilot to report whether AIWG is active, which `.github/` instruction
files it sees, the installed frameworks, and one next action.

If Node.js/npm are missing or report permission errors, begin with
[Install Node.js and npm Safely](../getting-started/install-node.md). Advanced
agents can use the
[Copilot operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/copilot.md).
