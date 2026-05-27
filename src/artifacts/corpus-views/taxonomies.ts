/**
 * Corpus-view classifier taxonomies (#1490).
 *
 * Verbatim TypeScript port of the regex pattern tables from the retired
 * research-complete `corpus-index-build/build.py`. Pattern order is
 * load-bearing: `classifyFirst` returns the FIRST matching label, so reordering
 * changes classification. All patterns are matched case-insensitively (the
 * Python source compiled with `re.I`).
 *
 * @source historical: agentic/code/frameworks/research-complete/skills/corpus-index-build/build.py
 */

export type LabeledPattern = readonly [label: string, pattern: RegExp];

const ci = (src: string): RegExp => new RegExp(src, 'i');

/** Single-label topic classifier (first match wins). */
export const TOPIC_PATTERNS: LabeledPattern[] = [
  ['Reinforcement Learning & RLHF', ci('\\b(rlhf|reinforcement learning|rlvr|reward model|ppo|dpo|grpo)\\b')],
  ['Mechanistic Interpretability', ci('\\b(mechanistic interpret|circuit|feature attribution|sparse autoencoder|activation steering|probing)\\b')],
  ['AI Safety & Alignment', ci('\\b(alignment|misalign|sycophan|deception|jailbreak|red team|safety|constitutional ai)\\b')],
  ['Agentic Workflows & Multi-Agent', ci('\\b(agentic|multi-agent|multi[- ]agent|tool use|orchestrat|autogen|agent loop)\\b')],
  ['Retrieval & RAG', ci('\\b(rag|retrieval[- ]augmented|dense retriev|reranker|bm25|colbert|hybrid retriev)\\b')],
  ['Embeddings & Vector Search', ci('\\b(embedding|sentence-bert|hnsw|ann |vector search|matryoshka)\\b')],
  ['Reasoning & Chain-of-Thought', ci('\\b(chain[- ]of[- ]thought|reasoning|self-refine|self-consist|cot prompt|thought)\\b')],
  ['Code Generation & Software Engineering', ci('\\b(code generation|code llama|humaneval|mbpp|swe-bench|copilot|coding assistant)\\b')],
  ['Fine-Tuning & PEFT', ci('\\b(lora|peft|fine[- ]tun|adapter|qlora|instruction tun)\\b')],
  ['Pretraining & Scaling Laws', ci('\\b(scaling laws|chinchilla|pretrain|compute[- ]optimal|emergent abilit)\\b')],
  ['Quantization & Compression', ci('\\b(quantization|pruning|gptq|awq|distillation|compression)\\b')],
  ['Inference & Serving Systems', ci('\\b(vllm|tensorrt|inference serv|kv cache|continuous batch|paged attention|serving)\\b')],
  ['Memory & Context', ci('\\b(long context|context window|memory augment|stateful|kv-cache memory)\\b')],
  ['Robotics & Embodied AI', ci('\\b(robot|embodied|manipulation|locomotion|vla |vision[- ]language[- ]action)\\b')],
  ['Multimodal', ci('\\b(multimodal|vision[- ]language|vlm|clip|image[- ]text)\\b')],
  ['Benchmarks & Evaluation', ci('\\b(benchmark|evaluat|helm|big-bench|mt-bench|leaderboard)\\b')],
  ['Knowledge Graphs & Symbolic', ci('\\b(knowledge graph|symbolic|ontolog|rdf|sparql)\\b')],
  ['Streaming & Event-Driven Systems', ci('\\b(kafka|redis stream|nats|event[- ]driven|cdc|change data capt|stream process)\\b')],
  ['Distributed Systems', ci('\\b(distributed system|consensus|raft|paxos|sharding|replicat)\\b')],
  ['Cryptography & Security', ci('\\b(cryptograph|threshold signature|frost|schnorr|hkdf|argon2|tpm|hsm|secure enclave)\\b')],
  ['Blockchain', ci('\\b(blockchain|proof of stake|ethereum|validator)\\b')],
  ['HCI & Developer Experience', ci('\\b(developer productiv|hci|cognitive load|user study|ux research|developer experience)\\b')],
  ['Theory of Mind & Social Reasoning', ci('\\b(theory of mind|tom |social reason|persuas|emotion)\\b')],
  ['Cognitive Science & Psychology', ci("\\b(cognitive scien|psycholog|metacognit|miller'?s law)\\b")],
  ['LLM Foundations & Surveys', ci('\\b(survey|foundation model|large language model|transformer architecture)\\b')],
  ['LLM Evaluation & Benchmarks', ci('\\b(llm|language model|gpt|claude|gemini|llama|mistral)\\b')],
];

