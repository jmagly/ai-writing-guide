# Budgeted exemplar selection

`src/writing/exemplar-selection.ts` provides a deterministic, profile-scoped example store and four explicit selection policies. It uses approved writer-profile samples as inert example data. It does not infer an identity, generate signature phrases, train a retriever, select a production default, or establish writing quality.

## Public contract

1. `createExemplarStore(profile, descriptors, partition)` validates the current writer profile, checks author partitions and excludes unusable or leaking examples. The store contains accepted descriptors, their profile fingerprint, the partition manifest and enrollment exclusions. Sample text remains in the writer profile. The partition contains private holdout text required for duplicate checks and should be handled as private research data.
2. `selectExemplars(profile, store, options)` revalidates the store and current profile before selection. It returns `examples`, `serializedData` and a text-free retrieval `receipt`.
3. `runExemplarAblation(profile, store, options)` compares all four policies at multiple distinct positive sample counts, with the same budget, target, tokenizer and seed. It accepts development-author stores only. Final-author enrollment can use frozen policies through selection, but cannot run this tuning helper.

A descriptor declares `sampleId`, `profileId`, `genre`, `topicTags` and `styleTags`. Descriptors are supplied data; the module neither fits them to held-out text nor treats their strings as instructions. Final-author descriptors must come from permitted enrollment data and frozen methods. The manifest declares `version`, `purpose`, disjoint `developmentAuthorIds`/`finalAuthorIds`, `holdouts` and the duplicate metric/threshold. Callers must provide the complete intended holdout manifest; no library can exclude an undisclosed document.

Selection options require `strategy`, `seed`, `maxSamples` and `budget`. Length/topic policies additionally require `target: { length, topicTags }`; length uses UTF-16 code units. There is no implicit policy default.

| Policy | Version 1 ordering |
|---|---|
| `random` | SHA-256 ordering of seed and sample ID, independent of descriptor input order |
| `style-varied` | Seeded first example, then greedy maximum minimum Jaccard distance between declared style-tag sets |
| `length-matched` | Increasing absolute distance from target UTF-16 length, seeded tie breaking |
| `topic-matched` | Decreasing Jaccard overlap with declared target topic tags, seeded tie breaking |

These are transparent baseline policies, not claims that tags capture personal style or that topical similarity is optimal. Selection is greedy and can leave unused budget; it does not solve a global packing optimum or force a requested example count. Overlong samples are excluded whole, never truncated into potentially misleading fragments.

## Approval, partitions and duplication

An example must belong to this profile, be active, author-approved, permit `useForVoice`, contain text and not be marked secret. Exclusions return fixed reason codes: `cross-author`, `unusable`, `holdout`, `near-holdout`, `duplicate-enrollment`, `stale-profile`, `budget` or `sample-limit`. No fallback retrieves another author's text.

The duplicate guard is explicitly `normalized-word-trigram-jaccard-v1`:

- Exact same-author holdout IDs and identical content hashes are excluded.
- Text is NFKC normalized and lowercased, then tokenized into Unicode letter/mark/number runs.
- Equal normalized token sequences are excluded even when punctuation or whitespace changes.
- Otherwise the guard compares sets of contiguous three-word shingles; texts shorter than three words use their complete word sequence as one shingle. A Jaccard score at or above the caller's threshold excludes the candidate.
- The same guard applies against every disclosed holdout, including other author partitions, and previously accepted enrollment examples. Sample-ID ordering resolves duplicate enrollment deterministically.

The fixture uses `0.8` as a declared lexical duplicate policy, not a research-derived universal threshold. This algorithm can miss paraphrases, translations, semantic duplicates and copied passages diluted by much longer text. It can also reject legitimately similar boilerplate. A successful guard proves only these declared checks over the supplied manifest; it does not prove semantic independence of the corpus. Holdout scanning is solely an exclusion check, not descriptor training or target-quality optimization.

Retrieval re-runs approval and duplicate checks. A store's fingerprint binds its complete manifest, including holdout contents, author sets, purpose, duplicate metric/threshold and accepted descriptors. Mutation without renewed enrollment fails validation. Profile content hashes, approval/rights state, revision, semantic version and cache epoch are bound into cache identity. Changes return an empty stale-store fallback until the caller recreates enrollment. Store fingerprints detect accidental mutation; they are not cryptographic signatures or authorization for an attacker-controlled replacement manifest.

## Budget and example trust boundary

