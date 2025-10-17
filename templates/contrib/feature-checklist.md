# Feature Contribution Checklist

Use this checklist to ensure your contribution is complete before creating a PR.

## Setup ✓

- [ ] Forked repository: `aiwg -contribute-start {feature}`
- [ ] Workspace initialized: `.aiwg/contrib/{feature}/`
- [ ] Branch created: `contrib/{username}/{feature}`
- [ ] SDLC agents deployed (optional)

## Intake ✓

- [ ] Intake template completed
- [ ] Problem statement clear
- [ ] Solution approach defined
- [ ] Deliverables listed
- [ ] Dependencies identified
- [ ] Success criteria defined

## Implementation ✓

### Code

- [ ] Tool/script created in appropriate directory
- [ ] Follows existing AIWG patterns
- [ ] Error handling implemented
- [ ] Edge cases handled
- [ ] Comments/JSDoc for public functions

### Integration

- [ ] Integrates with existing AIWG components
- [ ] Reuses existing utilities where possible
- [ ] CLI routing added to install.sh (if applicable)
- [ ] Follows naming conventions

## Documentation ✓

### Required Documentation

- [ ] README.md updated (add feature to list)
- [ ] Quick-start guide created (`docs/integrations/{feature}-quickstart.md`)
- [ ] Integration documentation (prerequisites, setup, usage, troubleshooting)

### Documentation Quality

- [ ] Clear prerequisites listed
- [ ] Step-by-step instructions
- [ ] Command examples provided
- [ ] Expected output shown
- [ ] Troubleshooting section included
- [ ] Links to related documentation

## Quality Gates ✓

- [ ] Markdown lint passes
- [ ] Manifest sync current
- [ ] No breaking changes (or documented in PR)
- [ ] Quality score >= 80%: `aiwg -contribute-test {feature}`

## Testing ✓

- [ ] Tested on target platform
- [ ] Tested error scenarios
- [ ] Tested with real user workflow
- [ ] Edge cases validated

## Git Hygiene ✓

- [ ] All changes committed
- [ ] Commit messages follow conventions
- [ ] No debug code or console.logs
- [ ] No commented-out code
- [ ] No secrets or API keys
- [ ] Branch pushed to fork

## PR Preparation ✓

- [ ] Quality validated: >= 80%
- [ ] PR description generated: `aiwg -contribute-pr {feature}`
- [ ] PR type selected (feature/bugfix/docs/refactor)
- [ ] Breaking changes documented (if applicable)
- [ ] Ready for maintainer review

## Post-PR ✓

- [ ] Monitor PR: `aiwg -contribute-monitor {feature}`
- [ ] Respond to feedback: `aiwg -contribute-respond {feature}`
- [ ] Sync with upstream if needed: `aiwg -contribute-sync {feature}`
- [ ] Address any CI failures

---

**Tips:**

- Use `aiwg -contribute-status {feature}` to check progress
- Use `aiwg -contribute-test {feature} --verbose` to see detailed validation
- Review [docs/contributing/contributor-quickstart.md](../../docs/contributing/contributor-quickstart.md) for guidance
- Don't hesitate to ask questions in PR comments
