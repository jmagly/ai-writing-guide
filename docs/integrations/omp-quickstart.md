# Connect AIWG to Oh My Pi

> **Status:** Experimental. AIWG currently qualifies Oh My Pi 18.1.10 on
> Linux x64. OMP is a separate provider from the Pi Coding Agent harness at pi.dev.

For the complete first-time journey, start with
[Install, Connect, and Verify](../getting-started/install-connect-verify.md).

Install OMP from its
[upstream instructions](https://github.com/can1357/oh-my-pi), install AIWG,
then open a terminal at the project root:

```bash
npm install -g aiwg
omp --version
aiwg use all --provider omp --dry-run
aiwg use all --provider omp
```

Start or reopen OMP from that project. Ask it to verify the project root,
`.omp/AGENTS.md`, `.omp/agents/`, `.omp/prompts/`, `.omp/rules/`, and the
one-level Agent Skills under `.agents/skills/`. It should confirm that
`WORKSPACE.md` and `AIWG.md` are loaded through the native OMP bootstrap before
claiming the session is fully connected.

## Provider names have different meanings

- `aiwg ... --provider omp` selects AIWG's OMP deployment adapter.
- `omp --model <backend>/<provider>/<model>` selects an OMP model.
- `oh-my-pi` is an AIWG alias for `omp`.

For example, an OMP process may use an OpenRouter model while AIWG still uses
the `omp` provider selector. Keep `OPENROUTER_API_KEY` in the process
environment or provider credential store; do not write it to project files,
receipts, transcripts, or command history.

## Profiles and complete skill copies

The default project deployment keeps the startup surface small: kernel skills
are copied to `.agents/skills/`, while the standard corpus remains available
through `aiwg discover` and `aiwg show`.

```bash
# Copy the complete skill corpus when the project needs an offline mirror
aiwg use all --provider omp --copy-all

# Deploy user resources to a named OMP profile
OMP_PROFILE=work aiwg use all --provider omp --scope user
```

`OMP_PROFILE` takes precedence over `PI_PROFILE`. OMP and Pi can coexist; AIWG
keeps their provider identities and native directories separate and preserves
operator-owned resources in their shared `.agents/skills/` surface.

## Verify and maintain

```bash
aiwg runtime-info --providers --provider omp --json
aiwg steward capabilities --provider omp
aiwg use all --provider omp --dry-run
```

Set `AIWG_OMP_BIN` if `omp` is outside `PATH`. A missing model catalog is an
error rather than an empty successful result; check the selected profile,
backend credentials, and OMP version.

See the [full OMP provider guide](../providers/omp.md) for native agents, MCP,
profiles, runtime execution, teams, sessions, ownership-safe removal,
troubleshooting, support limits, and the
[verification baseline](../providers/omp-verification.md).
