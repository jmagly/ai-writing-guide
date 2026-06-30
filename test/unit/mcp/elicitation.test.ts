/**
 * MCP elicitation tests — structured questions via MCP elicitation with
 * graceful markdown fallback.
 *
 * @source @src/mcp/elicitation.mjs
 * @source @src/mcp/tools/interaction.mjs
 * @implements #1676
 */

import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error — .mjs untyped
import {
  normalizeOptions,
  clientSupportsFormElicitation,
  buildChoiceSchema,
  elicitChoice,
  renderMarkdownPrompt,
} from '../../../src/mcp/elicitation.mjs';
// @ts-expect-error — .mjs untyped
import { registerInteractionTools } from '../../../src/mcp/tools/interaction.mjs';

/** Build a mock McpServer whose underlying `.server` reports given capabilities. */
function mockServer({
  supportsForm = true,
  elicitResult = { action: 'accept', content: { choice: 'b' } },
  elicitImpl,
}: {
  supportsForm?: boolean;
  elicitResult?: any;
  elicitImpl?: (params: any) => any;
} = {}) {
  const elicitInput = vi.fn(elicitImpl ?? (async () => elicitResult));
  return {
    server: {
      getClientCapabilities: () => (supportsForm ? { elicitation: { form: {} } } : {}),
      elicitInput,
    },
    elicitInput,
  };
}

describe('elicitation helpers (#1676)', () => {
  describe('normalizeOptions', () => {
    it('accepts strings and { label, value } objects', () => {
      expect(normalizeOptions(['a', { label: 'Bee', value: 'b' }, { label: 'See' }])).toEqual([
        { value: 'a', label: 'a' },
        { value: 'b', label: 'Bee' },
        { value: 'See', label: 'See' },
      ]);
    });
  });

  describe('clientSupportsFormElicitation', () => {
    it('true only when elicitation.form is advertised', () => {
      expect(clientSupportsFormElicitation(mockServer({ supportsForm: true }))).toBe(true);
      expect(clientSupportsFormElicitation(mockServer({ supportsForm: false }))).toBe(false);
      expect(clientSupportsFormElicitation({})).toBe(false);
      expect(clientSupportsFormElicitation(undefined)).toBe(false);
    });
  });

  describe('buildChoiceSchema', () => {
    it('builds a single-select oneOf schema', () => {
      const { requestedSchema, key } = buildChoiceSchema({
        options: ['a', { label: 'Bee', value: 'b' }],
      });
      expect(key).toBe('choice');
      const prop = requestedSchema.properties.choice;
      expect(prop.type).toBe('string');
      expect(prop.oneOf).toEqual([
        { const: 'a', title: 'a' },
        { const: 'b', title: 'Bee' },
      ]);
      expect(requestedSchema.required).toEqual(['choice']);
    });

    it('builds a multi-select array schema with items.anyOf', () => {
      const { requestedSchema } = buildChoiceSchema({
        options: ['x', 'y'],
        multiSelect: true,
        minItems: 1,
      });
      const prop = requestedSchema.properties.choice;
      expect(prop.type).toBe('array');
      expect(prop.items.anyOf).toEqual([
        { const: 'x', title: 'x' },
        { const: 'y', title: 'y' },
      ]);
      expect(prop.minItems).toBe(1);
    });
  });

  describe('elicitChoice', () => {
    it('emits a form and returns the accepted value when supported', async () => {
      const srv = mockServer({ elicitResult: { action: 'accept', content: { choice: 'b' } } });
      const res = await elicitChoice(srv, { question: 'Pick', options: ['a', 'b'] });
      expect(res.supported).toBe(true);
      expect(res.action).toBe('accept');
      expect(res.value).toBe('b');
      expect(srv.elicitInput).toHaveBeenCalledOnce();
      const params = srv.elicitInput.mock.calls[0][0];
      expect(params.mode).toBe('form');
      expect(params.message).toBe('Pick');
      expect(params.requestedSchema.properties.choice.oneOf).toHaveLength(2);
    });

    it('returns the array value for multi-select', async () => {
      const srv = mockServer({ elicitResult: { action: 'accept', content: { choice: ['x', 'y'] } } });
      const res = await elicitChoice(srv, { question: 'Pick', options: ['x', 'y'], multiSelect: true });
      expect(res.value).toEqual(['x', 'y']);
      expect(srv.elicitInput.mock.calls[0][0].requestedSchema.properties.choice.type).toBe('array');
    });

    it('distinguishes decline and cancel', async () => {
      const declined = await elicitChoice(mockServer({ elicitResult: { action: 'decline' } }), {
        question: 'Pick',
        options: ['a', 'b'],
      });
      expect(declined).toMatchObject({ supported: true, action: 'decline' });

      const cancelled = await elicitChoice(mockServer({ elicitResult: { action: 'cancel' } }), {
        question: 'Pick',
        options: ['a', 'b'],
      });
      expect(cancelled).toMatchObject({ supported: true, action: 'cancel' });
    });

    it('falls back (supported:false) when the client lacks elicitation', async () => {
      const srv = mockServer({ supportsForm: false });
      const res = await elicitChoice(srv, { question: 'Pick', options: ['a', 'b'] });
      expect(res.supported).toBe(false);
      expect(srv.elicitInput).not.toHaveBeenCalled();
    });

    it('degrades gracefully (never throws) when elicitInput errors', async () => {
      const srv = mockServer({
        elicitImpl: async () => {
          throw new Error('client does not support form elicitation');
        },
      });
      const res = await elicitChoice(srv, { question: 'Pick', options: ['a', 'b'] });
      expect(res.supported).toBe(false);
    });
  });

  describe('renderMarkdownPrompt', () => {
    it('renders a bold question and option list', () => {
      const md = renderMarkdownPrompt({ question: 'Pick one', options: ['a', { label: 'Bee', value: 'b' }] });
      expect(md).toContain('**Pick one**');
      expect(md).toContain('- `a`');
      expect(md).toContain('- Bee (`b`)');
      expect(md).toContain('Reply with your choice');
    });
  });
});

