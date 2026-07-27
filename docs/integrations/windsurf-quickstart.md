# Connect AIWG to Windsurf

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Open a terminal in the project folder you use with Windsurf:

```bash
npm install -g aiwg
aiwg use all --provider windsurf
```

Reload Windsurf in that folder. Invoke `/aiwg-regenerate`, review the preview,
and let it tailor the project context without replacing your instructions.
Ask it to verify the project root, `.windsurf/` context, installed frameworks,
and one useful next action.

If Node.js/npm are not working, follow [Install Node.js and npm
Safely](../getting-started/install-node.md). Agent/operator details live in the
[Windsurf operational reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/windsurf.md).
