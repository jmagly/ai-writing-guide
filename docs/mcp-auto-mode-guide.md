# MCP Auto-Mode Tool Search Guide

**Issue:** #285
**Version:** 2026.2.0
**Status:** Active

## Overview

This guide documents MCP (Model Context Protocol) Auto Mode, a feature that defers tool loading until needed via semantic search. Auto Mode prevents context pollution from large tool sets while maintaining full tool access.

**Key benefit:** Load 100+ tools without consuming 20-30% of context window upfront.

## What Auto Mode Does

### The Problem

Without Auto Mode, all MCP tools load descriptions upfront:

```
Context Window (200k tokens):
├── System prompt (5k)
├── Tool descriptions (40k) ← Problem: Large tool sets eat context
├── Conversation history (80k)
└── Available: 75k tokens
```

**Example:** Fortemi MCP server with 100+ tools consumes ~30k tokens just for descriptions.

### The Solution

Auto Mode defers tool loading and retrieves via semantic search:

```
Context Window (200k tokens):
├── System prompt (5k)
├── Tool search capability (1k) ← Single meta-tool
├── Conversation history (110k)
└── Available: 84k tokens

When tool needed:
1. Agent searches: "create database table"
2. Auto Mode finds: fortemi.create_table()
3. Load only that tool's description
```

**Context savings:** 95-98% for large tool sets.

### When Auto Mode Triggers

Auto Mode activates when tool descriptions exceed **10% of context window**:

| Context Size | Threshold | Tool Count (avg) |
|--------------|-----------|------------------|
| 200k tokens | 20k tokens | ~80 tools |
| 100k tokens | 10k tokens | ~40 tools |
| 32k tokens | 3.2k tokens | ~12 tools |

**Formula:** `threshold = context_window * 0.10`

**Behavior:**
- **Below threshold:** All tools loaded upfront (standard mode)
- **Above threshold:** Auto Mode enabled, search-based retrieval

**Manual override:**

```bash
# Force auto mode regardless of threshold
/mcp-config set auto_mode true

# Disable auto mode
/mcp-config set auto_mode false

# Custom threshold (percentage)
/mcp-config set auto_threshold 0.05  # 5% instead of 10%
```

## AIWG MCP Servers

AIWG integrates with multiple MCP servers for enhanced capabilities.

### Gitea Server

**Tools:** ~80 tools for git forge operations
**Context Impact:** ~25k tokens without Auto Mode
**Auto Mode Savings:** 97% (uses ~750 tokens)

**Categories:**

| Category | Tool Count | Examples |
|----------|------------|----------|
| Repository | 18 | `list_repos`, `create_repo`, `delete_repo` |
| Issues | 15 | `create_issue`, `list_issues`, `close_issue` |
| Pull Requests | 12 | `create_pr`, `merge_pr`, `review_pr` |
| Organizations | 10 | `list_orgs`, `create_org`, `add_member` |
| Users | 8 | `get_user`, `list_users`, `create_user` |
| Branches | 7 | `create_branch`, `delete_branch`, `list_branches` |
| Webhooks | 6 | `create_webhook`, `list_webhooks` |
| Misc | 4 | `search`, `get_version` |

**Installation:**

```bash
aiwg mcp install gitea
```

**Configuration:**

```json
// ~/.config/claude/mcp-servers.json
{
  "gitea": {
    "command": "npx",
    "args": ["@aiwg/mcp-gitea"],
    "env": {
      "GITEA_URL": "https://git.integrolabs.net",
      "GITEA_TOKEN": "<from ~/.config/gitea/token>"
    },
    "auto": 80  // Enable auto mode for 80+ tools
  }
}
```

### Hound Server

**Tools:** ~6 tools for code search
**Context Impact:** ~2k tokens (below threshold, auto mode not needed)

**Tools:**

| Tool | Description |
|------|-------------|
| `hound_search` | Search code across repositories |
| `hound_search_repos` | List available repositories |
| `hound_search_files` | Find files by path pattern |
| `hound_search_regex` | Search with regex patterns |
| `hound_list_repos` | List configured repos |
| `hound_status` | Check Hound server status |

**Installation:**

```bash
aiwg mcp install hound
```

**Configuration:**

