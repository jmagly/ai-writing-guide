# Scope Enforcement Prompt

Importable prompt for maintaining task boundaries during execution.

## Usage

```markdown
@~/.local/share/ai-writing-guide/agentic/code/addons/context-curator/prompts/scope-enforcement.md
```

## Prompt

Throughout task execution, enforce scope boundaries to prevent distractor pollution.

### Scope Declaration

At task start, declare boundaries:

```
TASK BOUNDARIES:
- Time: [range] — data outside this is OUT OF SCOPE
- Entity: [filter] — entities outside this are OUT OF SCOPE
- Operation: [type] — unrelated operations are OUT OF SCOPE
- Output: [format] — additional outputs are OUT OF SCOPE
```

### Scope Checks

At each significant step, verify:

```
SCOPE CHECK:
[ ] Data I'm using is within declared time range
[ ] Entities I'm referencing match the declared filter
[ ] My operation matches what was requested
[ ] I'm not adding unrequested analysis
```

### Scope Violation Recovery

If you notice you've incorporated out-of-scope data:

```
SCOPE VIOLATION DETECTED:
- What: [what out-of-scope data was used]
- Where: [at what step it was incorporated]
- Impact: [how it affected reasoning]

RECOVERY:
1. Discard conclusions that relied on out-of-scope data
2. Return to last checkpoint with clean scope
3. Re-process using only in-scope data
4. Verify output is scope-compliant
```

### Scope Expansion Request

If task cannot be completed within declared scope:

```
SCOPE EXPANSION NEEDED:
- Current scope: [declared boundaries]
- Blocking issue: [why task cannot complete]
- Proposed expansion: [specific additional scope needed]
- Justification: [why expansion is necessary]

AWAITING CONFIRMATION before proceeding with expanded scope.
```

### Final Scope Verification

Before delivering output:

```
FINAL SCOPE VERIFICATION:
✓ All data references are within declared scope
✓ All entities match declared filter
✓ Output addresses only what was requested
✓ No "bonus" analysis or tangents included
✓ Format matches expected output

OUTPUT IS SCOPE-COMPLIANT: [Yes/No]
```

## Anti-Patterns to Avoid

| Anti-Pattern | What It Looks Like | Why It's Wrong |
|--------------|-------------------|----------------|
| Scope creep | "I'll also include..." | Wasn't requested |
| Context inflation | "For completeness..." | Adds distractors |
| Entity confusion | Using similar names | Wrong entity |
| Time drift | Including other periods | Wrong timeframe |
| Helpful expansion | "You might also want..." | Unsolicited |

## Scope-Compliant Language

**DON'T SAY**:
- "I've also included..."
- "For additional context..."
- "While I was at it..."
- "You might find it useful..."

**DO SAY**:
- "Within the specified scope..."
- "Addressing the requested..."
- "Limiting to [declared scope]..."
- "If you need [expansion], please confirm."
