# Simple Language Translations

Maps natural language requests to AIWG rules, skills, and workflows. Used by the NL router and by agents interpreting user intent.

## Phase Transitions

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "move to elaboration" | Inception → Elaboration gate | `flow-inception-to-elaboration` |
| "start construction" | Elaboration → Construction gate | `flow-elaboration-to-construction` |
| "ready for production" | Construction → Transition gate | `flow-construction-to-transition` |
| "transition to {phase}" | Phase transition flow | `flow-{from}-to-{to}` |
| "check the gate" | Gate validation | `flow-gate-check` |
| "can we move forward" | Gate readiness check | `flow-gate-check` |

## Workflow Requests

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "where are we" | Project status | `project-status` |
| "what's next" | Phase recommendation | `project-awareness` |
| "run security review" | Security assessment | `security-audit` |
| "update risks" | Risk management cycle | `flow-risk-management-cycle` |
| "create a {artifact}" | Artifact generation | `orchestrate-project` |
| "generate tests" | Test generation | `generate-tests` |

## Review Cycles

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "review this PR" | PR review | `pr-review` |
| "code review" | Code review agent | Code Reviewer agent |
| "security scan" | Security assessment | `security-audit` |
| "check brand compliance" | Brand audit | `brand-audit` |
| "validate config" | Configuration validator | `config-validator` |

## Artifact Generation

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "write the SAD" | Software Architecture Document | `orchestrate-project` |
| "create an ADR" | Architecture Decision Record | `tot-decide` |
| "draft requirements" | Requirements document | Requirements Analyst agent |
| "create test plan" | Test strategy | Test Architect agent |
| "threat model" | Threat model | Security Architect agent |

## Research & Investigation

| User Says | Maps To | Rule Activated |
|-----------|---------|----------------|
| "look this up first" | Research action required | `research-before-decision` |
| "check the docs" | Read documentation before acting | `research-before-decision` |
| "how does this work" | Codebase exploration | `research-before-decision` |
| "find documentation for X" | Documentation search | `research-before-decision` |
| "what pattern does this use" | Pattern investigation | `research-before-decision` |
| "why is this failing" | Error investigation | `research-before-decision` |
| "search for X in the codebase" | Code search | `research-before-decision` |
| "read about X before changing it" | Pre-change research | `research-before-decision` |
| "investigate before you fix" | Root cause analysis | `research-before-decision` |
| "don't guess, look it up" | Explicit research demand | `research-before-decision` |

## Planning & Strategy

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "plan how to do this" | Approach planning | Plan mode / `orchestrate-project` |
| "think through this first" | Pre-implementation planning | Plan mode |
| "break this down" | Task decomposition | `orchestrate-project` |
| "what's the best approach" | Decision support | `tot-decide` |
| "compare these options" | Trade-off analysis | `tot-decide` |
| "design the approach" | Architecture/design work | Architecture Designer agent |
| "outline the steps" | Implementation plan | Plan mode |
| "strategize this" | Strategic planning | Product Strategist agent |

## Clarification & Recovery

| User Says | Maps To | Rule Activated |
|-----------|---------|----------------|
| "re-read my instructions" | Instruction reparse | `instruction-comprehension` |
| "that's not what I asked" | Instruction reparse + correction | `instruction-comprehension` |
| "I said X, not Y" | Explicit correction | `instruction-comprehension` |
| "you missed {thing}" | Incomplete execution | `instruction-comprehension` |
| "go back and read what I wrote" | Full reparse of original request | `instruction-comprehension` |
| "I already told you" | Repeated instruction (drift detected) | `instruction-comprehension` |
| "stop and listen" | Halt + reparse | `instruction-comprehension` |
| "no, use X instead" | Technology/approach correction | `instruction-comprehension` |
| "don't change that file" | Constraint violation correction | `instruction-comprehension` |
| "follow my instructions exactly" | Strict compliance demand | `instruction-comprehension` |

## Incident & Urgency

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "production is down" | Incident response | `flow-incident-response` |
| "P0" / "SEV1" | High-priority incident | `flow-incident-response` |
| "system down" | Incident triage | `flow-incident-response` |
| "security breach" | Security incident | `flow-incident-response` + `security-audit` |

## Meta & Help

| User Says | Maps To | Skill/Command |
|-----------|---------|---------------|
| "help" | Available actions | NL router options display |
| "what can you do" | Capability listing | `aiwg-kb` |
| "show me the framework" | Framework status | `project-status` |
| "doctor" / "health check" | Installation health | `aiwg doctor` |

## Rule Activation Mapping

When these patterns are detected, the corresponding rules are activated in the agent's context:

| Pattern Category | Rule | Effect |
|-----------------|------|--------|
| Research keywords detected | `research-before-decision` | Agent must search/read before modifying |
| Clarification/correction keywords | `instruction-comprehension` | Agent must reparse original instructions |
| Code modification without prior search | `research-before-decision` | Agent is reminded to research first |
| User repeats same instruction | `instruction-comprehension` | Drift detection triggered |
| Multiple failed attempts at same action | `research-before-decision` | Whack-a-mole detection triggered |

## References

- @agentic/code/addons/aiwg-utils/skills/nl-router/SKILL.md - NL router implementation
- @agentic/code/addons/aiwg-utils/rules/research-before-decision.md - Research rule
- @agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md - Instruction rule
- @agentic/code/frameworks/sdlc-complete/rules/thought-protocol.md - Thought types
