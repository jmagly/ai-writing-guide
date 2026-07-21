---
report_type: external-corpus-incorporation-audit
date: 2026-07-21
corpus: /home/roctinam/dev/research/research-papers
corpus_mode: read-only
corpus_refs_audited: 1901
raw_lane_selections: 173
unique_candidates: 155
net_new_aiwg_ref_mentions: 139
existing_aiwg_refs_selected_for_deeper_incorporation: 16
subagents: 3
status: complete
---

# External research corpus incorporation audit

## Outcome

Three independently scoped, wrapper-bound subagents audited the local research
warehouse and produced **155 unique high-signal items** for AIWG incorporation
consideration. The result is inside the requested 100–200 range. The 173 raw
lane selections contained only 18 pairwise overlaps and no source selected by
all three lanes, demonstrating materially different search behavior rather than
three copies of one shortlist.

Of the 155 candidates, **139 have no existing REF mention in the current AIWG
tree**. The remaining 16 are already cited but were selected because the current
implementation only partially realizes the source's implications:
`REF-001`, `REF-013`, `REF-020`, `REF-022`, `REF-062`, `REF-063`, `REF-071`,
`REF-073`, `REF-086`, `REF-089`, `REF-253`, `REF-449`, `REF-571`, `REF-599`,
`REF-720`, and `REF-1500`.

This report is the deduplicated portfolio index and prioritization layer. The
three lane reports are the authoritative item-level records; each contains exact
title, year/source type, local corpus path, substantive finding, quality and
confidence, AIWG overlap/gap, proposed destination, and incorporation sketch.

## Subagent and model-routing evidence

| Lane                   | Steward route        | Provider-compiled model | Wrapper declaration | Capability                                                             | Result |
| ---------------------- | -------------------- | ----------------------- | ------------------- | ---------------------------------------------------------------------- | -----: |
| Efficiency triage      | economy / efficiency | `gpt-5.3-codex-spark`   | `haiku` / economy   | `research-status`, `research-quality-audit`, `grade-on-ingest`         |     50 |
| Coding crosswalk       | standard / coding    | `gpt-5.6-sol`           | `sonnet` / standard | `research-quality-audit`, Technical Researcher                         |     66 |
| Reasoning architecture | premium / reasoning  | `gpt-5.6-sol`           | `opus` / premium    | Architecture Designer, Technical Researcher, research quality controls |     57 |

Steward emitted native Codex launch envelopes for all three tiers before the
workers ran. Each worker then loaded its assigned wrapper and research
capabilities through `aiwg show`. The collaboration runtime does not expose an
independently attestable child-model identity, so provider-compiled model
selection and wrapper declarations are reported as configuration evidence, not
misrepresented as runtime telemetry.

Lane reports:

- [Efficiency-tier triage](./external-corpus-audit-efficiency-2026-07-21.md)
- [Coding-tier implementation crosswalk](./external-corpus-audit-coding-2026-07-21.md)
- [Reasoning-tier architecture synthesis](./external-corpus-audit-reasoning-2026-07-21.md)

## Audit method

1. Inventory the 8.2 GB warehouse and identify its 1,901 canonical REF analyses,
   archived source artifacts, PDFs, and extracted full texts.
2. Load the Research Complete quality-audit and GRADE-on-ingest controls.
3. Run three distinct lenses: fast metadata/source triage, programmatic
   implementation crosswalk, and architecture-level synthesis.
4. Inspect substantive local analysis sections and targeted extracted full text;
   do not select from title matches alone.
5. Cross-search the current AIWG kernel, frameworks, addons, extensions, models,
   storage, A2A, evaluation, security, and context machinery.
6. Validate sequential item counts, unique REF IDs within each lane, required
   fields, and existence of every cited local corpus path.
7. Deduplicate across lanes by REF ID and retain disagreements about destination
   as useful elaboration evidence rather than silently flattening them.

The external corpus was read-only throughout. Its worktree already contains
unrelated active changes and newly inducted sources; this audit preserved that
state and wrote only the four reports under AIWG's `.aiwg/research/reports/`.

## Recommended portfolio

### P0 — measurement and execution contracts

Build these before broadening autonomous behavior:

- **Typed harness run record and disclosure:** `REF-1539`, `REF-1538`,
  `REF-1515`, `REF-1639`. Connect execution state, tools, context decisions,
  durable writes, permissions, verification, spend, environment, and outcomes.
- **System-level evaluation:** `REF-1621`, `REF-1551`, `REF-063`, `REF-1453`,
  `REF-1237`. Evaluate model × wrapper × harness × topology, with no-skill and
  optimized-single-agent baselines.
- **Artifact and decision integrity:** `REF-714`, `REF-718`, `REF-1649`. Add
  protected-region/semantic invariants, append-only decision records, and
  prepare/commit/compensate semantics for side effects.

