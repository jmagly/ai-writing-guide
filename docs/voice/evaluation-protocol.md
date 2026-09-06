# Voice evaluation protocol v1

`src/writing/voice-evaluation.ts` provides study preparation and descriptive analysis helpers for #2302. It has not run a human study, calibrated a metric, performed a power analysis or established improved writing quality. The checked-in fixture is synthetic. A complete design receipt is not a quality verdict. Actual pilot data, consented author samples, intended-reader judgments and independent metric calibration remain required.

## Prepare the private corpus

Use `parseEvaluationManifest` to freeze document IDs, author IDs, topics, development/enrollment/heldout membership and SHA-256 hashes of exact UTF-8 text. Development authors and final authors must be disjoint. Final authors supply separate enrollment and heldout documents. Supply the entire intended corpus; undisclosed contamination cannot be detected. Keep the manifest private because it contains source text.

The declared `normalized-word-trigram-jaccard-v1` duplicate guard normalizes Unicode and case, extracts word trigrams, and rejects exact normalized matches or Jaccard overlap at the caller's justified threshold. It applies to every pair, including within a partition. Run it **before** fitting profiles, descriptors or selectors, and remove flagged duplicates rather than optimizing the threshold on final outcomes. This lexical check misses paraphrases, translations and diluted copied passages and may reject common boilerplate. Review ambiguous duplicates independently and record exclusions. It does not establish semantic independence.

Record both control relationships explicitly: same author across different topics, and different authors writing on the same topic. The parser validates those relationships; the analyst must test whether a proposed style metric follows author rather than topic. Keep comparable genre, task and length where possible. Hash the frozen enrollment/test manifest and selector policies. Learn retrieval policy and tune thresholds exclusively on development authors. Use [equal-budget exemplar ablations](exemplar-selection.md) for random, style-varied, length-matched and topic-matched policies at multiple sample counts; do not choose a winner on heldout authors.

Only voluntarily author-supplied language and proficiency strata are supported. Missing values remain `not-supplied`. Do not infer ethnicity, nationality, demographic group or proficiency from prose. Obtain author consent for the intended study use, handling and retention before enrolling private text.

## Pilot, preregister, then collect final results

Run a pilot with development authors to estimate feasibility, rating reliability, missingness and within-author dependence. Archive its data, analysis and findings under a content hash. `preregisterEvaluation` records that hash, pilot author IDs, completion time, later registration time, frozen manifest hash, numerical decision thresholds with separate justifications, planned author count, sample-size justification, primary outcomes, analysis plan, selector-policy hash and budget/tokenizer identity. There are no built-in 65% or 60-brief defaults. A synthetic fixture value is never a recommended threshold or a power calculation.

Use the pilot to justify precision/power assumptions and feasible author recruitment. Specify exclusions, stopping rules, missing-data handling, multiplicity, paired contrasts, confidence level, bootstrap iterations/seed and any subgroup minimum sizes before final collection. Preserve registration versions and explain deviations. Freeze the manifest with an independent data custodian where heldout text must remain unseen by developers. The API requires the declaration `finalDataNotAccessed: true`; it cannot attest to chronology, consent, independence or the truth of that declaration. A hash of a claimed pilot artifact is not proof that the pilot occurred.

Record at least two generation model families with provider, exact model snapshot, decoding settings and prompt hash. Record extraction models separately. Judge models require an independent human calibration artifact and self-preference audit artifact, and cannot share an extraction model family or the same provider-plus-snapshot identity, even under different family labels. This conservative family check does not establish institutional or statistical independence. Audit judge preference for outputs from its own family and report family-specific disagreements. Prefer blind human author and intended-reader ratings as separate reference outcomes.

## Conditions and workflows

`EVALUATION_CONDITIONS` enumerates all eight combinations:

| ID | Rules | Voice description | Exemplars |
| --- | --- | --- | --- |
| r0v0e0 | off | off | off |
| r0v0e1 | off | off | on |
| r0v1e0 | off | on | off |
| r0v1e1 | off | on | on |
| r1v0e0 | on | off | off |
| r1v0e1 | on | off | on |
| r1v1e0 | on | on | off |
| r1v1e1 | on | on | on |

Cross these conditions with heldout tasks and each generation family in the notes-conditioned comparison. Separately label `unassisted`, `minimal-editing`, `notes-plus-author-edits`, and `notes-plus-exemplars-plus-author-edits` workflows. Do not count a minimally edited baseline as the missing notes-conditioned r0v0e0 arm. Capture author editing time, intervention count and final author approval as study data; the harness does not simulate author editing.

Each stimulus records its heldout-document ID, author/task IDs, generated text/hash, condition, workflow, model, genre, length band, editing strength and measured budget/tokenizer. Use the same supported propositions and task requirements for every arm. Keep actual tokenizer measurement artifacts with the run; a caller-supplied `budgetUsed` number is not independently measured by this harness. Freeze equal budget limits and reserve surrounding prompt overhead consistently. `evaluationDesignReadiness` checks model-family coverage, condition coverage for each heldout document/family, workflow presence, controls, planned author count and matching budget/tokenizer records. It does not check that every workflow has equally many observations, prove equal computational cost or enforce collection stopping rules. It always returns `humanEvaluation` and `qualityVerdict` as `not-established`.

## Blind judgment packets

Call `createBlindEvaluationPackets` for one author/task block with a recorded seed, stimuli and judge role assignments. It returns two separate artifacts:

- `packets`: opaque packet IDs, role, position labels and prose only. Supply these to judges.
- `privateKeyMap`: judge IDs and label-to-stimulus/condition/model mappings. Keep this with the data custodian; never send the whole return object to judges.

