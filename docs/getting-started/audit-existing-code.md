# Auditing Existing Code

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

You have a codebase and you want to know what's wrong with it. Security issues, missing tests, dead code, dependency risks, quality problems — AIWG runs structured audits and produces findings you can act on.

You don't need to set up a full project workflow. Just point AIWG at the code and ask.

---

## Quick audit (no setup)

```bash
npm install -g aiwg
cd /path/to/your/project
aiwg use all --provider <provider>
aiwg index build --all
aiwg regenerate --provider <provider>
```

Since this is an existing project, ask the agent to confirm the regenerated
context before the audit:

```
/aiwg-regenerate
```

Then:

```
Run a security audit on this codebase
```

```
Find all the places where user input isn't validated
```

```
What tests are missing for the most critical paths?
```

That's it. No intake, no configuration, no phases. Just ask.

---

## Targeted audits

### Security

```
/flow-security-review-cycle
```

Or with focus:

```
Run a security review focused on authentication and session management
```

```
Check for SQL injection, XSS, and broken access control
```

```
Review the API endpoints for authorization gaps
```

The security agents look at your actual code, not just generic patterns. Findings include the file, line, and a specific recommendation.

### Test coverage

```
/cleanup-audit
```

Or:

```
Show me what has no test coverage
```

```
Find the most complex functions with no tests
```

```
Which user flows have no end-to-end tests?
```

### Code quality

```
/cleanup-audit
```

```
Find dead code — functions, exports, and files that nothing calls
```

```
Show me the most complex files in this project (by cyclomatic complexity)
```

```
What technical debt would a senior engineer prioritize?
```

### Dependencies

```
Find outdated dependencies that have known security issues
```

```
Which dependencies are unused?
```

```
What would break if we upgraded React to the latest version?
```

---

## Getting a written report

AIWG can produce a structured report you can share with a team or include in a PR:

```
Generate a security audit report for this codebase
```

```
Write a technical debt summary with priorities and effort estimates
```

```
Create a test coverage gap analysis with recommendations
```

Reports land in `.aiwg/reports/`.

---

## Ongoing security gates

If you want audits to run automatically (before commits, on a schedule, or when files change), see [Daemon and Automation](daemon-and-automation.md). The `security-sentinel` behavior runs continuously.

---

## Iterative fixing

Found issues you want to fix? Use Al to run them down:

```
/ralph "Fix all the security issues found in the audit" --completion "security review passes"
```

Al will iterate — fix, re-audit, fix again — until the completion criterion is met or it needs your input.

---

## After the audit

- Found too much to fix at once? Ask: `Prioritize these findings by risk and effort`
- Want to prevent regressions? Ask: `Add tests that would catch these issues`
- Need to explain findings to stakeholders? Ask: `Write an executive summary of what we found`
