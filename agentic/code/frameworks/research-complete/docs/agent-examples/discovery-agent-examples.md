# Discovery Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Example 1: Simple - Basic Semantic Search

**Input:**
"Search for papers on OAuth2 security best practices published in the last 3 years."

**Thought (Goal):**
I need to find recent papers on OAuth2 security from 2021-2024, focusing on best practices and security vulnerabilities.

**Action:**
Execute Semantic Scholar API query with parameters: query="OAuth2 security best practices", year_range="2021-2024", limit=100

**Observation:**
Found 87 papers matching criteria. Top result: "OAuth 2.0 Security Best Practices" (Smith et al., 2023) with 42 citations and relevance score 0.95.

**Thought (Extraction):**
Top papers focus on token rotation, PKCE extension, and authorization code interception. Venue distribution: 60% A-tier conferences, 30% journals, 10% workshops.

**Output:**
```json
{
  "query": "OAuth2 security best practices",
  "timestamp": "2026-01-25T10:30:00Z",
  "total_results": 87,
  "filters_applied": {
    "year_range": "2021-2024",
    "venue": "all"
  },
  "papers": [
    {
      "paper_id": "abc123def456",
      "title": "OAuth 2.0 Security Best Practices",
      "authors": ["Smith, J.", "Doe, A."],
      "year": 2023,
      "venue": "ACM CCS",
      "venue_tier": "A*",
      "citations": 42,
      "doi": "10.1145/3576915.3623456",
      "relevance_score": 0.95,
      "url": "https://www.semanticscholar.org/paper/abc123def456"
    }
  ],
  "gap_analysis": {
    "under_researched_topics": ["OAuth PKCE adoption rates", "Token refresh security"],
    "contradictory_findings": [],
    "missing_integrations": ["OAuth + WebAuthn integration patterns"]
  }
}
```

**Why This Is Good:**
- Uses structured thought protocol (Goal → Action → Observation → Extraction)
- Queries appropriate API with specific parameters
- Returns comprehensive metadata including venue tier and DOI
- Includes gap analysis identifying under-researched areas
- Relevance score calculated from multiple ranking factors

## Example 2: Moderate - Citation Network Traversal

**Input:**
"Find papers related to 'Retrieval-Augmented Generation' and explore their citation network to discover foundational work and recent applications."

**Thought (Goal):**
I need to find RAG papers and traverse both backward citations (foundational work) and forward citations (recent applications using RAG).

**Action:**
1. Query Semantic Scholar for "Retrieval-Augmented Generation"
2. Extract top 10 papers by citation count
3. Query backward citations (references) for foundational papers
4. Query forward citations (citing papers) for recent applications

**Observation:**
- Initial query: 45 papers on RAG
- Top paper: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020, 1250 citations)
- Backward citations discovered: 15 foundational papers on dense retrieval and knowledge bases
- Forward citations discovered: 230 papers applying RAG to various domains

**Thought (Reasoning):**
The citation network reveals RAG's foundation in dense retrieval (DPR, 2020) and has exploded into applications: question answering, dialog systems, code generation, and medical domain. The forward citations show rapid growth post-2022 with LLM adoption.

**Thought (Extraction):**
Foundational cluster: Dense retrieval, BERT, T5
Application clusters: QA (45 papers), Dialog (30), Code gen (25), Medical (18), Legal (12)

**Output:**
```markdown
# Citation Network Discovery: Retrieval-Augmented Generation

## Initial Query Results
- Query: "Retrieval-Augmented Generation"
- Papers found: 45
- Date range: 2020-2024

## Foundational Papers (Backward Citations)
1. "Dense Passage Retrieval for Open-Domain QA" (Karpukhin et al., 2020) - 1850 citations
2. "BERT: Pre-training of Deep Bidirectional Transformers" (Devlin et al., 2019) - 15,000+ citations
3. "Exploring the Limits of Transfer Learning with T5" (Raffel et al., 2020) - 3200 citations

## Recent Applications (Forward Citations - 230 papers)

### By Domain
- **Question Answering**: 45 papers
  - Medical QA, Legal QA, Scientific QA
- **Dialog Systems**: 30 papers
  - Conversational AI, Customer service bots
- **Code Generation**: 25 papers
  - GitHub Copilot-style systems, bug fixing
- **Domain-Specific**: 48 papers
  - Medical (18), Legal (12), Finance (10), Education (8)

## Gap Analysis
- **Under-researched**: RAG for multilingual tasks (only 3 papers)
- **Contradictory**: Retrieval granularity (document vs passage vs sentence)
- **Missing**: RAG + reinforcement learning from human feedback integration

## Snowball Discovery Impact
- Original query: 45 papers
- Citation network: +245 papers (15 backward, 230 forward)
- Total unique: 290 papers after deduplication
```

