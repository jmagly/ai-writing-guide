# Selector development comparison, 2026-09-07

Four shipped exemplar policies were compared across four enrolled development voices (JDS, Twain, Darwin and Woolf), three familiar briefs and one/three examples. The 96 logical cells produced 78 distinct prompts; identical prompts share one generated output. Primary-session review accepted 17/78 for factual fidelity and 6/78 for fidelity, cadence and mode together. All joint passes came from workshop narratives; engineering emails and archive replies had none. These results do not support selecting a production winner.

| Policy | Examples | Logical cells | Fidelity passes | Joint passes |
|---|---:|---:|---:|---:|
| Random | 1 | 12 | 1 | 1 |
| Random | 3 | 12 | 3 | 0 |
| Style-varied | 1 | 12 | 1 | 1 |
| Style-varied | 3 | 12 | 3 | 2 |
| Length-matched | 1 | 12 | 0 | 0 |
| Length-matched | 3 | 12 | 2 | 1 |
| Topic-matched | 1 | 12 | 3 | 1 |
| Topic-matched | 3 | 12 | 5 | 1 |

Logical totals are 18/96 factual and 7/96 joint passes. Shared outputs must not be treated as independent observations. By voice, joint logical-cell passes were JDS 1/24, Twain 3/24, Darwin 3/24 and Woolf 0/24. The small, dependent development sample does not support population uncertainty or a universal ranking.

## Budget and reproducibility

The generator experiment froze a 6000-byte serialized-example cap. A supplementary audit reran the unchanged shipped selector with a common 1500-token envelope cap fixed before counting. All 96 selections and complete prompt hashes were identical. Actual envelope usage was 231–1266 tokens, with the exact requested one/three examples and zero fallback. The unchanged prompts reuse the earlier 78 outputs; the audit added no new generations. It does not retroactively preregister a token-budget experiment, test a binding token cap, equalize actual spend or include surrounding chat/prompt overhead.

Token counts used llama-tokenize with the exact tested GGUF layer, no BOS, no escape expansion and no special-token parsing. The binary, manifest and full model layer were hash-verified; identities and per-cell receipts are in the [text-free evidence artifact](selector-development-2026-09-07.json). Counts are exact for that tokenizer and envelope, without assuming equivalence to a provider's full chat-template accounting.

Generation used the shipped selector from commit 23e5b1972, selector seed `selector-2295-v1`, model seed 2292, temperature 0.3, medium reasoning and a 4096-token output ceiling. The local model alias was `qwen3.8:27b`; the underlying GGUF reports the Qwen35 family, 27.3B parameters, Q4_K_M. Manifest digest: `22130167c4c20e20c7b71454612966ca8e8171e9b3cc8ab6ce8aa6cbfec79643`. All 78 generations finished normally. Recorded aggregate usage was 67,446 uncached input tokens, 23,993 cache-read input tokens and 121,842 output tokens including reasoning. Service windows totaled approximately 20.9 minutes, including service transitions; this is not request latency. Fortemi was restored and the test model unloaded after every window.

## Scope and failure analysis

Modes rotate by author/brief; this is not the full author-by-brief-by-mode crossing. Mechanical lexical topic tags and surface style tags are frozen descriptors, not a learned retriever. Raw source text and paragraph boundaries were preserved. Canonical profile hashes stayed unchanged; reserved sources were not read. The public artifact contains hashes, measurements, selections and judgments without author source prose or holdout text. Full working inputs and outputs remain in the maintainer's voice-2292 evaluation archive; the text-free artifact alone cannot independently reproduce private-source generations.

Strategy/count labels were withheld during primary-session review, with author/mode visible. The same session previously developed profiles and judged related tasks; this is neither independent human review nor a holdout study. No detector determines acceptance. Factual precision, coverage, cadence and mode fit were checked separately. Engineering failures included invented log details and assurances; archive drafts often turned an accessible alternate path into the only access route. Factually valid drafts could still converge on a generic essay structure. Interpretive judgments remain development evidence, not objective proof of author authenticity.

The comparison supplies bounded evidence for issue 2295's policy/count ablation. Independent author/reader evaluation, additional model families, channel pilots and rollout qualification remain under issues 2301, 2302 and 2304. No profile or retrieval policy is promoted.