`ExemplarTokenizer` requires a stable `id`, `version`, `unit`, `measurement` and `count(serializedData)` function. A provider tokenizer can declare exact token counts only when it implements that named tokenizer/version. The module checks nonnegative integer results and recounts the complete JSON payload after each prospective addition, including IDs, hashes, escaping and structural delimiters. It never adds separately rounded sample estimates. Reserve system-prompt, transport and surrounding task overhead separately; this budget covers only the returned payload.

Without an adapter, `UTF8_BYTE_BUDGET` counts the exact UTF-8 byte length and reports `unit: utf8-bytes`, `measurement: upper-bound`. This is a conservative budget proxy for byte-based tokenization, not an exact model-token count or a guarantee for an arbitrary provider encoding. Use a verified exact tokenizer for provider token-limit claims. The unit remains explicit in receipts and fixture reports; byte counts are never relabeled as measured model tokens.

Examples are serialized as JSON objects with `kind: example-data`. Raw prose never becomes selection instructions or executable code. JSON escaping alone does not prevent a model from following embedded instructions: consumers must preserve the untrusted-example boundary when composing their prompts. This core performs no provider request, tool invocation or shell execution on sample content.

## Retrieval receipts and learned boundary

Receipts include strategy/version, seed, selected IDs/hashes, fixed selection reasons, all exclusions, requested/selected counts, budget units and measurement kind, tokenizer identity, profile version/revision/cache epoch, partition/store fingerprints, cache key and fallback diagnostics. They omit sample/holdout text and freeform descriptor strings. IDs and seed still require the caller's normal privacy policy. `qualityEvaluation` is always `not-performed`.

`LearnedExemplarPluginProposal` documents a future review boundary: plugin ID/version, evidence review, cost comparison and development-only training partition, with `enabled: false`. There is no loader or execution path for learned retrieval. Passing an unsupported strategy fails. Enabling a future plugin requires reviewed methods, consent/training provenance, equal-budget comparisons, cost evidence and a separate implementation decision; supplying the declaration cannot enable one.

## Deterministic fixture comparison

Reproduce:

```sh
npx vitest run --config config/vitest.config.js test/unit/writing/exemplar-selection.test.ts
```

The test emits `EXEMPLAR_ABLATION_FIXTURE` JSON. Measured on 2026-09-06 with Node 24.12.0 and Vitest 4.1.10: all 11 focused tests passed. TypeScript checking also passed. The synthetic fixture contains six developer-authored samples and declared tags; all runs use seed `voice-ablation-v1` and a 750-byte payload budget.

| Policy | Requested | Selected IDs | Selected count | Payload bytes |
|---|---:|---|---:|---:|
| random | 1 | b | 1 | 308 |
| style-varied | 1 | b | 1 | 308 |
| length-matched | 1 | a | 1 | 302 |
| topic-matched | 1 | a | 1 | 302 |
| random | 2 | b, c | 2 | 485 |
| style-varied | 2 | b, f | 2 | 648 |
| length-matched | 2 | a, b | 2 | 502 |
| topic-matched | 2 | a, f | 2 | 642 |
| random | 3 | b, c, d | 3 | 698 |
| style-varied | 3 | b, f | 2 | 648 |
| length-matched | 3 | a, b, c | 3 | 679 |
| topic-matched | 3 | a, f | 2 | 642 |

Equal budget means equal allowed limits, not identical consumed bytes. These measurements demonstrate deterministic differences in selection and budget use, including bounded fallback when a requested count does not fit. They provide no evidence that one resulting draft sounds better. No generation model or provider was involved; the exact artificial tokenizer test counts Unicode code points and is not a real provider tokenizer.

Remaining quality evaluation: freeze selector/descriptor methods and provider snapshots, compare equal-budget conditions across held-out authors/topics/channels, register sample-size and outcome criteria before held-out testing, collect blind author/reader judgments and independent measures, and report uncertainty at author level. No claim that five examples, topic matching or any other selector is universally best follows from this fixture. The [natural voice evidence ledger](../../agentic/code/addons/voice-framework/docs/natural-voice/evidence-ledger.v1.json) records the bounded research basis and separates practitioner hypotheses from established findings.

Measured artifact SHA-256 anchors:

- `test/fixtures/writing/exemplar-ablation.v1.json`: `56325c6600aa62d3bb0237fd4d02e24e10276d6a2db30b94a21574f6c943afac`
- `src/writing/exemplar-selection.ts`: `ee5387735653b76e5e4e1fcf4875ed24894018b902bd304defcb842ae17605b3`
- `test/unit/writing/exemplar-selection.test.ts`: `6831e6dcde57525ec06d52b399b6318a659163eb49cddc9d8cfce2883e402aed`