### P0 — adaptive orchestration and recovery

- **Difficulty/cost-aware routing:** `REF-086`, `REF-1637`, `REF-1424`,
  `REF-1535`, `REF-1536`, `REF-1541`. Estimate coordination value before fan-out;
  route models, tools, topology, and budgets from expected quality/risk/cost.
- **Durable mission state:** `REF-089`, `REF-282`, `REF-1423`, `REF-1431`.
  Introduce consistent-cut checkpoints, idempotent resume, verified shared gists,
  context partitions, and coverage accounting.
- **Feedback quality:** `REF-1363`, `REF-959`, `REF-1904`. Trace feedback to
  downstream decisions and distinguish informative process supervision from
  repeated critique tokens.

### P0 — adversarial authorization

- **Untrusted-context taint and reachability:** `REF-261`, `REF-1516`,
  `REF-817`. Track provenance through context transformations and compile tool,
  identity, store, hook, and escalation reachability.
- **Agent insider and deception evaluation:** `REF-208`, `REF-253`, `REF-258`,
  `REF-885`, `REF-940`. Add capability leases, tripwires, collusion/system-level
  analysis, reversible execution, and incident-ready evidence.

### P1 — bounded self-improvement laboratory

`REF-1369`, `REF-1376`, `REF-1377`, `REF-147`, `REF-1504`, `REF-1521`, and
`REF-1546` support a new **harness-lab addon**: immutable variants, trace-derived
failure signatures, bounded proposals, passing-behavior preservation sets,
held-in/held-out gates, cost/safety Pareto tests, human promotion, and rollback.
Nothing should self-promote into the kernel.

### P1 — memory, skills, tools, and context

- **Agent-native memory lifecycle:** `REF-1028`, `REF-141`, `REF-142`,
  `REF-1450`, `REF-1055`. Standardize working/factual/experiential memory,
  provenance, conflict, retention, forgetting, namespace, and poisoning controls.
- **Skill lifecycle and evaluation:** `REF-1029`, `REF-1030`, `REF-1237`,
  `REF-1377`. Add provenance, permissions, composition, capacity, regression
  probes, cross-model transfer, and retirement.
- **Tool-aware discovery and execution:** `REF-1032`–`REF-1042`, `REF-878`,
  `REF-1164`, `REF-1609`, `REF-1623`. Evaluate retrieval with hard negatives,
  improve descriptions, capture mutable world state, and score answer outcomes
  after successful calls.
- **Effective-context evaluation:** `REF-124`, `REF-571`, `REF-1354`,
  `REF-1425`, `REF-1427`, `REF-1428`. Test reasoning and aggregation, not nominal
  window size or retrieval-only success.

### P1 — framework-scale opportunities

1. **Research Lab** — `REF-488`, `REF-1050`, `REF-1240`, `REF-1402`,
   `REF-1864`: governed idea→experiment→review→replication lifecycle, targeted
   human intervention, negative-result handling, novelty checks, and provenance.
2. **Multi-Agent Assurance/Governance** — `REF-258`, `REF-861`, `REF-885`:
   identities, ecosystem graphs, collusion/miscoordination tests, institutional
   review, undo, and uncertainty registers.
3. **Agent Benchmark Laboratory** — `REF-1113`, `REF-1213`, `REF-1235`,
   `REF-1237`, `REF-1453`, `REF-1621`, `REF-1623`, `REF-1626`, `REF-1657`:
   longitudinal maintenance, slow-escalation safety, planning invariants,
   stateful tools, skill uplift, and harness-disclosed comparisons.

Framework status should remain provisional until each proposal defines a
distinct lifecycle, artifact graph, roles, gates, archive/provenance model, and
operator controls. Smaller experiments belong in addons or extensions first.

## Twelve architecture epics

| Epic                                      | Priority | Default shape                        |
| ----------------------------------------- | -------: | ------------------------------------ |
| System-level agent evaluation             |       P0 | Kernel schemas + `aiwg-evals` addon  |
| Trace-driven harness laboratory           |       P0 | Addon                                |
| Durable mission checkpointing             |       P0 | Kernel                               |
| Coordination science and assignment       |       P0 | Kernel policy + optimizer addon      |
| Adversarial agent authorization           |       P0 | Kernel + security extension          |
| Memory lifecycle and skill evolution      |       P1 | Semantic-memory/skill-factory addons |
| Diverse review and calibrated uncertainty |       P1 | Kernel review protocol + eval addon  |
| Tool-use economics and execution feedback |       P1 | Steward policy + addon               |
| Long-context truth-in-advertising         |       P1 | Context-curator + eval addon         |
| Governed autonomous research              |       P1 | New Research Lab framework           |
| Multi-agent safety and governance         |       P1 | New framework track                  |
| Cryptographic and model-change assurance  |       P2 | Security-engineering extensions      |

