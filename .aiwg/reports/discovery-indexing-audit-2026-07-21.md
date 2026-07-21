---
title: Discovery and Indexing Expansion Audit
date: 2026-07-21
status: implemented-and-verified
scope: operational asset indexing, discovery, language lookup, flows, runbooks
baseline_commit: 61a8bd618
head_at_audit_start: c05930a0f
---

# Discovery and Indexing Expansion Audit

## Executive conclusion

The July 17 operational-asset expansion correctly centralized the broad
discovery taxonomy and achieved local/Fortemi parity for skills, agents,
commands, rules, YAML flows, templates, and behaviors. The audit found four
material completeness gaps:

1. YAML process resources were flattened to `type: flow`; their exact `kind`
   and most process language were discarded.
2. The namespace detector accepted unrelated schemas whose domain happened to
   end in `ops.aiwg.io`.
3. Markdown runbooks were advertised as templates/documents instead of a
   discrete process type, and user-level runbook roots were not scanned.
4. Changed extractors could silently reuse stale entries because incremental
   validity considered file stat/checksum but not extractor revision.

These gaps are corrected. Runbooks are now a first-class default discovery and
show type, flows retain exact kinds, process-aware terms feed lexical and
embedding inputs, Fortemi v2 round-trips the metadata without extending its
locked record-type profile, and extractor changes force a one-time rebuild.

The audit does **not** claim that AIWG now has a benchmarked general-purpose
dense/hybrid discovery system. Chunk-level multi-vector retrieval, corpus-scale
RRF, reranking, and relevance evaluation remain separate work because they need
an owned benchmark and Fortemi profile/conformance evidence.

## Scope and method

The audit combined:

- history review of the expansion commit `61a8bd618` and its planning artifact;
- source tracing from scanners through local scoring, static Fortemi export,
  Fortemi query reconstruction, MCP exposure, and `discover -> show` routing;
- a forced framework build over 3,064 artifacts, followed by field-completeness
  and kind-distribution measurements;
- focused unit, integration, published Fortemi-package validation, and
  local/static parity tests;
- local-corpus review of GRADE-assessed retrieval references;
- current primary-source review of retrieval and runbook systems.

The default evidence threshold was two independent sources per design claim.
Preprints and vendor experiments are treated as directional evidence, not as
proof that a specific AIWG configuration improves relevance.

## Baseline audit matrix

| Asset type | Classification | Discovery metadata before audit | Broad discover/show | Audit disposition |
| --- | --- | --- | --- | --- |
| skill | nearest `skills/` ancestor with slug/flat guards | name, description/capability, triggers, tags, kernel, script | yes/yes | correct; retained |
| agent | nearest `agents/` ancestor | name, description/capability, optional triggers | yes/yes | correct; retained |
| command | nearest `commands/` ancestor | name, description/capability, optional triggers | yes/yes | correct; retained |
| rule | nearest `rules/` ancestor with index guards | name, description/capability, optional triggers | yes/yes | correct; retained |
| behavior | nearest `behaviors/` ancestor | name, description/capability, optional triggers | yes/yes | correct; retained |
| template | nearest `templates/` ancestor; provider-native extensions scoped to that ancestor | name and generic capability; usually no tags/triggers | yes/yes | correct base classification; procedural runbooks now split out with source origin retained |
| flow | YAML namespace match only | metadata name, `spec.description`, label values | yes/yes | incomplete; exact kind validation and structured terms added |
| runbook | absent; flattened to template/document | generic first-paragraph summary | no/no | added as discrete process type across local, Fortemi, MCP, docs, fallback, and user graph |
| hook | nearest `hooks/` ancestor | generic metadata | opt-in/yes | intentionally remains outside broad defaults |
| arbitrary docs/SDLC artifacts | frontmatter/path heuristics | title, tags, summary | query only | correctly excluded from capability discovery |
| marketplace plugin mirrors | excluded from framework scan | n/a | n/a | intentional deduplication; canonical framework/addon/extension sources remain indexed |

## Corpus measurement

The same 3,064-file framework corpus was built before and after the corrections.

| Measure | Before | After |
| --- | ---: | ---: |
| index schema | 1.0.0 | 1.0.0 |
| extractor revision | absent | 2026.07.21.1 |
| flow | 423 | 422 |
| runbook | 0 | 19 |
| template | 439 | 422 |
| document | 1,216 | 1,215 |
| flow entries with exact kind | 0 | 422 |

The one removed flow is `RepoMaintenanceDecision` under
`repo-maintainer.ops.aiwg.io/v1`. It is not one of the workflow metalanguage
resource families and is now indexed as an ordinary document. The remaining
422 flow resources preserve these kinds:

| Kind | Count |
| --- | ---: |
| FlowCapability | 336 |
| FlowPlaybook | 27 |
| WorkflowCapability | 18 |
| OpsCapability | 12 |
| OpsTarget | 8 |
| OpsExtension | 7 |
| OpsRole | 4 |
| OpsInventory | 3 |
| OpsPlaybook | 3 |
| WorkflowPlaybook | 3 |
| WorkflowInventory | 1 |

The 19 runbooks comprise 17 template-origin processes and two document-origin
processes. Each record uses `type: runbook`, `kind: Runbook`, and a
`sourceType` that retains the physical/original classification.

## Implemented design

### Process-aware metadata

`MetadataEntry` now has three optional language and routing fields:

- `kind`: the exact declarative/process kind, such as `FlowPlaybook`,
  `OpsInventory`, or `Runbook`;
- `sourceType`: the prior physical classification when semantic classification
  changes the top-level type;
- `searchTerms`: compact structure-aware language that is richer than a
  one-line summary.

YAML flow terms include kind, label keys and values, agents, step/capability
identifiers, descriptions, commands/actions, verification expectations,
inventory/target language, and rollback capability names. The detector accepts
only the declared Workflow/Flow/Ops capability, playbook, inventory, target,
gate, role, extension, and runbook families.

Markdown runbook detection is explicit (`type: runbook`) or structural: a
runbook marker plus both an action section and a control/validation section.
The extractor favors purpose/overview text and indexes lifecycle headings and
compact section context for procedure, recovery, verification, rollback,
diagnosis, remediation, monitoring, escalation, evidence, and postmortem.
This avoids filename-only promotion while retaining process templates as
searchable runbook blueprints with `sourceType: template`.

### Retrieval inputs

Local lexical scoring gives structured terms 1.5× weight: below explicit
triggers/capabilities, above a generic summary. Exact kind and source type are
additional compact signals. Embedding metadata changed from unlabeled
`title + summary` to labeled title, name, type, kind, source type, capability,
summary, tags, triggers, and structured search terms.

This is context enrichment, not a claim of new multi-vector retrieval. Existing
body mode still produces chunk embeddings that are mean-pooled to one node
vector; changing that storage/query contract requires benchmark and profile
work.

### Fortemi contract

The static AIWG v2 index continues to use only server-owned record types.
Runbooks and templates remain `aiwg.artifact`; their exact AIWG type is in the
existing search metadata. Kind, source type, and structured terms are stored in
the existing frontmatter/search text and reconstructed by the adapter. Facets
and SKOS concepts include compact kind/source-type values.

Focused generic-record filters now overfetch before exact AIWG-type
post-filtering, so unrelated `aiwg.artifact` records cannot crowd a requested
runbook/template out of a small candidate window. No new Fortemi shard profile,
record type, or compatibility claim is introduced.

### Index freshness

The serialized schema stays at `1.0.0` for legacy compatibility. A separate
`extractorVersion` now governs incremental reuse. A missing or mismatched
extractor revision discards the old reuse map and checksum manifest for one
build, guaranteeing that unchanged files receive new classification and
metadata. Legacy v1.0 migration remains valid.

### Surface completeness

`runbook` is included in:

- the shared broad discovery and show taxonomy;
- local and Fortemi discovery;
- the MCP discovery enum and description;
- corpus fallback resolution;
- the built-in user graph (`~/.aiwg/runbooks`);
- CLI, getting-started, MCP, user-index, and finder documentation.

The finder documentation was also corrected to reflect the public CLI contract:
discover returns stable IDs and provenance but intentionally omits paths;
`show --json` resolves the selected path and body.

## Research synthesis

### Why process structure should be indexed

AWS Systems Manager models runbooks in terms of actions, unique step names,
descriptions, inputs/outputs, retry/timeout behavior, failure transitions, and
conditional branching. Google Security Operations likewise defines playbooks
as triggers, actions, and flows that branch on prior outcomes. These independent
operational systems support indexing runbooks as processes rather than generic
documents and retaining step, verification, and failure/rollback language.