/** Multi-label method classifier (all matches). */
export const METHOD_PATTERNS: LabeledPattern[] = [
  ['Quantization', ci('\\b(quantiz|gptq|awq|int4|int8|bf16|fp4|fp8|bitnet|smoothquant)\\b')],
  ['Pruning & Sparsity', ci('\\b(prun|sparsit|sparse model|magnitude prun|wanda|sparsegpt)\\b')],
  ['Distillation', ci('\\b(distill|distilbert|teacher[- ]student|knowledge distill)\\b')],
  ['PEFT / LoRA / Adapters', ci('\\b(lora|qlora|peft|adapter[- ]based|prefix tun|prompt tun|p-?tuning)\\b')],
  ['Fine-Tuning (Full)', ci('\\b(full fine[- ]tun|sft|supervised fine[- ]tun|instruction tun)\\b')],
  ['RLHF / DPO / RL-from-Feedback', ci('\\b(rlhf|dpo|ppo|grpo|reward model|kto|ipo|orpo|reinforcement learning from human)\\b')],
  ['RLVR / Verifiable Rewards', ci('\\b(rlvr|verifiable reward|rule[- ]based reward|self[- ]reward)\\b')],
  ['Alignment & Constitutional', ci('\\b(constitutional ai|alignment|rule[- ]based ai feedback|rlaif)\\b')],
  ['Chain-of-Thought / Reasoning', ci('\\b(chain[- ]of[- ]thought|cot prompt|self[- ]refine|self[- ]consist|tree of thoughts|react)\\b')],
  ['Self-Play / Self-Improvement', ci('\\b(self[- ]play|self[- ]improv|bootstrap|star algorithm|rstar)\\b')],
  ['Mixture of Experts', ci('\\b(mixture of experts|\\bmoe\\b|gshard|switch transformer|expert routing)\\b')],
  ['Retrieval-Augmented Generation', ci('\\b(retrieval[- ]augmented|\\brag\\b|fid |dense retriev|colbert)\\b')],
  ['Embedding & Vector Search', ci('\\b(embedding|sentence-bert|hnsw|matryoshka|vector index)\\b')],
  ['Attention Variants & Long Context', ci('\\b(flash attention|sliding window attention|sparse attention|paged attention|ring attention|alibi|rotary embedding|rope)\\b')],
  ['KV Cache & Inference Optimization', ci('\\b(kv[- ]cache|kv cache|continuous batching|paged attention|prefill|decode optimization|speculative decoding)\\b')],
  ['Serving & Batching Systems', ci('\\b(vllm|tensorrt|continuous batch|dynamic batch|inference serv|throughput optimization)\\b')],
  ['Pretraining & Scaling Laws', ci('\\b(scaling laws|chinchilla|compute[- ]optimal|pretrain|data mixing)\\b')],
  ['Data Curation & Synthesis', ci('\\b(data curation|data synthesis|synthetic data|deduplication|semdedup|dataset distill)\\b')],
  ['Evaluation & Benchmarking', ci('\\b(benchmark|evaluat|helm|big[- ]bench|mt[- ]bench|leaderboard|holistic evaluation)\\b')],
  ['Mechanistic Interpretability', ci('\\b(mechanistic interpret|circuit analysis|sparse autoencoder|\\bsae\\b|feature attribution|probing classifier|activation steering)\\b')],
  ['Agentic Orchestration & Tool Use', ci('\\b(agentic|multi[- ]agent|tool use|tool[- ]calling|autogen|orchestrat|agent loop|react)\\b')],
  ['Robotics / Embodied Learning', ci('\\b(robot|embodied|manipulation|locomotion|vla |vision[- ]language[- ]action|sim[- ]to[- ]real)\\b')],
  ['Multimodal / Vision-Language', ci('\\b(multimodal|vision[- ]language|\\bvlm\\b|clip|image[- ]text|visual instruction)\\b')],
  ['Diffusion / Generative Models', ci('\\b(diffusion model|ddpm|score[- ]based|latent diffusion|flow matching|stable diffusion)\\b')],
  ['Reinforcement Learning (Foundations)', ci('\\b(reinforcement learning|markov decision|q[- ]learning|actor[- ]critic|trpo|policy gradient)\\b')],
  ['Distributed Training & Parallelism', ci('\\b(zero|fsdp|tensor parallel|pipeline parallel|data parallel|megatron|deepspeed)\\b')],
];

