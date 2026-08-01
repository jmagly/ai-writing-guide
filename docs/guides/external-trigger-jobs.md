# External-trigger jobs

AIWG external jobs are single-shot executions. The operating system or CI owns time; AIWG owns the reviewed job contract, work-item claim, provider invocation, evidence checks, and completion record. There is no resident AIWG scheduler.

## Contract

The versioned schema is `schemas/jobs/external-job.v1.schema.json`. A minimal flow looks like this:

```yaml
apiVersion: jobs.aiwg.io/v1
kind: ExternalJob
metadata:
  name: publish-approved-item
  revision: "1"
spec:
  trigger:
    type: external
  executor:
    provider: codex
    mode: exec
    workspace: /srv/aiwg/publisher
    prompt: prompts/publish.md
    resultSchema: schemas/job-result.json
    binary: /usr/local/bin/codex
  workItem:
    provider: gitea
    baseUrl: https://git.example.test
    repository: team/publication-queue
    tokenFile: /run/credentials/aiwg-gitea-token
    eligibleLabels: [publication-job]
  approval:
    required: true
    label: approved-for-publish
  security:
    allowedOrigins: [https://social.example.test]
    allowedAccounts: [brand-main]
    approvedAttachmentRoots: [/srv/aiwg/publisher/approved-assets]
    sensitiveValueFiles: [/run/credentials/browser-session]
  completion:
    require: [external-result-url, issue-comment, idempotency-key, verification]
```

The approval gate defaults to required. Setting `approval.required: false` is an explicit reviewed policy change. Credential references must be absolute private files outside the executor workspace. Values are never rendered into scheduler output or provider arguments.

The prompt and output schema are relative to the canonical workspace. Filesystem roots are rejected as workspaces, state directories, credential references, or attachment roots. The runner sends the prompt, issue identifier, idempotency key, approval state, origins, accounts, and attachment roots through provider stdin. The provider's structured result is rejected unless its URL origin, account, real attachment locations, verification evidence, and idempotency key match the contract.

## Commands

```console
aiwg job validate jobs/publish.yaml
aiwg job render-cron jobs/publish.yaml --format cron
aiwg job render-cron jobs/publish.yaml --format systemd
aiwg job render-cron jobs/publish.yaml --format gitea-actions
aiwg job run jobs/publish.yaml --once --json
```

Generated examples contain paths and commands only. Configure authentication in the host's protected runtime facility, never in cron text, unit files, workflow YAML, repository files, issue bodies, or command-line arguments.

## Claims, retries, and evidence

Eligible Gitea issues must have every `eligibleLabels` entry and, by default, the approval label. A runner writes a time-limited claim marker, waits for the configured election window, and only the lowest matching comment ID proceeds. Local exclusive locks prevent overlap on one host; the comment election handles contenders on different hosts using the same service identity.

The idempotency key is stable for the job name, contract revision, and issue number. Completion markers are accepted only from the authenticated service identity. A completed local result is written with private permissions before the completion comment, allowing a retry to finish the tracker update without repeating the external action. Providers receive the same key and must use it when checking the external system.

Run JSONL, final response, stderr, timestamps, and results live below `.aiwg/jobs/` (or `--state-dir`) with private permissions. Configured sensitive values and common authorization header patterns are redacted before output is persisted. Completion comments contain only the result URL, account identifier, verification summary, and idempotency key.

## Operational boundary

Review the flow, prompt, result schema, provider configuration, and external trigger together. AIWG verifies declared boundaries and completion evidence; provider/browser policy must independently enforce its own origin and account permissions. A failed executor or failed evidence check creates a non-completion issue marker and does not write a completion marker. The same contract revision will not automatically execute again after an uncertain failure; review the evidence and advance `metadata.revision` only when a new attempt is safe.
