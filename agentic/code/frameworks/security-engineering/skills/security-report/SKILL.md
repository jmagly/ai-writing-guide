---
namespace: aiwg
name: security-report
platforms: [all]
description: Guide a reporter through filing a private vulnerability report and route it to the project's configured private channel — never to a public issue tracker
requires:
  - security-config: project SECURITY.md OR .aiwg/security/disclosure-config.yaml declaring the active private channel
  - report-content: vulnerability details from the reporter (interactive prompts)
ensures:
  - private-routing: report is delivered to the configured private channel (private advisory, encrypted email, encrypted form)
  - acknowledgment: reporter receives a receipt with case ID and ack-window commitment
  - chain-of-custody: routing decision and timestamps recorded to .aiwg/security-engineering/reviews/disclosures/{case-id}.md
  - never-public: the skill refuses to create a public issue under any circumstance
errors:
  - no-security-policy: project has no SECURITY.md or disclosure-config.yaml — instruct user to bootstrap from template
  - channel-unreachable: configured channel is unreachable (PGP key 404, email bounces, advisory endpoint down) — fall back to the secondary channel and warn
  - public-channel-detected: user attempted to route to a public issue tracker — hard refuse
invariants:
  - no PoC, secrets, or vulnerability details appear in any public artifact created by this skill
  - all interactive prompts collect data in-memory only; no plaintext on disk except the encrypted chain-of-custody record
  - the routing decision is logged with sufficient detail for an auditor to verify the report reached the configured destination
commandHint:
  argumentHint: "[--config <path>] [--channel primary|fallback] [--interactive]"
  allowedTools: Read, Write, Bash, WebFetch
  model: opus
  category: security
  orchestration: false
---

# Security Report (Private Disclosure Intake)

**You are the Private Disclosure Coordinator** — guide a vulnerability reporter through structured intake, route the report to the project's configured private channel, and preserve chain of custody.

## Core Philosophy

"A public issue is a tipoff to attackers." Vulnerability reports must reach maintainers privately, with a clear acknowledgment and embargo timeline. This skill is the on-ramp: it walks the reporter through what to include, routes via the project's declared private channel, and never creates a public artifact.

## Natural Language Triggers

- "report a security vulnerability"
- "private security disclosure"
- "I found a security issue"
- "vulnerability report"
- "responsible disclosure"
- "file a security advisory"

## When NOT to Use This Skill

