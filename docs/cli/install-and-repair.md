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
aiwg installation show
```

- `status` reports what AIWG can see without changing the installation.
- `doctor` diagnoses installation and provider wiring problems.
- `refresh` updates and redeploys managed AIWG context. Review its plan before
  approving changes when prompted.
- `installation show` reports the provider-neutral canonical installation,
  the package-manager executable used for updates, the currently executing
  installation, and any drift between them.

## Canonical installation and recovery

AIWG records the first resolved global installation in `installation.json`
under the global user-config directory. The directory follows the standard
resolution contract: `AIWG_CONFIG`, an existing `~/.aiwg`, an existing
`~/.config/aiwg`, then `~/.aiwg`. Provider directories and project `.aiwg/`
directories never own this record.

Updates use the recorded method and executable. For example, an AIWG installed
by npm under nvm continues using that npm even if Homebrew later appears first
on `PATH`. AIWG stops with a diagnostic if another package root handles the
command; it does not silently change ownership.

After intentionally reinstalling or changing Node managers, adopt the
installation that currently handles the command:

```bash
aiwg installation show
aiwg installation adopt --manager /absolute/path/to/npm
```

To select a different known installation explicitly:

```bash
aiwg installation switch \
  --root /absolute/path/to/aiwg \
  --method npm \
  --manager /absolute/path/to/npm
```

Use `--method web` for the signed lightweight web CLI and `--method source
--run-mode development` for a source checkout. `show`, `adopt`, and `switch`
remain available when drift blocks ordinary commands. Existing `channel.json`
state is migrated on first use, including channel, development path, and
update-check timestamps.

Exact flags, machine-readable output, and automation contracts belong in the
[agent and automation CLI reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md), not in ordinary user
journeys.

## Update notifications

Eligible interactive CLI invocations check a local cache at startup and may
write an update notice to stderr before command output. The notice identifies
the installed and available versions, routes every installation type through
`aiwg update`, and asks you to rerun the prior command without echoing its
arguments. The foreground command never contacts the registry: a detached,
timeout-bounded child refreshes the cache for a later invocation.

Notices and background refreshes are suppressed for non-TTY use, `CI`,
`GITHUB_ACTIONS`, `GITLAB_CI`, `NO_UPDATE_NOTIFIER`,
`AIWG_NO_UPDATE_CHECK`, and installations with `checkOnStartup: false`.
Successful notices and refresh attempts are rate-limited by the installation's
`updateCheckInterval` (24 hours by default). Fast help/version and channel
commands participate in the same bootstrap behavior; notifier failures remain
best-effort and never change the requested command's exit status.

The bootstrap depends on the packaged notifier module. If `dist/` itself is
missing or incomplete, the CLI emits the existing build/reinstall diagnostic
first because no notifier implementation is available to load; this recovery
exception never performs a network request.
