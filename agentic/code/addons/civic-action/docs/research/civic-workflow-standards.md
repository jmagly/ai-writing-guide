# Civic workflow standards research brief

> **Research reference.** Begin with the
> [prompt-based Civic Action quickstart](../quickstart.md) for user interaction.
> This brief supports the prompts and controls; it is not an operating guide or
> a substitute for jurisdiction-specific human review.

**Issues:** #2214, #2216, #2217, #2218, #2220, #2221
**Retrieved:** 2026-09-01
**Status:** implementation guidance; not legal advice
**Scope:** vendor-neutral source ingestion, public-records planning, public-meeting reconciliation, public-technology procurement research, publishing gates, corrections, and local-resource indexing

## Executive findings

1. Every imported fact needs two distinct records: a stable source record and an immutable retrieval/version record. W3C PROV supplies entity/activity/agent lineage; DCAT supplies catalog, publisher, issue/modified date, update-frequency, distribution, and temporal-coverage concepts. Neither proves that a source is true or current, so AIWG must retain observed retrieval facts and a separate, risk-based freshness decision. [S1][S2][S3]
2. Automated collection is permitted only after an explicit access decision. `robots.txt` is a crawler-control protocol, not authorization or a substitute for Terms of Service, licensing, authentication, privacy, or rate limits. A successful fetch must follow its rules; an unreachable file is treated as complete disallow by RFC 9309. AIWG should be at least as conservative. [S4][S5]
3. A public-records assistant should plan and track requests, not provide legal advice or automatically submit them. Federal FOIA guidance is a useful field model, but federal FOIA does not determine state or local procedure. The governing jurisdiction, agency regulations, fees, deadlines, exemptions, and appeal path must remain externally supplied and human-confirmed. [S7][S8]
4. A machine transcript is not official minutes. WebVTT can carry timestamped, speaker-attributed cues, while official state guidance demonstrates that required minute content and the relationship between recordings, transcripts, draft minutes, and approved minutes differ by jurisdiction. Votes and minutes therefore require explicit uncertainty and reconciliation states. [S9][S10][S11]
5. A public-technology review should preserve a complete, source-linked acquisition history and distinguish public artifacts from protected proposal/source-selection material. FAR record classes and market-research practices are a strong reference taxonomy, but not local law; NIST supply-chain guidance adds lifecycle security and supplier-risk fields. [S15][S16][S17][S18]
6. Publication requires machine-readable `block`, `warn`, and `record` results plus human approval. Accessibility cannot be established by an automated scan alone. WCAG-EM says most checks are not fully automatable, and U.S. state/local-government obligations can select a different WCAG version than the toolkit's latest standards target. [S12][S13][S14]
7. Corrections must be new, traceable versions, never silent replacement. PROV revision/invalidation and IPTC usable/withheld/canceled states provide complementary lineage and newsroom semantics; HTTP and Sitemap metadata support downstream refresh but cannot guarantee removal from third-party caches or archives. [S2][S5][S19][S20]
8. The first three local-resource verticals should be emergency alerts, public transit, and human services. CAP, GTFS, and HSDS provide maintained schemas, authoritative publisher relationships, update/cancel semantics, and enough structure for useful validation without inventing a new domain model. [S21][S22][S23][S24]

## Research method and evidence policy

This brief follows the AIWG research pattern of discovery, source-quality assessment, provenance-tracked synthesis, and explicit review gates. Standards bodies and government publishers are treated as primary sources for what their specifications or programs require. They are not treated as proof that a particular source, jurisdiction, vendor, transcript, or publication complies.

Normative words in this brief have implementation meanings:

- **MUST / BLOCK**: publishing or collection cannot proceed without remediation or an authorized, recorded exception where exceptions are allowed.
- **SHOULD / WARN**: proceed only with visible uncertainty and a recorded reviewer decision.
- **MAY / RECORD**: retain the observation for traceability without stopping the workflow.

Each recommendation below includes source keys. The full, retrievable source list is at the end of the brief.

## #2214: Public-source registry and compliance gate

### Source registry schema

The registry should use one stable `source` object and append-only `retrieval` objects. A changed representation creates a new retrieval entity rather than overwriting earlier evidence. [S1][S2]