**Why This Is Good:**
- Demonstrates citation network traversal (backward + forward)
- Organizes results by domain clusters
- Quantifies discovery impact (original vs citation network)
- Identifies gaps in the citation network
- Shows reasoning about research trends and growth patterns

## Example 3: Complex - Systematic Review with Gap Detection

**Input:**
"Conduct a systematic search for papers on 'LLM agent safety and alignment' from 2022-2024. Identify gaps in evaluation methods, missing failure mode coverage, and contradictory findings on alignment techniques. Generate PRISMA-compliant documentation."

**Thought (Goal):**
I need to execute a systematic review protocol: preregistered search strategy, inclusion/exclusion criteria, quality assessment, gap detection across evaluation methods and failure modes.

**Action:**
1. Formulate boolean query: ("LLM" OR "large language model") AND ("agent" OR "agentic") AND ("safety" OR "alignment" OR "risk")
2. Search Semantic Scholar + arXiv with year filter 2022-2024
3. Apply inclusion criteria: peer-reviewed, English, minimum 5 citations
4. Deduplicate and rank by relevance
5. Perform topic clustering for gap detection
6. Document PRISMA protocol

**Observation:**
- Semantic Scholar: 152 papers
- arXiv: 89 papers
- After deduplication: 187 unique papers
- After inclusion criteria: 142 papers (45 excluded: <5 citations or non-English)

**Thought (Extraction):**
Topic clusters identified via abstract similarity:
- Evaluation methods (35 papers): Benchmarks, red teaming, adversarial testing
- Alignment techniques (48 papers): RLHF, constitutional AI, debate
- Failure modes (22 papers): Jailbreaking, prompt injection, tool misuse
- Theory/frameworks (37 papers): Goal misalignment, corrigibility, value learning

**Thought (Reasoning):**
Evaluation methods cluster is well-researched (35 papers) but failure modes cluster is sparse (22 papers). Only 3 papers cover autonomous replication risks, and no papers address long-horizon planning failures. Contradictory findings exist on RLHF effectiveness for agentic behavior.

**Thought (Exception):**
Found inconsistency: "Alignment techniques" papers cite different baselines making comparison difficult. Some use GPT-3.5, others GPT-4, Claude 2, or open models. This impacts reproducibility and synthesis.

**Thought (Synthesis):**
The field is heavily focused on evaluation and RLHF-style alignment but under-researches failure modes specific to agentic systems (long-horizon planning, tool misuse cascades, autonomous replication). Need more empirical work on failure taxonomies and standardized evaluation protocols.

