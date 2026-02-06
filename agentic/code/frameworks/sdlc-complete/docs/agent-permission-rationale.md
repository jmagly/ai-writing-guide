# Agent Permission Tier Rationale

**Version**: 1.0.0
**Parent Document**: @agentic/code/frameworks/sdlc-complete/docs/agent-permission-tiers.md

## Purpose

This document explains WHY each agent is assigned to its permission tier. Use this as a reference when creating new agents or evaluating tier assignments.

## Assignment Principles

### Analyst Tier Assignment Criteria

An agent should be Analyst tier if it:
1. Primarily consumes information to produce reports/specifications
2. Does not need to execute code or run tests
3. Works on analysis, review, or documentation tasks
4. Should not trigger code changes directly

**Key Question**: "Does this agent produce executable artifacts or just specifications/reports?"

If the answer is "just specifications/reports", it's Analyst tier.

### Implementation Tier Assignment Criteria

An agent should be Implementation tier if it:
1. Writes or modifies executable code
2. Needs to run tests or builds to validate work
3. Deploys or configures infrastructure
4. Requires Bash access for its core responsibilities

**Key Question**: "Does this agent need to execute commands as part of its work?"

If the answer is "yes", it's Implementation tier.

### Orchestrator Tier Assignment Criteria

An agent should be Orchestrator tier if it:
1. Coordinates work across multiple specialist agents
2. Makes routing decisions about which agents to invoke
3. Manages SDLC phase transitions
4. Requires flexible delegation to accomplish goals

**Key Question**: "Does this agent primarily delegate to other agents?"

If the answer is "yes", it's Orchestrator tier.

## Rationale by Agent

### Analyst Tier (25 agents)

#### Requirements Analysts
- **requirements-analyst**: Produces requirement specs, not code
- **requirements-reviewer**: Reviews and validates requirements documents
- **requirements-documenter**: Formats and organizes requirement artifacts

**Rationale**: Requirements work is pure analysis. These agents consume stakeholder input and produce specifications. They don't execute code or need Bash access.

#### Domain Experts
- **domain-expert**: Provides domain knowledge and validation
- **business-process-analyst**: Analyzes business processes, produces process maps
- **system-analyst**: Analyzes system boundaries and integration points

**Rationale**: Domain analysis is about understanding and documenting, not implementation. These agents provide expertise without touching code.

#### Security Review
- **security-auditor**: Reviews code/architecture for vulnerabilities, produces findings
- **security-architect**: Designs security controls, produces threat models
- **security-gatekeeper**: Validates security requirements are met

**Rationale**: Security review is distinct from security implementation. These agents identify issues and specify controls, but don't implement fixes. This separation of concerns prevents reviewers from modifying what they audit.

#### Code Reviewers
- **code-reviewer**: Reviews pull requests, provides feedback
- **citation-verifier**: Validates citations in documentation
- **quality-assessor**: Evaluates artifact quality

**Rationale**: Reviewers should observe and report, not modify. Limiting to Analyst tier prevents blurring the line between reviewer and implementer.

#### Governance
- **legal-liaison**: Validates legal compliance, provides guidance
- **privacy-officer**: Reviews privacy implications
- **raci-expert**: Creates RACI matrices
- **decision-matrix-expert**: Builds decision frameworks

**Rationale**: Governance roles are advisory. They provide frameworks and validation without executing code or making technical implementations.

#### Strategy
- **metrics-analyst**: Analyzes metrics, produces reports
- **product-strategist**: Defines product strategy
- **product-designer**: Creates product designs and mockups
- **vision-owner**: Maintains product vision

**Rationale**: Strategy and design work is pre-implementation. These agents define WHAT to build, not HOW. They produce specifications for Implementation tier agents to execute.

#### Documentation
- **documentation-archivist**: Organizes and maintains documentation
- **documentation-synthesizer**: Combines documentation from multiple sources
- **technical-writer**: Writes end-user documentation
- **test-documenter**: Documents test plans and results
- **architecture-documenter**: Documents architectural decisions

**Rationale**: Documentation agents consume existing artifacts and produce readable documentation. They don't execute code or modify implementations.

### Implementation Tier (23 agents)

#### Development
- **software-implementer**: Writes production code, runs tests
- **test-engineer**: Writes and executes tests
- **test-architect**: Designs test frameworks (may need to execute them)

**Rationale**: Core development work requires execution. These agents must run tests to validate their work (REF-013 MetaGPT executable feedback pattern).

#### Debugging
- **debugger**: Investigates issues, runs debugging commands
- **database-optimizer**: Analyzes and optimizes database queries (needs execution)
- **performance-engineer**: Profiles code, runs benchmarks

**Rationale**: Debugging requires execution to reproduce issues, analyze behavior, and validate fixes.

#### DevOps
- **devops-engineer**: Manages CI/CD pipelines, infrastructure
- **build-engineer**: Configures build systems
- **cloud-architect**: Provisions cloud resources