| Field group | Recommended fields | Requirement and rationale | Basis |
|---|---|---|---|
| Identity | `source_id`, `title`, `canonical_url`, `source_type`, `jurisdiction`, `language` | Stable internal identity must not depend on a mutable URL or title. | [S1][S3] |
| Authority | `publisher_name`, `publisher_id`, `publisher_type`, `authority_class`, `responsible_agent`, `contact_url` | Attribute a source to the person or organization responsible; `authority_class` is an editorial classification, not a truth score. | [S1][S2][S3] |
| Catalog | `description`, `keywords`, `spatial_coverage`, `temporal_coverage_start`, `temporal_coverage_end`, `update_frequency`, `distribution_format`, `distribution_url` | Align catalog and temporal metadata with DCAT while allowing non-RDF serialization. | [S3] |
| Rights | `license_url`, `terms_url`, `terms_retrieved_at`, `terms_hash`, `terms_state`, `attribution_text`, `reuse_constraints` | Preserve which terms were reviewed and their exact observed version. `terms_state` is `allowed`, `restricted`, `prohibited`, `not_applicable`, or `unknown`. | [S1][S4] |
| Access | `access_method`, `authentication_required`, `authorization_reference`, `robots_url`, `robots_retrieved_at`, `robots_hash`, `robots_state`, `rate_limit`, `retry_after`, `access_state` | Robots rules, authentication, authorization, and server throttling are separate controls and must not be collapsed into one Boolean. | [S4][S5] |
| Retrieval | `retrieval_id`, `requested_url`, `resolved_url`, `retrieved_at`, `http_status`, `etag`, `last_modified`, `cache_control`, `content_type`, `content_length`, `content_hash`, `storage_reference` | Record the exact representation used and HTTP validators needed for conditional retrieval. | [S1][S5][S6] |
| Freshness | `publisher_issued_at`, `publisher_modified_at`, `observed_age`, `freshness_policy_id`, `freshness_deadline`, `freshness_state`, `freshness_rationale`, `next_review_at` | Keep publisher claims, observed retrieval time, and AIWG policy decisions distinct. `freshness_state` is `fresh`, `due`, `stale`, `expired`, `unknown`, or `unavailable`. | [S3][S5][S6] |
| Provenance | `generated_by_activity`, `used_entities`, `derived_from`, `quoted_from`, `primary_source`, `attributed_to`, `generated_at`, `invalidated_at`, `revision_of` | Provide a direct mapping to W3C PROV concepts for every derived artifact and correction. | [S1][S2] |
| Review | `review_state`, `reviewer`, `reviewed_at`, `decision`, `decision_reason`, `exception_id`, `exception_expires_at` | No ambiguous access, rights, or authority state should silently become permission. | [S4][S25] |

`authority_class` should be an enum such as `official_record`, `official_guidance`, `standards_body`, `first_party_statement`, `secondary_reporting`, `community_submission`, or `unknown`. It describes origin; it MUST NOT be converted into an automatic credibility score. [S1][S25]

### Access decision state machine

Collection may proceed only when all applicable controls allow it:

```text
registered
  -> terms_reviewed
  -> robots_reviewed
  -> authentication_and_authorization_reviewed
  -> rate_limit_configured
  -> allowed | manual_only | blocked | unknown
```

Rules:

- A successfully retrieved `robots.txt` MUST be parsed and its applicable rules followed. Cache it for no more than 24 hours unless it is unreachable, matching RFC 9309's default ceiling. [S4]
- If `robots.txt` is unreachable because of server/network error, automated collection MUST block. RFC 9309 requires complete disallow in that condition. [S4]
- RFC 9309 permits crawling after some `robots.txt` 4xx outcomes, but AIWG SHOULD record `robots_state: unavailable` and require the independent terms/license decision before collection. This is a deliberate conservative policy, not an RFC requirement. [S4]
- Robots permission MUST NOT be interpreted as authorization. Do not bypass authentication, paywalls, technical controls, or explicit reuse restrictions. [S4][S5]
- HTTP `403` is a refusal and MUST block retries with the same credentials. Rate-limit and `Retry-After` observations MUST be honored and recorded. [S5]
- `terms_state: unknown`, a changed terms hash, or conflicting license/terms signals MUST route to human review. The reviewer records the permitted purpose, scope, retention, attribution, and expiry of the decision. [S1][S25]
- Private, restricted, or non-public feeds MUST NOT be republished merely because valid credentials exist. Authorization to retrieve and permission to publish are separate fields. [S4][S21][S22]

### Freshness policy

Freshness is a policy evaluation over a versioned observation, not a single timestamp:

```text
freshness_state = evaluate(
  retrieved_at,
  publisher_modified_at,
  http validators,
  source update_frequency,
  domain validity/expiry,
  risk tier,
  current time
)
```

