# Automated and Headless Installation

Non-interactive setup is intended for agents, provisioning systems, and CI/CD
automation. A person installing AIWG on a workstation should follow
[Install, Connect, and Verify](../getting-started/install-connect-verify.md).

For an automated environment, describe the outcome and constraints to the
agent or automation owner:

```text
Prepare a non-interactive AIWG installation for this environment. Detect the
provider and project root, pin the intended AIWG release, preview every file
and environment change, fail closed on missing prerequisites, and emit
machine-readable verification evidence.
```

The implementation must not guess credentials, bypass approval policy, or
claim success without verifying the installed executable and provider files.
Exact commands and flags live in the
[non-interactive CLI reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/non-interactive.md), which is written
for agents and scripts.
