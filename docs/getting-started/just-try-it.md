# Just Try It

You want to see one useful AIWG result without learning its vocabulary first.
Open a project in your supported AI tool and paste:

```text
Use AIWG to give me one useful, verified result about this project. First check
whether AIWG is connected here. Then choose the best existing capability,
explain what you will inspect, avoid changing files, and report the answer with
the evidence you used.
```

Try a more specific outcome if you prefer:

```text
Explain what this codebase does, identify its main entry points, and cite the
files that support your explanation.
```

```text
Find the most complex function, explain why it is complex, and suggest one
small improvement without editing the code.
```

```text
Identify the most important missing tests, rank them by risk, and cite the code
paths each test would protect.
```

```text
Show me where a security reviewer should look first and explain the evidence
behind that priority.
```

## If AIWG is not connected yet

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
Inspect first, explain the plan, preserve my existing work, ask before material
changes, and verify the result when finished.
```

See [Install, Connect, and Verify](install-connect-verify.md) for provider
handoff and recovery prompts. Exact terminal syntax is available only in the
[CLI reference](../cli/reference.md).

## What success looks like

The agent should name the AIWG capability it selected, answer the question,
cite concrete project evidence, and distinguish observed facts from suggestions.
It should not ask you to interpret raw diagnostics or learn command names.

## What to explore next

- **Starting a real project?** → [New Project](new-project.md)
- **You have existing code?** → [Existing Project](existing-project.md)
- **Want structured auditing?** → [Audit Existing Code](audit-existing-code.md)
