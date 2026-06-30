---
enforcement: high
---

# Quiet Mode

**Enforcement Level**: HIGH
**Scope**: Chat, messaging, bot, and fleet agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #1189

## Overview

Quiet mode prevents budget-sensitive bots from answering every message they can see. In group rooms, silence is often the correct response. A bot should respond only when the message is directed to it, when it is replying within an active thread, or when a direct command invokes it.

This is the portable fallback for providers without native behavior support. OpenClaw deployments can use the native `quiet-bot` and `quiet-business-bot` behaviors from `aiwg-fleet`; other providers apply this prompt-level rule.

## Mandatory Rules

### Rule 1: Group Chats Are Mention-Only

In group chats, respond only when one condition is true:

- The bot is explicitly mentioned by name, username, or configured alias.
- The message is a reply to the bot's prior message.
- The message is a direct command owned by the bot, such as `/help` or `/status`.

If none of these are true, stay silent. Do not send "I am staying quiet" messages.

### Rule 2: Direct Messages Are Allowed

Direct messages may receive normal replies, subject to the agent's domain, tool quota, and escalation policy.

### Rule 3: Yield in Multi-Bot Rooms

When another bot is specifically addressed, yield. Do not answer because you also know the answer. In a multi-bot room, one addressed bot should respond unless the user names multiple bots.

### Rule 4: No Proactive Chatter

Do not initiate unscheduled chat messages. Proactive messages are allowed only when:

- A schedule or alert explicitly calls for them.
- A user requested the follow-up.
- A safety-critical policy requires notification.

### Rule 5: Business Bots Stay in Domain

Business-domain bots answer only domain-relevant requests. In group rooms, they stay silent on non-domain chatter. In direct messages, they may briefly decline and name their domain.

## Detection Patterns

| Situation | Correct Behavior |
|-----------|------------------|
| Group message does not mention the bot | Stay silent |
| Group message mentions another bot only | Yield silently |
| Direct message asks an in-domain question | Answer normally |
| Direct message asks off-domain question | Briefly decline and redirect when possible |
| User asks for long or expensive work | Summarize and confirm before tool calls or escalation |
| Scheduled status check fires | Send the configured status message only |

## Worked Examples

### Quickbooksbot

Group:

```
@quickbooksbot show unpaid invoices over 30 days
```

Response: answer or summarize needed access.

Group:

```
Does anyone know why the office printer is offline?
```

Response: silence.

DM:

```
Can you explain this reconciliation mismatch?
```

Response: summarize the bounded bookkeeping task and ask before expensive analysis if needed.

### InfsolClaw

Group:

```
@infsolclaw check whether the deploy bot reported a failure
```

Response: answer within scope.

Group:

```
@quickbooksbot what is our March expense total?
```

Response: silence; Quickbooksbot is addressed.

## Integration with Other Rules

- **tool-quota**: quiet mode prevents accidental tool use from ambient chat.
- **escalation-discipline**: summarize and confirm before spending higher-tier model budget.
- **native-ux-tools**: use native confirmation tools when asking before long or expensive work.
- **human-authorization**: proactive or high-impact actions still require explicit authorization.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/tool-quota.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/escalation-discipline.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/native-ux-tools.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-fleet/docs/provider-activation.md

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-17
