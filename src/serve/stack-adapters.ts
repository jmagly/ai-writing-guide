/**
 * Per-stack executor adapters (#1546).
 *
 * A Mission conductor (mission-conductor.ts) fans worker cycles out across
 * *heterogeneous* agentic stacks. Each stack advertises itself on the existing
 * executor registry via a `runtime:<name>` capability — the convention proven
 * in slice 1 (see test/unit/serve/agent-router.test.ts "cross-stack Mission
 * dispatch"). A StackAdapter is the conductor-side description of how a worker
 * cycle maps onto that stack's NATIVE long-running primitive, plus the runtime
 * capability token the conductor filters on — so the conductor dispatches and
 * captures results uniformly regardless of which stack runs the worker.
 *
 * The adapter does NOT run the worker. The registered executor on that stack
 * runs it via `aiwg serve`'s dispatch transport (dispatch-router + the WS event
 * stream). The adapter keeps the conductor stack-agnostic: it owns only the
 * `runtime:<name>` token and the native-primitive description.
 *
 * @implements #1546
 */

/** How a worker cycle is dispatched onto a given stack. */
export interface WorkerInvocation {
  /** The `runtime:<name>` capability the executor MUST advertise to receive it. */
  runtimeCapability: string;
  /** The stack's native long-running primitive this worker drives. */
  primitive: string;
  /** Human-readable description of the dispatched worker mechanism. */
  describe: string;
}

/** A per-stack adapter: maps a worker cycle onto one stack's native primitive. */
export interface StackAdapter {
  /** Stack id, e.g. 'codex', 'claude-code'. */
  runtime: string;
  /** The capability token an executor advertises for this stack (`runtime:<id>`). */
  runtimeCapability: string;
  /** Native long-running primitive a worker cycle drives on this stack. */
  primitive: string;
  /** Build the worker-invocation descriptor for a cycle prompt. */
  invoke(prompt: string): WorkerInvocation;
}

function makeAdapter(runtime: string, primitive: string): StackAdapter {
  const runtimeCapability = `runtime:${runtime}`;
  return {
    runtime,
    runtimeCapability,
    primitive,
    invoke(prompt: string): WorkerInvocation {
      // prompt is carried by the dispatch payload; the descriptor records the
      // mechanism so the conductor's ledger is identical-shape across stacks.
      const trimmed = prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
      return {
        runtimeCapability,
        primitive,
        describe: `dispatch worker to ${runtime} executor via ${primitive} (${trimmed})`,
      };
    },
  };
}

/** Codex executor adapter — a dispatched worker drives Codex `/goal` (or `/aiwg-mission`, #1544). */
export const codexAdapter: StackAdapter = makeAdapter('codex', '/goal');

/** Claude Code executor adapter — a dispatched worker drives the Workflow tool / subagents. */
export const claudeCodeAdapter: StackAdapter = makeAdapter('claude-code', 'workflow-tool');

/** Built-in adapters for the two stacks the cross-stack proof exercises. */
export const BUILTIN_STACK_ADAPTERS: StackAdapter[] = [codexAdapter, claudeCodeAdapter];

/**
 * Registry of per-stack adapters. Operators can register additional stacks
 * (the `runtime:<name>` convention is open-ended); a Mission can then dispatch
 * workers to any registered runtime.
 */
export class StackAdapterRegistry {
  private byRuntime = new Map<string, StackAdapter>();

  constructor(adapters: StackAdapter[] = BUILTIN_STACK_ADAPTERS) {
    for (const a of adapters) this.byRuntime.set(a.runtime, a);
  }

  register(adapter: StackAdapter): void {
    this.byRuntime.set(adapter.runtime, adapter);
  }

  get(runtime: string): StackAdapter | undefined {
    return this.byRuntime.get(runtime);
  }

  has(runtime: string): boolean {
    return this.byRuntime.has(runtime);
  }

  runtimes(): string[] {
    return [...this.byRuntime.keys()];
  }
}
