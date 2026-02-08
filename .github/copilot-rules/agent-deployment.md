name: aiwg-agent
description: AIWG SDLC agent
model:
  name: gpt-4
  temperature: 0.3
  max_tokens: 8000
tools: ["createFile","createDirectory","editFiles","deleteFile","search","runInTerminal","fetch","runSubagent","todos","problems","changes"]
instructions: |
  # Agent Deployment Rules
  
  These rules apply when working with agent definitions and multi-provider deployment.
  
  ## Agent Ecosystem
  
  ### Categories
  
  **General-Purpose Writing Agents** (`agentic/code/agents/`):
  - `writing-validator` - Validates voice consistency and authenticity
  - `prompt-optimizer` - Enhances prompts using AI Writing Guide principles
  - `content-diversifier` - Generates varied examples and perspectives
  
  **SDLC Framework Agents** (`agentic/code/frameworks/sdlc-complete/agents/`):
  - 64 specialized agents covering all SDLC phases
  - See `@agentic/code/frameworks/sdlc-complete/agents/manifest.json` for complete list
  
  **Marketing Agents** (`agentic/code/frameworks/media-marketing-kit/agents/`):
  - 37 marketing-focused agents covering campaign lifecycle
  - See `@agentic/code/frameworks/media-marketing-kit/agents/manifest.json` for complete list
  
  ## Multi-Provider Support
  
  ### Deployment Commands
  
  ```bash
  # Claude Code (default - creates .claude/agents/)
  aiwg -deploy-agents --mode sdlc
  
  # GitHub Copilot (creates .github/agents/*.yaml + copilot-instructions.md)
  aiwg -deploy-agents --provider copilot --mode sdlc
  
  # Factory AI (creates .factory/droids/ + AGENTS.md)
  aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands --create-agents-md
  
  # OpenCode (creates .opencode/agent/ + AGENTS.md)
  aiwg -deploy-agents --provider opencode --mode sdlc --deploy-commands --create-agents-md
  
  # Cursor (creates .cursor/rules/ + AGENTS.md)
  aiwg -deploy-agents --provider cursor --mode sdlc --deploy-commands --create-agents-md
  
  # OpenAI/Codex (creates .codex/agents/)
  aiwg -deploy-agents --provider openai
  
  # As single AGENTS.md file
  aiwg -deploy-agents --provider openai --as-agents-md
  ```
  
  ### Model Override
  
  Default models defined in `agentic/code/frameworks/sdlc-complete/config/models.json`.
  
  ```bash
  aiwg -deploy-agents --provider factory \\
    --reasoning-model <your-reasoning-model> \\
    --coding-model <your-coding-model> \\
    --efficiency-model <your-efficiency-model>
  ```
  
  ### Provider-Specific Guidance
  
  - **Factory AI**: See `agentic/code/frameworks/sdlc-complete/agents/factory-compat.md`
  - **OpenCode**: See `docs/integrations/opencode-quickstart.md`
  - **Cursor**: See `docs/integrations/cursor-quickstart.md`
  - **OpenAI/Codex**: See `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`
  
  ## Agent Definition Format
  
  ### Metadata Structure
  
  ```yaml
  ---
  name: agent-name
  description: Brief agent description
  model: sonnet|opus|haiku
  tools: Read, Write, MultiEdit, Bash, WebFetch, Glob, Grep
  orchestration: true|false
  category: sdlc-setup|sdlc-orchestration|sdlc-management|...
  ---
  
  # Agent Name
  
  [Agent instructions and capabilities]
  ```
  
  ### Tool Selection Guidelines
  
  | Task Type | Recommended Tools |
  |-----------|------------------|
  | Code analysis | Read, Glob, Grep |
  | Code modification | Read, Write, MultiEdit |
  | Build/test execution | Bash |
  | Research | WebFetch, WebSearch |
  | File discovery | Glob, Grep |
  
  ## Working with Agents
  
  ### Parallel Execution Pattern
  
  Launch multiple agents in a single message:
  
  ```
  Task(security-architect) -> Security validation
  Task(test-architect) -> Testability review
  Task(requirements-analyst) -> Requirements traceability
  Task(technical-writer) -> Clarity and consistency
  ```
  
  ### Agent Isolation
  
  All agents work independently with isolated contexts regardless of platform. Each agent:
  - Has its own context window
  - Cannot directly communicate with other agents
  - Returns results to the orchestrator for synthesis