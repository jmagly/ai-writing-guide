# Research reading list

These publications inform AIWG workflow design. Results reported for other systems or benchmarks are not measurements
or guarantees of AIWG performance. Evaluate a workflow on your own tasks before estimating cost, accuracy, or time
savings.

See the [product overview](what-is-aiwg.md) for capabilities and limitations, and the [research
background](https://github.com/jmagly/aiwg/blob/main/docs/research/research-background.md) for design context. This
companion bibliography collects the reading links covered in the README; it is not a fresh validation of every cited
result.

## Cognitive Foundations

- Miller, G.A. (1956). [The Magical Number Seven, Plus or Minus Two](https://doi.org/10.1037/h0043158). *Psychological
  Review*, 63(2), 81–97. doi:10.1037/h0043158
- Sweller, J. (1988). [Cognitive Load During Problem Solving: Effects on
  Learning](https://doi.org/10.1207/s15516709cog1202_4). *Cognitive Science*, 12(2), 257–285.
  doi:10.1207/s15516709cog1202_4
- Anderson, J.R. et al. (2004). [An Integrated Theory of the Mind](https://doi.org/10.1037/0033-295X.111.4.1036).
  *Psychological Review*, 111(4), 1036–1060. (ACT-R cognitive architecture)
- Laird, J.E., Newell, A. & Rosenbloom, P.S. (1987). [SOAR: An Architecture for General
  Intelligence](https://doi.org/10.1016/0004-3702(87)90050-6). *Artificial Intelligence*, 33(1), 1–64.
- Harel, D. (1987). [Statecharts: A Visual Formalism for Complex
  Systems](https://doi.org/10.1016/0167-6423(87)90035-9). *Science of Computer Programming*, 8(3), 231–274.
- Young, S. et al. (2010). [The Hidden Information State Model: A Practical Framework for POMDP-Based Spoken Dialogue
  Management](https://doi.org/10.1016/j.csl.2009.04.001). *Computer Speech & Language*, 24(2), 150–174.

## Multi-Agent Systems & Orchestration

- Jacobs, R.A. et al. (1991). [Adaptive Mixtures of Local Experts](https://doi.org/10.1162/neco.1991.3.1.79). *Neural
  Computation*, 3(1), 79–87. (Mixture-of-Experts foundation)
- Hong, S. et al. (2024). [MetaGPT: Meta Programming for a Multi-Agent Collaborative
  Framework](https://arxiv.org/abs/2308.00352). *ICLR 2024*.
- Qian, C. et al. (2024). [ChatDev: Communicative Agents for Software Development](https://arxiv.org/abs/2307.07924).
  *ACL 2024*.
- Shen, Y. et al. (2023). [HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in
  HuggingFace](https://arxiv.org/abs/2303.17580). *NeurIPS 2023*.
- Tao, W. et al. (2024). [MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue Resolution](https://arxiv.org/abs/2403.17927).
- Zhang, J. et al. (2025). [AFlow: Automating Agentic Workflow Generation](https://arxiv.org/abs/2410.10762). *ICLR
  2025 Oral*.
- Wu, Q. et al. (2023). [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent
  Conversation](https://arxiv.org/abs/2308.08155). (Conversational multi-agent framework)
- Yu, C. et al. (2025). [A Survey on Agent Workflow — Status and Future](https://arxiv.org/abs/2508.01186). (24
  systems, 11 metrics)
- Lodha, D. et al. (2026). [MCP-Diag: A Deterministic, Protocol-Driven Architecture for AI-Native Network
  Diagnostics](https://arxiv.org/abs/2601.22633). *COMSNETS 2026*.
- Yu, G. (2026). [AdaptOrch: Adaptive Orchestration for Multi-Agent LLM Systems Through Topology-Aware Task Planning](https://arxiv.org/abs/2502.09340).
- Gerred (2025). [Multi-Agent
  Orchestration](https://gerred.github.io/building-an-agentic-system/second-edition/part-iv-advanced-patterns/chapter-10-multi-agent-orchestration.html).
  Tool isolation, resource boundaries, observable coordination.
- Falconer, S. (2025). [Event-Driven Multi-Agent
  Systems](https://www.confluent.io/blog/event-driven-multi-agent-systems/). Confluent. 4 Kafka orchestration
  patterns.
- Mario, M. (2025). [Multi-Agent System Patterns: A Unified Guide to Designing Agentic
  Architectures](https://medium.com/@mjgmario/multi-agent-system-patterns-a-unified-guide-to-designing-agentic-architectures-04bb31ab9c41).
  4-dimensional framework.
- Runkle, S. (2026). [Choosing the Right Multi-Agent
  Architecture](https://www.blog.langchain.com/choosing-the-right-multi-agent-architecture/). LangChain. Subagents,
  skills, and handoffs.
- Towards Data Science (2025). [Why Your Multi-Agent System Is Failing: Escaping the 17x Error
  Trap](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/).
  Coordination failure analysis.
- NexAI Tech (2025). [Multi-AI Agent Architecture Patterns for
  Scale](https://nexaitech.com/multi-ai-agent-architecutre-patterns-for-scale/). Enterprise 5-layer architecture, 3
  orchestration patterns.
- Wexford, E. (2026). [How to Build Multi-Agent Systems: Complete 2026
  Guide](https://dev.to/eira-wexford/how-to-build-multi-agent-systems-complete-2026-guide-1io6). DEV Community.
  Multi-agent design guidance.

## Reasoning & Planning

- Wei, J. et al. (2022). [Chain-of-Thought Prompting Elicits Reasoning in Large Language
  Models](https://arxiv.org/abs/2201.11903). *NeurIPS 2022*.
- Wang, X. et al. (2023). [Self-Consistency Improves Chain of Thought Reasoning in Language
  Models](https://arxiv.org/abs/2203.11171). *ICLR 2023*.
- Yao, S. et al. (2023). [ReAct: Synergizing Reasoning and Acting in Language
  Models](https://arxiv.org/abs/2210.03629). *ICLR 2023*.
- Yao, S. et al. (2023). [Tree of Thoughts: Deliberate Problem Solving with Large Language
  Models](https://arxiv.org/abs/2305.10601). *NeurIPS 2023*.
- Zhou, A. et al. (2024). [Language Agent Tree Search Unifies Reasoning, Acting, and Planning in Language
  Models](https://arxiv.org/abs/2310.04406). *ICML 2024*.
- Kojima, T. et al. (2022). [Large Language Models are Zero-Shot Reasoners](https://arxiv.org/abs/2205.11916).
  *NeurIPS 2022*. ("Let's think step by step")
- Liu, Z. et al. (2026). [Exploratory Memory-Augmented LLM Agent via Hybrid On- and Off-Policy Optimization
  (EMPO²)](https://arxiv.org/abs/2602.23008). *ICLR 2026*.

## Self-Correction & Iterative Refinement

- Madaan, A. et al. (2023). [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651).
  *NeurIPS 2023*.
- Shinn, N. et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement
  Learning](https://arxiv.org/abs/2303.11366). *NeurIPS 2023*.

## Stage-Gate, SDLC & Traceability

- Cooper, R.G. (1990). [Stage-Gate Systems: A New Tool for Managing New
  Products](https://doi.org/10.1016/0007-6813(90)90040-I). *Business Horizons*, 33(3), 44–54.
- Jacobson, I., Booch, G. & Rumbaugh, J. (1999). *The Unified Software Development Process*. Addison-Wesley. ISBN 978-0-201-57169-1.
- Gotel, O.C.Z. & Finkelstein, A.C.W. (1994). [An Analysis of the Requirements Traceability
  Problem](https://doi.org/10.1109/ICRE.1994.292398). *IEEE ICRE 1994*.

## Software Engineering & Agent-Computer Interface

- Jimenez, C.E. et al. (2024). [SWE-bench: Can Language Models Resolve Real-world GitHub
  Issues?](https://www.swebench.com). *ICLR 2024*.
- Wang, X. et al. (2024). [Executable Code Actions Elicit Better LLM Agents
  (CodeAct)](https://arxiv.org/abs/2402.01030). *ICML 2024*.
- Yang, J. et al. (2024). [SWE-agent: Agent-Computer Interfaces Enable Automated Software
  Engineering](https://arxiv.org/abs/2405.15793). *NeurIPS 2024*.
- Laurent, A. (2025). [A Comparison of AI Code Assistants for Large
  Codebases](https://intuitionlabs.ai/articles/ai-code-assistants-large-codebases). IntuitionLabs.
- Augment Code (2025). [AI Coding Assistants for Large Codebases: A Complete Guide](https://www.augmentcode.com/tools/ai-coding-assistants-for-large-codebases-a-complete-guide).
- AlgoMaster (2025). [How to Use AI Effectively in Large
  Codebases](https://blog.algomaster.io/p/using-ai-effectively-in-large-codebases). Retrieval as bottleneck framing.

## Context Engineering & Memory

- Liu, N.F. et al. (2024). [Lost in the Middle: How Language Models Use Long
  Contexts](https://arxiv.org/abs/2307.03172). *TACL* 12, 157–173. doi:10.1162/tacl_a_00638
- Dai, Y. et al. (2025). [Pretraining Context Compressor for Large Language Models with Embedding-Based
  Memory](https://aclanthology.org/2025.acl-long.1394.pdf). *ACL 2025*.
- Kang, M. et al. (2025). [ACON: Optimizing Context Compression for Long-Horizon LLM Agents](https://arxiv.org/abs/2510.00615).
- Liu, F. & Qiu, H. (2025). [Context Cascade Compression (C3): Exploring the Upper Limits of Text Compression](https://arxiv.org/abs/2511.15244).
- Vasilopoulos, A. (2026). [Codified Context: Infrastructure for AI Agents in a Complex
  Codebase](https://arxiv.org/abs/2602.20478). (Three-tier context infrastructure: constitution + 19 agents + 34-doc
  KB)
- Ostby, D.L. (2025). [Stingy Context: Compressing Code Context for Cost-Effective AI Development
  Assistance](https://arxiv.org/abs/2512.15504). (TREEFRAG, 18:1 compression ratio)
- Anthropic Applied AI Team (2026). [Effective Context Engineering for AI
  Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). Anthropic Engineering
  Blog.
- Huang, J.Y. et al. (2026). [Do LLMs Benefit From Their Own Words?](https://arxiv.org/abs/2602.24287)
- Böckeler, B. (2026). [Context Engineering for Coding
  Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html). Martin Fowler's
  Blog. Two-category framework.
- Haseeb, M. (2025). [Context Engineering for Multi-Agent LLM Code Assistants](https://arxiv.org/abs/2508.08322).
- Verma, N. (2026). [Focus Agent: LLM Agent with Active Context Compression for SWE-Bench](https://arxiv.org/abs/2501.09067).
- Zylos Research (2026). [Long-Running AI Agents and Task
  Decomposition](https://zylos.ai/research/2026-01-16-long-running-ai-agents). (35-min degradation threshold,
  Planner-Worker model)
- Zylos Research (2026). [LLM Context Window Management and Long-Context Strategies](https://zylos.ai/research/2026-01-19-llm-context-management).

## Agent Memory & Knowledge Systems

- Laird, J.E. et al. (1987). [SOAR: An Architecture for General
  Intelligence](https://doi.org/10.1016/0004-3702(87)90050-6). *Artificial Intelligence*, 33(1), 1–64.
- Anderson, J.R. et al. (2004). [An Integrated Theory of the Mind
  (ACT-R)](https://doi.org/10.1037/0033-295X.111.4.1036). *Psychological Review*, 111(4), 1036–1060.
- Park, J.S. et al. (2023). [Generative Agents: Interactive Simulacra of Human
  Behavior](https://arxiv.org/abs/2304.03442). *UIST 2023*. doi:10.1145/3586183.3606763
- Xu, W. et al. (2025). [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110).
- Hu, Y. et al. (2025). [Memory in the Age of AI Agents: A Survey](https://arxiv.org/abs/2512.13564). (Surveys 100+
  implementations, forms-functions-dynamics framework)
- Rezazadeh, A. et al. (2025). [Collaborative Memory: Multi-User Memory Sharing in LLM Agents with Dynamic Access Control](https://arxiv.org/abs/2505.18279).
- Yuen, S. et al. (2025). [Intrinsic Memory Agents: Heterogeneous Multi-Agent LLM Systems through Structured
  Contextual Memory](https://arxiv.org/abs/2508.08997). Role-aligned heterogeneous memory.
- Graves, A., Wayne, G. & Danihelka, I. (2014). [Neural Turing Machines](https://arxiv.org/abs/1410.5401). External
  memory architectures.
- Packer, C. et al. (2023). [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560). OS-inspired
  virtual context paging.
- Yu, Z. et al. (2026). [Multi-Agent Memory from a Computer Architecture
  Perspective](https://arxiv.org/abs/2603.10062). *Architecture 2.0 '26*. Three-layer I/O-cache-memory hierarchy.
- Chhikara, P. et al. (2025). [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413).

## Recursive Context Decomposition

- Zhang, A.L., Kraska, T. & Khattab, O. (2026). [Recursive Language Models](https://arxiv.org/abs/2512.24601).
  *arXiv:2512.24601*. MIT CSAIL.

## Provenance, Reproducibility & Research Management

- Wilkinson, M.D. et al. (2016). [The FAIR Guiding Principles for scientific data management and
  stewardship](https://doi.org/10.1038/sdata.2016.18). *Scientific Data*, 3, 160018. (G20, EU, NIH endorsement)
- W3C (2013). [PROV-DM: The PROV Data Model](https://www.w3.org/TR/prov-dm/). W3C Recommendation.
- CCSDS (2024). [Reference Model for an Open Archival Information System
  (OAIS)](https://public.ccsds.org/Pubs/650x0m2.pdf). ISO 14721. (Digital preservation lifecycle)
- GRADE Working Group (2004–present). [GRADE Handbook](https://www.gradeworkinggroup.org/). Evidence quality
  assessment. Adopted by WHO, Cochrane, NICE, and 100+ organizations.
- Schmidgall, S. et al. (2025). [Agent Laboratory: Using LLM Agents as Research Assistants](https://arxiv.org/abs/2501.04227).
- Sureshkumar, V. et al. (2026). [R-LAM: Towards Reproducibility in Large Action Model Workflows](https://arxiv.org/abs/2601.09749).
- ServiceNow Research (2025). LitLLM for Scientific Literature Reviews. RAG-based literature review, no hallucination approach.

## AI Safety & Failure Modes

- Tang, R. et al. (2023). [Large Language Models Can be Lazy Learners: Analyze Shortcuts in In-Context
  Learning](https://arxiv.org/abs/2305.17256). *ACL 2023 Findings*. doi:10.18653/v1/2023.findings-acl.284
- Bandara, E. et al. (2025). [A Practical Guide for Designing, Developing, and Deploying Production-Grade Agentic AI Workflows](https://arxiv.org/abs/2512.08769).
- Roig, J.V. (2025). [How Do LLMs Fail In Agentic Scenarios? A Qualitative Analysis](https://arxiv.org/abs/2512.07497).
- Von Arx, S., Chan, L. & Barnes, E. (2025). [Recent Frontier Models Are Reward
  Hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/). METR Research Blog.
- Anthropic Alignment Team (2025). [From shortcuts to sabotage: Natural emergent misalignment from reward
  hacking](https://www.anthropic.com/research/emergent-misalignment-reward-hacking). Anthropic Research.
- Batista, R.M. & Griffiths, T.L. (2026). [A Rational Analysis of the Effects of Sycophantic
  AI](https://arxiv.org/abs/2602.14270). (Bayesian analysis, epistemic risk)
- Kumar, R.S.S. et al. (2025). [Taxonomy of Failure Modes in Agentic AI
  Systems](https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/).
  Microsoft Security.
- Twiss, J. (2026). [AI Coding Degrades: Silent Failures Emerge](https://spectrum.ieee.org/ai-coding-degrades). *IEEE Spectrum*.
- van Linschoten, A.S. (2025). [The Agent Deployment Gap: Why Your LLM Loop Isn't
  Production-Ready](https://www.zenml.io/blog/the-agent-deployment-gap-why-your-llm-loop-isnt-production-ready-and-what-to-do-about-it).
  ZenML.

## Task Decomposition & Declarative Pipelines

- Khot, T. et al. (2023). [Decomposed Prompting: A Modular Approach for Solving Complex
  Tasks](https://arxiv.org/abs/2210.11610). *ICLR 2023*.
- Khattab, O. et al. (2023). [DSPy: Compiling Declarative Language Model Calls into Self-Improving
  Pipelines](https://arxiv.org/abs/2310.03714). *ICLR 2024*.
- Dohan, D. et al. (2022). [Language Model Cascades](https://arxiv.org/abs/2207.10342). Google Brain. (PGM
  formalization of multi-step LLM pipelines)
- Peng, B. et al. (2023). [Check Your Facts and Try Again: Improving Large Language Models with External Knowledge and
  Automated Feedback](https://arxiv.org/abs/2302.12813). Microsoft Research.

## Training, Alignment & In-Context Learning

- Ouyang, L. et al. (2022). [Training language models to follow instructions with human feedback
  (InstructGPT)](https://arxiv.org/abs/2203.02155). (RLHF methodology)
- Dong, Q. et al. (2024). [A Survey on In-Context Learning](https://arxiv.org/abs/2301.00234). *EMNLP 2024*.
- Bai, Y. et al. (2022). [Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073).
  (Principle-based alignment)

## RAG, Retrieval & Tool Use

- Lewis, P. et al. (2020). [Retrieval-Augmented Generation for Knowledge-Intensive NLP
  Tasks](https://arxiv.org/abs/2005.11401). *NeurIPS 2020*.
- Schick, T. et al. (2023). [Toolformer: Language Models Can Teach Themselves to Use
  Tools](https://arxiv.org/abs/2302.04761). (Self-supervised tool learning)

## Domain Knowledge & Specialization

- Song, Z. et al. (2025). [Injecting Domain-Specific Knowledge into Large Language Models: A Comprehensive
  Survey](https://arxiv.org/abs/2502.10708). *EMNLP 2025 Findings*. (Four-paradigm taxonomy)
- Zhang, T. et al. (2024). [RAFT: Adapting Language Model to Domain Specific RAG](https://arxiv.org/abs/2403.10131).
  *COLM 2024*. (Outperforms RAG-only and SFT-only)

## Constrained Generation & Output Validation

- Beurer-Kellner, L., Fischer, M. & Vechev, M. (2023). [Prompting Is Programming: A Query Language for Large Language
  Models (LMQL)](https://arxiv.org/abs/2212.06094). *PLDI 2023*. doi:10.1145/3591300
- Willard, B.T. & Louf, R. (2023). [Efficient Guided Generation for Large Language Models (Outlines)](https://arxiv.org/abs/2307.09702).
- Lhoest, Q. & Turuta, M. (2024). [Structured Generation with
  Outlines](https://huggingface.co/blog/outlines-structured-generation). Hugging Face Blog.
- Gerganov, G. et al. (2024). [Grammar-Based Sampling (GBNF) —
  llama.cpp](https://github.com/ggerganov/llama.cpp/blob/master/grammars/README.md). Context-free grammar constrained
  sampling.

## LLM Serving & Local Deployment

- Yu, G. et al. (2022). [Orca: A Distributed Serving System for Transformer-Based Generative
  Models](https://www.usenix.org/conference/osdi22/presentation/yu). *OSDI '22*.
- Kwon, W. et al. (2023). [Efficient Memory Management for Large Language Model Serving with
  PagedAttention](https://arxiv.org/abs/2309.06180). *SOSP '23*. UC Berkeley.
- Ollama Team (2024). [Ollama Concurrent Requests and Performance
  FAQ](https://github.com/ollama/ollama/blob/main/docs/faq.md). `OLLAMA_NUM_PARALLEL` configuration guidance.

## MCP & Agentic Standards

- Agentic AI Foundation / Linux Foundation (2025). [Model Context Protocol Specification
  2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25). (Tool integration protocol)
