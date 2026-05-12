# Secret Rotation — Gitea Release Tokens

Audit finding F6 (Wave 4 of #1278) flagged that the Gitea release-bearing
secrets had no documented rotation cadence. The compensating-controls bundle
for the Gitea publish leg (#1286 / A10) treats periodic rotation as one of
the three controls that substitute for the missing `environment:`-scoped
secrets + deployment-protection-rules surface that GitHub Actions provides
and Gitea Actions currently does not. The other two are signed-tag verify
(#1299 / A9, already in place — that's the hard gate) and the manual-approval
record injected into the Gitea release body.

This document is the operator procedure for rotating `secrets.NPM_TOKEN`
on the Gitea repo. It applies to the Gitea API token (`gta_…` format) that
drives both `gitea-release.yml` and the Gitea-registry leg of
`npm-publish.yml` — despite its name, this is not an npmjs.org token. The
npmjs.org token (`NPMJS_TOKEN`) is being phased out in favor of the GitHub
Actions OIDC trusted-publishing path (#1283 / A5); rotate it on the same
cadence until A5's first verified release lands and the operator removes
it from the Gitea repo entirely.

## When to rotate

| Trigger | Cadence |
|---|---|
| Scheduled rotation | Every 90 days (quarterly) |
| Maintainer offboarding | Immediately, on the same day |
| Suspected runner compromise | Immediately |
| Gitea audit-log anomaly | Within 24 hours of detection |
| Token believed to have been logged or echoed | Immediately |
| First successful release after the **previous** rotation | Confirms the rotation worked; record the date as the start of the next 90-day window |

Calendar reminders are owner-driven, not automation-driven — there is no
external service watching token age right now. The recommended pattern is
a recurring calendar entry on the 1st of each quarter (Jan/Apr/Jul/Oct).
Pair the rotation with the per-quarter security review on #1278's
follow-up tracker.

## How to rotate

The procedure is single-operator, runs in under 10 minutes, and never
echoes the token to logs or shell history. Do not paste the token into
a chat client, an issue body, or a commit message — see
`.claude/rules/token-security.md` for the full handling rules.

### Step 1 — Generate a new Gitea token

1. Log in to Gitea (`git.integrolabs.net`) as the AIWG release-bearing
   account.
2. **User Settings → Applications → Manage Access Tokens**.
3. Click **Generate New Token**.
4. Token name: use a date-stamped pattern, e.g. `aiwg-publish-2026Q2`.
   The date stamp makes it trivial to read the token-list page and
   confirm the right token is in service.
5. Scopes (minimum viable set):
   - `write:package` — required by both publish legs to push to the
     Gitea npm registry.
   - `write:repository` — required by `gitea-release.yml` to create
     release records on the AIWG repo.
   - **Do not** grant `admin:*`, `write:user`, or `write:organization`.
     If the token leaks, the scopes above limit the blast radius to the
     AIWG repository and its package registry — they do not authorize
     account or organization mutations.
6. **Generate Token**. Copy the value once — Gitea will not show it again.

### Step 2 — Update the repo secret

1. Repo → **Settings → Secrets and Variables → Actions**.
2. Find `NPM_TOKEN`. Click **Edit**.
3. Paste the new token value.
4. Save.

Do not delete the old token from Gitea yet — keep it parked for the
post-rotation verification step below.

### Step 3 — Verify the rotation worked

The cheapest verification path is a tag-push using the next available
pre-release version. This exercises both publish legs and the release-
creation workflow against the new token without affecting the stable
channel.

```bash
# Choose the next pre-release version, e.g. v2026.6.0-rc.1
# Sign and push the tag — verify-signed-tag.sh (A9) gates it.
git tag -s v2026.6.0-rc.1 -m "rc.1 — NPM_TOKEN rotation verification"
git push origin main --tags
```

Watch the run on Gitea Actions:

- `Publish to npm registries` — both pre-release jobs should reach
  `Affirm dist-tag on Gitea` and exit clean.
- `Create Gitea Release` — should reach `Create or reuse Gitea release`
  and produce a release entry with the new approval record line.

Then `npm install -g aiwg@2026.6.0-rc.1 --registry=https://git.integrolabs.net/api/packages/roctinam/npm/`
on a clean host as a smoke test.

### Step 4 — Revoke the old token

Only after the verification run is green:

1. Gitea → **User Settings → Applications → Manage Access Tokens**.
2. Locate the previous-quarter token (e.g. `aiwg-publish-2026Q1`).
3. **Delete**.

### Step 5 — Record the rotation

Append a rotation-record entry to this file, under "Rotation history"
below. The record proves the cadence is being honored and feeds the
quarterly security review.

## Rotation history

| Date | Performed by | Token name | Trigger | Verification |
|---|---|---|---|---|
| _(seed entry — first rotation will be the next quarter after Wave 4 lands)_ | | | | |

## What if rotation breaks the publish

If the post-rotation test tag fails on either publish leg or on release
creation:

1. **Do not roll forward.** Revert the repo secret to the previous token
   value (you have not yet revoked it in step 4, so it is still valid).
2. Inspect the failed run's output. Common causes:
   - New token's scopes are insufficient — re-generate with the full
     `write:package` + `write:repository` pair.
   - Token name conflicts with an existing token (Gitea normally allows
     this but some setups reject duplicates).
   - Copy/paste error — regenerate, do not edit by hand.
3. File a `#1278`-tagged follow-up issue if the failure surfaces a
   workflow bug rather than a token issue.

## Related rules and procedures

- `.claude/rules/token-security.md` — base token-handling rules (heredoc
  scoping, no echo, file permissions). Applies to every token in the
  AIWG project, not just `NPM_TOKEN`.
- `.claude/rules/dev-secret-hygiene.md` — secret rotation procedure
  required per-project. This file is AIWG's instance.
- `.gitea/workflows/README.md` — release-secret policy section, points
  back here for the rotation cadence.
- `.aiwg/architecture/adr-gitea-release-compensating-controls.md` — why
  rotation is in the compensating bundle in the first place.
- `tools/ci/verify-signed-tag.sh` — the signed-tag gate that runs ahead
  of any token-driven publish. Tag signature is the hard gate; token
  rotation is one of the soft gates.
