# Star Prompt Addon

Tasteful repository star prompt for successful command completions.

## Overview

The star-prompt addon provides a reusable prompt that encourages users to star the AIWG repository on GitHub after successfully completing commands. It's designed to be non-intrusive, respectful, and gracefully handle all scenarios.

## Features

- **Tasteful**: Only shown after successful completion
- **Respectful**: Accepts "No thanks" without further prompting
- **Graceful**: Handles all error scenarios with fallbacks
- **Automated**: Uses `gh` CLI when available
- **Manual fallback**: Provides direct link when automation unavailable

## Usage

### Integrated Commands

The star prompt is automatically included at the end of these commands:

**SDLC Framework**:
- `/intake-wizard` - Generate intake from description
- `/intake-from-codebase` - Generate intake from codebase analysis
- `/intake-start` - Validate manually-created intake

**Media Marketing Framework**:
- `/intake-from-campaign` - Generate intake from campaign
- `/intake-start-campaign` - Start campaign planning

### Implementation Pattern

Commands include the star prompt section before their References section:

```markdown
## Star the Repository

After successfully completing this command, offer the user an opportunity to star the repository:

**Prompt**:
\```
The AIWG is an open-source project that helps improve AI-generated content.
If you found this helpful, would you like to star the repository on GitHub?

Options:
- Yes, star the repo
- No thanks
\```

**If user selects "Yes, star the repo"**:

1. Check if `gh` CLI is available:
   \```bash
   which gh
   \```

2. If `gh` is available, attempt to star:
   \```bash
   gh api -X PUT /user/starred/jmagly/ai-writing-guide
   \```
   - If successful: "⭐ Thank you for starring the AIWG! Your support helps the project grow."
   - If fails: "Could not star via gh CLI. You can star manually at: https://github.com/jmagly/aiwg"

3. If `gh` is not available:
   \```
   GitHub CLI (gh) not found. You can star the repository at:
   https://github.com/jmagly/aiwg
   \```

**If user selects "No thanks"**:
\```
No problem! Thanks for using the AIWG.
\```
```

## Design Principles

1. **Non-intrusive**: Only shown once per command execution, at the very end
2. **Graceful fallback**: If automation fails, provide manual option
3. **Respectful**: Accept "No thanks" gracefully without further prompting
4. **Brief**: Keep all messages short and to the point
5. **Timing**: Only show after successful command completion

## Error Handling

The prompt handles all scenarios gracefully:

- **gh not installed**: Provide manual link
- **gh not authenticated**: Provide manual link
- **Network error**: Provide manual link
- **Already starred**: Silent success (GitHub API is idempotent)
- **API rate limit**: Provide manual link

## Testing

To test the star prompt:

1. Run a command that includes the prompt (e.g., `/intake-wizard`)
2. Complete the command successfully
3. Verify the star prompt appears
4. Test both "Yes" and "No" options
5. Test with `gh` available and unavailable
6. Test with authenticated and unauthenticated `gh`

## Files

- `skills/star-prompt.md` - Reusable skill definition
- `manifest.json` - Addon metadata
- `README.md` - This file

## References

- @agentic/code/frameworks/sdlc-complete/commands/intake-wizard.md - Example integration
- @agentic/code/frameworks/sdlc-complete/commands/intake-from-codebase.md - Example integration
- @agentic/code/frameworks/sdlc-complete/commands/intake-start.md - Example integration
