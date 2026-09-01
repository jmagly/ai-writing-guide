# Legal and ethics guardrails for civic-action workflows

- **Issues:** [AIWG #2213](https://git.integrolabs.net/roctinam/aiwg/issues/2213), jurisdiction-sensitive portions of [AIWG #2216](https://git.integrolabs.net/roctinam/aiwg/issues/2216) and [AIWG #2217](https://git.integrolabs.net/roctinam/aiwg/issues/2217)
- **Retrieved:** 2026-09-01
- **Geographic baseline:** United States federal law and selected state examples; no state, tribal, territorial, or local conclusion is encoded
- **Artifact status:** Research brief and implementation constraints; not legal advice and not an authorization to record, request, collect, publish, or contact anyone

## Decision

Proceed with a jurisdiction-neutral guardrail layer, but do not let the addon perform or represent any legally consequential step until a human has selected and reviewed an applicable jurisdiction profile. In particular, an unknown or incomplete jurisdiction must block recording, deadline calculation, request transmission, legal assertions, publication, outreach, and escalation. The safe result is a research checklist or draft marked `NOT REVIEWED — DO NOT SEND/PUBLISH`, never a guessed rule.

This is a design recommendation, not a legal conclusion. Federal FOIA applies to federal executive-branch agency records and does not govern Congress, federal courts, state or local agencies, or private parties; states have their own access statutes ([DOJ Office of Information Policy, “About the FOIA”](https://www.justice.gov/oip/about-foia)). Recording and open-meeting rules also turn on jurisdiction and context. Federal law contains a party-consent provision for certain interceptions, while California separately requires all-party consent for a confidential communication and excludes specified public proceedings from that definition ([18 U.S.C. § 2511(2)(d)](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section2511); [California Penal Code § 632](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=632.)). These are examples of why the addon must not turn a general U.S. rule into a local answer.

The implementation should be stricter than the minimum conduct prohibited by any one statute. For example, there is no single general federal “doxxing law” that makes every publication of personal information unlawful. The product should nevertheless block doxxing, stalking assistance, intimidation, coordinated contact floods, and targeting of homes or families because those uses create foreseeable safety and privacy harm; federal stalking law confirms that technology-assisted courses of conduct intended to harass or intimidate can cross criminal boundaries in specified circumstances ([18 U.S.C. § 2261A](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section2261A)).

## Research method and evidence hierarchy

The five research cycles required by Strategy #148 were treated as follows:

| Cycle | Evidence examined | Result used here |
|---|---|---|
| Civic-tech, journalism, public-records, open-meetings, OSINT, and agent-safety patterns | Federal statutes and agency guidance; selected current state statutes; NIST, W3C, NARA, and journalism ethics standards | Jurisdiction profile, provenance packet, editorial status labels, corrections, human gates |
| Jurisdiction-neutral risk categories and decision points | Federal-versus-state scope, consent and context differences, agency-specific rules, deadlines, exemptions, and appeal variation | Fail-closed resolver and no universal deadline/consent rule |
| Harassment, doxxing, stalking, privacy, scraping, and publication risk | Stalking statute, computer-access and anticircumvention law, robots protocol, privacy frameworks, defamation doctrine | Blocked classes and safer alternatives |
| Reusable AIWG surfaces | `citation-guard`, `induct-media`, research REF/citation sidecars, media hash/storage policies, and human-in-the-loop gate patterns discovered through `aiwg discover`/`aiwg show` | Compose existing provenance and approval contracts instead of inventing parallel ones |
| Guardrail collation | Sources and constraints below | Implementation matrix, review checklists, retention defaults, readiness recommendation |

Authority is weighted in this order: current statutory text and official court opinions; current government guidance; consensus technical standards; professional ethics codes. A cited federal requirement is not represented as binding a private civic group unless the source actually says so. NIST and journalism standards are used as defensible design patterns, not as law. State examples demonstrate variance; they are not a survey of all jurisdictions.

## Findings and required policy

### 1. Jurisdiction is structured input, not prose decoration

A jurisdiction profile must identify at least:

- country and, where applicable, state, territory, tribe, county, municipality, and agency;
- governing records/open-meetings/recording authority, official source URL, version or effective date, and retrieval date;
- agency regulations, published request instructions, designated custodian, accepted delivery methods, and office hours;
- consent rule and whether the source is an open meeting, official stream, official recording, public call, or potentially confidential conversation;
- response, extension, fee, appeal, and limitation periods, including the event that starts or tolls each period and the reviewed holiday calendar;
- known confidentiality, privacy, sealed-record, closed-session, victim/witness, juvenile, health, education, and law-enforcement restrictions;
- reviewer identity, review timestamp, scope, unresolved questions, and expiration/revalidation date.

The profile must cite official sources and expose their retrieval dates. It must never silently fall back from a local profile to federal FOIA. DOJ expressly states that federal FOIA does not reach state or local records ([DOJ OIP FOIA Reference Guide](https://www.justice.gov/oip/department-justice-freedom-information-act-reference-guide)). Even among selected state examples, timing differs: California’s Public Records Act uses a 10-day determination period with a possible written extension in unusual circumstances, while Pennsylvania’s Right-to-Know guidance describes a five-business-day response and a possible extension ([California Government Code § 7922.535](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=7922.535.); [Pennsylvania Office of Open Records Citizens’ Guide](https://www.openrecords.pa.gov/RTKL/CitizensGuide.cfm)). The addon therefore must record agency-provided dates and may compute a date only from a reviewed profile; every computed date is labeled an estimate, not a legal assertion.

Federal FOIA itself illustrates why the model needs structured exceptions rather than a single “public” flag. It requires a request to reasonably describe agency records, provides a response process, and contains nine exemption classes, including personal privacy, confidential commercial information, law-enforcement interests, confidential sources, and physical safety ([5 U.S.C. § 552](https://uscode.house.gov/view.xhtml?req=%28title%3A5+section%3A552+edition%3Aprelim%29); [FOIA.gov FAQ](https://www.foia.gov/faq.html)). A released record, a record that may be requested, and a record safe to republish are three different states.

**Required behavior:** when the jurisdiction profile is missing, stale, internally inconsistent, or not tied to the relevant agency, set `jurisdiction_status: unresolved`, list the missing facts and official sources to consult, and stop before action.

### 2. Source access must respect authorization, technical controls, terms, and licenses

The addon may use a publicly accessible page, an official API, a user-provided lawful copy, or an authenticated source for which the user has documented authorization. It must not obtain or help obtain material by bypassing authentication, paywalls, CAPTCHAs, rate limits, IP blocks, encryption, private URLs, or other access controls. The Computer Fraud and Abuse Act addresses access without authorization and access to off-limits areas; the Supreme Court’s *Van Buren* decision explains that “exceeds authorized access” concerns information in areas such as files, folders, or databases that are off limits, not merely an improper downstream purpose ([18 U.S.C. § 1030](https://uscode.house.gov/view.xhtml?preview=true&req=%28title%3A18+section%3A1030+edition%3Aprelim%29); [*Van Buren v. United States*, 593 U.S. 374 (2021)](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf)). Copyright law separately prohibits circumvention of an effective access-control measure, subject to statutory and periodically adopted exceptions that the addon is not competent to adjudicate ([17 U.S.C. § 1201](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title17-section1201)).

The Robots Exclusion Protocol provides crawler rules that automated clients are requested to honor, but the standard explicitly says those rules are not access authorization ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.pdf)). The implementation must therefore record robots status and terms status separately from authorization status. An absent `robots.txt` is not permission to enter an authenticated or otherwise restricted area; an allowed robots rule does not override terms, license, privacy, or law.

Access and republication are also separate. Federal government works have a specific rule under 17 U.S.C. § 105, while state/local material and third-party material embedded in a government response require their own analysis; news reporting is an example of a purpose that may qualify for fair use, but the Copyright Office emphasizes that fair use is case-specific and has no fixed safe percentage ([17 U.S.C. § 105](https://uscode.house.gov/view.xhtml?edition=2023&num=0&req=granuleid%3AUSC-2023-title17-section105); [U.S. Copyright Office Fair Use Index](https://copyright.gov/fair-use/)). The addon must never label all “public records” as public domain.

**Safe alternatives:** use an official export/API, ask the custodian for an accessible copy, ask the user to upload a lawfully acquired source, store only a URL/hash and analysis where copying is not authorized, or draft a records request for human review.

### 3. Privacy minimization applies even to lawfully obtained or public data

“Publicly accessible” is not equivalent to “safe to aggregate, enrich, or republish.” NIST defines minimization as limiting the creation, collection, use, processing, storage, maintenance, dissemination, and disclosure of personally identifiable information to what is directly relevant and necessary, and retaining it only as long as necessary ([NIST CSRC minimization glossary](https://csrc.nist.gov/glossary/term/minimization)). NIST Privacy Framework 1.0 is the current final voluntary framework as of retrieval; version 1.1 remains an initial public draft and must not be described as final ([NIST Privacy Framework 1.0](https://www.nist.gov/privacy-framework/privacy-framework); [NIST Privacy Framework 1.1 status](https://www.nist.gov/privacy-framework/new-projects/privacy-framework-version-11)).

The default handling policy is:

- collect the smallest source slice needed for the stated public-interest question;
- do not collect or infer home addresses, personal phone/email, precise routine locations, family relationships, identity numbers, financial account data, credentials, medical/education details, immigration status, intimate imagery, or biometric templates unless a documented public-interest necessity and legal/ethical review both approve it;
- apply heightened protection to minors, victims, witnesses, confidential sources, private citizens incidentally mentioned in records, and people facing credible safety risks;
- never enrich a public record with brokered, leaked, breached, or inferred personal data to identify or locate a person;
- maintain a restricted evidence copy and a separately redacted working/public copy; do not mutate the evidence copy;
- surface sensitive fields to a human reviewer rather than relying on automated redaction as conclusive;
- record why each retained personal field is necessary, who may access it, the deletion/review date, and any hold.

Federal FOIA’s privacy and safety exemptions are not direct publication rules for a civic newsroom, but they provide strong evidence that government transparency law itself recognizes personal privacy, confidential sources, fair-trial interests, and physical safety as countervailing interests ([5 U.S.C. § 552(b)(6)–(7)](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title5-section552%28b%29%283%29)). The federal Privacy Act also treats identifiers such as voice prints and photographs as part of an individually linked agency record; its agency-specific scope must not be generalized into a universal private-sector rule, but it supports treating speaker-identification artifacts as sensitive ([5 U.S.C. § 552a](https://uscode.house.gov/view.xhtml?req=%28title%3A5+section%3A552a%28b%29+edition%3Aprelim%29)).

### 4. Harassment, stalking, doxxing, intimidation, and personal targeting are blocked classes

Block a request when its object or reasonably foreseeable effect is to:

- locate a person’s home, family, children, private contact details, routine, vehicle, workplace entrance, or real-time movements;
- build a target dossier unrelated to a concrete public-interest claim;
- enable repeated unwanted contact, coordinated swarming, mass complaints aimed at an individual rather than an institution, intimidation, shaming, retaliation, or threats;
- identify an anonymous/private person through dataset linkage, face recognition, voice recognition, or leaked/brokered data;
- rank people for pressure, punishment, surveillance, or “exposure” based on protected traits, lawful association, speech, or inferred beliefs;
- draft language that threatens legal, employment, reputational, family, immigration, or physical consequences to compel action;
- impersonate a requester, journalist, constituent, attorney, official, or affected person.

This product rule is deliberately broader than the elements of a criminal offense. Federal stalking law requires specified intent and a course of conduct causing or expected to cause fear or substantial emotional distress ([18 U.S.C. § 2261A](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section2261A)). The addon should not attempt to decide whether those elements are met; it should prevent the enabling conduct earlier.

**Safe alternatives:** redirect the user to an official office address, public comment channel, ethics/inspector-general process, records custodian, ombudsman, editor, court or administrative self-help resource, or emergency service as appropriate. Reframe the output around policy, public acts, official records, aggregated patterns, and institutional accountability. A lawful escalation draft must be factual, nonthreatening, addressed through an established channel, limited to a specific requested remedy, and reviewed by a human.

### 5. A public record proves the record exists; it does not automatically prove every assertion inside it

Every publishable claim needs an explicit epistemic status:

| Status | Meaning | Publication rule |
|---|---|---|
| `official_record` | The cited official source contains the stated entry or assertion | Say what the record says; do not silently adopt its underlying allegation as fact |
| `reported_allegation` | An identified person or document makes a disputed or unverified claim | Attribute precisely, state status and response, and do not use a conclusory headline |
| `verified_fact` | Evidence supports the proposition after documented verification | Cite primary evidence and verification notes; preserve limitations |
| `analysis` | A reasoned interpretation derived from cited facts | Identify method, assumptions, and author/reviewer |
| `opinion` | A value judgment not presented as a verifiable fact | Label commentary/advocacy and keep factual premises cited |
| `unknown_or_disputed` | Evidence is insufficient or materially conflicts | Do not resolve by model confidence; state what is unknown and route to review |

Calling a factual implication “opinion” is not a universal shield. The Supreme Court rejected a wholesale constitutional exemption for statements merely labeled opinion when they can reasonably be understood as asserting actual facts ([*Milkovich v. Lorain Journal Co.*, 497 U.S. 1 (1990), official U.S. Reports](https://www.govinfo.gov/app/details/USREPORTS-497/USREPORTS-497-1); [Congressional Constitution Annotated discussion](https://constitution.congress.gov/browse/essay/amdt1-7-5-7/ALDE_00013808/)). State defamation and privacy law varies, and the addon must not decide plaintiff status, fault standards, privileges, or defenses.

Professional standards reinforce the implementation pattern. The Society of Professional Journalists calls for attribution, labeling advocacy/commentary, minimizing harm, and correcting information throughout a story’s life ([SPJ Code of Ethics](https://www.spj.org/spj-code-of-ethics/)). The Associated Press requires attribution for reasonably disputed information and visible, labeled corrections rather than euphemistic silent fixes ([AP, “Telling the Story”](https://www.ap.org/about/news-values-and-principles/telling-the-story/)). These are ethics/design sources, not binding law.

**Required behavior:** retain the original claim, source, exact quotation or source location, retrieval time, verification steps, contrary evidence, response sought/received, status, reviewer, and publication version. Corrections append a new version and correction note; they do not erase the prior provenance record.

### 6. Human review must be an accountable decision, not a checkbox

NIST AI RMF 1.0 calls for documented roles, knowledge limits, human oversight, validation, safe failure, and accountability across the AI lifecycle ([NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)). Current federal OMB Memorandum M-25-21 applies to federal executive agencies, not generally to civic groups, but is a useful high-consequence design analogue: it requires suitable human oversight, intervention, accountability, fail-safes, periodic review, and appeal/remedy processes for covered high-impact federal AI uses ([OMB M-25-21, pp. 13–16](https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf)). It rescinded and replaced M-24-10, so implementations must not cite M-24-10 as current federal policy.

For this addon, human review is mandatory before:

1. initiating or continuing a recording when legality/consent is relevant;
2. sending a public-records request, narrowing letter, fee agreement, appeal, or legal assertion;
3. assigning a real person’s identity to an uncertain speaker or record;
4. publishing a transcript, vote ledger, allegation, adverse claim, personal data, or legal/compliance conclusion;
5. contacting a subject, official, employer, family member, source, or third party;
6. starting any escalation, campaign, coordinated outreach, or correction that names a person;
7. overriding a blocked or warning result.

The approval record must name the reviewer, role, artifact hash/version, jurisdiction profile/version, questions reviewed, evidence considered, redactions, decision, conditions, timestamp, and expiration. The authoring model cannot approve its own output. A reviewer must be able to reject, revise, or return the artifact and must receive the underlying sources, not just the generated summary.

## Issue #2216: public-meeting transcript and vote-ledger constraints

### Lawful intake

Before acquisition or transcription, classify the input as one of: official public recording; official live stream; open meeting recorded by the user; recording supplied by an authorized participant; or unknown/private communication. Record the source URL, provider, license/terms posture, meeting body, jurisdiction, open/closed status, agenda, acquisition method, and authorization evidence.

Federal Government in the Sunshine Act rules apply only to the federal collegial bodies within the statute’s definition; they are not a general local-meeting code. Within that limited scope, the statute addresses closed-meeting transcripts/recordings/minutes and specified retention ([5 U.S.C. § 552b](https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title5-section552b)). California provides a contrasting state/local example: a person attending an open local legislative-body meeting generally may record unless the body reasonably finds persistent disruption, and an agency-directed recording is subject to inspection under the state Public Records Act ([California Government Code § 54953.5](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=54953.5.)). Neither source authorizes a universal recording rule.

When meeting status, side-conversation status, consent, or source authorization is uncertain, the flow may prepare an acquisition checklist but must not activate a recorder, ingest a covert recording, or advise that recording is lawful.

### Transcript, speaker, and vote evidence

- Preserve the original media or a hash-only source record when copying/redistribution is not authorized. Record SHA-256, byte size, duration, acquisition time, source URL, and storage policy.
- Treat automated transcript text, diarization, face matching, voice matching, OCR, agenda alignment, motion extraction, and vote extraction as derived assertions.
- Do not enable biometric speaker identification by default. A public agenda or visible nameplate may support a candidate label, but uncertain identity remains `SPEAKER_XX` until human confirmation.
- Cite transcript claims to time ranges and the source hash. A quote must match the reviewed transcript segment; the transcript segment must retain confidence/limitations and reviewer status.
- Record motions, amendments, seconds, votes, abstentions, absences, recusals, agenda item, timestamp, and source separately. Do not infer a missing vote from silence or attendance.
- Use reconciliation states `match`, `mismatch`, `absent_from_source`, `ambiguous`, and `human_review_required`. A “match” means the compared sources agree on the represented fields; it does not certify legal validity.
- Treat adopted/official minutes as a distinct source and AI transcript/ledger as non-authoritative unless the governing body itself adopts it. Never overwrite an official source with a reconciliation result.
- Do not reconstruct, identify speakers in, or summarize a closed/exempt segment from indirect clues. Preserve the public boundary and refer the question to a reviewer.
- Publish captions/transcripts accessibly. DOJ’s current Title II guidance says state/local government web content is subject to WCAG 2.1 AA on the applicable compliance schedule and identifies captions as an accessibility requirement; the current dates were extended to 2027/2028 depending on entity size ([ADA.gov compliance guide](https://www.ada.gov/resources/small-entity-compliance-guide/)). This rule directly governs covered public entities, not every independent publisher, but accessible captions remain the safe default.

### Meeting publication gate

Block publication unless a human has verified: lawful source posture; public/closed boundaries; agenda identity; material speaker labels; each extracted motion/vote; citations/timecodes; sensitive data redactions; allegation status; accessibility; correction contact; and a visible “machine-assisted draft” or equivalent disclosure where automation materially contributed.

## Issue #2217: public-records assistant constraints

### Planning and drafting

The assistant may help identify a likely custodian and draft a request for records. It must not claim that an agency is covered, a record is disclosable, an exemption is invalid, a deadline has legally expired, fees must be waived, or an appeal will succeed. Federal guidance recommends checking already-published information first, sending the request to the agency/component likely to hold the records, describing records rather than asking the agency to conduct research or answer questions, and requesting a desired available format ([FOIA.gov FAQ](https://www.foia.gov/faq.html)). Those are useful drafting patterns even though state/local procedures differ.

Required planning fields:

- public-interest question and intended use;
- resolved jurisdiction profile and official law/instruction links;
- agency, component/custodian, and basis for believing it holds the records;
- record types, systems, offices, date range, keywords, known identifiers, and reasonable exclusions;
- requested native/electronic format and metadata, with accessibility needs;
- fee ceiling and fee-waiver/expedited-processing request only when reviewed criteria are supplied;
- privacy/safety minimization plan;
- draft status, human reviewer, send authorization, and exact transmitted version.

The tool must present optional narrowing language rather than maximizing volume. It must not fabricate legal citations or use adversarial language. If the custodian or law is unclear, produce questions such as “Which office maintains these records?” and “Which official request instructions apply?” rather than a ready-to-send demand.

### Tracking and response ingestion

Track observed events separately from calculated events: submitted time/method and exact copy; receipt; agency tracking number; acknowledgement; agency-provided estimated date; fee notice; clarification; extension; rolling production; final response; denial basis as quoted; and appeal/review instructions. Preserve envelopes, headers, attachments, and portal receipts.

On ingest:

- quarantine and scan files before parsing; preserve originals and hashes;
- identify container/attachment relationships and conversion/OCR history;
- label OCR and extracted tables as derived; never silently “correct” source text;
- record redactions and stated exemption bases without attempting to reverse, infer, or deanonymize them;
- separate records about a person from proof that the person committed an act;
- apply the privacy/publication review before indexing into a broadly searchable knowledge base;
- prevent cross-record enrichment that creates a new target dossier;
- attach every finding to a source page/cell/message/time range and provenance chain.

W3C PROV provides a vendor-neutral model of entities, activities, agents, derivation, primary sources, quotations, revisions, and invalidation that fits this chain ([W3C PROV-O Recommendation](https://www.w3.org/TR/prov-o/)). NARA’s guidance emphasizes preserving content, context, structure, authenticity, integrity, and the links among records; it directly governs federal records contexts but is a strong evidence-management pattern here ([NARA, “Implementing Electronic Signature Technologies”](https://www.archives.gov/records-mgmt/policy/electronic-signature-technology.html)).

### Sending, appeal, and escalation gate

Before sending, a human must verify the jurisdiction, custodian, scope, dates, privacy impact, fee exposure, attachments, contact information, and tone. Before an appeal or escalation, a human must additionally verify the transmitted request, response/denial, governing appeal instructions, computed dates, and cited authority. The addon may offer a neutral template:

> Please confirm the authority relied on for the response, the records or portions withheld, and the applicable administrative review or appeal process. If narrowing would facilitate a response, please identify the categories or date ranges creating the present difficulty.

It must block threats, accusations of crimes or bad faith without verified support, personal contact campaigns, exposure of private information, and instructions to evade agency procedures. A safer alternative is a factual chronology plus official review options for the human requester.

## Blocked request classes and safe alternatives

| Request class | Disposition | Safe alternative |
|---|---|---|
| “Tell me whether recording this meeting/call is legal” without a reviewed profile | Block legal conclusion and recording action | Produce jurisdiction/consent/source checklist and links for local review |
| Covert recording, private side-channel capture, or ingest of apparently unlawfully obtained material | Block acquisition/use; preserve no extra copy | Use official recording/minutes, seek consent, or request the record |
| Bypass login, paywall, CAPTCHA, rate limit, IP block, encryption, robots denial, or no-scrape control | Block bypass and derived instructions | Official API/export, authorized account, custodian request, user-supplied lawful copy, hash-only reference |
| Compile home/family/contact/location data or deanonymize a private person | Block collection, linkage, and publication | Official office/contact channel; aggregate or role-based reporting |
| Coordinate repeated contact, swarming, shaming, retaliation, intimidation, or threats | Block plan, lists, scripts, and automation | Single factual institutional communication or established complaint/comment channel |
| Publish an allegation as fact or use “opinion”/“allegedly” to avoid verification | Block publication | Attribute claim, cite record, seek response, state uncertainty, and route to editorial/legal review |
| Infer hidden/redacted/closed-session content or identify a confidential source | Block inference/deanonymization | Report only the existence and stated basis of the withholding |
| Automatically send a request, appeal, demand, outreach, or correction | Block external action | Produce a versioned draft and human-review packet |
| Calculate a deadline from an unreviewed law or generic calendar | Block legal deadline assertion | Record agency date; provide unresolved checklist; calculate only after profile approval |
| Republish an entire acquired work on the assumption that “public record” means public domain | Block license conclusion | Link/quote only as reviewed, use hash-only storage, obtain permission, or seek legal review |
| Biometric face/voice identification of meeting participants | Block by default | Agenda/nameplate/context candidate label plus human confirmation; otherwise `SPEAKER_XX` |
| Delete or silently overwrite a source, allegation, correction history, or prior published version | Block destructive mutation | Append a revision/correction with provenance and retention decision |

## Implementation guardrail matrix

The following matrix is normative for downstream agents, skills, flows, schemas, and publishing adapters.

| Control | Trigger | Required automated result | Human gate | Minimum audit evidence | Severity |
|---|---|---|---|---|---|
| Jurisdiction resolution | Recording, records, deadline, legal language, appeal | Validate profile completeness/freshness; otherwise stop | Jurisdiction reviewer approves profile | Authority URLs, effective/retrieval dates, scope, reviewer, expiry | `block` |
| Source authorization | Fetch, record, upload, API, scrape | Classify public/authenticated/user-supplied/unknown; reject control bypass | Reviewer resolves ambiguous authorization/terms/license | URL, access method, robots/terms/license state, authorization note | `block` |
| Meeting openness/consent | Audio/video acquisition or activation | Distinguish official/open/closed/private/unknown; unknown stops | Reviewer confirms recording and use posture | Body, meeting status, consent basis, source, profile | `block` |
| Sensitive-person protection | Any PII/biometric/private-citizen field | Minimize, flag, redact public copy, prohibit enrichment | Privacy/editorial reviewer approves necessity | Field inventory, purpose, access, redaction, retention | `block` for high-risk; otherwise `warn` |
| Anti-targeting | Person dossiers, outreach, escalation, contact lists | Detect targeting patterns and refuse harmful operationalization | No routine override; exceptional public-interest work requires security/editorial review | Request, rationale, safer alternative, decision | `block` |
| Epistemic labeling | Claim extraction or drafting | Require status and source; prevent promotion by model confidence alone | Editor approves `verified_fact` and adverse claims | Claim, status history, sources, contrary evidence, response | `block` before publication |
| Transcript provenance | Transcription, diarization, quote | Preserve source/transcript hashes, segments, limitations, tool/version | Reviewer validates material quotes/speakers | Hashes, timestamps, segment text, speaker status, reviewer | `block` before publication |
| Vote reconciliation | Motion/vote extraction | Use explicit states; never infer absent votes; preserve each source | Reviewer verifies material fields | Agenda item, motion, members/votes, citations, reconciliation | `block` before publication |
| Records draft | Request/narrowing/appeal | Draft only; no automatic send; no unsupported law/deadline claim | Requester or authorized reviewer approves exact version | Profile, custodian, scope, fees, version/hash, approval | `block` |
| Response ingestion | Files, email, portal exports | Quarantine, hash, preserve original, track derived OCR/extraction | Reviewer handles malware, sensitive data, publication | Receipt, hashes, MIME/container map, tool history, redactions | `block` on unsafe input |
| Publication | Any public/CMS/social output | Run citations, privacy, allegations, accessibility, license, correction checks | Named editor approves exact artifact | Gate result, evidence packet, version/hash, approver, timestamp | `block` |
| External outreach/escalation | Email, form, post, call plan, campaign | Draft only; prevent swarming/threats/personal channels | Human approves recipient, channel, facts, remedy, tone | Recipient role/channel, purpose, draft, approval, send receipt | `block` |
| Correction/takedown | Challenge or discovered error | Freeze distribution if severe; append correction/retraction; do not erase provenance | Correction editor decides scope and notification | Complaint, evidence, old/new versions, affected outputs, decision | `block` until reviewed |
| Retention/disposal | Schedule date, user deletion, takedown | Respect holds; dispose derived/private copies per policy; retain audit tombstone | Records/privacy owner approves sensitive/source disposal | Policy, item hashes, holds checked, disposition, approver | `block` if hold/uncertain |

### Required machine-readable gate outcomes

Each gate should emit `pass`, `warn`, or `block`, never only prose. At minimum include:

```yaml
gate_id: civic-guardrail/<control>
status: pass | warn | block
artifact_id: <stable-id>
artifact_sha256: <sha256>
jurisdiction_profile_id: <id-or-null>
policy_version: <version>
findings:
  - code: <stable-code>
    severity: warn | block
    evidence: [<source-or-field-reference>]
    safe_alternative: <actionable-non-harmful-path>
review:
  required: true
  reviewer: <human-or-null>
  decision: approved | rejected | revise | pending
  decided_at: <timestamp-or-null>
```

No downstream agent may reinterpret `block` as a suggestion. Overrides, if a policy owner later permits any, must use an explicit, separately authorized false-positive/exception gate and must not be available for anti-targeting, credential/access-control bypass, covert recording, or threats.

## Publication and public-records review checklists

### Publication checklist

- [ ] Exact artifact version/hash supplied to reviewer.
- [ ] Jurisdiction/source profile current for every recording or restricted source.
- [ ] Source authorization, terms, robots, license, and copying posture recorded.
- [ ] Every material factual claim has a primary-source citation or an explicit limitation.
- [ ] Public record, allegation, verified fact, analysis, opinion, and unknown/disputed states are not conflated.
- [ ] Adverse claims were corroborated where possible and a fair opportunity to respond was documented.
- [ ] Quotations match the cited page/cell/message/timestamp and preserve context.
- [ ] Transcript speaker labels and vote ledger material fields were reviewed.
- [ ] Closed, sealed, redacted, confidential-source, and victim/witness boundaries were preserved.
- [ ] Private-person data was minimized; high-risk fields were removed or specifically approved.
- [ ] Headline, summary, metadata, social copy, image/caption, and structured data do not overstate the body.
- [ ] Copyright/license and accessibility checks passed.
- [ ] Correction contact, version history, and correction propagation plan are present.
- [ ] Named human editor approved the exact output and conditions.

### Public-records checklist

- [ ] Correct federal/state/tribal/territorial/local authority and agency instructions linked.
- [ ] Custodian/component basis documented; public sources checked first.
- [ ] Request seeks reasonably identifiable records rather than answers or new research.
- [ ] Date range, record type/system, keywords/identifiers, formats, and exclusions are proportionate.
- [ ] Request avoids unnecessary personal data and target profiling.
- [ ] Fee ceiling, waiver/expedition language, identity verification, and attachments are reviewed where relevant.
- [ ] Dates are labeled as observed, agency-provided, or profile-calculated estimates.
- [ ] Tone is factual and nonthreatening; no unsupported legal conclusion or accusation.
- [ ] Exact send version, method, account/identity, and authorization are approved.
- [ ] Response-ingest, sensitive-data, retention, and eventual publication plans are assigned.

## Source retention and correction defaults

Use four linked layers:

1. **Evidence source:** immutable bytes when lawful to retain, otherwise URL plus hash/metadata and a reason for hash-only handling.
2. **Derived work:** OCR, transcript, tables, speaker candidates, claim extraction, summaries, and redactions, each linked to the source and tool/version.
3. **Editorial artifact:** reviewed story, request, ledger, correction, or source packet with status and approver.
4. **Public artifact:** published version and distribution locations, linked back to the editorial artifact and forward to any correction/retraction.

W3C PROV’s entity/activity/agent and derivation/revision relationships provide the portable vocabulary ([PROV-O](https://www.w3.org/TR/prov-o/)). AIWG’s existing `induct-media` contract already records source/transcript hashes, timestamp segments, licensing/storage posture, and allows hash-only media; `citation-guard` already checks source existence and transcript quote/timestamp alignment. Civic-action assets should compose these contracts rather than define incompatible provenance.

Retention periods must be organization-defined and jurisdiction-reviewed. NIST SP 800-53 AU-11 describes retaining audit records for an organization-defined period consistent with retention policy and legal/operational needs; it is a federal control catalog, not a universal retention period ([NIST SP 800-53 Rev. 5.1, AU-11](https://csrc.nist.gov/CSRC/media/Projects/risk-management/800-53%20Downloads/800-53r5/SP_800-53_v5_1-derived-OSCAL.pdf)). Default implementation behavior should therefore be:

- no invented universal number of years;
- a short review interval for raw sensitive personal data and a documented necessity to renew retention;
- preservation holds for active disputes, corrections, litigation, audits, or legally required retention;
- deletion of unnecessary working copies and extracted PII when the purpose ends, subject to holds;
- an audit tombstone recording what was disposed, when, under which policy, by whom, and which hash identified it;
- correction by append-only revision and visible notice, with propagation to downstream indexes/feeds; takedown does not require destroying the restricted evidence/audit record when retention is lawful and necessary.

## AIWG composition and design-pattern handoff

The legal/ethics layer should be represented once as a reusable rule and deterministic gate contract, then invoked by each agent/skill/flow. Do not duplicate paraphrased safety prose across assets because it will drift.

| AIWG surface | Reuse/extension requirement |
|---|---|
| Research-complete `citation-guard` | Validate source existence, claim citations, transcript timestamps, and hedging/limitations |
| Research-complete `induct-media` | Reuse hash, transcript sidecar, timestamp, license, storage, and hash-only patterns |
| Human-in-the-loop gate patterns | Reuse explicit approval/override records; create civic-specific gate reasons and non-overridable classes |
| Security engineering | Threat-model re-identification, stalking, credential/control bypass, malicious uploads, and unsafe publication |
| Knowledge-base/indexing | Separate restricted evidence from public index; enforce redaction and deletion/correction propagation |
| Marketing/publishing | Treat CMS/social/email as external actions behind the same publication/outreach approval boundary |
| Ops/audit | Emit stable gate codes, artifact hashes, reviewer decisions, retention events, and correction propagation status |

Agents should explain and assemble review packets; they must not self-authorize. Skills should have narrow inputs/outputs and emit the machine-readable gate result. Flows should place the guardrail gates before acquisition, before external transmission, before indexing sensitive material, and before publication. Schemas should preserve evidence and decision history. Templates should visibly distinguish draft, reviewed, published, corrected, and retracted states.

## Confidence and limitations

| Finding | Confidence | Limitation |
|---|---|---|
| Federal FOIA scope is not state/local scope | High | Agency status and specific federal component can still require analysis |
| Recording/open-meeting rules require jurisdiction and context resolution | High | No 50-state/territorial/tribal survey was attempted; consent and public-meeting exceptions change |
| Unknown jurisdiction should fail closed for action | High as safety/design judgment | This is a product risk decision, not a statement that every unknown case is unlawful |
| Access-control bypass and technical circumvention must be blocked | High | Statutory exceptions and authorization can be fact-specific; the addon should not adjudicate them |
| Privacy minimization and anti-targeting defaults | High as safety/ethics design | Particular publication rights and duties vary; public interest can require case-specific review |
| Allegation/fact/opinion separation and visible corrections | High as editorial design | Defamation, privilege, privacy torts, reporter’s privilege, and anti-SLAPP rules vary by jurisdiction |
| Human review before consequential actions | High as AI risk-control design | Human review can fail; reviewer competence, independence, workload, and source access must be tested |
| Specific retention period | Unresolved | Must be supplied by organization/jurisdiction profile and applicable holds; no universal default is justified |

Additional research is required before deploying in a named jurisdiction: validate current statutes and agency rules with an authorized local reviewer; assess applicable privacy, biometric, wiretap, open-meeting, public-records, defamation, copyright, journalist-protection, anti-SLAPP, accessibility, records-retention, and professional-licensing rules; test the jurisdiction profile against realistic fixtures; and establish an owner/revalidation cadence.

## Implementation-readiness recommendation

**Proceed with guardrail schemas, deterministic gates, review packets, provenance, and tests. Do not proceed with autonomous acquisition, recording, sending, publishing, outreach, deadline/legal conclusions, or jurisdiction-specific advice.**

Issue #2213 is ready to move from research into policy implementation only if this brief and its fail-closed rule are explicitly accepted by a human policy owner. Issues #2216 and #2217 may implement draft-only, evidence-preserving workflows behind these gates. A jurisdiction profile must remain a separately reviewed data dependency; the addon must ship with no profile that purports to cover every U.S. jurisdiction.

Acceptance should record:

- policy owner and date;
- accepted blocked classes and any classes declared non-overridable;
- reviewer roles and independence requirements;
- jurisdiction profile schema and revalidation owner;
- retention-policy owner;
- approved AIWG composition points;
- test evidence for fail-closed behavior, source provenance, privacy redaction, and correction propagation.

## Source register

All web sources were retrieved 2026-09-01.

| Source | Authority and relevance |
|---|---|
| [5 U.S.C. § 552](https://uscode.house.gov/view.xhtml?req=%28title%3A5+section%3A552+edition%3Aprelim%29) | Official U.S. Code text; federal records process and exemptions |
| [DOJ OIP, About the FOIA](https://www.justice.gov/oip/about-foia) | Official federal scope statement; excludes state/local, Congress, courts, and private entities |
| [FOIA.gov FAQ](https://www.foia.gov/faq.html) | Official request-planning and processing guidance |
| [5 U.S.C. § 552a](https://uscode.house.gov/view.xhtml?req=%28title%3A5+section%3A552a+edition%3Aprelim%29) | Official federal Privacy Act text; cited only within its agency-specific scope |
| [5 U.S.C. § 552b](https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title5-section552b) | Official federal open-meetings text; limited federal-body scope |
| [18 U.S.C. § 2511](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section2511) | Official federal interception statute; party-consent provision and exceptions |
| [California Penal Code § 632](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=632.) | Official state example distinguishing confidential communication and public proceedings |
| [California Government Code § 54953.5](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=54953.5.) | Official state/local open-meeting recording example, effective 2026 text |
| [California Government Code § 7922.535](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=7922.535.) | Official current state records-response example, effective 2026 text |
| [Pennsylvania OOR Citizens’ Guide](https://www.openrecords.pa.gov/RTKL/CitizensGuide.cfm) | Official state records-response and appeal example |
| [18 U.S.C. § 1030](https://uscode.house.gov/view.xhtml?preview=true&req=%28title%3A18+section%3A1030+edition%3Aprelim%29) | Official computer-access statute |
| [*Van Buren v. United States*](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf) | Official Supreme Court opinion interpreting “exceeds authorized access” |
| [17 U.S.C. § 1201](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title17-section1201) | Official anticircumvention statute |
| [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.pdf) | Standards-track Robots Exclusion Protocol; explicitly not access authorization |
| [17 U.S.C. § 105](https://uscode.house.gov/view.xhtml?edition=2023&num=0&req=granuleid%3AUSC-2023-title17-section105) | Official federal-government-works copyright rule |
| [U.S. Copyright Office Fair Use Index](https://copyright.gov/fair-use/) | Official explanation of case-specific fair-use analysis |
| [NIST Privacy Framework 1.0](https://www.nist.gov/privacy-framework/privacy-framework) | Current final voluntary privacy-risk framework at retrieval |
| [NIST Privacy Framework 1.1 status](https://www.nist.gov/privacy-framework/new-projects/privacy-framework-version-11) | Official status showing 1.1 remains an initial public draft at retrieval |
| [NIST minimization glossary](https://csrc.nist.gov/glossary/term/minimization) | Official definition supporting collection/use/retention minimization |
| [NIST AI RMF 1.0 Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) | Voluntary AI oversight, validation, safe-failure, and accountability pattern |
| [OMB Memorandum M-25-21](https://www.whitehouse.gov/wp-content/uploads/2025/02/M-25-21-Accelerating-Federal-Use-of-AI-through-Innovation-Governance-and-Public-Trust.pdf) | Current federal executive-agency AI governance analogue; replaced M-24-10 |
| [18 U.S.C. § 2261A](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section2261A) | Official federal stalking statute; not represented as a general doxxing law |
| [*Milkovich v. Lorain Journal Co.*](https://www.govinfo.gov/app/details/USREPORTS-497/USREPORTS-497-1) | Official U.S. Reports decision on factual implications and “opinion” |
| [Constitution Annotated: Defamation](https://constitution.congress.gov/browse/essay/amdt1-7-5-7/ALDE_00013808/) | Library of Congress synthesis of governing Supreme Court doctrine |
| [SPJ Code of Ethics](https://www.spj.org/spj-code-of-ethics/) | Primary professional ethics source for attribution, labeling, correction, and harm minimization |
| [AP, Telling the Story](https://www.ap.org/about/news-values-and-principles/telling-the-story/) | Primary newsroom standard for attribution and visible corrections |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/) | W3C Recommendation for entity/activity/agent provenance and revision chains |
| [NARA trustworthy-record guidance](https://www.archives.gov/records-mgmt/policy/electronic-signature-technology.html) | Official federal records-management pattern for content, context, structure, authenticity, and integrity |
| [NIST SP 800-53 Rev. 5.1](https://csrc.nist.gov/CSRC/media/Projects/risk-management/800-53%20Downloads/800-53r5/SP_800-53_v5_1-derived-OSCAL.pdf) | Official control catalog; AU-11 supports policy-defined audit retention |
| [ADA.gov state/local web accessibility guide](https://www.ada.gov/resources/small-entity-compliance-guide/) | Current official Title II/WCAG 2.1 AA and compliance-date guidance |
