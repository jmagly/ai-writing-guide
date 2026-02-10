# Privacy Policy

**Last Updated:** October 17, 2025
**Effective Date:** October 17, 2025

## Overview

The AIWG framework ("the Software") is designed with privacy as a core principle. **We collect zero data. Period.**

## Data Collection

**What we collect:** Nothing.

**What we don't collect:**
- No usage analytics or telemetry
- No personally identifiable information (PII)
- No project metadata or file contents
- No API keys or credentials
- No command history or workflow logs
- No error reports or crash dumps
- No IP addresses or device fingerprints

## How the Framework Works

### Local-Only Processing

All operations occur **entirely on your machine**:

1. **Installation:** Downloads framework files to `~/.local/share/ai-writing-guide`
2. **Agent Deployment:** Copies agent definitions to your project's `.claude/agents/`
3. **Workflow Execution:** AI provider (Claude Code, OpenAI, etc.) processes prompts locally
4. **Artifact Generation:** Documents saved to your project's `.aiwg/` directory

**No network calls** except:
- Downloading framework during installation (from GitHub)
- Updating framework (`aiwg -update` pulls latest from GitHub)
- AI API calls (handled by your AI provider, not us)

### Third-Party Services

**We don't use:**
- Google Analytics
- Error tracking (Sentry, Rollbar)
- CDNs for tracking
- Marketing pixels
- Social media trackers

**You interact with:**
- **GitHub:** Repository hosting (subject to [GitHub Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement))
- **AI Providers:** Claude Code, OpenAI, etc. (subject to their privacy policies)

## Your Data Ownership

**You own everything:**
- All generated artifacts (intake docs, architecture, tests, etc.)
- All project files in `.aiwg/` directories
- All agent customizations you make
- All command outputs

**MIT License applies to framework code** (prompts, scripts, templates), **not your generated content**. Your artifacts are yours, no strings attached.

## AI Provider Privacy

When you use this framework, **your AI provider processes your prompts**:

### Claude Code / Anthropic

- **Privacy Policy:** https://www.anthropic.com/privacy
- **Data Usage:** Anthropic may use prompts to improve models (see their policy)
- **Opt-Out:** Available for Claude Team/Enterprise (consult Anthropic docs)

### OpenAI / Codex

- **Privacy Policy:** https://openai.com/policies/privacy-policy
- **Data Usage:** OpenAI may use prompts to improve models (see their policy)
- **Opt-Out:** Available for API users (set `data_retention: false` in API calls)

**We have no control over third-party AI provider data practices.** Read their policies carefully.

## Sensitive Data Handling

**Your responsibility:**
- Do not include secrets (API keys, passwords) in prompts
- Do not include PII unless you've reviewed your AI provider's privacy policy
- Do not include proprietary/confidential information unless you trust your AI provider
- Add `.aiwg/` to `.gitignore` if artifacts contain sensitive data

**Framework protections:**
- No secrets storage (framework never sees credentials)
- No auto-commit of `.aiwg/` (you control version control)
- No file uploads to external services
- No telemetry of file contents

## Cookie Policy

**We don't use cookies.** This framework is a command-line tool, not a web service.

If you visit our GitHub repository, GitHub may set cookies (see [GitHub Cookie Policy](https://docs.github.com/en/site-policy/privacy-policies/github-cookies)).

## Children's Privacy

This framework is not directed at children under 13. We don't knowingly collect data from anyone (including children), because we don't collect data at all.

## International Users

**No cross-border data transfers** because we don't collect data.

Your AI provider may transfer data internationally (e.g., Anthropic/OpenAI servers). Consult their privacy policies.

## Data Retention

**We retain nothing** because we collect nothing.

**You control retention:**
- Delete `.aiwg/` directories to remove artifacts
- Delete `~/.local/share/ai-writing-guide` to uninstall framework
- Your AI provider retains prompt history per their policies

## Your Rights

### GDPR (EU Users)

Not applicable—we don't process personal data.

If your AI provider processes your data, exercise rights with them (access, deletion, portability, etc.).

### CCPA (California Users)

Not applicable—we don't sell personal information or collect California residents' data.

If your AI provider processes your data, exercise rights with them.

### Other Jurisdictions

We comply by not collecting data in the first place. Universal compliance through non-collection.

## Security

**No data to secure** because we don't collect data.

**Your security responsibilities:**
- Keep Node.js and AI provider tools updated
- Use strong passwords for AI provider accounts
- Monitor API usage for unauthorized access
- Review generated artifacts for accidental secret inclusion

**Framework security:**
- Open source (audit the code: https://github.com/jmagly/aiwg)
- No external dependencies for core functionality (22 scripts, zero npm packages)
- No network calls except GitHub downloads and AI API (which you initiate)

## Changes to This Policy

We'll update this policy if our practices change (e.g., if we ever add analytics, which we don't plan to).

**Notification method:** Update this file, update "Last Updated" date, commit to repository.

**Your options:**
- Check this file periodically
- Watch repository for changes
- If we ever start collecting data (we won't), we'll make it very obvious

## Contact

**Questions?** [Open a GitHub issue](https://github.com/jmagly/aiwg/issues) or [start a discussion](https://github.com/jmagly/aiwg/discussions).

**Email:** Not provided (to avoid spam). Use GitHub for all communication.

## Summary (TL;DR)

1. **We collect zero data**
2. **Everything processes locally**
3. **You own your artifacts**
4. **Your AI provider may collect data** (read their policies)
5. **No cookies, no tracking, no telemetry**
6. **Open source** (audit anytime: https://github.com/jmagly/aiwg)

**Privacy by design. Privacy by default. Privacy always.**
