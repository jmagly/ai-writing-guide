# Contributing

## Manifests and READMEs

We maintain a `manifest.json` and a README/manifest.md in every directory to help agents and humans quickly understand
contents without extra tooling.

- Add or update files? Update the directory's `manifest.json`.
- Need help? Use the generator:
  - `node tools/manifest/generate-manifest.mjs <dir> [--write-md]`
- Validate manifests before pushing:
  - `node tools/manifest/check-manifests.mjs`

## Optional pre-commit hook

Create `.git/hooks/pre-commit`:

```bash
#!/usr/bin/env bash
node tools/manifest/check-manifests.mjs || exit 1
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Markdown Lint

Run `npm exec markdownlint-cli2 "**/*.md"` (Node ≥18) before PRs.

## Testing Requirements

Significant changes (new agents, commands, skills, CLI changes, framework modifications) require full regression
testing across all supported providers before merging.

See [Testing Requirements](docs/contributing/testing-requirements.md) for:

- Full regression testing criteria
- Provider validation matrix
- Test categories and coverage thresholds
- PR requirements checklist

## Scope

- SDLC framework: `agentic/code/frameworks/sdlc-complete/`
- Marketing framework: `agentic/code/frameworks/media-marketing-kit/`
- Addons (utilities, voice, writing): `agentic/code/addons/`
- Command documentation: `docs/commands/`

## Development Kit

Use the AIWG Development Kit to create and extend packages:

### Creating Packages

```bash
# Create a new addon (standalone utilities)
aiwg scaffold-addon my-addon --description "My utilities"

# Create a new extension (framework expansion pack)
aiwg scaffold-extension hipaa --for sdlc-complete --description "HIPAA compliance"

# Create a new framework (full lifecycle - advanced)
aiwg scaffold-framework my-lifecycle --phases "plan,build,test,deploy"
```

### Adding Components

```bash
# Add agents to a package
aiwg add-agent code-helper --to my-addon --template simple
aiwg add-agent security-reviewer --to my-addon --template complex
aiwg add-agent workflow-manager --to my-addon --template orchestrator

# Add commands to a package
aiwg add-command quick-check --to my-addon --template utility
aiwg add-command convert-docs --to my-addon --template transformation
aiwg add-command full-review --to my-addon --template orchestration

# Add skills to a package
aiwg add-skill voice-apply --to voice-framework

# Add templates to a package
aiwg add-template audit-checklist --to sdlc-complete --type checklist --category security
```

### Validating Packages

```bash
# Validate structure
aiwg validate my-addon --verbose

# Auto-fix issues
aiwg validate my-addon --fix
```

### In-Session Commands

Within Claude Code sessions, use interactive commands for AI-guided creation:

```bash
/devkit-create-addon my-addon --interactive
/devkit-create-extension hipaa --for sdlc-complete --interactive
/devkit-create-agent security-auditor --to my-addon --template complex
/devkit-create-command review-code --to my-addon --template orchestration
/devkit-validate my-addon --fix --verbose
/devkit-test my-addon --verbose
```

### Documentation

- [Development Kit Overview](docs/development/devkit-overview.md)
- [Creating Addons](docs/development/addon-creation-guide.md)
- [Creating Extensions](docs/development/extension-creation-guide.md)
- [Creating Frameworks](docs/development/framework-creation-guide.md)
