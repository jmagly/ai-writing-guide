# Page Schema

Frontmatter contract for LLM Wiki pages. All derived pages must include the required fields. Template-specific fields are required when using that template.

## Universal Fields (all pages)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Page title. Used as the display name and wikilink target. |
| `type` | enum | yes | One of: `summary`, `entity`, `concept`, `synthesis`, `book-companion`, `personal`, `research-deep-dive`, `business-team`. |
| `created` | date (YYYY-MM-DD) | yes | Date the page was first created. |
| `tags` | string[] | yes | Freeform tags for categorization. Empty array `[]` is valid. |

## Optional Universal Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `last-updated` | date (YYYY-MM-DD) | same as `created` | Date of last substantive edit. |
| `source` | string | — | Path to raw source file that produced this page. |
| `status` | enum | `active` | One of: `active`, `archived`, `draft`, `superseded`. |
| `confidence` | enum | — | One of: `low`, `medium`, `high`. Used by research and synthesis pages. |

## Template-Specific Fields

### book-companion

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `author` | string | yes | Book author. |
| `genre` | string | no | Genre classification. |
| `reading-status` | enum | yes | One of: `not-started`, `in-progress`, `finished`, `abandoned`. |
| `started` | date | no | Date reading began. |
| `finished` | date | no | Date reading completed. |
| `rating` | number (1-5) | no | Personal rating. |

### personal

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | yes | Primary topic or area. |
| `date` | date | yes | Entry date. |
| `category` | enum | yes | One of: `goal`, `project`, `journal`, `insight`, `reference`. |

### research-deep-dive

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | yes | Research topic. |
| `confidence` | enum | yes | One of: `low`, `medium`, `high`. |
| `last-updated` | date | yes | Date of last thesis revision. |

### business-team

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project` | string | yes | Project name. |
| `team` | string | yes | Team name. |
| `date` | date | yes | Meeting or decision date. |
| `category` | enum | yes | One of: `meeting`, `decision`, `status`, `retrospective`, `handoff`. |
| `decision-status` | enum | no | One of: `proposed`, `approved`, `rejected`, `superseded`. Required when category is `decision`. |

## Cross-Reference Convention

All inter-page links use Obsidian-native wikilink syntax:

```
[[Page Title]]
[[Page Title|display text]]
[[Page Title#Section]]
```

Do not use `@-mention` or bare markdown links for wiki-internal references.

## Lint Rules

The topology declares four lint rules that validate page integrity:

| Rule | What It Checks |
|------|---------------|
| `link-check` | All `[[wikilinks]]` resolve to existing pages. |
| `mention-lint` | No `@-mention` style refs in wiki pages (wrong convention). |
| `orphan-detection` | Pages with zero inbound links after 30 days. |
| `contradiction-scan` | Flags pages making conflicting claims about the same entity. |
