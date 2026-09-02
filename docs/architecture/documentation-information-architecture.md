# Documentation Information Architecture

AIWG documentation is classified on three independent axes: audience, task
type, and publication target. Moving a reference out of the user journey does
not remove it from the product.

## Audiences and ownership

| Audience | Reader need | Owner | Publication target |
|---|---|---|---|
| End user | Goals, conversational asks, choices, approvals, outcomes, verification | Product documentation | `docs.aiwg.io` |
| Agent/operator | CLI contracts, flags, structured output, automation, diagnostics, recovery | Runtime and capability owners | The dedicated `docs/cli/` reference section, installed package, and `releases.aiwg.io` |
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

Executable commands and flag tables do not appear in public user journeys.
During public-site staging, AIWG command examples—including bootstrap and
recovery examples—are replaced by contextual natural-language prompts. Exact
syntax remains available only in the published `docs/cli/` reference section
for readers, agents, and scripts that explicitly need it.

## Prompt-first user contract

Each public procedure provides:

- a pasteable prompt describing the goal;
- what the agent should inspect before acting;
- which material changes require approval;
- the observable success result and evidence; and
- a recovery prompt when the result differs.

When no working agent is available, the page links to the CLI reference rather
than reproducing a terminal recipe. Installation, deployment, status, repair,
discovery, indexing, loops, missions, orchestration, JSON contracts, and
non-interactive flags all follow this boundary.

## Publication metadata

CLI references live under `docs/cli/`; other agent references live under
`docs/agents/`. Agent references declare:

```yaml
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.<name>
```

The public build publishes the dedicated CLI reference section but excludes the
rest of the agent-only corpus. Release and npm packaging retain the complete
source directory. CI verifies both sides of the boundary and rejects AIWG
command guidance in staged public-user pages outside `docs/cli/`.

## Linking

User pages link primarily to conversational journeys. They may link to the CLI
reference only as an explicitly labelled terminal or automation reference.
Agent documents use stable IDs and paths rooted at `docs/agents/`. Contributor
pages may link across audiences when the audience and target are explicit.

Historical release notes and fixtures remain accurate records and are excluded
from mechanical conversational rewrites.
