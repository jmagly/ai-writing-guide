# Install and Repair Commands

This is the complete direct-user CLI surface for normal AIWG setup and
recovery. Everything after a working installation should normally happen in
the agent conversation.

For the guided path, provider names, prerequisites, and success checks, follow
[Install, Connect, and Verify](../getting-started/install-connect-verify.md).

## Install AIWG

In a terminal:

```bash
npm install -g aiwg
```

Then open the intended project in your agent and ask:

```text
Set up AIWG for this project. Detect the provider, preview the files you will
create or update, preserve existing work, ask before material changes, and
verify that AIWG is active when you finish.
```

If no working agent can complete project setup, the installation guide provides
the supported `aiwg wizard` and `aiwg use` fallback commands.

## Check or repair the installation

Start in the agent conversation:

```text
Check whether AIWG is installed and active in this project. Diagnose any
installation or provider wiring problem, explain the proposed repair, ask
before changing files, and verify the result.
```

If the agent cannot run, these recovery commands are safe direct-user entry
points:

```bash
aiwg status
aiwg doctor
aiwg refresh
```

- `status` reports what AIWG can see without changing the installation.
- `doctor` diagnoses installation and provider wiring problems.
- `refresh` updates and redeploys managed AIWG context. Review its plan before
  approving changes when prompted.

Exact flags, machine-readable output, and automation contracts belong in the
[agent and automation CLI reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md), not in ordinary user
journeys.
