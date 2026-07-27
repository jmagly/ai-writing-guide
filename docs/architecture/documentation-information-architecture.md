# Documentation Information Architecture

AIWG documentation is classified on three independent axes: audience, task
type, and publication target. Moving a reference out of the user journey does
not remove it from the product.

## Audiences and ownership

| Audience | Reader need | Owner | Publication target |
|---|---|---|---|
| End user | Goals, conversational asks, choices, approvals, outcomes, verification | Product documentation | `docs.aiwg.io` |
| Agent/operator | CLI contracts, flags, structured output, automation, diagnostics, recovery | Runtime and capability owners | installed package and `release.aiwg.io` |
| Contributor/maintainer | Authoring, architecture, testing, and release operations | Maintainers | explicitly classified development/contributor surfaces |

Within every audience, use the Diátaxis task types—tutorial, how-to, reference,
and explanation—rather than mixing all four into one page.

## User interaction contract

Public journeys follow this sequence:

1. The user tells the agent what outcome they want.
2. The agent explains the proposed path and asks only necessary questions.
3. The agent previews material changes and obtains required approvals.
4. The agent runs AIWG operations.
5. The agent reports the outcome and evidence the user can verify.

Public guidance assumes competence without assuming prior terminal or agent
experience. It defines necessary terms, identifies where each action occurs,
explains the effect and approval boundary, and gives an observable success and
recovery condition.

Commands appear in public docs only when they are on the direct-touch allowlist
or are clearly marked as an operator/recovery escape hatch.

## Direct-touch command allowlist

| Command | Why a user may type it |
|---|---|
| `npm install -g aiwg` | Bootstrap before an AI agent can use AIWG |
| `aiwg wizard` | Optional guided bootstrap when the agent cannot run setup |
| `aiwg use all --provider <provider>` | Preferred complete provider bootstrap |
| `aiwg new` | Explicit new-project bootstrap escape hatch |
| `aiwg status` | Independent verification or broken-agent diagnosis |
| `aiwg doctor` | Exceptional recovery |
| `aiwg refresh` | Exceptional repair/update of deployed context |

After bootstrap, `aiwg-regenerate` is invoked through the provider so the agent
can select and apply the correct context migration. Discovery, `show`, indexing,
loops, missions, orchestration, JSON contracts, and non-interactive flags are
agent/operator surfaces.

## Publication metadata

Agent-reference documents live under `docs/agents/` and declare:

```yaml
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.<name>
```

The public build is assembled into a staging directory that excludes this
corpus. Release and npm packaging retain the source directory. CI verifies both
sides of the boundary.

## Linking

User pages link to conversational journeys, not CLI reference pages. Agent
documents use stable IDs and paths rooted at `docs/agents/`. Contributor pages
may link across audiences when the audience and target are explicit.

Historical release notes and fixtures remain accurate records and are excluded
from mechanical conversational rewrites.