- Use `ETag` and `Last-Modified` for conditional validation; use HTTP cache directives as origin freshness signals. Do not treat either as proof that the underlying facts remain correct. [S5][S6]
- Preserve DCAT-style `issued`, `modified`, `accrualPeriodicity`, temporal coverage, and distribution metadata when supplied. Never synthesize missing publisher dates from the retrieval timestamp. [S3]
- Domain expiry overrides generic TTL. A CAP alert past `expires`, a canceled alert, or a transit alert outside its active period is not current even if fetched moments ago. [S21][S23]
- Safety-critical expired content MUST block publication as current. Non-safety content beyond its policy deadline SHOULD warn and carry a visible "last verified" value until revalidated.
- A failed refresh MUST retain the last known version and mark it `stale` or `unavailable`; it MUST NOT silently restamp the old content as newly retrieved. [S1][S6]

## #2217: Public-records request planning

### Boundary

The assistant is a drafting, research, and tracking tool. It MUST NOT claim to determine legal entitlement, exemptions, deadlines, fee eligibility, litigation strategy, or the correct custodian. It MUST NOT submit a request without an explicit human action. Federal FOIA applies to federal agencies and each agency processes its own records; state and local laws and procedures differ. [S7][S8]

### Request-plan schema

| Group | Recommended fields | Gate behavior | Basis |
|---|---|---|---|
| Governing profile | `jurisdiction`, `law_name`, `law_url`, `agency_regulations_url`, `profile_reviewed_at`, `profile_reviewer` | Missing or unreviewed jurisdiction profile blocks a "ready to submit" state. | [S7][S8] |
| Recipient | `agency`, `component`, `records_officer`, `contact_source_url`, `submission_channels`, `mailing_address` | Component and contact must be source-linked; uncertainty warns. | [S7] |
| Scope | `records_description`, `subject`, `date_start`, `date_end`, `record_types`, `likely_custodians`, `systems_or_locations`, `search_terms`, `exclusions` | The plan must ask for records rather than answers, research, or newly created analysis. | [S7][S8] |
| Delivery | `preferred_format`, `delivery_method`, `accessibility_needs`, `rolling_production_requested` | Record preferences without asserting that the agency must honor them. | [S7] |
| Fees | `requester_category_claim`, `fee_ceiling`, `advance_notice_threshold`, `fee_waiver_requested`, `fee_waiver_rationale`, `fee_rule_url` | Never predict approval. Missing ceiling warns before submission. | [S7] |
| Expedition | `expedited_requested`, `expedited_basis`, `supporting_facts`, `certification_text`, `expedition_rule_url` | Must be disabled by default and require human review of the jurisdiction's rule. | [S7] |
| Privacy | `request_concerns_self`, `third_party_personal_data`, `consent_or_identity_requirements`, `sensitive_terms`, `minimization_notes` | Potential third-party personal data or credentials block automation and trigger privacy review. | [S7][S25] |
| Tracking | `request_id`, `draft_version`, `submitted_at`, `submission_proof`, `agency_tracking_number`, `acknowledged_at`, `status`, `estimated_completion`, `correspondence_log` | Submission fields change only from observed evidence or a human action. | [S7][S8] |
| Response | `response_received_at`, `disposition`, `exemptions_asserted`, `redactions_marked`, `withheld_volume`, `appeal_information`, `response_files`, `checksums` | Store the agency's assertion without deciding whether it is legally correct. | [S7] |
| Provenance | `sources`, `drafted_by`, `reviewed_by`, `revision_of`, `generated_at` | Every factual instruction and contact value must trace to its current source. | [S1][S2] |

Recommended request states are `researching`, `draft`, `human_review`, `ready`, `submitted`, `acknowledged`, `clarification_requested`, `fee_issue`, `processing`, `partial_response`, `completed`, `denied`, `appeal_considered`, and `closed`. State transitions must be backed by correspondence or an explicit human action. [S1][S7][S8]

## #2216: Meeting transcript, vote ledger, and minutes reconciliation

### Artifact separation

Maintain four separately versioned artifacts:

1. **Source media**: immutable recording reference, checksum, duration, acquisition rights, and provenance.
2. **Transcript**: timestamped cues, speaker hypotheses, confidence, and human edits.
3. **Vote ledger**: structured motions and votes derived from identified cues and documents.
4. **Minutes reconciliation**: comparison of transcript/ledger with draft and approved official minutes.

WebVTT supplies time-aligned cues and voice spans, but it does not certify speaker identity or factual accuracy. [S11] Official guidance also distinguishes minutes from verbatim transcripts: Massachusetts specifies core minute content, while Florida describes minutes as a brief summary and says a verbatim transcript is not required. [S9][S10]

### Transcript schema

