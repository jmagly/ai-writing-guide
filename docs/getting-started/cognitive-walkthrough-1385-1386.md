# Cognitive Walkthrough: Issues 1385 and 1386

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

Date: 2026-05-18

Scope: beginner documentation MVP for Start Here, first-success recipes, and entry-point cross-links.

## Walkthrough Scenario

A new user has heard that AIWG can help with their project but does not know the framework names, commands, or provider differences.

## Primary Flow

1. User opens the docs home.
2. User chooses Start Here.
3. User asks the agent: "How best can we use AIWG for this project?"
4. User follows the minimal command path only far enough to verify installation and search capabilities.
5. User picks one first-success recipe.
6. User verifies the chosen path with discovery or a visible agent response.

## Checks

| Question | Result |
|---|---|
| Can the user start without knowing AIWG vocabulary? | Yes. Start Here leads with agent-assisted discovery and links to the Beginner Language Map. |
| Is there a minimal command path? | Yes. `npm install -g aiwg`, `aiwg -version`, project `cd`, `aiwg discover`, and `aiwg show` are shown before framework deployment. |
| Are steward and discover explained without architecture detail? | Yes. Steward is described as the guide; discover is described as search. |
| Is project scope distinguished from global scope? | Yes. The page explains project folder context, global/user defaults, and wrong-folder recovery. |
| Are there at least three recipes? | Yes. Ask the steward to route you, find one capability, start an intake, and verify setup. |
| Does at least one recipe explain steward and discover as user actions? | Yes. Ask The Steward To Route You defines the steward as the guide and discover as search, then uses both in the command path. |
| Does the flow avoid unshipped wizard/status promises? | Yes. It uses existing CLI commands, discovery, show, and current intake slash-command docs. |
| Does the user know where to ask for help or contribute? | Yes. Start Here links to troubleshooting, filing issues, and filing pull requests. |

## Notes

The recommended first mental model is "tell the agent what you are trying to do and ask how AIWG can help." Command examples support the flow, but the docs do not require beginners to memorize the full framework catalog before getting a result.
