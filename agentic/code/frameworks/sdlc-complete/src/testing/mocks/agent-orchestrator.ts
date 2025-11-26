/**
 * MockAgentOrchestrator - Mock Claude Code multi-agent orchestration for isolated testing
 *
 * Simulates agent execution without real API calls, with support for:
 * - Controllable responses and delays
 * - Error injection for failure testing
 * - Execution history tracking
 * - Parallel agent simulation
 *
 * Satisfies NFR-TEST-004: <10% mismatch with real agent behavior
 */

export interface MockAgentBehavior {
  /** Function to generate response based on prompt */
  responseGenerator: (prompt: string) => string;
  /** Optional delay in milliseconds to simulate processing time */
  delay?: number;
  /** Error rate (0-1) - probability of failure on each execution */
  errorRate?: number;
}

export interface AgentRequest {
  /** Type/role of the agent (e.g., 'security-architect', 'test-engineer') */
  agentType: string;
  /** Prompt/instructions for the agent */
  prompt: string;
}

export interface AgentResponse {
  /** Type/role of the agent that executed */
  agentType: string;
  /** Generated output from the agent */
  output: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Error if execution failed */
  error?: Error;
}

export interface AgentExecution {
  /** Type/role of the agent */
  agentType: string;
  /** Prompt provided to the agent */
  prompt: string;
  /** Response from the agent (includes output and timing) */
  response: AgentResponse;
  /** Timestamp when execution started (epoch milliseconds) */
  timestamp: number;
}

/**
 * Mock orchestrator for multi-agent testing
 * Provides realistic simulation of agent execution patterns
 */
export class MockAgentOrchestrator {
  private registeredAgents: Map<string, MockAgentBehavior> = new Map();
  private executionHistory: AgentExecution[] = [];
  private globalDelay: number = 0;
  private errorInjections: Map<string, Error> = new Map();
  private delayInjections: Map<string, number> = new Map();

  /**
   * Register a mock agent with defined behavior
   * @param agentType - Agent identifier (e.g., 'security-architect')
   * @param mockBehavior - Configuration for agent behavior
   */
  registerAgent(agentType: string, mockBehavior: MockAgentBehavior): void {
    this.registeredAgents.set(agentType, mockBehavior);
  }

  /**
   * Set global delay applied to all agent executions
   * @param ms - Delay in milliseconds
   */
  setGlobalDelay(ms: number): void {
    if (ms < 0) {
      throw new Error('Global delay must be non-negative');
    }
    this.globalDelay = ms;
  }

  /**
   * Execute a single agent with given prompt
   * @param agentType - Type of agent to execute
   * @param prompt - Instructions for the agent
   * @returns Promise resolving to agent response
   * @throws Error if agent not registered or execution fails
   */
  async executeAgent(agentType: string, prompt: string): Promise<AgentResponse> {
    const startTime = Date.now();
    const timestamp = startTime;

    // Check for registered agent
    const behavior = this.registeredAgents.get(agentType);
    if (!behavior) {
      throw new Error(`Agent type '${agentType}' is not registered`);
    }

    // Check for injected error
    const injectedError = this.errorInjections.get(agentType);
    if (injectedError) {
      this.errorInjections.delete(agentType); // One-time injection
      const response: AgentResponse = {
        agentType,
        output: '',
        executionTime: 0,
        error: injectedError
      };
      this.executionHistory.push({ agentType, prompt, response, timestamp });
      throw injectedError;
    }

    // Check for error rate simulation
    if (behavior.errorRate && Math.random() < behavior.errorRate) {
      const error = new Error(`Simulated random failure for agent '${agentType}'`);
      const response: AgentResponse = {
        agentType,
        output: '',
        executionTime: 0,
        error
      };
      this.executionHistory.push({ agentType, prompt, response, timestamp });
      throw error;
    }

    // Calculate total delay
    const behaviorDelay = behavior.delay ?? 0;
    const injectedDelay = this.delayInjections.get(agentType) ?? 0;
    const totalDelay = this.globalDelay + behaviorDelay + injectedDelay;

    // Clear one-time delay injection
    if (this.delayInjections.has(agentType)) {
      this.delayInjections.delete(agentType);
    }

    // Simulate processing delay
    if (totalDelay > 0) {
      await this.sleep(totalDelay);
    }

    // Generate response
    const output = behavior.responseGenerator(prompt);
    const executionTime = Date.now() - startTime;

    const response: AgentResponse = {
      agentType,
      output,
      executionTime
    };

    // Record execution
    this.executionHistory.push({ agentType, prompt, response, timestamp });

    return response;
  }

  /**
   * Execute multiple agents in parallel
   * @param agents - Array of agent requests to execute
   * @returns Promise resolving to array of responses (in same order as requests)
   */
  async executeParallel(agents: AgentRequest[]): Promise<AgentResponse[]> {
    const promises = agents.map(({ agentType, prompt }) =>
      this.executeAgent(agentType, prompt)
        .catch(error => {
          // Return error response instead of throwing
          // This allows parallel execution to continue even if one fails
          return {
            agentType,
            output: '',
            executionTime: 0,
            error: error as Error
          } as AgentResponse;
        })
    );

    return Promise.all(promises);
  }

  /**
   * Reset orchestrator state
   * Clears execution history, injections, and global delay
   * Does NOT clear registered agents
   */
  reset(): void {
    this.executionHistory = [];
    this.errorInjections.clear();
    this.delayInjections.clear();
    this.globalDelay = 0;
  }

  /**
   * Get execution history
   * @returns Array of all agent executions (chronological order)
   */
  getExecutionHistory(): AgentExecution[] {
    return [...this.executionHistory]; // Return copy to prevent mutation
  }

  /**
   * Inject one-time error for next execution of specific agent
   * @param agentType - Agent that should fail
   * @param error - Error to throw on next execution
   */
  injectError(agentType: string, error: Error): void {
    this.errorInjections.set(agentType, error);
  }

  /**
   * Inject one-time delay for next execution of specific agent
   * @param agentType - Agent to delay
   * @param ms - Additional delay in milliseconds
   */
  injectDelay(agentType: string, ms: number): void {
    if (ms < 0) {
      throw new Error('Injected delay must be non-negative');
    }
    this.delayInjections.set(agentType, ms);
  }

  /**
   * Get list of registered agent types
   * @returns Array of registered agent type identifiers
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.registeredAgents.keys());
  }

  /**
   * Check if agent type is registered
   * @param agentType - Agent identifier to check
   * @returns True if agent is registered
   */
  hasAgent(agentType: string): boolean {
    return this.registeredAgents.has(agentType);
  }

  /**
   * Unregister an agent
   * @param agentType - Agent to remove
   * @returns True if agent was removed, false if not registered
   */
  unregisterAgent(agentType: string): boolean {
    return this.registeredAgents.delete(agentType);
  }

  /**
   * Clear all registered agents
   */
  clearAgents(): void {
    this.registeredAgents.clear();
  }

  /**
   * Sleep utility for simulating delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