/** Single-label venue classifier (first match wins). */
export const VENUE_PATTERNS: LabeledPattern[] = [
  ['NeurIPS', ci('\\b(neurips|nips)\\b')], ['ICML', ci('\\bicml\\b')], ['ICLR', ci('\\biclr\\b')],
  ['ACL', ci('\\b(acl |annual meeting of the association for computational linguistics)\\b')],
  ['EMNLP', ci('\\bemnlp\\b')], ['NAACL', ci('\\bnaacl\\b')], ['CVPR', ci('\\bcvpr\\b')],
  ['ICCV', ci('\\biccv\\b')], ['ECCV', ci('\\beccv\\b')], ['AAAI', ci('\\baaai\\b')],
  ['IJCAI', ci('\\bijcai\\b')], ['KDD', ci('\\b(kdd |sigkdd)\\b')], ['SIGIR', ci('\\bsigir\\b')],
  ['WWW', ci('\\b(www conference|the web conference)\\b')], ['RSS', ci('\\b(rss |robotics: science and systems)\\b')],
  ['CoRL', ci('\\bcorl\\b')], ['ICRA', ci('\\bicra\\b')], ['IROS', ci('\\biros\\b')],
  ['OSDI', ci('\\bosdi\\b')], ['SOSP', ci('\\bsosp\\b')], ['NSDI', ci('\\bnsdi\\b')],
  ['USENIX ATC', ci('\\busenix atc\\b')], ['USENIX Security', ci('\\busenix security\\b')],
  ['IEEE S&P / Oakland', ci('\\b(ieee s&p|ieee symposium on security|oakland)\\b')],
  ['CCS', ci("\\b(acm ccs|ccs '?\\d)\\b")], ['CHI', ci("\\b(chi conference|chi '?\\d)\\b")],
  ['UIST', ci('\\buist\\b')], ['VLDB', ci('\\bvldb\\b')], ['SIGMOD', ci('\\bsigmod\\b')],
  ['FAccT', ci('\\bfacct\\b')], ['TMLR', ci('\\btmlr\\b')], ['JMLR', ci('\\bjmlr\\b')],
  ['Nature', ci('\\b(nature\\b(?! communications)|nature\\.)')], ['Science', ci('\\bscience\\b(?! advances)')],
  ['PNAS', ci('\\bpnas\\b')], ['RFC (IETF)', ci('\\brfc \\d+\\b')], ['arXiv', ci('\\b(arxiv|preprint)\\b')],
  ['Anthropic Research', ci('\\b(anthropic\\.com|anthropic research|transformer circuits)\\b')],
  ['OpenAI Research', ci('\\bopenai\\.com\\b')], ['DeepMind / Google Research', ci('\\b(deepmind|google research|research\\.google)\\b')],
  ['Meta AI / FAIR', ci('\\b(meta ai|fair |facebook ai research)\\b')], ['Microsoft Research', ci('\\bmicrosoft research\\b')],
  ['GitHub / Documentation', ci('\\b(github\\.com|github pages|readthedocs|docs\\.\\w+)\\b')],
  ['Blog / Web Article', ci('\\b(blog|medium\\.com|substack|dev\\.to)\\b')], ['Wikipedia', ci('\\bwikipedia\\b')],
];

/** Size extraction patterns: [pattern, multiplier-to-millions]. Matched globally, case-insensitive. */
export const SIZE_PATTERNS: ReadonlyArray<readonly [RegExp, number]> = [
  [/(\d+\.\d+|\d{1,4})\s*B\b(?:\s*parameters|\s*params|\s*model)?/gi, 1000],
  [/(\d{1,4})\s*M\b(?:\s*parameters|\s*params|\s*model)?/gi, 1],
];

export const SIZE_TIERS: ReadonlyArray<readonly [label: string, low: number, high: number]> = [
  ['<1B parameters', 0, 999],
  ['1-10B parameters', 1000, 9999],
  ['10-100B parameters', 10000, 99999],
  ['100B-1T parameters', 100000, 999999],
  ['1T+ parameters', 1000000, 10 ** 12],
];

export const PIPELINE_STAGES: ReadonlyArray<readonly [title: string, blurb: string, refs: string[]]> = [
  ['1. Data Curation & Preparation', 'Assembling, cleaning, and deduplicating pretraining and finetuning data.', ['REF-421', 'REF-460', 'REF-468', 'REF-471', 'REF-442']],
  ['2. Tokenization & Architecture Foundations', 'Tokenizer choice, architecture variants, and positional encodings.', ['REF-389', 'REF-500']],
  ['3. Pretraining at Scale', 'Compute-optimal recipes, scaling laws, and large-scale optimization.', ['REF-052', 'REF-054', 'REF-389', 'REF-437', 'REF-460']],
  ['4. Mixture-of-Experts & Sparse Architectures', 'Sparsely activated models as a parallel pretraining strategy.', ['REF-007']],
  ['5. Instruction Tuning & SFT', 'Supervised fine-tuning on instructions to convert base models into assistants.', ['REF-055', 'REF-435', 'REF-470']],
  ['6. RLHF, DPO, and Preference Optimization', 'Aligning models with human and AI feedback.', ['REF-025', 'REF-055', 'REF-449']],
  ['7. RLVR & Reasoning RL', 'Verifiable-reward RL for reasoning, math, and code.', ['REF-819', 'REF-957', 'REF-457']],
  ['8. PEFT / LoRA / Adapter-Based Adaptation', 'Parameter-efficient fine-tuning when full SFT is impractical.', ['REF-049']],
  ['9. Quantization, Pruning & Compression', 'Shrinking trained models for inference deployment.', ['REF-051']],
  ['10. Inference Serving & Optimization', 'Productionizing trained models: batching, KV cache, throughput.', ['REF-101', 'REF-102', 'REF-312', 'REF-313']],
  ['11. Evaluation, Safety & Continuous Monitoring', 'Holistic evaluation, red-teaming, and live monitoring.', ['REF-063', 'REF-064', 'REF-189', 'REF-191', 'REF-481']],
];

/** Return the first matching label, or null. Mirrors build.py `classify_first`. */
export function classifyFirst(text: string, patterns: LabeledPattern[]): string | null {
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** Return all matching labels in table order. Mirrors build.py `classify_many`. */
export function classifyMany(text: string, patterns: LabeledPattern[]): string[] {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}