**Rationale**: DevOps work is inherently about execution - deploying, building, provisioning. Bash access is essential.

#### Modernization
- **legacy-modernizer**: Refactors old code, needs to run tests
- **incident-responder**: Investigates and remediates incidents (requires execution)
- **reliability-engineer**: Implements SRE practices, monitors systems

**Rationale**: These agents work with running systems and need execution to validate changes or investigate issues.

#### Integration
- **integration-engineer**: Integrates systems, tests connections
- **deployment-manager**: Deploys applications
- **environment-engineer**: Manages deployment environments

**Rationale**: Integration and deployment work requires execution to validate connections and configurations.

#### Accessibility
- **accessibility-specialist**: Validates accessibility (may need to run automated tools)
- **api-designer**: Designs APIs (may prototype and test)
- **api-documenter**: Documents APIs (may need to test endpoints)

**Rationale**: While primarily design/documentation, these agents benefit from execution to validate their work.

#### Tooling
- **toolsmith**: Creates tools for other agents
- **mcpsmith**: Creates MCP servers
- **skillsmith**: Creates skills
- **commandsmith**: Creates commands
- **agentsmith**: Creates agent definitions

**Rationale**: Tool creation requires testing and validation. These agents write code that must be executed to verify functionality.

#### Research
- **technical-researcher**: Investigates technologies, may prototype to evaluate

**Rationale**: Technical research often involves running proof-of-concepts and validating claims empirically.

### Orchestrator Tier (8 agents)

#### Orchestration
- **executive-orchestrator**: Manages entire SDLC lifecycle, routes to all specialists
- **architecture-designer**: Coordinates architecture work across multiple domains

**Rationale**: Top-level orchestrators need unrestricted delegation to coordinate work. They decide which specialist agents to invoke based on task needs.

#### Intake
- **intake-coordinator**: Routes incoming requests to appropriate specialists
- **project-manager**: Manages project workflow, delegates to team

**Rationale**: Intake and project management are about routing work to the right agents, requiring full Task access.

#### Management
- **configuration-manager**: Manages configuration artifacts across the system
- **traceability-manager**: Maintains traceability across all artifacts

**Rationale**: Management roles need visibility and control across all agent types to maintain system-wide consistency.

#### Context
- **context-librarian**: Manages context for all agents
- **component-owner**: Coordinates work for specific components

**Rationale**: These agents provide support across all agent types and need flexible delegation.

## Edge Cases and Debates

### Why is technical-researcher Implementation tier?

**Debate**: Could be Analyst (research is analysis) or Implementation (needs to prototype)

**Decision**: Implementation tier

**Rationale**: Technical research often requires running code to evaluate claims. REF-013 MetaGPT's executable feedback pattern shows that execution improves research quality. Researcher needs to validate that technologies actually work as claimed.

### Why is security-auditor Analyst tier but not security-implementer?

**Separation of Concerns**: Security audit must be independent from security implementation. If security-auditor could modify code, it creates a conflict of interest.

**Pattern**: Auditor finds issue → Documents finding → Escalates to Software Implementer → Implementer fixes → Auditor re-validates

This separation maintains audit integrity.

### Why is api-designer Implementation tier?

**Debate**: API design is specification work (Analyst) vs needs testing (Implementation)

**Decision**: Implementation tier

**Rationale**: Modern API design benefits from immediate validation. Designing an API endpoint and immediately testing it with curl or Postman improves design quality. Implementation tier allows this.

### Could architecture-designer be Implementation tier?

**No**: Architecture Designer coordinates multiple specialists (Security Architect, API Designer, etc.). This coordination role requires Orchestrator-level delegation. While individual architects might implement, the Architecture Designer is the coordinator.

## Future Considerations

### Tier Elevation

If an agent consistently needs to escalate for execution, consider:
1. Is the agent definition too narrow?
2. Should the agent be Implementation tier?
3. Is the workflow inefficient?

**Example**: If Requirements Analyst frequently escalates to run tests, either:
- Requirements are too implementation-focused (scope issue)
- Agent should be hybrid analyst-implementer (tier issue)
- Workflow needs refinement (process issue)

### Hybrid Agents

Future versions may support hybrid tiers:
- **Analyst+Bash**: Can execute but not spawn other agents
- **Implementation+Orchestrate**: Can spawn limited orchestrators

This is not yet supported but could address edge cases.

### Dynamic Tier Elevation

Could allow temporary tier elevation with justification:
```
Task(Bash, justification="Need to validate API endpoint before finalizing spec")
```

This would require runtime support and audit logging.

## References

- @agentic/code/frameworks/sdlc-complete/docs/agent-permission-tiers.md - Tier definitions
- @.aiwg/research/findings/REF-013-metagpt.md - Executable feedback pattern
- @.claude/rules/executable-feedback.md - Execution requirements for code agents
- Claude Code v2.1.33 Release Notes - Task(agent_type) introduction

---

**Maintained by**: Configuration Manager
**Last Updated**: 2026-02-06
**Review Cycle**: Quarterly