```json
{
  "hound": {
    "command": "npx",
    "args": ["@aiwg/mcp-hound"],
    "env": {
      "HOUND_URL": "http://localhost:6080"
    }
  }
}
```

### IT Assets Server

**Tools:** ~10 tools for asset management
**Context Impact:** ~3k tokens (below threshold)

**Categories:**

| Category | Tool Count | Examples |
|----------|------------|----------|
| Assets | 4 | `list_assets`, `get_asset`, `create_asset` |
| Inventory | 3 | `search_inventory`, `update_inventory` |
| Reports | 3 | `asset_report`, `depreciation_report` |

**Installation:**

```bash
aiwg mcp install it-assets
```

**Configuration:**

```json
{
  "it-assets": {
    "command": "npx",
    "args": ["@aiwg/mcp-it-assets"],
    "env": {
      "ASSETS_DB": "~/.config/assets/assets.db"
    }
  }
}
```

### Fortemi Server

**Tools:** 100+ tools for business operations
**Context Impact:** ~30k tokens without Auto Mode
**Auto Mode Savings:** 98% (uses ~600 tokens)

**Categories:**

| Category | Tool Count | Domain |
|----------|------------|--------|
| CRM | 25 | Customer relationship management |
| Accounting | 20 | Financial operations |
| Inventory | 18 | Stock and warehouse |
| Sales | 15 | Sales pipeline and orders |
| HR | 12 | Human resources |
| Projects | 10 | Project management |

**Installation:**

```bash
aiwg mcp install fortemi
```

**Configuration:**

```json
{
  "fortemi": {
    "command": "npx",
    "args": ["@aiwg/mcp-fortemi"],
    "env": {
      "FORTEMI_API_KEY": "<api-key>",
      "FORTEMI_URL": "https://api.fortemi.com"
    },
    "auto": 100  // Force auto mode
  }
}
```

## Discoverability Tips

### For Users

**Use descriptive search queries:**

```
Bad:  "make thing"
Good: "create database table"

Bad:  "repo"
Good: "list all repositories in organization"

Bad:  "issue"
Good: "create GitHub issue with labels"
```

**Search patterns that work:**

| Pattern | Example | Finds |
|---------|---------|-------|
| Verb + Object | "create repository" | `gitea.create_repo` |
| Domain + Action | "customer search" | `fortemi.crm.search_customers` |
| Use Case | "find code pattern" | `hound.search_regex` |
| Natural Language | "show me all open issues" | `gitea.list_issues` |

**Troubleshooting tool discovery:**

```bash
# If tool not found by search
/mcp-debug search "create table"

# Shows:
# - Semantic search results
# - Similarity scores
# - Why tools matched/didn't match

# Force load specific tool
/mcp-load fortemi.create_table

# List all available tools (loads all)
/mcp-tools list --all
```

### For MCP Server Developers

**Write searchable tool descriptions:**

```typescript
// BAD: Too generic
{
  name: "create",
  description: "Creates a thing"
}

// GOOD: Specific, keyword-rich
{
  name: "create_repository",
  description: "Create a new Git repository with name, description, and visibility settings. Supports both public and private repositories."
}
```

**Include synonyms and use cases:**

```typescript
{
  name: "list_issues",
  description: "List GitHub issues and bugs. Search by status (open, closed), labels, assignee, or milestone. Useful for: bug tracking, backlog review, sprint planning."
}
```

**Use semantic field names:**

```typescript
// GOOD: Clear intent
{
  name: "customer_search",
  description: "Search customer database by name, email, phone, or account ID. Returns customer records with full contact details and order history."
}
```

**Keywords that improve discoverability:**

| Category | Keywords |
|----------|----------|
| CRUD | create, read, update, delete, list, get, modify, remove |
| Search | search, find, query, filter, lookup, locate |
| Navigation | show, display, view, browse, navigate |
| Actions | execute, run, start, stop, trigger, perform |
| Data | data, records, entries, items, objects |

## Configuration

### Auto-Mode Settings

**Global configuration:**

```json
// ~/.config/claude/config.json
{
  "mcp": {
    "auto_mode": {
      "enabled": true,
      "threshold": 0.10,        // 10% of context
      "fallback_load": true,    // Load all if search fails
      "cache_results": true,    // Cache search results
      "min_similarity": 0.70    // Minimum similarity score
    }
  }
}
```

**Per-server configuration:**

