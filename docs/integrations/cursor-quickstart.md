# Connect AIWG to Cursor

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project folder you open with Cursor:

```bash
npm install -g aiwg
aiwg use all --provider cursor
```

Reload Cursor in that folder. In the Cursor chat, type `/aiwg-regenerate`,
review the preview, and let the agent tailor the context without replacing your
project instructions. Ask it to report whether AIWG is active, which `.cursor/`
files it reads, the installed frameworks, and one useful next action.

For Node.js/npm help, use the [safe installation
guide](../getting-started/install-node.md). Advanced details are in the
[Cursor operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/cursor.md).
