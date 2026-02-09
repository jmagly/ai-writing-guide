# Chat Platform Bidirectional Communication - Research Index

Research conducted: 2026-02-08
Purpose: Implement messaging bot mode for AIWG daemon (#313)

## Research Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **chat-platform-research-summary.md** | Executive summary and decision guide | Architects, PMs |
| **chat-platform-bidirectional-patterns.md** | Comprehensive technical patterns | Implementers |
| **minimal-chat-adapters-reference.md** | Production-ready code implementations | Developers |
| **chat-platform-gotchas.md** | Edge cases and troubleshooting | Everyone |

## Quick Navigation

**Want to understand the landscape?** → Start with `chat-platform-research-summary.md`

**Need implementation details?** → See `chat-platform-bidirectional-patterns.md`

**Ready to code?** → Copy from `minimal-chat-adapters-reference.md`

**Hitting production issues?** → Check `chat-platform-gotchas.md`

## Key Findings

### Platform Comparison

| Platform | Dependencies | Complexity | Recommended For |
|----------|--------------|------------|-----------------|
| **Slack** | None (webhook), Express (inbound) | Low | MVP, fastest time-to-value |
| **Discord** | discord.js | Medium | Teams already on Discord |
| **Telegram** | None | Low | Lightweight, no infrastructure |

### Implementation Priority

1. **Phase 1**: Slack outbound (webhook) - 1-2 days, zero dependencies
2. **Phase 2**: Slack inbound (slash commands) - 2-3 days, Express
3. **Phase 3**: Discord - 3-4 days, discord.js
4. **Phase 4**: Telegram - 2-3 days, zero dependencies
5. **Phase 5**: Production hardening - 3-5 days

### Critical Patterns

**Adapter Interface**:
```typescript
interface MessagingAdapter {
  initialize(): Promise<void>;
  send(message: AiwgMessage, channel: string): Promise<MessageResult>;
  onCommand(handler: CommandHandler): void;
  shutdown(): Promise<void>;
}
```

**Canonical Message Format**:
```typescript
interface AiwgMessage {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  fields: Array<{ label: string; value: string; inline: boolean }>;
  actions?: Array<{ id: string; label: string; style: string }>;
}
```

**Command Router**:
```typescript
class CommandRouter {
  register(command: string, handler: CommandHandler);
  route(command: ParsedCommand): Promise<CommandResponse>;
}
```

## Security Requirements

### Token Management
- All tokens from environment variables
- Never log, echo, or expose in messages
- Load at point of use (adapter initialize)
- Slack: HMAC-SHA256 signature verification for inbound
- Telegram: IP allowlist or secret token

### Authorization
- Channel allow-lists (only respond in configured channels)
- User authorization for write commands (approve/reject)
- Command scope: read-only vs write

## Production Readiness

### Must-Have Features
- [x] Graceful degradation (one platform failure doesn't break others)
- [x] Rate limiting per platform
- [x] Health monitoring and reconnection
- [x] Message queuing and retry
- [x] Lazy loading (don't import discord.js unless needed)

### Nice-to-Have Features
- [ ] Message threading (group Ralph loop updates)
- [ ] Rich formatting (code blocks, links, timestamps)
- [ ] Interactive buttons for HITL gates
- [ ] Metrics and analytics

## Testing Strategy

### Unit Tests
- Adapter initialization
- Message formatting
- Command parsing
- Signature verification (Slack)

### Integration Tests
- End-to-end message send/receive
- Interactive component handling
- Reconnection logic
- Rate limit handling

### Manual Tests
- Token expiry/invalid token
- Network disconnect during operation
- Platform-specific edge cases (see gotchas.md)

## References

**Related ADRs**:
- @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md - Architectural decision
- @.aiwg/architecture/adrs/ADR-cross-platform-feature-adoption.md - Platform adapter precedent

**AIWG Integration**:
- @tools/ralph-external/orchestrator.mjs - Event lifecycle for messaging
- @.claude/rules/hitl-gates.md - HITL gate architecture
- @.claude/rules/token-security.md - Token handling requirements

**External Documentation**:
- Slack API: https://api.slack.com/
- Discord API: https://discord.com/developers/docs/
- Telegram Bot API: https://core.telegram.org/bots/api

## Next Steps

1. Review research with team
2. Approve implementation plan
3. Start with Phase 1 (Slack outbound webhook)
4. Iterate based on user feedback
5. Expand to other platforms

---

**Research Status**: COMPLETE
**Recommendation**: Proceed with phased implementation, starting with Slack webhook (MVP)
