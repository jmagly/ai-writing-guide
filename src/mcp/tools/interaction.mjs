/**
 * Interaction tools — structured questions via MCP elicitation.
 *
 * Registers `ask-user`: a tool the agent can call to ask the operator a
 * single/multi-select question. On clients that support MCP form elicitation
 * (e.g. Codex, whose `tool_call_mcp_elicitation` is stable) this renders a
 * native selection form and returns the choice; on other clients it returns a
 * formatted markdown prompt for the agent to present. This restores
 * agent-initiated structured questions on Codex, whose native
 * `request_user_input` tool is mode-gated and off by default (#1668).
 *
 * @implements #1676
 */

import { z } from 'zod';
import { elicitChoice, renderMarkdownPrompt } from '../elicitation.mjs';

/**
 * Register interaction tools on the MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerInteractionTools(server) {
  server.registerTool(
    'ask-user',
    {
      title: 'Ask the user a structured question',
      description:
        'Ask the operator a single- or multi-select question. On clients that support MCP ' +
        'elicitation (e.g. Codex) this renders a native selection form and returns the choice; ' +
        'on other clients it returns a formatted markdown prompt for you to present to the user. ' +
        'Use for short clarifications that materially change the outcome — not for low-stakes ' +
        'choices with a sensible default.',
      inputSchema: {
        question: z.string().describe('The question to ask the user.'),
        options: z
          .array(
            z.union([
              z.string(),
              z.object({
                value: z.string().optional().describe('Machine value returned on selection.'),
                label: z.string().describe('Human-readable label.'),
              }),
            ]),
          )
          .min(2)
          .describe('Two or more options. Plain strings, or { label, value } objects.'),
        multiSelect: z.boolean().optional().describe('Allow selecting multiple options (default false).'),
        context: z.string().optional().describe('Optional context shown above the question.'),
      },
    },
    async ({ question, options, multiSelect = false, context }) => {
      const message = context ? `${context}\n\n${question}` : question;
      const res = await elicitChoice(server, { question: message, options, multiSelect });

      if (res.supported && res.action === 'accept') {
        const val = Array.isArray(res.value) ? res.value.join(', ') : res.value;
        return {
          content: [{ type: 'text', text: `User selected: ${val ?? '(empty selection)'}` }],
        };
      }

      if (res.supported && (res.action === 'decline' || res.action === 'cancel')) {
        return {
          content: [
            {
              type: 'text',
              text: `User ${res.action}d the question without selecting. Do not assume an answer — ask how to proceed.`,
            },
          ],
        };
      }

      // Fallback: client has no native question UI — instruct the agent to ask in markdown.
      const prompt = renderMarkdownPrompt({ question, options, multiSelect });
      return {
        content: [
          {
            type: 'text',
            text:
              'This client has no native question UI. Present the following to the user verbatim ' +
              `and proceed with their reply:\n\n${prompt}`,
          },
        ],
      };
    },
  );
}
