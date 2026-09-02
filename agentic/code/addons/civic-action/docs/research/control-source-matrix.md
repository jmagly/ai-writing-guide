# Civic Action control-to-source matrix

**Reviewed:** 2026-09-01

**Scope:** AIWG Civic Action addon
**Interpretation boundary:** These sources inform artifact and review design.
They do not establish that a particular acquisition, recording, request,
procurement action, or publication is lawful or conformant in every
jurisdiction.

The detailed source analysis, dissent, and jurisdiction limits remain in
`civic-workflow-standards.md` and `legal-ethics-guardrails.md`. This matrix
connects those sources to the shipped controls and states whether each control
is executable or declarative.

| Control | Primary source basis | Shipped implementation | Verification | Boundary |
|---|---|---|---|---|
| Provenance and revision identity | [W3C PROV-DM](https://www.w3.org/TR/prov-dm/), [PROV-O](https://www.w3.org/TR/prov-o/) | Source, request, meeting, correction, and publication schemas carry identifiers, hashes, derivation, or version fields | Civic schema compilation and fixture tests | Most hashes are asserted metadata; the local gate does not fetch or independently hash remote evidence |
| Catalog authority and freshness metadata | [W3C DCAT 3](https://www.w3.org/TR/vocab-dcat-3/), [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) | Source registry records publisher, distribution, retrieval, validator, cache, and freshness fields; the gate blocks unresolved jurisdiction sentinels and expired exceptions and reports overdue review | Source schema plus `source-gate` decision, deadline, exception, terms-snapshot, and next-review tests | Freshness is not correctness; jurisdiction policy remains a dated human determination |
| Crawler and access review | [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) | Source gate checks declared robots, authorization, access, terms, publication-rights, and bypass states | Valid and hostile source fixtures; invalid schema inputs exit 2 | Robots permission is not legal authorization, copyright permission, or a security bypass license |
| Public-records request planning | [U.S. DOJ request guidance](https://www.justice.gov/oip/make-foia-request-doj), [FOIA.gov FAQ](https://www.foia.gov/faq.html) | Request-plan schema/template separates estimated and observed dates, fixes automatic submission to false, and preserves original responses | Schema positives and consequential-action negatives | Federal FOIA is a reference pattern, not a substitute for state, local, tribal, territorial, or foreign law; no submission gate ships |
| Meeting openness, recording, and official-record separation | [Massachusetts Open Meeting Law Guide](https://www.mass.gov/doc/open-meeting-law-guide-2025/download), [Florida Sunshine Manual](https://www.myfloridalegal.com/sites/default/files/government-in-the-sunshine-manual.pdf) | Meeting Flow requires a pre-recording human gate; ledger and reconciliation remain separate artifacts | Flow schema/human-gate tests; meeting packet gate | State examples are not universal law; recording posture is a declarative human gate, not determined by the CLI |
| Transcript cues and selectors | [WebVTT](https://www.w3.org/TR/webvtt1/), [Media Fragments](https://www.w3.org/TR/media-frags/) | Vote ledger requires a nonempty motion inventory, source cues, timestamps/citations, explicit verification, and conflict preservation; reconciliation requires comparisons and blocks unresolved material/unknown differences | Empty-inventory, inferred-vote, conflict, pending-difference, and missing-cue negative tests | The addon does not identify speakers or declare its reconciliation official minutes |
| Accessibility review | [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WCAG-EM](https://www.w3.org/TR/WCAG-EM/) | Publication packet separates automated and manual status and requires a named, dated manual reviewer with a decision reason | Publication gate anonymous, undated, and incomplete-review negatives | Automated checks and a packet status are evidence, not a WCAG conformance determination |
| Public-technology evidence review | [FAR Part 10](https://www.acquisition.gov/far/part-10), [FAR Subpart 4.8](https://www.acquisition.gov/far/subpart-4.8), [FAR 9.104-1](https://www.acquisition.gov/far/9.104-1), [NIST SP 800-161r1](https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final) | Review schema requires nonempty evidence and risk inventories with evidence references; award recommendation is fixed to null | Schema positives, empty-inventory negatives, and prohibited-award negative | Federal sources are design references unless adopted; the addon does not rank vendors, resolve conflicts of interest, or recommend an award |
| Publication state and correction planning | [IPTC NewsML-G2 Guidelines](https://www.iptc.org/std/NewsML-G2/guidelines/), [Sitemaps protocol](https://www.sitemaps.org/protocol.html), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) | Publication requires nonempty claim/upstream-gate inventories, structured source/retrieval selectors, and independent dated exact-hash approval; correction records require changed claims and downstream targets | Publication and correction schema tests; vacuous-pass, self-review, state, and propagation negatives | Correction is a human workflow, not a cryptographically enforced history; third-party reindexing or deletion cannot be guaranteed |
| Emergency, transit, and human-service profiles | [OASIS CAP 1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html), [FEMA IPAWS developers](https://www.fema.gov/emergency-managers/practitioners/integrated-public-alert-warning-system/technology-developers), [GTFS reference](https://gtfs.org/documentation/schedule/reference/), [Open Referral HSDS](https://docs.openreferral.org/en/latest/hsds/overview.html) | Local-resource schema binds CAP/GTFS/HSDS verticals to their formats and prevents a declared publication pass for unverified, stale, nonpublic, unreviewed, or failed-validation records | Per-vertical, cross-profile, and unsafe-publication-state negatives | These are AIWG profile contracts, not CAP/GTFS/HSDS conformance or public-safety validators |
| Human oversight and residual-risk disclosure | [NIST AI RMF 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10) | Agents, rules, skills, and Flow gates reserve consequential decisions for named people and preserve warnings/blocks | Addon, Flow, CLI, discovery, and deployment tests | A machine pass is review evidence only; it is not legal advice, factual verification, compliance, or authorization to act |

## Citation maintenance gate

When a control, field, or automated decision changes:

1. update the relevant research brief and this matrix;
2. record whether the behavior is executable, schema-only, or declarative;
3. add a positive and a safe negative test at the same boundary;
4. preserve jurisdiction and conformance limitations in public release copy;
5. re-run schema, addon, discovery, deployment, and executable-gate tests.