```json
// ~/.config/claude/mcp-servers.json
{
  "gitea": {
    "auto": "threshold",   // Use threshold (default)
    // OR
    "auto": true,          // Always use auto mode
    // OR
    "auto": false,         // Never use auto mode
    // OR
    "auto": 50             // Auto mode if >50 tools
  }
}
```

### Threshold Settings

**Adjust auto-mode threshold:**

```bash
# More aggressive (save more context)
/mcp-config set auto_threshold 0.05  # 5%

# Less aggressive (more tools upfront)
/mcp-config set auto_threshold 0.20  # 20%

# Default
/mcp-config set auto_threshold 0.10  # 10%
```

**Threshold recommendations:**

| Use Case | Threshold | Rationale |
|----------|-----------|-----------|
| Large tool sets (100+) | 5% | Maximize context savings |
| Standard (20-100 tools) | 10% | Balanced (default) |
| Small tool sets (<20) | 20% | Prefer upfront loading |

**Context window considerations:**

| Model | Context | 10% Threshold | Recommended |
|-------|---------|---------------|-------------|
| Claude Opus 4.6 | 200k | 20k tokens | Default (10%) |
| Claude Sonnet 4.5 | 200k | 20k tokens | Default (10%) |
| GPT-4 | 32k | 3.2k tokens | 5% threshold |
| Older models | 8k | 800 tokens | Disable auto mode |

## Testing Patterns

### Common Search Queries by Server

**Gitea Server:**

```
# Repository operations
"list repositories"
"create new repository"
"delete repository"
"search repositories"

# Issue management
"create issue"
"list open issues"
"close issue"
"add issue comment"

# Pull requests
"create pull request"
"merge pull request"
"review PR"

# Organization
"list organizations"
"create organization"
"add team member"
```

**Hound Server:**

```
# Code search
"search for function definition"
"find code pattern"
"search with regex"
"find file by name"

# Repository
"list available repositories"
"show repository status"
```

**IT Assets Server:**

```
# Asset management
"list all assets"
"find asset by serial number"
"create new asset"
"update asset location"

# Reports
"asset depreciation report"
"inventory summary"
```

**Fortemi Server:**

```
# CRM
"search customers"
"create customer record"
"list customer orders"

# Accounting
"create invoice"
"record payment"
"list unpaid invoices"

# Inventory
"search products"
"update stock quantity"
"list low stock items"

# Sales
"create sales order"
"track sales pipeline"
"generate quote"
```

### Testing Auto-Mode Behavior

**Test 1: Verify auto mode activates**

```bash
# Load large tool set
aiwg mcp install fortemi

# Check status
/mcp-status

# Should show:
# Fortemi: Auto Mode (100 tools, 30k tokens deferred)
```

**Test 2: Tool search accuracy**

```bash
# Search for tool
/mcp-debug search "create customer"

# Verify results include:
# ✓ fortemi.crm.create_customer (similarity: 0.95)
# ✓ fortemi.crm.search_customer (similarity: 0.78)
# ✗ fortemi.inventory.create_product (similarity: 0.42)
```

**Test 3: Fallback loading**

```bash
# Disable search cache
/mcp-config set cache_results false

# Search with vague query
/mcp-debug search "thing"

# Should fallback and load all tools
# Warning: No high-confidence matches, loading all tools
```

**Test 4: Context savings**

```bash
# Measure context before
/context-usage

# Context: 50k / 200k (25%)

# Load large MCP server with auto mode
aiwg mcp install fortemi

# Measure context after
/context-usage

# Context: 51k / 200k (25.5%)
# Savings: ~29k tokens deferred
```

## Performance

### Context Savings with Auto Mode

**Gitea (80 tools):**

| Mode | Context Used | Savings |
|------|--------------|---------|
| Standard | 25k tokens | 0% |
| Auto | 750 tokens | 97% |

**Fortemi (100 tools):**

| Mode | Context Used | Savings |
|------|--------------|---------|
| Standard | 30k tokens | 0% |
| Auto | 600 tokens | 98% |

**Combined (180 tools):**

| Mode | Context Used | Savings |
|------|--------------|---------|
| Standard | 55k tokens | 0% |
| Auto | 1.3k tokens | 97.6% |

### Search Performance

**Query latency:**