| Object | Required fields | Basis |
|---|---|---|
| `meeting` | `meeting_id`, `body`, `jurisdiction`, `notice_url`, `agenda_url`, `scheduled_start`, `actual_start`, `location`, `members_expected`, `media_source_id`, `minutes_urls` | [S1][S9] |
| `cue` | `cue_id`, `start`, `end`, `text`, `language`, `speaker_label`, `speaker_identity_state`, `speaker_confidence`, `text_confidence`, `overlap`, `inaudible`, `human_verified`, `revision_of` | [S1][S2][S11][S25] |
| `agenda_item` | `item_id`, `agenda_label`, `start_cue`, `end_cue`, `documents_used`, `disposition`, `confidence` | [S9][S11] |
| `transcript_review` | `reviewer`, `reviewed_at`, `scope`, `corrections`, `unresolved_segments`, `tool_and_version` | [S1][S25] |

`speaker_identity_state` is `unknown`, `diarized`, `self_identified`, `context_inferred`, or `human_confirmed`. Only `human_confirmed` may be presented without an uncertainty label. Confidence is evidence for review prioritization, not permission to auto-confirm. [S25]

### Vote-ledger schema and rules

Recommended fields are `motion_id`, `agenda_item_id`, `motion_text`, `motion_text_state`, `mover`, `seconder`, `vote_method`, `quorum_observed`, `members_present`, `vote_entries[]`, `announced_result`, `calculated_result`, `source_cue_ids`, `source_document_ids`, `extracted_by`, `verified_by`, `verification_state`, and `notes`. Each vote entry contains `member`, `choice`, `source_cue_id`, and `confidence`. [S1][S9][S11]

- Do not infer `absent`, `abstain`, `recused`, or a member's vote from silence, seating, party, or an aggregate announced result.
- Preserve the exact motion language when available; otherwise set `motion_text_state: paraphrase`.
- A mismatch between announced and calculated result is `conflict`, not an automatic correction.
- A vote remains `provisional` until a human verifies the source media or an official record corroborates it. Labeling it "official" requires the governing body's official source. [S9][S10][S25]

### Reconciliation states

Use `captured_unverified`, `human_verified`, `corroborated`, `conflict`, `draft_minutes`, `approved_minutes`, `superseded`, and `unresolvable`. A reconciliation record should include `assertion_id`, `artifact_a`, `artifact_b`, `relation`, `difference`, `materiality`, `source_selectors`, `reviewer`, `decision`, and `decision_reason`. [S1][S2][S9][S10]

The public view MUST clearly distinguish transcript text, editorial annotations, draft minutes, and approved minutes. Closed/executive-session content, private addresses, or inadvertently captured sensitive speech must route to a jurisdiction-aware privacy/legal review rather than automatic publication. [S9][S10][S25]

## #2218: Public-technology procurement research

### Record classes

The toolkit should recognize these classes without assuming every jurisdiction makes each class public:

| Class | Examples | Basis |
|---|---|---|
| Need and authorization | problem statement, budget authority, accessibility/security requirements, approvals | [S15][S16] |
| Acquisition planning | procurement plan, alternatives, schedule, competition strategy | [S15][S16] |
| Market research | RFI, source list, comparable contracts, product literature, capability notes | [S16] |
| Solicitation | notice, solicitation, amendments, Q&A, bidder conference material | [S15] |
| Offers and source selection | proposals, pricing, evaluation worksheets, conflict disclosures, selection record | [S15] |
| Responsibility | financial capacity, schedule capacity, performance, integrity, controls, technical capability, eligibility | [S17] |
| Award and contract | decision rationale, award, contract, modifications, options, warranties, service levels | [S15] |
| Administration | deliverables, acceptance, incidents, invoices, payments, performance, corrective actions | [S15] |
| Closeout and oversight | final acceptance, excess funds, audit, protest, litigation, retention/disposition | [S15] |
| Public release | released version, redaction/exemption statement, release date, provenance | [S1][S7][S15] |

FAR requires contract files sufficient to provide a complete transaction history, support decisions and review, and preserve essential facts; it also identifies proposal and source-selection information that must be protected from unauthorized disclosure. The implementation must therefore track both artifact existence and disclosure state. [S15]

### Neutral evidence and risk schema

Recommended `evidence_item` fields are `evidence_id`, `claim`, `claimant`, `artifact_class`, `source_id`, `selector`, `date`, `jurisdiction`, `public_release_state`, `verification_state`, `supports_or_contradicts`, and `review_notes`. Avoid sentiment labels and vendor scores. [S1][S15][S16]

Recommended `risk` fields are `risk_id`, `category`, `condition`, `consequence`, `affected_service_or_population`, `evidence_ids`, `likelihood`, `impact`, `uncertainty`, `owner`, `mitigation`, `verification_method`, `residual_risk`, `status`, and `reviewed_at`. `likelihood` and `impact` may use configured ordinal values only when accompanied by rationale; unknown must remain a valid value. [S18][S25]

Minimum risk categories are:

