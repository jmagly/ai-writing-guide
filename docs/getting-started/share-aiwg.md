# Share AIWG

Use this page when you need repo-owned source copy for pointing someone to the beginner path.

This page is source material only. Posting, campaign timing, and external community execution live outside this repo.

The problem this page solves is duplication: AIWG needs accurate source copy, but external campaign work belongs outside this repository.

We chose source copy over campaign planning because the repo can keep command examples accurate, while external channels change faster. Keep this asset set small enough to review in 300s: one short handoff, one community reply, one screenshot checklist, plus one demo script.

Validation baseline: test this copy against AIWG version 2026.5. While the copy is short, maintainers should record any issue that failed when someone follows the link and runs the first command.

## Short Handoff

```text
If AIWG feels confusing, start here:
https://docs.aiwg.io/getting-started/start-here.html

The path is: describe your goal, preview the wizard, deploy one focused path, then verify with aiwg status --probe --json.
```

## Community Reply

```text
For a first AIWG session, do not start with the full catalog. Open the Start Here guide, run the wizard preview from your project folder, then ask AIWG to recommend one path and one fallback for your situation.

Start Here: https://docs.aiwg.io/getting-started/start-here.html
Verification: aiwg status --probe --json
```

## Screenshot Checklist

If screenshots are used, capture only non-sensitive examples:

- terminal showing `aiwg wizard --dry-run --goal "help me start a project"`;
- provider choice or plan output without private paths;
- `aiwg status --probe --json` with project paths redacted if needed;
- a single recommended AIWG path from the steward/discover pattern;
- the first useful output from a sample project.

Do not show private repository names, tokens, local usernames, customer data, or unreleased provider keys.

For a useful asset set, capture 3 to 5 screenshots at most. More than that tends to recreate the full docs flow and becomes difficult to keep accurate when wizard or provider behavior changes.

## Maintenance Notes

Keep this page aligned with shipped features. If wizard or status behavior changes, update:

- [Start Here](start-here.md)
- [Provider Handoff](provider-handoff.md)
- [Demo Script](demo-script.md)

## Related

- [Start Here](start-here.md)
- [Demo Script](demo-script.md)
- [Onboarding Validation](onboarding-validation.md)
