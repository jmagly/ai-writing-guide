# Academic Citations Guide

Reference citations for AIWG frameworks, providing theoretical foundations.

## Issues

- #216 (Voice/Style Transfer)
- #217 (Dual-Track Delivery)
- #218 (Semantic Service Discovery)

---

## 1. Voice Profile Framework

### Academic Foundation

The voice profile framework applies principles from controllable text generation research:

- **CTRL** (Keskar et al., 2019): Conditional transformer approach for style control
- **PPLM** (Dathathri et al., 2020): Attribute-based text generation without retraining

### Key Concepts

| Concept | CTRL/PPLM Term | AIWG Implementation |
|---------|----------------|---------------------|
| Voice profiles | Control codes | `voices/templates/*.yaml` |
| Style attributes | Bag-of-words | `tone`, `vocabulary`, `structure` |
| Temperature | Sampling parameter | Voice-specific defaults |
| Top-p/Top-k | Nucleus sampling | Output diversity control |

### References

```bibtex
@article{keskar2019ctrl,
  title={CTRL: A Conditional Transformer Language Model for Controllable Generation},
  author={Keskar, Nitish Shirish and McCann, Bryan and Varshney, Lav R and Xiong, Caiming and Socher, Richard},
  journal={arXiv preprint arXiv:1909.05858},
  year={2019}
}

@inproceedings{dathathri2020plug,
  title={Plug and Play Language Models: A Simple Approach to Controlled Text Generation},
  author={Dathathri, Sumanth and Madotto, Andrea and Lan, Janice and Hung, Jane and Frank, Eric and Molino, Piero and Yosinski, Jason and Liu, Rosanne},
  booktitle={International Conference on Learning Representations},
  year={2020}
}
```

### Application to Voice Profiles

**CTRL-Inspired Patterns**:
- Control codes map to voice profile selectors
- Domain-specific training → domain-specific vocabulary lists
- Style tokens → `tone` attributes in profiles

**PPLM-Inspired Patterns**:
- Attribute classifiers → validation rules in `writing-validator`
- Gradient-based steering → confidence thresholds for style matching
- No retraining required → declarative profile definitions

---

## 2. SDLC Framework

### Methodology Foundation

AIWG's SDLC framework synthesizes established methodologies:

- **SAFe 6.0** (Scaled Agile, 2023): Dual-track agile delivery
- **RUP** (Kruchten, 2003): Phase-based lifecycle with iteration

### Phase Mapping

| AIWG Phase | RUP Phase | SAFe Equivalent |
|------------|-----------|-----------------|
| Concept | Inception | PI Planning (Vision) |
| Inception | Inception | PI Planning (Roadmap) |
| Elaboration | Elaboration | Architecture Enablers |
| Construction | Construction | Feature Development |
| Transition | Transition | Release Train |

### Dual-Track Model

From SAFe 6.0:

```
Discovery Track          Delivery Track
───────────────          ──────────────
├── Requirements         ├── Implementation
├── Architecture         ├── Testing
├── Design               ├── Integration
└── Validation           └── Deployment
```

**AIWG Implementation**:
- `/flow-discovery-track` orchestrates discovery
- `/flow-delivery-track` orchestrates delivery
- `/flow-iteration-dual-track` synchronizes both

### References

```bibtex
@book{kruchten2003rup,
  title={The Rational Unified Process: An Introduction},
  author={Kruchten, Philippe},
  edition={3rd},
  publisher={Addison-Wesley Professional},
  year={2003}
}

@misc{scaledagile2023,
  title={SAFe 6.0 Framework},
  author={{Scaled Agile, Inc.}},
  howpublished={\url{https://scaledagileframework.com/}},
  year={2023}
}
```

### Application to SDLC

**RUP-Inspired Patterns**:
- Milestones at phase boundaries → gate checks
- Architecture-centric approach → Elaboration focus
- Iterative development → Ralph loops
- Risk-driven planning → Risk register integration

**SAFe-Inspired Patterns**:
- Program Increments → Iteration planning
- Enabler work → Infrastructure/architecture tasks
- Continuous delivery → `/flow-deploy-to-production`
- DevOps integration → DevOps Engineer agent

---

## 3. Extension System

### Semantic Discovery Foundation

AIWG's capability-based extension discovery applies SOA principles:

- **Semantic Matching** (Papazoglou & van den Heuvel, 2007): Capability-based service selection
- **Dynamic Composition** (Dustdar & Schreiner, 2005): Runtime orchestration

### Concept Mapping

| SOA Concept | AIWG Extension System |
|-------------|----------------------|
| Service | Extension (agent, command, skill) |
| Service Contract | Extension manifest |
| Service Registry | Extension registry |
| Service Discovery | Capability-based search |
| Service Composition | Multi-agent orchestration |
| Service Broker | Registry.ts |

### Semantic Search Model

```
Query: "I need to generate tests"

Extension Registry Search:
1. Parse natural language query
2. Extract capability keywords: ["test", "generate", "quality"]
3. Match against extension capabilities
4. Rank by relevance score
5. Return: test-engineer, test-architect, mutation-analyst

SOA Equivalent:
1. Service request arrives
2. Extract functional requirements
3. Query UDDI/registry
4. Select by QoS criteria
5. Return service endpoint
```

### References

```bibtex
@article{papazoglou2007soa,
  title={Service-Oriented Architectures: Approaches, Technologies and Research Issues},
  author={Papazoglou, Michael P and van den Heuvel, Willem-Jan},
  journal={The VLDB Journal},
  volume={16},
  number={3},
  pages={389--415},
  year={2007},
  publisher={Springer}
}

@article{dustdar2005survey,
  title={A Survey on Web Services Composition},
  author={Dustdar, Schahram and Schreiner, Wolfgang},
  journal={International Journal of Web and Grid Services},
  volume={1},
  number={1},
  pages={1--30},
  year={2005}
}
```

### Application to Extensions

**SOA-Inspired Patterns**:
- Loose coupling → Extension independence
- Contract-first design → Manifest-driven definitions
- Late binding → Runtime agent selection
- Service versioning → Extension version constraints
- Choreography → Multi-agent workflows

---

## Integration Points

### Voice Framework

Update locations:
- `agentic/code/addons/voice-framework/README.md` - Academic Foundation section
- `agentic/code/addons/voice-framework/docs/voice-theory.md` - Detailed theory
- Voice profile templates - Reference academic principles

### SDLC Framework

Update locations:
- `agentic/code/frameworks/sdlc-complete/README.md` - Methodology Foundation
- `agentic/code/frameworks/sdlc-complete/docs/sdlc-theory.md` - Theory document
- Phase documentation - Cross-reference to SAFe/RUP

### Extension System

Update locations:
- `docs/extensions/overview.md` - Semantic Discovery section
- `src/extensions/registry.ts` - Citation comments
- `docs/research/soa-patterns.md` - Detailed SOA mapping

---

## Citation Format

Use APA 7th edition for consistency:

**Journal Article**:
> Author, A. A., & Author, B. B. (Year). Title of article. *Journal Name*, *volume*(issue), pages. https://doi.org/xxx

**Book**:
> Author, A. A. (Year). *Title of work: Capital letter also for subtitle*. Publisher.

**Conference Paper**:
> Author, A. A. (Year). Title of paper. In *Proceedings of Conference Name* (pp. xx-xx). Publisher.

**Website**:
> Author/Organization. (Year). *Title*. URL

---

## References

- @agentic/code/addons/voice-framework/README.md
- @agentic/code/frameworks/sdlc-complete/README.md
- @docs/extensions/overview.md
- @.aiwg/research/findings/
