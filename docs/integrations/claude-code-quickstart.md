# Connect AIWG to Claude Code

For the complete first-time journey, start with [Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Claude Code is the **provider** in this guide. Complete the [safe Node.js setup](../getting-started/install-node.md)
first if `node` or `npm` is unavailable.

From a terminal opened in the project's main folder, install AIWG and deploy the complete system:

```bash
npm install -g aiwg
aiwg use all --provider claude
```

The deployment command refreshes AIWG's shared project context and prints a verification result. Close and reopen
Claude Code if the `aiwg use` output says a reload is required. After that, ask Claude Code to verify AIWG by
reporting the project root, provider files it can read, installed frameworks, and one useful next action.

Try one small task immediately after verification:

```text
Review this project's README and getting-started docs for unclear positioning, missing setup steps, or unsupported claims. Save the three highest-priority fixes with file references and a recommended next edit at .aiwg/marketing/brand/audit/readme-review.md. Leave the reviewed files unchanged.
```

Success means Claude Code names the intended project, follows the AIWG bootstrap into `WORKSPACE.md` and `AIWG.md` or
the provider-specific adapter, and produces a concrete review you can inspect. For advanced flags, compatibility
notes, and recovery details, see the [Claude operational
reference](https://github.com/jmagly/aiwg/blob/main/docs/agents/providers/claude.md).