describe('ask-user tool (#1676)', () => {
  /** Register the tool on a mock server and return the captured handler. */
  function registerAndCapture(serverOpts = {}) {
    const srv: any = mockServer(serverOpts);
    let handler: any;
    srv.registerTool = (_name: string, _spec: any, fn: any) => {
      handler = fn;
    };
    registerInteractionTools(srv);
    return { srv, handler };
  }

  it('registers a tool named ask-user', () => {
    const names: string[] = [];
    const srv: any = mockServer();
    srv.registerTool = (name: string) => names.push(name);
    registerInteractionTools(srv);
    expect(names).toContain('ask-user');
  });

  it('returns the user selection on a supported client', async () => {
    const { handler } = registerAndCapture({ elicitResult: { action: 'accept', content: { choice: 'b' } } });
    const out = await handler({ question: 'Pick', options: ['a', 'b'] });
    expect(out.content[0].text).toContain('User selected: b');
    expect(out.isError).toBeFalsy();
  });

  it('returns a markdown fallback prompt on an unsupported client', async () => {
    const { handler } = registerAndCapture({ supportsForm: false });
    const out = await handler({ question: 'Pick', options: ['a', 'b'] });
    expect(out.content[0].text).toContain('no native question UI');
    expect(out.content[0].text).toContain('**Pick**');
  });

  it('surfaces decline without inventing an answer', async () => {
    const { handler } = registerAndCapture({ elicitResult: { action: 'decline' } });
    const out = await handler({ question: 'Pick', options: ['a', 'b'] });
    expect(out.content[0].text).toContain('declined');
    expect(out.content[0].text).toContain('Do not assume');
  });
});
