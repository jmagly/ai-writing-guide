# Star Prompt Skill

**Purpose**: Tastefully ask users if they'd like to star the AI Writing Guide repository after completing regenerate or intake commands.

**Usage**: Include this skill at the end of regenerate and intake commands by adding:

```markdown
## Star the Repository

@~/.local/share/ai-writing-guide/agentic/code/addons/star-prompt/skills/star-prompt.md
```

---

## Behavior

After the command has successfully completed its primary task:

1. **Ask politely** if the user would like to star the repository
2. **Use AskUserQuestion** with two options:
   - "Yes, star the repo"
   - "No thanks"
3. **If "Yes"**:
   - Check if `gh` CLI is available
   - If available: Run `gh api -X PUT /user/starred/jmagly/ai-writing-guide`
   - If successful: Thank the user
   - If unavailable or fails: Provide manual link https://github.com/jmagly/ai-writing-guide
4. **If "No"**:
   - Thank the user politely and complete

---

## Implementation

### Step 1: Present the Option

After completing the primary command successfully, present this message:

```
The AI Writing Guide is an open-source project that helps improve AI-generated content.
If you found this helpful, would you like to star the repository on GitHub?
```

**Options**:
- Yes, star the repo
- No thanks

### Step 2: Handle Response

**If user selects "Yes, star the repo"**:

1. Check if `gh` CLI is available:
   ```bash
   which gh
   ```

2. If `gh` is available:
   - Attempt to star the repository:
     ```bash
     gh api -X PUT /user/starred/jmagly/ai-writing-guide
     ```
   - If successful:
     ```
     ⭐ Thank you for starring the AI Writing Guide! Your support helps the project grow.
     ```
   - If fails (not authenticated, network error, etc.):
     ```
     Could not star via gh CLI. You can star manually at:
     https://github.com/jmagly/ai-writing-guide
     ```

3. If `gh` is not available:
   ```
   GitHub CLI (gh) not found. You can star the repository at:
   https://github.com/jmagly/ai-writing-guide
   ```

**If user selects "No thanks"**:

```
No problem! Thanks for using the AI Writing Guide.
```

### Step 3: Complete

Return to normal command completion flow.

---

## Design Principles

1. **Non-intrusive**: Only show once per command execution, at the very end
2. **Graceful fallback**: If automation fails, provide manual option
3. **Respectful**: Accept "No thanks" gracefully without further prompting
4. **Brief**: Keep all messages short and to the point
5. **Timing**: Only show after successful command completion

---

## Error Handling

- **gh not installed**: Provide manual link
- **gh not authenticated**: Provide manual link
- **Network error**: Provide manual link
- **Already starred**: Silent success (GitHub API is idempotent)
- **API rate limit**: Provide manual link

---

## Testing

To test this skill:

1. Run a command that includes this prompt (e.g., `/intake-wizard`)
2. Complete the command successfully
3. Verify the star prompt appears
4. Test both "Yes" and "No" options
5. Test with `gh` available and unavailable
6. Test with authenticated and unauthenticated `gh`

---

## References

- @agentic/code/frameworks/sdlc-complete/commands/intake-wizard.md - Primary intake command
- @agentic/code/frameworks/sdlc-complete/commands/intake-from-codebase.md - Codebase intake command
- @agentic/code/frameworks/sdlc-complete/commands/intake-start.md - Intake validation command