**Output:**
```markdown
# Systematic Review: LLM Agent Safety and Alignment

## Search Strategy (PRISMA-Compliant)

**Date Executed:** 2026-01-25
**Databases:** Semantic Scholar, arXiv
**Search Terms:**
- Boolean query: ("LLM" OR "large language model") AND ("agent" OR "agentic") AND ("safety" OR "alignment" OR "risk")
- Year range: 2022-2024

**Inclusion Criteria:**
- Publication year: 2022-2024
- Peer-reviewed conference/journal or arXiv preprint
- English language
- Minimum 5 citations (relaxed for arXiv <6 months old)
- Focus on safety or alignment of LLM-based agents

**Exclusion Criteria:**
- Non-English papers
- Opinion pieces without empirical evaluation
- Papers focused solely on capability improvement without safety consideration

## Results

**PRISMA Flow:**
- Records identified via Semantic Scholar: 152
- Records identified via arXiv: 89
- Total records after deduplication: 187
- Records screened: 187
- Records excluded: 45 (29 <5 citations, 16 non-English)
- **Final included: 142 papers**

## Topic Clustering (K-means, k=4)

### Cluster 1: Evaluation Methods (35 papers, 24.6%)
**Characteristics:**
- Focus: Benchmarks, red teaming, adversarial testing
- Prominent papers:
  - "Red Teaming Language Models" (Perez et al., 2022) - 180 citations
  - "TruthfulQA: Measuring How Models Mimic Human Falsehoods" (Lin et al., 2022) - 250 citations

**Sub-topics:**
- Benchmark datasets (15 papers)
- Red teaming methodologies (12 papers)
- Automated adversarial testing (8 papers)

### Cluster 2: Alignment Techniques (48 papers, 33.8%)
**Characteristics:**
- Focus: RLHF, constitutional AI, debate, scalable oversight
- Prominent papers:
  - "Constitutional AI: Harmlessness from AI Feedback" (Bai et al., 2022) - 320 citations
  - "Training Language Models to Follow Instructions with Human Feedback" (Ouyang et al., 2022) - 1500+ citations

**Sub-topics:**
- RLHF methods (22 papers)
- Constitutional AI (10 papers)
- Debate and amplification (8 papers)
- Scalable oversight (8 papers)

### Cluster 3: Failure Modes (22 papers, 15.5%) ⚠️ SPARSE
**Characteristics:**
- Focus: Jailbreaking, prompt injection, tool misuse
- Prominent papers:
  - "Jailbroken: How Does LLM Safety Training Fail?" (Wei et al., 2023) - 85 citations
  - "Prompt Injection Attacks on LLMs" (Willison, 2023) - 42 citations

**Sub-topics:**
- Jailbreaking (10 papers)
- Prompt injection (7 papers)
- Tool misuse (5 papers)

### Cluster 4: Theory and Frameworks (37 papers, 26.1%)
**Characteristics:**
- Focus: Goal misalignment, corrigibility, value learning theory
- Prominent papers:
  - "Open Problems in Cooperative AI" (Dafoe et al., 2020) - 180 citations
  - "Learning to Summarize from Human Feedback" (Stiennon et al., 2020) - 850 citations

## Gap Analysis

### Under-Researched Topics (Sparse Clusters)

1. **Autonomous Replication Risks** - Only 3 papers
   - Limited empirical work on self-replication prevention
   - No papers on detection methods for replication attempts

2. **Long-Horizon Planning Failures** - Only 4 papers
   - Most evaluation focuses on single-turn or short conversations
   - Missing: Multi-day planning failure modes

3. **Tool Misuse Cascades** - Only 5 papers in failure modes cluster
   - Gap: How misuse of one tool enables misuse of others
   - Missing: Automated detection of tool misuse patterns

4. **Multimodal Agent Safety** - Only 2 papers
   - Text-only focus dominates (95% of papers)
   - Missing: Image, video, audio modality risks

### Contradictory Findings

1. **RLHF Effectiveness for Agentic Behavior**
   - Pro: 12 papers report improved safety (e.g., Ouyang et al. 2022)
   - Con: 5 papers report RLHF increases deceptive capabilities (e.g., Hubinger et al. 2024)
   - Explanation: Different evaluation protocols, model sizes, and task types

2. **Red Teaming Comprehensiveness**
   - Some papers claim automated red teaming is sufficient (n=8)
   - Others argue human red teamers find unique failures (n=6)
   - Resolution: Likely both needed, but optimal mix unclear

### Missing Integrations

1. **Agent Safety + Robustness Testing** - No papers bridge these areas
2. **Constitutional AI + Tool Use** - Only 1 paper addresses this integration
3. **Multi-Agent Safety** - Only 2 papers on safety in multi-agent settings

## Contradictory Evidence Details

### Finding: RLHF Impact on Deception
- **Pro-RLHF papers (n=12)**: Report reduced harmful outputs, better instruction following
- **Critical papers (n=5)**: Report increased sophistication of deceptive behavior
- **Hypothesis**: RLHF optimizes for human approval, which can incentivize deception
- **Recommendation**: Further research on deception-aware RLHF variants needed

## Coverage Heatmap

| Topic Area | Paper Count | Coverage |
|------------|-------------|----------|
| Evaluation methods | 35 | ████████░░ 80% |
| Alignment techniques | 48 | ██████████ 100% |
| Failure modes (general) | 22 | ████░░░░░░ 40% |
| └─ Jailbreaking | 10 | ██████░░░░ 60% |
| └─ Autonomous replication | 3 | ██░░░░░░░░ 20% |
| └─ Tool misuse | 5 | ███░░░░░░░ 30% |
| Theory/frameworks | 37 | ████████░░ 75% |
| Multimodal safety | 2 | █░░░░░░░░░ 10% |

## Recommendations for Future Research

1. **High Priority Gaps:**
   - Failure taxonomies for agentic systems (only 22 papers vs 48 on alignment)
   - Autonomous replication detection and prevention (only 3 papers)
   - Long-horizon planning safety (only 4 papers)

2. **Methodological Improvements:**
   - Standardize evaluation baselines across papers
   - Develop benchmark for tool misuse detection
   - Create multimodal agent safety dataset

3. **Integration Work:**
   - Constitutional AI + tool use safety
   - Multi-agent coordination safety
   - Agent safety + adversarial robustness

## Acquisition Queue

Selected 50 papers for full acquisition based on:
- High citation count (>50 citations)
- Recent publication (2023-2024)
- Gap-filling potential (sparse cluster papers prioritized)
- Venue quality (A*/A tier conferences/journals)

Queue saved to: `.aiwg/research/discovery/acquisition-queue.json`
```

**Why This Is Good:**
- Follows PRISMA systematic review protocol with proper flow diagram
- Quantitative topic clustering with paper counts and percentages
- Identifies specific research gaps with paper counts
- Documents contradictory findings with evidence from multiple sources
- Provides coverage heatmap showing research balance
- Offers actionable recommendations prioritized by gap severity
- Uses thought protocol throughout (Goal, Extraction, Reasoning, Exception, Synthesis)
- Generates acquisition queue for downstream Acquisition Agent
