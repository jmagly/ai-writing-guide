# Usage Notes

AIWG is optimized for token efficiency through modular context loading and path-scoped rules.

## Account Compatibility

| Account Type | Suitability |
|--------------|-------------|
| **Claude Pro / Team** | ✅ Recommended |
| **API Pay-as-you-go** | ✅ Works well with cost monitoring |
| **Free tiers** | ⚠️ May hit rate limits on heavy workflows |

## Tips for Optimal Usage

1. **Start small** — Run individual workflows before full SDLC phases
2. **Use `--interactive`** — Control generation scope when needed
3. **Monitor usage** — Check your AI provider's dashboard for cost tracking
4. **Set budget alerts** — If your provider supports them

## Token Optimization

AIWG minimizes token usage through:

- **Path-scoped rules** — Only load context relevant to current file
- **Modular frameworks** — Install only what you need
- **Template reuse** — Consistent artifact structure reduces regeneration

## Rate Limits

If you hit rate limits:

1. Wait a few minutes before retrying
2. Use `--interactive` mode for smaller batches
3. Consider upgrading your account tier
4. Split large workflows into smaller steps

## Cost Management

**You are responsible for API costs.** The framework does not:

- Track or limit spending
- Provide cost alerts
- Guarantee cost estimates
- Refund unexpected charges

**Recommendations:**

- Start with simple workflows to gauge usage
- Monitor your provider's dashboard regularly
- Set budget alerts if available
- Use `--dry-run` flags when available to preview actions

## Technical Notes

- **Rate Limits:** Agentic tools handle rate limits and retries automatically
- **Version Control:** Document rollback is optional and user-controlled
  - Enable by committing `.aiwg/` artifacts to git
  - Or add `.aiwg/` to `.gitignore` for local-only use
