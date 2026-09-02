# Civic-action research synthesis and readiness decision

> **Decision record.** Begin with the
> [prompt-based Civic Action quickstart](../quickstart.md) for user interaction.
> This document records implementation readiness and boundaries; it is not a
> command-led user procedure.

**Decision date:** 2026-09-01
**Issues:** #2213–#2222
**Decision:** proceed with an opt-in addon and fail-closed human gates; reject
autonomous acquisition, recording, request submission, outreach, legal advice,
speaker identification, award recommendation, and publication.

## Accepted research findings

Three independent research streams were completed before implementation:

1. `legal-ethics-guardrails.md` establishes jurisdiction resolution,
   non-overridable blocked classes, privacy/retention defaults, draft-only
   meeting/records behavior, and accountable human review from 36 authoritative
   sources.
2. `civic-workflow-standards.md` establishes versioned provenance, source access
   and freshness states, records/meeting/procurement contracts, accessible
   publishing gates, correction/reindex behavior, and CAP/GTFS/HSDS pilots from
   26 primary or authoritative sources.
3. `aiwg-design-patterns.md` audits 33 repository paths and selects the canonical
   addon, manifest, agent, skill, rule, FlowPlaybook, schema, template,
   discovery, deployment, and test patterns.

The reports agree on the critical boundaries: public availability is not
publication permission; robots rules are not authorization; a machine
transcript is not official minutes; federal FOIA is not a state/local rule;
automated accessibility scanning is not a conformance claim; corrections are
append-only revisions; and machine confidence never substitutes for evidence or
human authority.

## Packaging decision

The canonical implementation is `agentic/code/addons/civic-action/` with
`core: false` and `autoInstall: false`. It composes existing AIWG frameworks and
ships no vendor requirement. A marketplace plugin may later be generated as a
thin wrapper; it must not own a second hand-edited implementation.

Required dependency: `aiwg-utils`. Optional dependencies are research-complete,
media-curator, knowledge-base, media-marketing-kit, ops-complete, and
security-engineering. Missing optional dependencies create explicit degraded or
manual-review states.

### Persona and artifact allocation

The durable roles are agents: `civic-newsroom-operator` owns orchestration,
`news-caster` owns accessible evidence-bound explanation, `citation-editor`
owns claim/source review, and `correction-editor` owns append-only correction
review. Records research, procurement review, and CAP/GTFS/HSDS indexing remain
skills plus schemas/templates because they are bounded procedures, not durable
identities. Community-resource and public-records evidence editing compose the
citation editor with their domain skill. Local SEO/GEO is limited to accurate,
cited structured-data planning through the local-resource and publication
gates; ranking manipulation, invented locality, and uncited optimization are
out of scope.

### Pilot and marketplace disposition

Recommended project-local pilots are: one official CAP alert feed, one public
GTFS static feed, one public HSDS directory, one previously published meeting
with approved minutes, and one closed public-records request whose response can
be replayed without contacting an agency. Browser, CMS, hosting, OCR,
transcription, search, and surveillance-vendor adapters remain optional and
must degrade honestly when absent.

Marketplace language must describe Civic Action as a lawful research,
reconciliation, drafting, and quality-review addon. It must not promise legal
advice, guaranteed compliance, surveillance, automated outreach/submission,
speaker identification, vendor scoring, or autonomous publication. A future
plugin may distribute the addon as a generated thin wrapper only.

## Human acceptance and non-overridable policy

The user's direction to fully implement the issue set using cited AIWG research
accepts the proceed-with-gates design. The implementation therefore encodes
covert/private recording, access-control bypass, doxxing, stalking,
deanonymization, threats, impersonation, and coordinated personal targeting as
non-overridable workflow rules. Local commands enforce only the declared fields
they receive; broader content and jurisdiction determinations remain named-human
review responsibilities. All legally or editorially consequential actions
require a named, independent human reviewer of the exact artifact.

## Tooling gaps found during implementation

- The `add-agent` skill documentation advertises a `validator` template, but
  `tools/scaffolding/add-agent.mjs` currently accepts only `simple`, `complex`,
  and `orchestrator`. Bounded reviewer agents were authored using the canonical
  agent contract instead.
- The `add-template` skill documents addon targets, but the current scaffolder
  rejects an addon target. Templates were authored using the documented
  frontmatter/content contract and are covered by manifest/tests.

These are upstream scaffolding gaps, not reasons to weaken the civic-action
artifact contract.

## Readiness criterion

Implementation is ready only after every manifest asset resolves, agent/skill
metadata is non-placeholder, JSON schemas compile and validate positive/negative
fixtures, executable gates reject invalid contracts and block their documented
declared conditions, FlowPlaybooks and capabilities validate and resolve with
human gates, discovery/deployment checks pass, public docs are registered, and
CI is green. A pass remains bounded review evidence, not legality, compliance,
or action authorization. Tracker closure must cite that evidence.