- AWS, [Creating your own runbooks](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-documents.html)
- AWS, [Automation actions reference](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-actions.html)
- Google Cloud, [Playbook and automation overview](https://docs.cloud.google.com/chronicle/docs/soar/respond/working-with-playbooks/whats-on-the-playbooks-screen)

### Why compact structured context is justified

Anthropic's Contextual Retrieval experiments report lower top-20 retrieval
failure when concise chunk context is added to both embedding and BM25 inputs,
and explicitly identify chunk boundaries as an evaluation variable. Recent MCP
description studies independently find that clear functionality and accurate,
complete descriptions affect tool selection, but also show that indiscriminate
augmentation can increase execution steps and regress some tasks. The chosen
implementation therefore adds bounded, source-derived process terms rather
than generated prose or whole-body duplication.

- Anthropic, [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- Wang et al., [From Docs to Descriptions](https://arxiv.org/abs/2602.18914)
- Hasan et al., [MCP Tool Descriptions Are Smelly](https://arxiv.org/abs/2602.14878)

The last two are 2026 preprints. They are useful corroboration, but their
results do not substitute for AIWG-specific relevance evaluation.

### Why hybrid and multi-vector work is deferred

The local corpus rates the original RRF work HIGH (GRADE A) and the original
ColBERT work HIGH (GRADE A). RRF combines heterogeneous rankings without score
calibration; ColBERT preserves fine-grained token interactions that single
vectors lose. Elastic's current documentation recommends RRF for hybrid
full-text/vector search. ColBERTv2 reports a 6–10× reduction in the storage
footprint of late interaction, but multi-vector storage is still materially
larger than single-vector retrieval.

- Local REF-027: `/home/roctinam/dev/research/research-papers/documentation/references/REF-027-reciprocal-rank-fusion.md`
- Local REF-048: `/home/roctinam/dev/research/research-papers/documentation/references/REF-048-colbert-late-interaction.md`
- Local REF-050: `/home/roctinam/dev/research/research-papers/documentation/references/REF-050-e5-text-embeddings.md`
- Local REF-068: `/home/roctinam/dev/research/research-papers/documentation/references/REF-068-rethinking-hybrid-retrieval.md` (GRADE LOW; dissenting/applied signal only)
- Cormack et al., [Reciprocal Rank Fusion](https://doi.org/10.1145/1571941.1572114)
- Santhanam et al., [ColBERTv2](https://arxiv.org/abs/2112.01488)
- Elastic, [Hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)

The 2026 semantic-tool-discovery preprint reports 97.1% Hit@3 and 0.91 MRR on
140 queries over 121 tools, but uses one embedding model, has no lexical/hybrid
comparison, and is small relative to AIWG's 3,000+ artifact corpus. The local
induction rates it GRADE B. It supports building an AIWG benchmark, not copying
its architecture untested.

- Local REF-879: `/home/roctinam/dev/research/research-papers/documentation/references/REF-879-semantic-tool-discovery-mcp.md`
- Mudunuri et al., [Semantic Tool Discovery for LLMs](https://arxiv.org/abs/2603.20313)

## Verification gates

| Gate | Result |
| --- | --- |
| TypeScript no-emit compilation | pass |
| runbook detection and template-origin preservation | pass |
| exact flow kind and unrelated Ops-domain rejection | pass |
| extractor revision rebuild and legacy migration | pass |
| local discovery and `discover -> show` | pass |
| Fortemi v2 published-package validation | pass |
| local/static Fortemi parity | pass |
| framework corpus forced build | pass, 3,064 artifacts |
| rebuilt CLI local runbook discovery | pass, certificate runbook ranked first |
| rebuilt CLI static Fortemi sync/discovery/show | pass, 3,064 items and exact runbook result |
| changed indexing test set | pass, 121 passed and 1 intentionally skipped |
| repository schema lint and `git diff --check` | pass |

The repository-wide run completed 7,756 tests successfully, with 28 skipped.
Seven file-watcher assertions failed because the host had exhausted its
`fs.inotify.max_user_instances=128` allowance; the first `fs.watch` call
returned `EMFILE`. Running that unchanged watcher file with Chokidar polling
passed all 25 tests. This is an explicit host resource condition, not an
indexing regression; no watcher code is part of this change.

## Deferred work requiring tracker disposition

1. Build an owned relevance benchmark stratified by operational asset type,
   including ambiguous same-domain candidates and process-step queries.
2. Evaluate lexical, dense, hybrid RRF, reranked, and chunk/multi-vector
   variants against that benchmark, with latency, memory, index-size, and
   failure-mode measurements.
3. Change Fortemi profiles/storage only after a named-profile conformance
   fixture and import/re-export evidence exist for the proposed representation.
4. Investigate research-query source-quality filtering: local corpus queries in
   this audit returned quarantine scan artifacts ahead of curated references.

These are intentionally not folded into the runbook/index extractor change.
They have different evidence, storage, and acceptance criteria.

### Tracker disposition

- [#1819](https://git.integrolabs.net/roctinam/aiwg/issues/1819) — new feature
  issue for the operational-discovery benchmark and measured hybrid/
  multi-vector decision gate.
- [#1690](https://git.integrolabs.net/roctinam/aiwg/issues/1690) — reopened rather
  than duplicated; its research-query source-ranking and GRADE-preservation
  acceptance criteria are violated by the quarantine-result reproduction.
- [#1820](https://git.integrolabs.net/roctinam/aiwg/issues/1820) — separate bug
  found while following the required issue workflow: concurrent duplicate
  checks race on a shared temporary file.
