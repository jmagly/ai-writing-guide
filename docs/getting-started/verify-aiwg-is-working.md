# First Success: Verify AIWG Is Working

Use this recipe before depending on AIWG for project work.

## Do This

Check the CLI:

```bash
aiwg -version
aiwg -help
```

Move to the project folder you want to work in:

```bash
cd /path/to/your/project
pwd
```

Preview the guided onboarding path:

```bash
aiwg wizard --dry-run --goal "help me start a project"
```

Run the deterministic verification probe:

```bash
aiwg status --probe --json
```

Run one discovery query:

```bash
aiwg discover "aiwg steward"
```

If you already know the area you need, use that phrase instead:

```bash
aiwg discover "security review"
aiwg discover "research workflow"
aiwg discover "project intake"
```

## You Should See

You see a version, help text, a wizard plan that says no files were written, a JSON probe with `schema: "aiwg.status.probe.v1"`, and a discovery response. The discovery response does not need to be the final answer; it only proves AIWG can search the installed capability set.

## If That Did Not Work

If `aiwg` is not found, install it or check your PATH:

```bash
npm install -g aiwg
aiwg -version
```

If discovery returns nothing useful, ask the agent to translate your words:

```text
Translate my goal into two or three AIWG discovery phrases and explain which one to try first.
```

If the answer seems scoped to the wrong files, check the current folder before continuing:

```bash
pwd
ls -a
```

If the probe reports `not-configured` or `partial`, follow the wizard's deploy action, then run `aiwg status --probe --json` again before treating setup as complete.

## Next

After verification succeeds, choose one focused recipe: [Find One Capability](first-success-find-capability.md) or [Start A Project Intake](first-success-start-intake.md).

## Related

- [Start Here](start-here.md)
- [Beginner Language Map](language-map.md)