- accessibility and accommodation [S12][S14][S16]
- privacy and data governance [S18][S25]
- security and software/supplier chain [S18]
- interoperability, portability, and vendor lock-in [S16][S18]
- resilience, continuity, and exit/transition [S18]
- records retention, auditability, and public disclosure [S15]
- fiscal, schedule, and performance risk [S15][S16][S17]
- supplier responsibility, integrity, and conflicts [S15][S17]

The toolkit MAY compare documented requirements with evidence, but MUST NOT make an award recommendation, infer corruption, or rank vendors without a human-defined method and authorized reviewer. It must state that FAR and NIST are reference models unless the governing procurement adopted them. [S15][S18][S25]

## #2220: Cited, accessible publishing gates

### Machine-readable gate result

Every gate emits:

```yaml
gate_id: string
severity: block | warn | record
status: pass | fail | waived | not_applicable
rule: string
artifact_id: string
observed: object
expected: object
evidence_refs: [string]
checked_at: date-time
checker: string
reviewer: string | null
waiver:
  authority: string | null
  reason: string | null
  expires_at: date-time | null
```

Blocks are never silently downgraded. An editorial reviewer cannot waive a lack of access rights or authorization; that requires the rights holder or appropriately authorized legal/policy owner. A waiver is a new provenance activity, retains the failed result, names its authority and rationale, and expires. [S1][S2][S4]

### Gate matrix

| Gate | Block | Warn | Record | Basis |
|---|---|---|---|---|
| Source access | Prohibited terms, disallowed path, authorization bypass, private/restricted feed proposed for public release | Terms ambiguity or manual-only source | Access decision and hashes | [S4][S5][S22] |
| Provenance | Material claim has no source entity; content hash/version missing; correction overwrites history | Secondary source where primary source is expected | Complete derivation graph | [S1][S2][S3] |
| Citation | Allegation, quotation, vote, number, date, or consequential factual claim lacks a resolvable source selector | Non-material background claim has only broad-document citation | Citation coverage and selector type | [S1][S2][S11][S26] |
| Freshness | Safety-critical item expired/canceled; required current source is unavailable | Non-critical source is overdue or publisher date unknown | Retrieval age, validators, policy | [S3][S6][S21][S23] |
| Meeting certainty | Vote or speaker identity presented as official while provisional/conflicted | Low-confidence transcript segment visibly labeled | Cue confidence and review state | [S9][S10][S11][S25] |
| Records/legal boundary | Automated submission, hard-coded unverified deadline, legal conclusion, or sensitive personal data without review | Uncertain custodian or fee outcome visibly labeled | Jurisdiction profile and reviewer | [S7][S8][S25] |
| Accessibility | Known failure at the selected conformance target in published content or a complete process; missing required captions/alternative | Automated check passes but required manual evaluation is incomplete | Scope, tools, manual tests, reviewer | [S12][S13][S14] |
| Editorial state | Item is `withheld` or `canceled`; required human editorial approval absent | Material single-source dependency or unresolved non-critical dissent | Approval, dissent, and status | [S19][S25] |
| Privacy/safety | Doxxing, secret/private content, unnecessary sensitive data, or credible personal safety risk | Public but sensitive data needing minimization/context | Redactions and rationale | [S21][S25] |
| Structured data | Invalid mandatory CAP/GTFS/HSDS fields used for public assertions | Optional metadata missing | Validator version and findings | [S21][S23][S24] |

### Citation selector requirements

Each material claim should reference a `citation` object with `citation_id`, `source_id`, `retrieval_id`, `claim_id`, `selector_type`, `selector_value`, `quoted_text` when applicable, `accessed_at`, and `verification_state`. Use page/section selectors for documents, WebVTT cue IDs or W3C media fragments for recordings, and stable record IDs plus version/hash for structured feeds. [S1][S2][S11][S26]

Accessibility evaluation must define scope, conformance target, technologies, representative samples, complete processes, automated findings, manual findings, and evaluator. Passing an automated tool is not a WCAG conformance claim. [S12][S13]

For covered U.S. state and local government sites, the configured legal profile must separately record the DOJ Title II rule's applicable WCAG 2.1 Level AA requirement and timing; a project may voluntarily target WCAG 2.2 AA without representing that the two standards are legally interchangeable. [S12][S14]

## Correction, withdrawal, and reindexing

### Correction record

Every correction should contain `correction_id`, `item_id`, `old_version`, `new_version`, `status_before`, `status_after`, `reason_category`, `public_note`, `changed_claim_ids`, `source_refs`, `reported_at`, `decided_at`, `published_at`, `reviewer`, `downstream_targets`, and `completion_evidence`. [S1][S2][S19]

Use these publication states:

