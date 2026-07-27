# Session Intelligence Traceability and Issue Plan

Parent: [AIWG #1898](https://git.integrolabs.net/roctinam/aiwg/issues/1898)

## Workstreams

### Wave 0: Contracts and Safety

| Issue | Deliverable | Use cases | ADR/risk |
|---|---|---|---|
| [#1899](https://git.integrolabs.net/roctinam/aiwg/issues/1899) | Canonical schemas, status/error model, adapter SDK, fixture contract | UC-SI-001, UC-SI-003, UC-SI-005, UC-SI-009 | ADR-002, SI-R05 |
| [#1900](https://git.integrolabs.net/roctinam/aiwg/issues/1900) | Consent, allowed roots, redaction, privacy, and audit policy | UC-SI-002, UC-SI-003 | ADR-003, SI-R01-R04 |
| [#1901](https://git.integrolabs.net/roctinam/aiwg/issues/1901) | SQLite repository, import checkpoints, identity, deduplication | UC-SI-003, UC-SI-005 | ADR-001/002, SI-R05-R06 |
| [#1902](https://git.integrolabs.net/roctinam/aiwg/issues/1902) | Authorized discovery and bounded-reader library | UC-SI-002 | ADR-002/003, SI-R01 |

### Wave 1: Provider Adapters

One issue is required for each canonical provider so evidence, fixtures,
limitations, and support status cannot be hidden by batching:

`claude`, `codex`, `copilot`, `cursor`, `factory`, `hermes`, `opencode`,
`openclaw`, `openhuman`, `warp`, `devin-desktop` (`windsurf` compatibility
alias), and `generic`.

All depend on C1/C2/C4. Adapters that require local transactional import also
depend on C3.

### Wave 2: Operator and Retrieval Surfaces

| Issue | Deliverable | Use cases | Dependencies |
|---|---|---|---|
| [#1903](https://git.integrolabs.net/roctinam/aiwg/issues/1903) | Catalog lifecycle and `aiwg sessions` JSON/doctor surface | UC-SI-001, UC-SI-003, UC-SI-005, UC-SI-009 | #1899-#1902 |
| [#1904](https://git.integrolabs.net/roctinam/aiwg/issues/1904) | Lexical/metadata search with evidence citations | UC-SI-004, UC-SI-005 | #1901, implemented adapters |
| [#1905](https://git.integrolabs.net/roctinam/aiwg/issues/1905) | Optional semantic/Fortemi backend | UC-SI-004 | #1904, redaction gate, Fortemi contracts |
| [#1908](https://git.integrolabs.net/roctinam/aiwg/issues/1908) | Tombstone, purge preview, deletion receipts, dependency reporting | UC-SI-008 | ADR-005, SI-R08/R09/R13; #1900, #1901 |

### Wave 3: Intelligence and Memory

| Issue | Deliverable | Use cases | Dependencies |
|---|---|---|---|
| [#1906](https://git.integrolabs.net/roctinam/aiwg/issues/1906) | Candidate extraction, citation validation, conflicts, supersession, review | UC-SI-006 | ADR-004, SI-R02/R07; #1904 |
| [#1907](https://git.integrolabs.net/roctinam/aiwg/issues/1907) | Explicit memory/KB promotion and receipts | UC-SI-007 | ADR-004, SI-R07/R13; #1906 |
| [#1908](https://git.integrolabs.net/roctinam/aiwg/issues/1908) | Promotion dependency reporting and explicit revoke/supersede/origin-unavailable outcomes within the lifecycle workflow | UC-SI-008 | ADR-005, SI-R08/R13; #1907 |

### Wave 4: Closure

| Issue | Deliverable | Use cases | Dependencies |
|---|---|---|---|
| [#1909](https://git.integrolabs.net/roctinam/aiwg/issues/1909) | Twelve-provider conformance, security/fuzz, performance gates and documentation | All | Waves 0-3 |

Cockpit UI remains a separately gated follow-up after CLI and schema stability.

## Provider Traceability

| Provider | Planned adapter issue | Required operations |
|---|---|---|
| `claude` | [#1910](https://git.integrolabs.net/roctinam/aiwg/issues/1910) | discover/import/update/status |
| `codex` | [#1911](https://git.integrolabs.net/roctinam/aiwg/issues/1911) | API/import/update/status |
| `copilot` | [#1912](https://git.integrolabs.net/roctinam/aiwg/issues/1912) | export import/status |
| `cursor` | [#1913](https://git.integrolabs.net/roctinam/aiwg/issues/1913) | CLI/cloud import plus editor manual import |
| `factory` | [#1914](https://git.integrolabs.net/roctinam/aiwg/issues/1914) | JSONL plus optional API |
| `hermes` | [#1915](https://git.integrolabs.net/roctinam/aiwg/issues/1915) | native export plus snapshot fallback |
| `opencode` | [#1916](https://git.integrolabs.net/roctinam/aiwg/issues/1916) | export/API/SSE |
| `openclaw` | [#1917](https://git.integrolabs.net/roctinam/aiwg/issues/1917) | Gateway/consistent event snapshot |
| `openhuman` | [#1918](https://git.integrolabs.net/roctinam/aiwg/issues/1918) | raw JSONL plus enrichment |
| `warp` | [#1919](https://git.integrolabs.net/roctinam/aiwg/issues/1919) | manual Markdown import and loss report |
| `devin-desktop` (`windsurf` alias) | [#1920](https://git.integrolabs.net/roctinam/aiwg/issues/1920) | opt-in hook capture |
| `generic` | [#1921](https://git.integrolabs.net/roctinam/aiwg/issues/1921) | declared interchange; opaque unsupported |

## Fortemi Dependencies

The local AIWG path is not blocked by Fortemi. Optional integration needs:

1. [Fortemi #1090](https://git.integrolabs.net/Fortemi/fortemi/issues/1090):
   source-addressed atomic external-note upsert.
2. [Fortemi #1091](https://git.integrolabs.net/Fortemi/fortemi/issues/1091):
   typed indexed metadata predicates and evidence locators across lexical,
   vector, and hybrid search.
3. [Fortemi #1092](https://git.integrolabs.net/Fortemi/fortemi/issues/1092):
   previewable graph purge with derived-data cleanup and content-free receipts.

Provider adapters, session schemas, candidate policy, review, and memory
promotion do not belong in Fortemi.

## Research Induction Plan

One section9 issue per missing high-value source:

- [section9 #655](https://git.integrolabs.net/section9/research-papers/issues/655):
  LongMemEval, Wu et al., ICLR 2025 / arXiv:2410.10813.
- [section9 #656](https://git.integrolabs.net/section9/research-papers/issues/656):
  CoALA, Sumers et al., TMLR 2024 / arXiv:2309.02427.
- [section9 #657](https://git.integrolabs.net/section9/research-papers/issues/657):
  MemoryBank, Zhong et al., AAAI 2024 / arXiv:2305.10250.
- [section9 #658](https://git.integrolabs.net/section9/research-papers/issues/658):
  Deng et al., privacy threat analysis framework, Requirements Engineering 2011.

OpenTelemetry is already represented by REF-1589 and must not be duplicated.

## Parent Closure Gate

The parent may close only when every canonical provider row links:

- implementation or explicit degraded/unsupported disposition,
- conformance fixture or contract test,
- provider documentation,
- relevant security/lifecycle tests,
- and the closing child issue.