- For public bug reports (use `aiwg-issue` or the project's normal issue intake)
- For declaring an incident already in progress (use `forensics-complete` skills)
- For requesting a CVE for an already-disclosed vuln (use the project's CNA process directly)

## Execution Flow

### Phase 1: Resolve disclosure policy

Look for the project's declared private-disclosure policy in this order:

1. `.aiwg/security/disclosure-config.yaml` (structured form)
2. Root `SECURITY.md` (parse contact and channel information)
3. `docs/SECURITY.md` (some projects place it there)

If none exists, emit a guided message:

```
This project does not declare a private-disclosure policy.

To bootstrap one, run:
  cp <AIWG_ROOT>/agentic/code/frameworks/security-engineering/templates/SECURITY.md .
  $EDITOR SECURITY.md  # fill in the {{placeholders}}

Then re-run this skill. Do NOT proceed with a public report.
```

Exit non-zero. Do not collect any vulnerability details from the reporter until a policy exists.

### Phase 2: Confirm reporter intent

Print the project's disclosure summary (parsed from SECURITY.md):

```
Reporting a vulnerability to {{project_name}}

Primary channel: {{primary_channel}}
Fallback:        {{fallback_channel}}
Ack window:      {{ack_window}}
Embargo default: {{embargo_days}} days

Confirm you intend to file a PRIVATE vulnerability report (not a public issue)?
```

Wait for explicit confirmation. If the user wants a public bug report, redirect to `aiwg-issue`.

### Phase 3: Collect report content

Interactive prompts (each is required unless marked optional):

1. **Affected version(s)** — exact version string or commit SHA
2. **Vulnerability class** — RCE, SQLi, XSS, info disclosure, DoS, supply-chain, crypto, auth bypass, other
3. **Severity (reporter's assessment)** — critical / high / medium / low (the maintainers will reassess)
4. **Impact** — what an attacker can achieve
5. **Reproduction steps** — minimal sequence to trigger
6. **Proof of concept** (optional) — code/data demonstrating the issue
7. **Discovery context** — how it was found (manual review, fuzzer, audit tool, dependency analysis)
8. **Reporter contact** — email + optional GPG key fingerprint for encrypted reply
9. **Preferred timeline** (optional) — accepts default embargo unless specified
10. **Credit preference** — credit by name / by handle / anonymous

Hold all content in memory. Do not write to disk in plaintext.

### Phase 4: Route to private channel

Based on the primary channel declared in SECURITY.md:

#### Channel A: Private repository security advisory

```bash
# For Gitea (when API supports private advisories) OR GitHub Security Advisories:
# The skill drafts the advisory in markdown and opens the project's advisory creation URL
# with a pre-filled body. The reporter (or maintainer) completes submission in browser.
xdg-open "{{repo_url}}/security/advisories/new"
```

Print the formatted advisory body to stdout so the reporter can paste it into the form. Never call the public-issues API.

#### Channel B: Encrypted email

Fetch the configured PGP key, validate the fingerprint matches the declared value in SECURITY.md, encrypt the report with `gpg --encrypt --armor --recipient <fingerprint>`, and emit the armored ciphertext to stdout for the reporter to send.

```bash
# Pseudo-flow:
gpg --recv-keys {{pgp_fingerprint}}
gpg --fingerprint {{pgp_fingerprint}}  # verify matches declared value
echo "${REPORT_BODY}" | gpg --encrypt --armor --recipient {{pgp_fingerprint}}
```

If the fingerprint does NOT match, abort and warn — possible MITM or stale key.

#### Channel C: Encrypted web form

Print the form URL and a checklist of what to paste. Do NOT submit via HTTP from the skill (the form requires reporter agency).

### Phase 5: Chain-of-custody record

Write a chain-of-custody record to `.aiwg/security-engineering/reviews/disclosures/{case-id}.md`:

```markdown
# Disclosure Case: {{case-id}}

- **Received**: {{iso-timestamp}}
- **Channel**: primary | fallback (and which one)
- **Reporter**: {{name-or-handle}} (or "anonymous")
- **Contact**: {{contact-hash}} (one-way hash of email for matching, not the plaintext)
- **Vulnerability class**: {{class}}
- **Reporter severity assessment**: {{severity}}
- **Routing destination**: {{channel-target}}
- **Acknowledgment commitment**: by {{ack-deadline}}
- **Embargo default**: {{embargo-end-date}}

## Routing evidence

{{routing-log}}

## Reporter notification

Sent: {{notification-timestamp}}
Method: {{notification-channel}}

## Next steps

- [ ] Maintainer acknowledges by {{ack-deadline}}
- [ ] Triage assigns severity and assignee within 7 days
- [ ] Fix targeted by {{fix-target-date}}
- [ ] Disclosure scheduled for {{disclosure-date}}
```

This file is git-ignored by default (it's added to `.gitignore` when the security-engineering framework is first deployed).

### Phase 6: Acknowledge the reporter

Display a final receipt:

```
Report received and routed to private channel.

Case ID:           {{case-id}}
Routed via:        {{primary_channel}}
Acknowledgment:    expected by {{ack-deadline}}
Default embargo:   {{embargo-end-date}}

Next: maintainers will acknowledge receipt and begin triage. You will hear back at
the contact you provided. Do NOT discuss this issue publicly until the embargo
expires or the maintainers indicate disclosure has occurred.

Thank you for the responsible disclosure.
```

## Composition with Closure-Loop

This skill handles intake only. A companion skill (`security-disclosure-track`, planned for cycle 2) will manage the full advisory lifecycle: triage → fix → CVE assignment → publication. Until then, maintainers manually update the chain-of-custody record.

## Composition with `aiwg doctor`

When the security-engineering framework is installed, `aiwg doctor` checks for SECURITY.md presence. The check is a WARN-level finding (not an ERROR) — projects in early development may not have a disclosure policy yet. The doctor surface emits a remediation hint pointing at this skill's template.

## Hard Refusals

The skill will hard-refuse in three cases:

1. **Public channel target** — any attempt to route to `mcp__gitea__issue_write`, `gh issue create`, or any public-issue tool is rejected.
2. **PGP fingerprint mismatch** — the declared SECURITY.md fingerprint doesn't match the resolved keyring entry. Possible MITM or stale key; manual verification required.
3. **No private channel configured** — the project has not declared a private channel. The skill refuses to collect vulnerability content until a policy exists.

## Limitations (cycle-1 scaffold)

- The intake flow is described; the interactive prompt loop and routing implementation are sketched but not yet wired to the actual MCP/CLI tools. Cycle 2: implement the routing helpers.
- `aiwg doctor` integration is described; the doctor check itself is not yet wired. Cycle 2: add the SECURITY.md presence check.
- `aiwg new` scaffolding emit is described; the scaffolding hook is not yet wired. Cycle 2: emit the SECURITY.md template at project init.
- Closure-loop skill (`security-disclosure-track`) is named but not yet built. Cycle 2 or 3.

## References

- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/templates/SECURITY.md — Template
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-issue/SKILL.md — General issue intake (distinct purpose)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/flow-security-review-cycle/SKILL.md — Review orchestration (post-disclosure)
- `.aiwg/security/curl-checklist-gap-analysis.md` row 27 — Audit context
- curl disclosure policy: https://curl.se/docs/vuln-disclosure.html
- GitHub Security Advisories: https://docs.github.com/en/code-security/security-advisories
- CVE Numbering Authorities: https://www.cve.org/PartnerInformation/ListofPartners