- `usable`: current approved version may be published.
- `withheld`: must not be published until a subsequent approved version.
- `canceled`: permanently withdrawn from public reuse.
- `superseded`: AIWG extension indicating a newer usable version exists; retain only as historical, clearly marked evidence.

The first three states align with IPTC NewsML-G2; `superseded` is an AIWG extension and must not be serialized as an IPTC publishing-status value. [S19]

### Downstream correction flow

1. Freeze silent edits; create a new version with `revision_of` and preserve hashes. [S1][S2]
2. If harm may continue while correction is prepared, set the public item to `withheld`; use `canceled` only when permanently withdrawn. [S19]
3. Publish a correction note linked in both directions between versions. Preserve quoted/primary-source lineage and invalidation time. [S2][S19]
4. Purge or update owned caches, feeds, search indexes, API responses, social drafts, exports, and derived datasets. Record each target and result.
5. Update `ETag`, `Last-Modified`, cache directives, and Sitemap `<lastmod>` accurately; remove canceled URLs from the sitemap and return the intentional HTTP status selected by the publisher (for example, `410 Gone` for known permanent removal). [S5][S6][S20]
6. Re-run citation, freshness, accessibility, and structured-data gates on the corrected representation. [S12][S13]
7. Keep an access-controlled audit record when records-retention duties require it, even when the public representation is removed. Do not allow archived canceled content to re-enter publication workflows. [S15][S19]

No standard can guarantee that a third party promptly re-crawls, updates, or deletes a copy. The UI must describe reindex requests as requested/observed outcomes, not completed global erasure. [S5][S20]

## #2221: Three structured local-resource verticals

### 1. Emergency alerts and public warning

Use OASIS CAP 1.2 as the canonical exchange model. Required indexed fields should include `identifier`, `sender`, `sent`, `status`, `msg_type`, `scope`, `references`, `incidents`, `language`, `category`, `event`, `urgency`, `severity`, `certainty`, `effective`, `onset`, `expires`, `headline`, `description`, `instruction`, `web`, `contact`, and geographic areas. Preserve resources, signatures, and the original CAP payload/hash. [S21]

Gates:

- BLOCK malformed required fields, unverified sender, non-public scope proposed for public display, `Test`/`Exercise` displayed as actual, expired alerts displayed as active, or a `Cancel`/`Update` that cannot be reconciled with its references. [S21]
- WARN unknown urgency/severity/certainty, missing optional instructions/contact, or stale feed connectivity.
- RECORD CAP profile, validator version, original status, update/cancel chain, and issuer verification.

FEMA's IPAWS feed requires approval, credentials, and an agreement; this demonstrates why a technically reachable feed is not necessarily an unrestricted source. IPAWS also does not replace local alerting systems. [S22]

### 2. Public transit

Use GTFS Schedule for `agency`, `routes`, `trips`, `stops`, `stop_times`, `calendar`, and `calendar_dates`, retaining feed version/hash and active service dates. Use GTFS Realtime for trip updates, vehicle positions, and service alerts with feed/entity timestamps and source identifiers. [S23]

Gates:

- BLOCK invalid required identifiers/relationships, service outside its declared dates presented as active, or unverified feed ownership presented as agency-authoritative.
- WARN realtime timestamp beyond the locally configured service-level threshold, missing optional accessibility fields, or schedule/realtime mismatch.
- RECORD validator output, feed timestamp, retrieval timestamp, entity deletions, and schedule version.

Do not infer on-time performance, accessibility, cancellations, or service availability from an absent realtime entity. Unknown remains unknown unless the feed specification and publisher profile establish a different semantic. [S23][S25]

### 3. Human services

Use Open Referral HSDS for the core relationship among `organization`, `service`, `location`, and `service_at_location`, with `schedule`, `contact`, `phone`, `eligibility`, `fees`, `language`, `taxonomy`, `service_area`, and metadata/change records. Each service must remain linked to the responsible organization, and the source taxonomy must be preserved rather than silently remapped. [S24]

Gates:

- BLOCK a service without a responsible organization, a location/contact fabricated from inference, or sensitive eligibility/client data proposed for public indexing.
- WARN hours, eligibility, fees, or contact data beyond their verification policy; taxonomy mapping with unresolved ambiguity; or accessibility information not supplied by the source.
- RECORD source metadata, taxonomy/version, last verified time, correction/takedown contact, and all transformation mappings.

The index must label "not provided" separately from "none." It must offer a correction/takedown intake route, preserve the contested value and evidence internally, and route urgent safety or privacy reports to human review. [S1][S24][S25]

## Cross-cutting implementation invariants

