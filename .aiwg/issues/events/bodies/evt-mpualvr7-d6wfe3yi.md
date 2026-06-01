## Summary

The AIWG bootstrap context (AGENTS.md + AIWG.md) is supposed to induce the agent to use skill discovery (`aiwg discover`) for nearly all requests. In practice, when a user pastes a directive that names an AIWG command (e.g., an `address-issues` tracker table), the agent treats it as informational context and asks clarifying questions instead of running discovery and invoking the command.

## Reproduction

1. Start a fresh opencode session in the AIWG workspace
2. Paste an `address-issues` tracker table (e.g., showing #1524, #1409)
3. Observe: agent asks "What would you like me to do with these issues?" instead of running `aiwg discover "address-issues"`

## Expected Behavior

Per skill-discovery Rule 0 (Recognize Directive Boundaries Before Acting):
- Agent classifies the paste as a **new directive** (not continuation)
- Agent runs `aiwg discover "address-issues"` immediately
- Agent fetches the command via `aiwg show command address-issues`
- Agent invokes the address-issues workflow

## Actual Behavior

- Agent treats the tracker table as informational context
- Agent asks clarifying questions instead of acting
- Discovery never runs
- The skill-discovery rule is violated from the very first turn

## Root Cause Analysis

### 1. Rules are deployed but not loaded into system prompt

`skill-discovery.md` is deployed at `.opencode/rule/skill-discovery.md` (401 lines), but opencode's rule loading mechanism does not inject rule content into the agent's system prompt. The rule file exists on disk but is invisible to the agent at runtime.

### 2. AGENTS.md Discover-First Protocol is too weak

The AGENTS.md "Discover-First Protocol" section says:
> Before declining an AIWG request as out of scope or inventing a workflow from memory, run `aiwg discover`

This only fires when the agent is about to **decline** or **improvise**. It does not fire when the agent receives a directive that names a known AIWG command. The agent doesn't decline - it asks clarifying questions, which bypasses the protocol entirely.

### 3. No available_skills entry for address-issues

The `available_skills` list in the system prompt contains ~20 kernel skills (quickrefs + core utilities). `address-issues` is not listed. The agent has no signal that this is an invocable AIWG command.

### 4. No directive classification framing

The bootstrap context lacks an explicit instruction to classify each user turn as "new directive" vs "continuation" and to run discovery on new directives. Rule 0 defines this discipline but Rule 0 is not in the agent's context.

## Proposed Fixes

1. **Elevate Rule 0 to AGENTS.md**: The directive classification logic from skill-discovery Rule 0 should be in the AGENTS.md bootstrap, not buried in a rule file that isn't loaded.
2. **Strengthen Discover-First Protocol**: Change "before declining" to "on every new directive that names an AIWG capability or command".
3. **Add command discovery hint**: AGENTS.md should explicitly state that commands deployed at `.opencode/command/*.md` are discoverable via `aiwg discover` and invocable via `aiwg show`.
4. **Consider opencode rule loading**: Investigate whether opencode supports auto-loading rules from `.opencode/rule/` and wire it if so.