| Operation | Latency | Notes |
|-----------|---------|-------|
| Semantic search | 10-50ms | In-memory vector similarity |
| Tool load | 5-10ms | Load single tool description |
| Fallback load | 100-500ms | Load all tools (rare) |

**Accuracy metrics:**

| Query Type | Accuracy | Examples |
|------------|----------|----------|
| Exact match | 100% | "create_repository" |
| Synonym | 95% | "new repo" → create_repo |
| Natural language | 85% | "make a new issue" |
| Vague | 60% | "thing" → best guess |

**Optimization tips:**

1. **Use specific verbs** - "create" better than "make"
2. **Include domain** - "customer search" vs "search"
3. **Natural phrasing** - "show me X" works well
4. **Avoid ambiguity** - Be precise when possible

### Real-World Scenarios

**Scenario 1: SDLC workflow with all MCP servers**

```
Tools available: 196 (Gitea + Hound + Assets + Fortemi)

Without Auto Mode:
- Context used: 58k tokens
- Remaining: 142k tokens
- Overhead: 29%

With Auto Mode:
- Context used: 6k tokens
- Remaining: 194k tokens
- Overhead: 3%

Benefit: 26% more context for conversation
```

**Scenario 2: Long conversation**

```
Conversation: 100 messages, 80k tokens

Without Auto Mode:
- Tools: 58k
- Conversation: 80k
- Total: 138k / 200k (69%)

With Auto Mode:
- Tools: 6k
- Conversation: 80k
- Total: 86k / 200k (43%)

Benefit: Can continue 50% longer before context limit
```

## Troubleshooting

### Tool Not Found

**Problem:** Search doesn't find expected tool

**Diagnosis:**

```bash
/mcp-debug search "your query"
```

**Solutions:**

1. Try different keywords:
   ```
   Instead of: "repo"
   Try: "repository", "create repository"
   ```

2. Use domain prefix:
   ```
   Instead of: "search"
   Try: "customer search", "code search"
   ```

3. Force load server:
   ```bash
   /mcp-load-all gitea
   ```

### Auto Mode Not Activating

**Problem:** Auto mode not enabled despite large tool set

**Diagnosis:**

```bash
/mcp-status --verbose
```

**Solutions:**

1. Check threshold:
   ```bash
   /mcp-config get auto_threshold
   # If too high, lower it
   /mcp-config set auto_threshold 0.05
   ```

2. Force enable:
   ```json
   // mcp-servers.json
   {
     "fortemi": {
       "auto": true  // Force on
     }
   }
   ```

3. Verify tool count:
   ```bash
   /mcp-tools count fortemi
   # Should be >threshold
   ```

### High Context Usage Despite Auto Mode

**Problem:** Context still high with auto mode

**Diagnosis:**

```bash
/context-usage --breakdown
```

**Possible causes:**

1. **Cached tools:** Previous loads still in context
   ```bash
   # Clear cache
   /mcp-cache clear
   ```

2. **Multiple servers:** Cumulative effect
   ```bash
   # Check all servers
   /mcp-status --all
   ```

3. **Fallback triggered:** Vague queries load all tools
   ```bash
   # Check logs
   /mcp-logs | grep fallback
   ```

## Best Practices

### For Users

1. **Use specific search terms** - Better tool matching
2. **Enable auto mode for large tool sets** - Save context
3. **Monitor context usage** - Use `/context-usage` regularly
4. **Clear tool cache periodically** - Prevent context bloat

### For MCP Server Developers

1. **Write detailed descriptions** - Improve searchability
2. **Include keywords and synonyms** - Better discovery
3. **Group related tools** - Logical categorization
4. **Test search queries** - Validate discoverability
5. **Document search patterns** - Help users find tools

### For System Administrators

1. **Configure auto mode thresholds** - Based on team needs
2. **Monitor search performance** - Ensure good UX
3. **Standardize server configs** - Team consistency
4. **Document tool sets** - What's available where

## References

- @docs/cli-reference.md - MCP command reference
- @agentic/code/frameworks/sdlc-complete/docs/mcp-integration.md - MCP integration patterns
- @~/.config/claude/mcp-servers.json - Server configuration
- Issue #285 - MCP auto-mode verification

---

**Guide Version:** 2026.2.0
**Last Updated:** 2026-02-06
**Maintainer:** AIWG Team