Seeded ordering, Latin-square rotations and alternating reversed blocks operate separately for authors and readers. Every complete 2N-judge block balances positions and reversal for N stimuli. Incomplete blocks can be imbalanced; inspect counts and use the preregistered allocation plan. Authors ordinarily rate their own material, so exact population balance may require repeated tasks rather than multiple fictitious author identities. Text itself may disclose a condition or author; blind metadata is not proof of successful blinding. Use neutral task instructions, preserve model-independent display and ask judges whether they recognized a condition. Keep that response separate from outcome ratings.

Pairwise studies can use two-stimulus blocks with swapped label order. Record ties explicitly and do not convert missing judgments into ties or zero scores. The library prepares data and never contacts judges.

## Ratings and analysis

`EvaluationRating` records stimulus, author and judge IDs, author/reader role, dimension, numeric value or null, explicit tie flag and a required reason for missing scores. Register scale anchors and direction before collecting data; the API intentionally does not impose a universal rating scale. `summarizeEvaluationRatings` counts missing observations and ties separately and keeps author and reader roles separate. It rejects duplicate stimulus/judge/role/dimension observations. Pass `{ manifest, stimuli, assignments }` as the second argument to `summarizeEvaluationRatings` for assignment-bound ingestion. Register human judges in `manifest.humanJudges` with their permitted role; author judges also require their final-author ID. Model judges permit only the `reader` role; they cannot supply author self-report. Manifest-bound summaries label `judgeKind` as `human` or `model` and reject any call mixing those kinds, including mixed assignment rosters. Analyze model diagnostics and human reader outcomes in separate calls. Without manifest context, judge kind remains `unknown` and must not be presented as verified human evidence. The ingestion checks the judge registry, role, stimulus author and assignment identity, rejects unassigned observations, and represents absent assigned responses as missing with reason `assigned-rating-not-returned`. Assignments list `stimulusId`, `judgeId`, `role` and `dimension`; derive them from the private packet map and the preregistered rubric before collecting ratings. Keep that roster complete and frozen with the study custodian. These are caller-declared assignments, not authenticated attendance records.

Without an assignment roster, summaries return `missingnessCompleteness: unknown`: a zero count means no explicit null rows were supplied, not that every assigned judge responded. With a roster they return `declared-assignments`. Supplying a manifest without assignments still validates registered judges and roles. Standalone summaries without context validate row structure only. Its pooled arithmetic means are descriptive only; do not use them for text-level significance tests.

Rate these dimensions separately:

- Factual fidelity: retained supported facts, limitations and uncertainty; unsupported additions.
- Author authenticity: the author's own judgment of fit and willingness to claim the writing.
- Reader suitability: intended readers' task success, clarity and appropriateness.
- Effort: measured time/interventions and separately anchored perceived effort.
- Within-author preservation: heldout cross-topic consistency, without rewarding copied phrases.
- Between-author diversity: meaningful distinction after controlling topic, genre and length.

`bootstrapAuthorMeans` first averages observed values within each author, then resamples whole authors with replacement. Authors receive equal weight even with unequal text counts. It returns a deterministic percentile interval, excludes authors with only missing values and returns no interval when fewer than two observed authors remain. For condition effects, first form preregistered paired differences within author/task, then pass author-cluster rows for that contrast. The helper does not manufacture pairings, impute missingness, adjust multiple testing or replace an adequate sample-size analysis. Very small author counts produce unreliable intervals even when a numeric interval can be computed.

`summarizeEvaluationByStratum` reuses the manifest-bound author/model/heldout-document/output-hash/workflow checks before processing ratings, validates judges and roles, and accepts an optional `assignments` list in its options to account for absent responses. Its missingness completeness follows the same explicit status as the aggregate helper. It produces descriptive author-cluster estimates by condition, workflow, genre, length band, editing strength, voluntary language/proficiency and generation model family. Filter to the preregistered contrast before inference; marginal summaries pool other factors and cannot estimate causal effects. Report cell counts and missingness, avoid publishing identifying small strata, and leave sparse comparisons unresolved. Between-author diversity requires an independently specified diversity measure or human rubric; a dimension label does not compute one.

`reportMetricDisagreement` compares human and metric categorical outcomes under a caller-supplied, independently calibrated decision rule and human-reference hash. It reports missing pairs, ties, disagreement IDs and rate without choosing a winning source. Analyze disagreement by author/topic/model/voluntary strata using the private join keys. Calibration must use independent human reference data; these APIs record the declaration rather than verify the artifact. Do not compare arbitrary raw similarity and rating scales directly. Optional detectors remain research diagnostics only: no authorship certification, publication gate or personal-voice threshold follows from their scores.

## Study handoff and validation

The study custodian still needs to supply: consented development/final authors and documents; a real pilot and sample-size justification; signed-off preregistration; frozen generation and independent judge artifacts; actual model outputs/token accounting; blind author and intended-reader ratings; author-edit effort records; calibrated metrics and self-preference audit; author-cluster analysis with limitations. Report failures and missingness as well as gains. No human-rated improvement is claimed until those records exist.

`test/fixtures/writing/evaluation-leakage.v1.json` contains only developer-authored synthetic documents and injected copies. Run `npx vitest run test/unit/writing/voice-evaluation.test.ts` for partition contamination, circular judges, temporal declarations, label rotations, missing ratings/ties, clustered resampling, model coverage, budgets and disagreement. Passing deterministic tests establishes bounded implementation behavior, not human-rated quality, demographic fairness or universal naturalness.
