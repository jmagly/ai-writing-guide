# Scope And Recovery

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Use this page when AIWG seems installed but the agent is looking at the wrong files, missing project context, or writing setup into the wrong folder.

People often run setup from `$HOME`, `/tmp`, or another convenient shell location, then the AI assistant has no useful project context. The fix is usually not a new framework. It is moving to the right folder and verifying scope.

We chose a recovery page instead of a hard error because the warning is meant to protect beginners without breaking automation. While `$HOME` and `/tmp` are difficult defaults for project context, some empty-project setups are valid. Treat the warning as a 30s pause, not a failure.

Validation baseline: test this page against AIWG version 2026.5. While the recovery flow is deliberately short, maintainers should record any issue that failed inside the first 300s of folder diagnosis.

## The Default: Project Scope

For beginners, the right default is project-scoped setup. Run AIWG from the folder that contains the project you want the AI assistant to understand:

```bash
cd /path/to/your/project
pwd
ls -a
aiwg wizard --dry-run --goal "help me start a project"
```

Good signs include `.git/`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or another project file. After deploy, you should also see `.aiwg/` and provider files such as `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, or `AGENTS.md`.

## Global Or User Scope

Global or user-scoped setup is for capabilities you intentionally want across many projects, such as personal defaults or provider-level reusable skills. It is not the beginner default because it does not by itself teach AIWG about a specific project.

Use project scope unless you can finish this sentence:

```text
I want this AIWG capability available across projects because ...
```

## If You Ran AIWG In The Wrong Folder

Stop before adding more frameworks. Check where you are:

```bash
pwd
ls -a
aiwg status --probe --json
```

If the folder is `$HOME`, `/tmp`, `/`, or another place that is not your project, move to the intended project root and rerun the wizard preview:

```bash
cd /path/to/the/right/project
aiwg wizard --dry-run --goal "help me start a project"
```

Then deploy from the correct folder:

```bash
aiwg wizard
```

## What The Project-Isolation Warning Means

`aiwg use` may warn:

```text
No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root.
```

That warning is informational. It does not block the command because some users intentionally deploy to new or unusual folders. For beginners, treat it as a pause point: confirm the folder before continuing.

The warning is deliberately non-blocking. Blocking unusual directories would break valid automation and empty-project setup, but staying silent makes the beginner failure difficult to diagnose.

## Recovery Prompt

Ask the agent:

```text
I may be in the wrong folder. Check pwd, list the project signals you see, run or read aiwg status --probe --json, and tell me whether I should move before deploying AIWG.
```

## Related

- [Start Here](start-here.md)
- [Provider Handoff](provider-handoff.md)
- [Verify AIWG Is Working](verify-aiwg-is-working.md)
