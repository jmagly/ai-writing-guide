# First Success: Start A Project Intake

Use this recipe when you have an idea, repo, or workstream and want AIWG to turn it into structured project context.

## Do This

Go to the project folder:

```bash
cd /path/to/your/project
```

Ask the agent:

```text
Help me start an AIWG intake for this project. Recommend one intake path and ask only the questions needed to begin.
```

For a new software project, use:

```text
/intake-wizard "<short project description>"
```

For an existing codebase, use:

```text
/intake-from-codebase .
```

If your provider cannot run slash commands, ask for the closest available AIWG command or capability:

```bash
aiwg discover "intake wizard"
aiwg discover "intake from codebase"
```

## You Should See

The agent has enough context to produce or update intake documents, or it has given you a specific blocker such as missing project files or an unavailable provider command.

## If That Did Not Work

If the agent describes the wrong project, stop and check scope:

```bash
pwd
ls -a
```

Then ask:

```text
This intake seems scoped to the wrong folder. Re-check the project root and restart from the files in the current directory.
```

## Next

Once intake starts, follow [Getting Started with Intake](../intake-guide.md) for the command that matches your project.

## Related

- [Start Here](start-here.md)
- [Intake Guide](../intake-guide.md)
