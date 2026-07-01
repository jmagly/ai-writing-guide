---
namespace: aiwg
name: npm-release-age-gate
platforms: [all]
description: Configure and review npm min-release-age controls for JavaScript projects, including 7-day default gates, 10-day high-sensitivity profiles, npm version requirements, and safe override handling.
---

# npm-release-age-gate

Use this skill when a user wants to slow dependency adoption after a
fresh npm publish, configure `min-release-age`, decide whether to use
npm or pnpm for the gate, or troubleshoot install failures caused by
newly published package versions.

## Triggers

- "release age gate"
- "min-release-age"
- "minimumReleaseAge"
- "7 day npm gate" / "10 day npm gate"
- "new package version blocked"
- "npm supply chain hardening"

## Suggested default

For npm projects, commit this at the repo root:

```ini
min-release-age=7
```

Require npm 11.5+ on contributor machines and in any CI job that can
change the lockfile:

```bash
npm install -g npm@^11.5
npm --version
```

For release-prep dependency churn, major version bumps, or highly
sensitive projects, use a one-command high-sensitivity profile:

```bash
npm install --min-release-age=10
```

## Decision tree

1. Does the project already use npm with a committed `package-lock.json`?
   Keep npm and add `.npmrc`. Migration to pnpm is not required for the
   threat model.
2. Does the project already use pnpm?
   Use pnpm's `minimumReleaseAge` setting in `pnpm-workspace.yaml` or
   `.npmrc` equivalent per pnpm's current docs.
3. Does CI use Node 20 or Node 22 images?
   Install npm 11.5+ before lockfile-changing commands. Older bundled
   npm versions may ignore the gate.
4. Is the job a publish workflow using npm trusted publishing?
   Prefer Node 24 so the workflow has a current npm 11.x and satisfies
   trusted-publishing runtime requirements.

## Override policy

Avoid permanent bypasses. If a dependency must be adopted before the
gate expires:

```bash
npm install --min-release-age=0 <package>
```

Require the commit message or PR body to state:

- package name and version,
- why waiting is not acceptable,
- who approved the override,
- what additional verification was run.

## What to inspect

- `.npmrc` at repo root.
- CI jobs that run `npm install`, `npm update`, or lockfile
  regeneration.
- Developer docs and onboarding docs for npm 11.5+.
- Release runbooks for the 10-day high-sensitivity option.
- Any scripts that pass `--before`; npm cannot use `before` and
  `min-release-age` together.

## Common mistakes

| Mistake | Fix |
|---|---|
| Setting the gate but leaving contributors on npm 10 | Document and enforce npm 11.5+ |
| Assuming `npm ci` updates the lockfile | The gate matters most when the lockfile is regenerated |
| Using `--min-release-age=0` in CI permanently | Remove the bypass and document one-off exceptions |
| Migrating npm projects to pnpm just for this control | Keep npm unless pnpm has independent project value |

## References

- npm config `min-release-age`: <https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age>
- npm trusted publishing: <https://docs.npmjs.com/trusted-publishers>
