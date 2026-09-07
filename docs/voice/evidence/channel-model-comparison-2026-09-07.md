# Paired channel development comparison: Qwen and GPT-OSS

Twenty GPT-OSS generations used exactly the same prompt bytes as the latest twenty Qwen channel cases: eighteen from channel-pilot-02 and two article-context-corrected cases from channel-pilot-03. JDS and Darwin each cover OMP and Antigravity across article, social, email, engineering and conversation. These are two historical development topic clusters, not independent held-out qualification.

| Outcome | Qwen baseline | GPT-OSS |
| --- | ---: | ---: |
| Cases / normal completions | 20 / 20 | 20 / 20 |
| Protected-marker restoration | 19 | 18 |
| Primary semantic fidelity passes | 11 | 5 |
| Joint fidelity/cadence/mode passes | 0 | 0 |
| Candidates retained by channel runtime | 0 | 0 |

The Qwen outputs are reused observations, not twenty new generations. Both sets were replayed under a66e8968a, with the same original briefs and frozen primary-session reviews. Each set produced 24 destination checks (social also exercised Telegram and Discord); all retained the original. No-callback originals were preserved throughout.

GPT-OSS factual passes by channel: social4/4, email1/4, article0/4, engineering0/4, conversation0/4. JDS had3/10 and Darwin2/10. Three of the five semantic passes still violated exact formatting or CTA multiplicity constraints. A factual pass is not an exact-format or joint-quality pass. The remaining two were near-verbatim source text and did not demonstrate sustained distinct source cadence.

The recurring failure was treating the announcement CTA as a question to answer: replacing it with recommendations, duplicating it, or inventing a testing order. One article added unsupported claims about default-adapter failures and preview validation. Nonbreaking hyphens also changed explicit date/operator literals. Two generations failed marker transport. All failures remain in the denominator; no replacements or repairs were made.

Both used seed2303, temperature0.3, medium reasoning and a4096-token output ceiling through matric-eval/Ollama. Qwen was qwen3.8:27b, underlying qwen35 27.3B Q4_K_M, digest22130167c4c20e20c7b71454612966ca8e8171e9b3cc8ab6ce8aa6cbfec79643. GPT-OSS was gpt-oss:20b, 20.9B MXFP4, digest17052f91a42e97930aa6e28a6c6c06a983e6a58dbb00434885a0cf5313e376f7. Size, quantization, tokenizer and model family differ; this is not an isolated architecture comparison or a powered superiority test.

GPT-OSS usage was51,698 tokens. The service cycle took219.3s including load and restoration, not solely generation latency. Warmup and the primary review are outside reported generation token usage. The model was unloaded and Fortemi restored healthy. Existing Qwen per-call receipts remain with their original runs; do not compare whole-run totals containing unrelated cases.

The primary session judged every restored output; it also designed and tuned the development setup, so independence is not claimed. Human author/reader ratings, preregistered final author partitions and independent judge calibration remain outstanding. Two model-family snapshots now have channel evidence, but that alone does not satisfy #2302 or qualify rollout.

Next test explicit protection of the complete CTA and caller-required literals before generation, rather than relying on prose instructions and after-the-fact rejection. Keep the source facts separate from reader-directed questions, preserve the existing rejection checks, and measure any prompt change as a new intervention. Automatic defect localization remains a separate calibration task.

[Aggregate receipts](channel-model-comparison-2026-09-07.json). Private source/output artifacts remain in the authorized development workspace at `.aiwg/working/voice-2292/channel-family-02/`; raw author enrollment text is not redistributed here.