- **Append-only evidence:** source payloads, decisions, corrections, and gate results are immutable versions. Mutable indexes point to the current usable version. [S1][S2]
- **No invented facts:** missing values remain null/unknown with provenance; transformations retain input and mapping version. [S1][S25]
- **Human authority:** legal/access decisions, public-record submission, consequential publication, official vote labeling, vendor conclusions, and correction release require a named human reviewer. [S7][S9][S15][S25]
- **Jurisdiction profiles:** laws, deadlines, exceptions, accessibility obligations, and records-retention rules are data with sources and review dates, never universal constants. [S7][S8][S9][S10][S14][S15]
- **Separation of fact and assessment:** origin, authority class, freshness, confidence, and editorial decision are distinct fields. No composite credibility score. [S1][S3][S25]
- **Safe failure:** when access, currentness, identity, or official status cannot be established, the workflow blocks or visibly warns; it does not guess. [S4][S6][S21][S25]
- **Accessible evidence:** public citations and correction links have descriptive link text; media has captions/transcript alternatives as applicable; complete publishing processes undergo both automated and manual review. [S11][S12][S13]

## Dissent, scope limits, and unresolved design choices

1. **Robots versus legal permission:** RFC 9309 defines crawler behavior and explicitly says it is not security. It does not settle contract, copyright, privacy, database-right, or public-record questions. The recommended `unknown -> human review` state is intentionally more conservative than treating absence of a disallow rule as complete permission. [S4]
2. **Freshness versus correctness:** DCAT and HTTP expose publication, modification, validation, and cache signals; a recently modified official source may still contain an error, and an old stable record may remain authoritative. Domain policy and review are still required. [S3][S5][S6]
3. **Records-law variation:** DOJ/FOIA.gov guidance is federal and cannot be transplanted as state or municipal law. The schema is a planning vocabulary, not a deadline calculator or legal determination. [S7][S8]
4. **Transcript versus minutes:** Massachusetts guidance supports detailed minutes; Florida guidance says minutes are a brief summary and need not be verbatim. This is evidence against a universal transcript-to-minutes rule. AIWG should compare artifacts without declaring one universally controlling. [S9][S10]
5. **Automated speech confidence:** WebVTT standardizes timing and voice annotations, not recognition accuracy. NIST AI RMF supports validity, reliability, transparency, and accountable review, but it does not prescribe a universal confidence threshold for civic transcripts. Thresholds must be tested per system, language, acoustic condition, and consequence. [S11][S25]
6. **Procurement scope:** FAR is federal. Its record taxonomy and responsibility concepts are useful design references but may conflict with or omit local procurement law, collective-bargaining duties, bid secrecy, protest rules, and retention schedules. [S15][S16][S17]
7. **Accessibility versioning:** WCAG 2.2 is the current W3C Recommendation used here as a design target, while the cited DOJ Title II rule references WCAG 2.1 AA for covered U.S. state/local entities. The implementation must retain both a standards target and a legal-profile target. [S12][S14]
8. **Automated accessibility limits:** most accessibility checks are not fully automatable, and representative sampling alone generally does not establish conformance for an entire site. Machine gates must not emit an unqualified "WCAG compliant" claim. [S13]
9. **Correction versus retention:** IPTC's canceled state calls for removal from publication systems and archives, while government records rules may require retention. AIWG should remove canceled material from public reuse while preserving a separately access-controlled audit/records copy when required. [S15][S19]
10. **Reindexing limits:** HTTP and Sitemap signals help compliant consumers discover changes; they cannot compel third-party caches, archives, screenshots, or syndicators to remove content. [S5][S20]
11. **Vertical completeness:** CAP, GTFS, and HSDS are strong first pilots because each has a maintained structured model. They do not cover all locally important resources, and incomplete adoption by local publishers may require clearly marked adapters rather than fabricated conformance. [S21][S23][S24]

## Primary sources

All sources were retrieved on 2026-09-01.

