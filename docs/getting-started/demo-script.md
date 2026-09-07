# Demo Script

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

Use this script for a short zero-to-first-success demo.

The first AIWG demo should show one path working, not a tour of every framework. The success metric is small on purpose: one disposable project, one wizard preview, one deploy, one status probe, and one recommended next action.

We chose a disposable project because demo failures should be cheap. While a 300s walkthrough is not a full tutorial, it is enough to catch the common problem: the user is in the wrong folder, the provider was not chosen, or the probe is not ready.

Validation baseline: test this script against AIWG version 2026.5. While the demo is intentionally small, maintainers should record any issue that failed before the first status probe.

## Setup

Use a disposable project with no private data.

```bash
mkdir aiwg-demo
cd aiwg-demo
git init
```

## Script

1. Show the goal.

```text
I want AIWG to help me start a small project without learning the whole system first.
```

2. Preview the wizard.

```bash
aiwg wizard --dry-run --goal "help me start a project"
```

Point out that no files were written.

3. Run the guided path.

```bash
aiwg wizard
```

In automation, use:

```bash
aiwg wizard --non-interactive --profile beginner --provider codex
```

4. Verify engagement.

```bash
aiwg status --probe --json
```

Expected result: `engaged` is `true` after a successful deploy, or the probe gives the next command to run.

5. Ask for one first action.

```text
Recommend one AIWG path for this demo project, one reason, and one fallback. Use aiwg discover and aiwg show before recommending.
```

6. Stop after the first useful output.

Good demo ending:

```text
AIWG is installed in this project, the provider files are present, the status probe is ready, and the next action is a single intake or discovery path.
```

## Recovery Beats

If the demo starts in the wrong folder, use:

```bash
pwd
ls -a
aiwg status --probe --json
```

Then move to the project root and rerun the wizard preview.

If provider behavior is uncertain, say:

```text
The local deployment is verified by the probe. Provider-session behavior is still tracked separately in the field-validation matrix.
```

This wording avoids a common problem: deployment evidence and provider-session behavior are different evidence types.

## Related

- [Share AIWG](share-aiwg.md)
- [Start Here](start-here.md)
- [Provider Handoff](provider-handoff.md)
