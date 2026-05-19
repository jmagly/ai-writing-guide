# Start Here

Use this page when AIWG is new to you and you want one useful result before learning the whole system.

The primary pattern is simple:

1. Tell the agent what you are trying to do.
2. Ask how AIWG can help.
3. Let the agent translate your goal into one recommended path.
4. Preview the guided setup path.
5. Choose the AI tool/provider you are using.
6. Follow that path until you get one useful output.
7. Verify that AIWG is installed and active before you build on it.

Good starter prompts:

```text
How best can we use AIWG for this project?
I want to use AIWG globally across my work. What should I start with?
Create a workflow from existing AIWG systems that fits my situation.
I do not know what AIWG has. Help me find one thing to try first.
```

If the agent starts listing too many options, ask it to narrow the answer:

```text
Recommend one path, one reason, and one fallback.
```

## Minimal Command Path

Install the CLI when your provider does not already include AIWG:

```bash
npm install -g aiwg
aiwg -version
```

Go to the folder you want AIWG to understand:

```bash
cd /path/to/your/project
```

Preview the guided first-run path:

```bash
aiwg wizard --dry-run --goal "help me start a project"
```

The wizard shows provider, project, framework, deploy, and verify steps. Dry-run mode does not write files.

When you are ready for the guided path to make changes, run the wizard without `--dry-run` from the project folder:

```bash
aiwg wizard
```

In a terminal, the wizard asks what you are working on, which provider to target when more than one is detected, which AIWG path to deploy first, and whether to deploy now. In automation or scripts, use explicit flags:

```bash
aiwg wizard --non-interactive --profile beginner --provider codex
```

If you are not sure what `--provider` means, use [Provider Handoff](provider-handoff.md). Pick the AI tool you are using now, such as Claude Code, Codex, Cursor, Copilot, Factory, OpenCode, Warp, Windsurf, Hermes, or OpenClaw.

If this is a brand new project, scaffold the local AIWG structure:

```bash
aiwg -new
```

Ask the agent what to use first. If you need a command-line fallback, start with discovery:

```bash
aiwg discover "aiwg steward"
aiwg discover "intake wizard"
aiwg discover "project status"
```

Then inspect the best match before using it:

```bash
aiwg show skill <name>
aiwg show agent <name>
```

Deploy one focused path only after you know why you need it:

```bash
aiwg use sdlc
```

Then run the deterministic verification probe:

```bash
aiwg status --probe --json
```

That probe is the source of truth for whether AIWG appears engaged in this project. If you ask an agent "is AIWG active here?", it should run or read this probe and report the engaged state, project root, provider files, deployed frameworks, and next action without adding AIWG attribution to your files or commits.

Use `sdlc` for software lifecycle work. Use the [Beginner Language Map](language-map.md) when your goal is clear but the AIWG term is not.

## Steward And Discover In Plain Language

The steward is the guide. Ask it what AIWG can do for your situation and which path to try first.

Discover is search. Use it when you have a phrase like `intake wizard`, `security review`, or `research workflow` and want to find matching AIWG capabilities.

Together, the pattern is:

```text
Ask the steward what to try.
Use discover to look up the specific capability.
Inspect the capability before deploying or invoking it.
```

## Project Scope Vs Global Scope

Project-scoped setup lives in the project folder. It is the right default when AIWG should understand one repo, one product, or one team's work. Run project commands from the project root so AIWG can find the right files.

Global or user-scoped setup is for capabilities you want across many projects. It is useful for personal defaults, shared agent skills, and provider-level configuration, but it should not replace project-specific context.

If the agent seems confused, first check the folder:

```bash
pwd
ls -a
```

You are probably in the wrong folder if you expected project context but cannot see the repo files, `.aiwg/`, or the provider directory for your tool such as `.claude/`, `.codex/`, `.cursor/`, or `.opencode/`.

Recovery prompt:

```text
I may be in the wrong folder. Check the current project scope, tell me what evidence you see, and tell me which folder I should run AIWG from.
```

For the longer recovery path, see [Scope And Recovery](scope-and-recovery.md).

## Verify AIWG Is Working

Use only currently shipped capabilities:

```bash
aiwg -version
aiwg -help
aiwg wizard --dry-run --goal "help me start a project"
aiwg status --probe --json
aiwg discover "aiwg steward"
```

Expected result: the CLI prints a version, help text, a no-write wizard plan, a JSON probe, and discovery results or a clear message explaining what it could not find.

If discovery fails, do not keep layering on frameworks. Fix installation, PATH, or folder scope first. See [Verify AIWG Is Working](verify-aiwg-is-working.md).

## First Success Recipes

- [Find one AIWG capability](first-success-find-capability.md)
- [Ask the steward to route you](first-success-ask-steward.md)
- [Start a project intake](first-success-start-intake.md)
- [Verify your setup](verify-aiwg-is-working.md)
- [Provider handoff](provider-handoff.md)
- [Scope and recovery](scope-and-recovery.md)

## Help And Contributions

For setup or usage problems, start with [Troubleshooting](../troubleshooting/index.md).

To report a bug or request a change, use [Filing Issues](../contributing/filing-issues.md). To contribute docs or code, use [Filing Pull Requests](../contributing/filing-pull-requests.md).