- **[S1]** W3C, [PROV-DM: The PROV Data Model](https://www.w3.org/TR/prov-dm/) — Recommendation defining entities, activities, agents, derivation, attribution, responsibility, and temporal provenance.
- **[S2]** W3C, [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/) — Recommendation defining revision, quotation, primary-source, generation, and invalidation relations.
- **[S3]** W3C, [Data Catalog Vocabulary (DCAT) Version 3](https://www.w3.org/TR/vocab-dcat-3/) — Recommendation for catalog records, datasets, distributions, publishers, issued/modified dates, update frequency, and temporal coverage.
- **[S4]** IETF, [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) — standards-track crawler-control rules, caching, failure behavior, and security limitations.
- **[S5]** IETF, [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — HTTP validators, refusal, redirects, and permanent-removal semantics.
- **[S6]** IETF, [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) — freshness, staleness, validation, and cache-control semantics.
- **[S7]** U.S. Department of Justice Office of Information Policy, [Make a FOIA Request to DOJ](https://www.justice.gov/oip/make-foia-request-doj) — official request routing, description, fee, waiver, expedition, and response guidance.
- **[S8]** FOIA.gov, [Freedom of Information Act FAQ](https://www.foia.gov/faq.html) — official federal scope, agency processing, record/search boundaries, acknowledgments, redactions, and responses.
- **[S9]** Massachusetts Attorney General, [Open Meeting Law Guide (2025)](https://www.mass.gov/doc/open-meeting-law-guide-2025/download) and [Open Meeting Law FAQ](https://www.mass.gov/info-details/frequently-asked-questions-about-the-open-meeting-law) — official example of minute content, approval, draft access, and document listing requirements.
- **[S10]** Florida Attorney General, [Government-in-the-Sunshine Manual](https://www.myfloridalegal.com/sites/default/files/government-in-the-sunshine-manual.pdf) — official state guidance distinguishing written minutes from a verbatim transcript/recording.
- **[S11]** W3C, [WebVTT: The Web Video Text Tracks Format](https://www.w3.org/TR/webvtt1/) — time-aligned cues, voice spans, language, and caption serialization.
- **[S12]** W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) — accessibility conformance criteria, including captions, structure, keyboard operation, headings, language, contrast, and link purpose.
- **[S13]** W3C, [WCAG Evaluation Methodology (WCAG-EM) 2.0](https://www.w3.org/TR/WCAG-EM/) — evaluation scope, representative samples, complete processes, reporting, and limits of automation and sampling.
- **[S14]** U.S. Department of Justice, [ADA Title II Regulations](https://www.ada.gov/law-and-regs/regulations/title-ii-2010-regulations/) — official rule text incorporating WCAG 2.1 Level A and AA for covered state/local web content and apps, subject to the rule's scope and exceptions.
- **[S15]** U.S. Federal Acquisition Regulation, [Subpart 4.8 — Government Contract Files](https://www.acquisition.gov/far/subpart-4.8) — transaction history, file classes, protection, preservation, and retention.
- **[S16]** U.S. Federal Acquisition Regulation, [Part 10 — Market Research](https://www.acquisition.gov/far/part-10) — needs, sources, market practices, research techniques, accessibility, and documentation.
- **[S17]** U.S. Federal Acquisition Regulation, [9.104-1 — General Standards of Responsibility](https://www.acquisition.gov/far/9.104-1) — capacity, performance, integrity, controls, skills, facilities, and eligibility.
- **[S18]** NIST, [SP 800-161 Rev. 1 Update 1: Cybersecurity Supply Chain Risk Management Practices](https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final) — lifecycle supplier, product, service, resilience, reliability, integrity, and quality risk management.
- **[S19]** IPTC, [NewsML-G2 Guidelines: Publishing Status and Corrections](https://www.iptc.org/std/NewsML-G2/guidelines/) — usable, withheld, and canceled states; versions, corrections, and withdrawal behavior.
- **[S20]** Sitemaps.org, [Sitemaps XML Protocol](https://www.sitemaps.org/protocol.html) — URL listing, accurate modification dates, sitemap indexes, and crawler discovery.
- **[S21]** OASIS, [Common Alerting Protocol Version 1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html) — alert identity, sender, status, type, scope, urgency, severity, certainty, time, geography, update, and cancel semantics.
- **[S22]** FEMA, [IPAWS Technology Vendors and Developers](https://www.fema.gov/emergency-managers/practitioners/integrated-public-alert-warning-system/technology-developers) — CAP use, authorized-feed access, redistribution agreement, credentials, and IPAWS/local-system boundaries.
- **[S23]** MobilityData/GTFS community, [GTFS Overview](https://gtfs.org/documentation/overview/) and [GTFS Schedule Reference](https://gtfs.org/documentation/schedule/reference/) — schedule and realtime feed entities, relationships, service dates, and update types.
- **[S24]** Open Referral, [Human Services Data Specification](https://docs.openreferral.org/en/latest/hsds/overview.html) and [HSDS Schema Reference](https://docs.openreferral.org/en/latest/hsds/schema_reference.html) — organizations, services, locations, schedules, contacts, eligibility, taxonomies, and metadata/provenance.
- **[S25]** NIST, [Artificial Intelligence Risk Management Framework 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10) — voluntary validity, reliability, transparency, accountability, privacy, safety, and risk-management characteristics.
- **[S26]** W3C, [Media Fragments URI 1.0](https://www.w3.org/TR/media-frags/) — interoperable temporal selectors for audio/video evidence.
