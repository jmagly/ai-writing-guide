/**
 * AIWG + Codex SDK Integration Examples
 *
 * These examples demonstrate how to use the Codex TypeScript SDK
 * with AIWG SDLC workflows for programmatic automation.
 *
 * Prerequisites:
 *   npm install @openai/codex-sdk
 *   export OPENAI_API_KEY=your-key
 *
 * Usage:
 *   npx tsx docs/examples/codex-sdk-examples.ts
 */

import { Codex } from "@openai/codex-sdk";

// ============================================================================
// Example 1: Basic AIWG Workflow
// ============================================================================

async function runSecurityReview(projectPath: string) {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: projectPath,
  });

  const turn = await thread.run(`
    Execute AIWG security review workflow.

    1. Read the project structure and identify key files
    2. Check for OWASP Top 10 vulnerabilities
    3. Review authentication and authorization patterns
    4. Check for secrets in code
    5. Review dependency security

    Output a structured security report with:
    - Critical issues (must fix)
    - High-priority issues
    - Recommendations
    - Overall risk assessment
  `);

  return turn.finalResponse;
}

// ============================================================================
// Example 2: Streaming Responses
// ============================================================================

async function streamCodeReview(projectPath: string, prNumber: number) {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: projectPath,
  });

  const { events } = await thread.runStreamed(`
    Review PR #${prNumber} using AIWG code review standards.

    Focus on:
    - Code quality and maintainability
    - Security concerns
    - Performance implications
    - Test coverage
    - Documentation completeness
  `);

  console.log("Starting code review...\n");

  for await (const event of events) {
    switch (event.type) {
      case "item.started":
        if (event.item.type === "command_execution") {
          console.log(`> ${event.item.command}`);
        }
        break;

      case "item.completed":
        if (event.item.type === "agent_message") {
          console.log("\n" + event.item.text);
        } else if (event.item.type === "reasoning") {
          console.log(`[Reasoning] ${event.item.text}`);
        }
        break;

      case "turn.completed":
        console.log(`\nTokens used: ${event.usage.input_tokens} in, ${event.usage.output_tokens} out`);
        break;
    }
  }
}

// ============================================================================
// Example 3: Structured Output for AIWG Artifacts
// ============================================================================

interface ArchitectureDecisionRecord {
  id: string;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  context: string;
  decision: string;
  consequences: string[];
  alternatives: Array<{
    option: string;
    pros: string[];
    cons: string[];
  }>;
}

async function generateADR(
  projectPath: string,
  topic: string
): Promise<ArchitectureDecisionRecord> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: projectPath,
  });

  const schema = {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      status: {
        type: "string",
        enum: ["proposed", "accepted", "deprecated", "superseded"],
      },
      context: { type: "string" },
      decision: { type: "string" },
      consequences: {
        type: "array",
        items: { type: "string" },
      },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            option: { type: "string" },
            pros: { type: "array", items: { type: "string" } },
            cons: { type: "array", items: { type: "string" } },
          },
          required: ["option", "pros", "cons"],
          additionalProperties: false,
        },
      },
    },
    required: ["id", "title", "status", "context", "decision", "consequences", "alternatives"],
    additionalProperties: false,
  } as const;

  const turn = await thread.run(
    `Generate an Architecture Decision Record (ADR) for: ${topic}

    Read the existing codebase to understand the current architecture.
    Consider the project context from AGENTS.md or CLAUDE.md.

    Follow AIWG ADR template structure:
    - Clear problem context
    - Decisive recommendation
    - Well-analyzed alternatives
    - Honest consequences (both positive and negative)`,
    { outputSchema: schema }
  );

  return JSON.parse(turn.finalResponse) as ArchitectureDecisionRecord;
}

// ============================================================================
// Example 4: Resume Previous Session
// ============================================================================

async function continueWorkflow(threadId: string, nextPrompt: string) {
  const codex = new Codex();
  const thread = codex.resumeThread(threadId);

  const turn = await thread.run(nextPrompt);
  return turn.finalResponse;
}

// ============================================================================
// Example 5: Multi-Step SDLC Workflow
// ============================================================================

async function runIterationWorkflow(projectPath: string, iterationNumber: number) {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: projectPath,
  });

  console.log(`Starting Iteration ${iterationNumber} workflow...\n`);

  // Step 1: Discovery track assessment
  console.log("Step 1: Discovery Track Assessment");
  const discovery = await thread.run(`
    Assess the discovery track for iteration ${iterationNumber}.

    1. Review .aiwg/requirements/ for pending requirements
    2. Check requirements readiness (validated, estimated, prioritized)
    3. Identify any requirements needing refinement
    4. Report discovery track status
  `);
  console.log(discovery.finalResponse);

  // Step 2: Delivery track assessment
  console.log("\nStep 2: Delivery Track Assessment");
  const delivery = await thread.run(`
    Assess the delivery track for iteration ${iterationNumber}.

    1. Review current implementation status
    2. Check test coverage and quality
    3. Identify any blockers or risks
    4. Report delivery track status
  `);
  console.log(delivery.finalResponse);

  // Step 3: Iteration planning
  console.log("\nStep 3: Iteration Planning");
  const planning = await thread.run(`
    Create iteration plan for iteration ${iterationNumber + 1}.

    Based on the discovery and delivery assessments:
    1. Select requirements for next iteration
    2. Estimate capacity and velocity
    3. Identify risks and dependencies
    4. Create iteration plan document

    Save to .aiwg/planning/iteration-${iterationNumber + 1}-plan.md
  `);
  console.log(planning.finalResponse);

  return {
    threadId: thread.id,
    discovery: discovery.finalResponse,
    delivery: delivery.finalResponse,
    planning: planning.finalResponse,
  };
}

// ============================================================================
// Example 6: Custom Environment
// ============================================================================

async function runInSandbox(projectPath: string, prompt: string) {
  // Custom environment for sandboxed execution
  const codex = new Codex({
    env: {
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: process.env.HOME || "/tmp",
      // Exclude sensitive variables
    },
  });

  const thread = codex.startThread({
    workingDirectory: projectPath,
    skipGitRepoCheck: true, // Allow non-git directories
  });

  const turn = await thread.run(prompt);
  return turn.finalResponse;
}

// ============================================================================
// Main: Run Examples
// ============================================================================

async function main() {
  const projectPath = process.cwd();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
AIWG + Codex SDK Examples

Usage:
  npx tsx codex-sdk-examples.ts <example> [args]

Examples:
  security           Run security review
  review <pr>        Stream code review for PR
  adr <topic>        Generate Architecture Decision Record
  iteration <num>    Run iteration workflow

Environment:
  OPENAI_API_KEY     Required
`);
    return;
  }

  const [example, ...exampleArgs] = args;

  switch (example) {
    case "security":
      const securityResult = await runSecurityReview(projectPath);
      console.log(securityResult);
      break;

    case "review":
      const prNumber = parseInt(exampleArgs[0] || "1", 10);
      await streamCodeReview(projectPath, prNumber);
      break;

    case "adr":
      const topic = exampleArgs.join(" ") || "caching strategy";
      const adr = await generateADR(projectPath, topic);
      console.log(JSON.stringify(adr, null, 2));
      break;

    case "iteration":
      const iteration = parseInt(exampleArgs[0] || "1", 10);
      const result = await runIterationWorkflow(projectPath, iteration);
      console.log("\nWorkflow complete. Thread ID:", result.threadId);
      break;

    default:
      console.error(`Unknown example: ${example}`);
      process.exit(1);
  }
}

main().catch(console.error);
