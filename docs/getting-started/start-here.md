# Start Here

Use this page when AIWG is new to you and you want one useful result before learning the whole system.

The everyday AIWG user surface is the conversation with your AI tool. AIWG ships a CLI, but most of it exists so the agent can call it on your behalf. You stay in the chat. The agent does the AIWG-specific lookups, discovery, indexing, and orchestration when you ask for something.

## The Primary Pattern

1. Tell the agent what you are trying to do.
2. Ask how AIWG can help.
3. The agent translates your goal into one recommended path and verifies it against AIWG's installed capabilities.
4. You preview and approve any deployment.
5. Follow the recommended path until you get one useful output.
6. Verify that AIWG is installed and active before you build on it.

Good starter prompts:

```text
How best can we use AIWG for this project?
I want to use AIWG globally across my work. What should I start with?
Create a workflow from existing AIWG systems that fits my situation.
I do not know what AIWG has. Help me find one thing to try first.
```

If the agent starts listing too many options, ask it to narrow:

```text
Recommend one path, one reason, and one fallback.
```

## Setup and Approval

The fastest supported setup is one paste into the AI provider with the project
open:

```text
Install or repair AIWG for this project by following
https://raw.githubusercontent.com/jmagly/aiwg/main/setup.aiwg.yaml
Explain the plan before changing anything, preserve my existing work, and ask
me only for choices you cannot safely determine.
```

The provider performs the preferred sequence:

1. install AIWG;
2. deploy `all` for the provider you use;
3. build the capability indices;
4. invoke `aiwg-regenerate` so AIWG is tailored and hooked into the project;
5. verify engagement.

Follow [Install, Connect, and Verify](install-connect-verify.md) when you need
the manual fallback, provider-name table, or restricted/headless guidance.

After bootstrap, ask the agent to handle ongoing setup from the project folder:

```text
Set up AIWG for this project. Preview the provider and framework changes first,
ask me before applying them, then verify the result.
```

The agent normally runs the onboarding and verification operations. You only
need the following terminal escape hatches when no working agent can perform
them.

### Installation escape hatch

Install once (and only when your provider does not already bundle AIWG):

```bash
npm install -g aiwg
```

### Guided recovery escape hatch

```bash
cd /path/to/your/project
aiwg wizard
```

The wizard asks what you are working on, which provider to target, which AIWG path to deploy first, and whether to deploy now. A dry-run preview is available with `aiwg wizard --dry-run --goal "<your goal>"`.

If you need to deploy without the wizard, use the preferred complete
project-scoped setup and name your provider:

```bash
aiwg use all --provider <provider>
```

This installs the complete deployable end-user surface. A narrower command such
as `aiwg use sdlc --provider <provider>` is an advanced choice for users who
deliberately want only one framework.

Build the indices, then ask the current provider to run `aiwg-regenerate` for
this existing project and preserve project-authored instructions:

```bash
aiwg index build --all
aiwg regenerate --provider <provider>
```

After regeneration, ask “Is AIWG active in this project?” so the agent reads
the status probe and explains the result. Restart the provider only if that
verification shows it is still using cached startup instructions.

If you want an agent or steward to handle the whole setup from prerequisites to
provider handoff, use the [Agentic Install Runbook](../agentic-install-runbook.md).

### Independent verification escape hatch

```bash
aiwg status --probe --json
```

That probe is the source of truth for whether AIWG appears active in this project. If you ask an agent "is AIWG active here?", it reads this probe and reports the engaged state, project root, provider files, deployed frameworks, and next action.

The full list of user-side commands is short: `aiwg use`, `aiwg wizard`, `aiwg new`, `aiwg status`, `aiwg doctor`, `aiwg refresh`. Everything past that — discovery, capability lookup, indexing, agent loops, mission control — is the agent's job, invoked from inside the chat when you ask for something AIWG-shaped.

## Steward And Discover, From The User Side

The steward is a guide agent. You ask the steward what AIWG can do for your situation and which path to try first.

Discover is the agent's capability search. When you describe a goal, the agent searches AIWG's installed operational assets for matching skills, agents, commands, rules, flows, runbooks, templates, and behaviors, inspects the best match, and recommends one. You do not need to learn the search syntax or memorize phrases — you say the goal in plain language, the agent does the lookup.

The pattern in chat:

```text
Ask the steward what to try.
Let the agent look up the specific capability against AIWG.
Inspect the recommendation before deploying or invoking it.
```

## Project Scope Vs Global Scope

Project-scoped setup lives in the project folder. It is the right default when AIWG should understand one repo, one product, or one team's work. Run the user-side commands from the project root so AIWG can find the right files.

Global or user-scoped setup is for capabilities you want across many projects. It is useful for personal defaults, shared agent skills, and provider-level configuration, but it should not replace project-specific context.

If the agent seems confused about which project it is reasoning about, ask:

```text
I may be in the wrong folder. Check the current project scope, tell me what
evidence you see, and tell me which folder I should run AIWG from.
```

For the longer recovery path, see [Scope And Recovery](scope-and-recovery.md).

## Verify AIWG Is Working

You only need one check. Ask the agent:

```text
Is AIWG active in this workspace? Read aiwg status --probe and report the
engaged state, project root, deployed frameworks, and next action.
```

The agent will run the probe and surface the result in the conversation. If the probe reports `not-configured` or `partial`, the agent will tell you which `aiwg use` or `aiwg wizard` action will finish setup. If it reports `needs-repair`, the agent will run health diagnostics and propose the fix.

For more depth, see [Verify AIWG Is Working](verify-aiwg-is-working.md).

## First Success Recipes

- [Find one AIWG capability](first-success-find-capability.md)
- [Ask the steward to route you](first-success-ask-steward.md)
- [Start a project intake](first-success-start-intake.md)
- [Verify your setup](verify-aiwg-is-working.md)
- [Provider handoff](provider-handoff.md)
- [Scope and recovery](scope-and-recovery.md)
- [Agentic install runbook](../agentic-install-runbook.md)

## Help And Contributions

For setup or usage problems, start with [Troubleshooting](../troubleshooting/index.md).

To report a bug or request a change, use [Filing Issues](../contributing/filing-issues.md). To contribute docs or code, use [Filing Pull Requests](../contributing/filing-pull-requests.md).