## Deduplicated candidate ledger

The following 155 REF IDs are the authoritative set. Full titles, local paths,
findings, evidence grades, overlap analysis, destinations, and implementation
proposals are in the lane reports linked above.

- `REF-001`, `REF-013`, `REF-020`, `REF-022`, `REF-062`, `REF-063`, `REF-071`, `REF-073`, `REF-086`, `REF-089`
- `REF-124`, `REF-125`, `REF-126`, `REF-141`, `REF-142`, `REF-147`, `REF-150`, `REF-151`, `REF-208`, `REF-231`
- `REF-253`, `REF-258`, `REF-261`, `REF-270`, `REF-275`, `REF-278`, `REF-282`, `REF-310`, `REF-449`, `REF-480`
- `REF-488`, `REF-495`, `REF-506`, `REF-511`, `REF-535`, `REF-571`, `REF-599`, `REF-612`, `REF-663`, `REF-696`
- `REF-702`, `REF-706`, `REF-714`, `REF-718`, `REF-720`, `REF-723`, `REF-729`, `REF-745`, `REF-749`, `REF-750`
- `REF-762`, `REF-764`, `REF-802`, `REF-816`, `REF-817`, `REF-818`, `REF-825`, `REF-861`, `REF-878`, `REF-879`
- `REF-880`, `REF-885`, `REF-940`, `REF-959`, `REF-1021`, `REF-1028`, `REF-1029`, `REF-1030`, `REF-1031`, `REF-1032`
- `REF-1033`, `REF-1034`, `REF-1035`, `REF-1036`, `REF-1037`, `REF-1038`, `REF-1040`, `REF-1041`, `REF-1042`, `REF-1050`
- `REF-1051`, `REF-1055`, `REF-1058`, `REF-1059`, `REF-1112`, `REF-1113`, `REF-1114`, `REF-1146`, `REF-1164`, `REF-1200`
- `REF-1206`, `REF-1213`, `REF-1235`, `REF-1237`, `REF-1239`, `REF-1240`, `REF-1249`, `REF-1354`, `REF-1361`, `REF-1363`
- `REF-1364`, `REF-1367`, `REF-1369`, `REF-1376`, `REF-1377`, `REF-1402`, `REF-1423`, `REF-1424`, `REF-1425`, `REF-1427`
- `REF-1428`, `REF-1431`, `REF-1450`, `REF-1453`, `REF-1492`, `REF-1493`, `REF-1500`, `REF-1502`, `REF-1504`, `REF-1515`
- `REF-1516`, `REF-1518`, `REF-1521`, `REF-1522`, `REF-1535`, `REF-1536`, `REF-1538`, `REF-1539`, `REF-1541`, `REF-1546`
- `REF-1550`, `REF-1551`, `REF-1561`, `REF-1592`, `REF-1609`, `REF-1615`, `REF-1620`, `REF-1621`, `REF-1623`, `REF-1624`
- `REF-1626`, `REF-1637`, `REF-1639`, `REF-1640`, `REF-1649`, `REF-1655`, `REF-1657`, `REF-1661`, `REF-1673`, `REF-1682`
- `REF-1688`, `REF-1782`, `REF-1864`, `REF-1904`, `REF-1905`

## Incorporation gates

1. **Evidence:** recent preprints need an independent or peer-reviewed supporting
   source before driving a P0/P1 production requirement.
2. **Kernel:** kernel changes must be provider-neutral, cross-framework,
   enforceable, and cheaper than repeated local implementations.
3. **Evaluation:** every orchestration, memory, skill, or tool mechanism needs a
   held-out baseline with quality, failure, latency, and cost evidence.
4. **Security:** self-improvement, evolving memory, tool learning, and autonomous
   research require quarantine, least privilege, provenance, rollback, and
   independent promotion authority.
5. **Routing:** evaluate model and harness jointly; never generalize one
   model-wrapper result into a model-only claim.
6. **Framework:** require lifecycle, roles, artifacts, gates, archival behavior,
   and operator controls before promoting an addon experiment to a framework.

## Validation evidence

- Efficiency lane: 50 unique sequential items; every local path resolves.
- Coding lane: 66 unique sequential items; every required field and path resolves;
  11 targeted extracted-full-text checks.
- Reasoning lane: 57 selected items, 12 epics, and 8 explicit exclusions; every
  selected path resolves.
- Cross-lane union: 155 unique REF IDs from 173 selections.
- The ledger resolves to 155 distinct local reference-analysis paths; all 155
  exist in the external corpus.
- Cross-lane overlap: 18 pair-overlap REF IDs, zero triple-overlap IDs.
- `git diff --check` passed for all worker reports.
- No file under `/home/roctinam/dev/research/research-papers` was modified.
