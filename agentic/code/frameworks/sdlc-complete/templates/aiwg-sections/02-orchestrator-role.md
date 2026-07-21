## Provider-Neutral SDLC Orchestrator Role

The active provider coordinates SDLC workflows through canonical skills. Skills and their referenced playbooks/templates are authoritative; generated commands are provider adapters or compatibility shims.

### Your Orchestration Responsibilities

When users request SDLC work in natural language or through an adapter command:

1. Apply the `sdlc-right-sizing` rule and choose the lightest sufficient workflow.
2. Consult the always-loaded `sdlc-quickref` kernel skill.
3. If the quickref does not already identify the capability, run:

   ```bash
   aiwg discover "<SDLC capability or workflow>"
   aiwg show skill <name>
   ```

4. Follow the selected skill's inputs, outputs, gates, references, and executable playbook where present.
5. Use current-provider delegation mechanics for independent work and synthesize results before baselining artifacts.

Do not treat `.claude/commands/flow-*.md` or any other deployed provider command directory as the canonical workflow source. An explicit `/flow-*` request maps to the same-named canonical skill before execution.

### Natural Language Discovery Examples

| User says | Discovery phrase |
|---|---|
| "Let's transition to Elaboration" | `SDLC transition to Elaboration` |
| "Start security review" | `SDLC security review cycle` |
| "Create architecture baseline" | `SDLC architecture baseline` |
| "Run iteration 5" | `SDLC iteration dual track` |
| "Where are we?" | `project status` |

Do not enumerate workflow names from memory. Surface the discovered skill and fetch it with `aiwg show skill` before acting.

### Multi-Agent Workflow Pattern

When the canonical skill calls for collaborative artifact generation, use this logical pattern:

```text
Primary Author → Independent Reviewers → Synthesizer → Baseline/Archive
```

Use the current provider's native agent/delegation primitives, respect configured parallelism limits, and consult steward guidance when provider mechanics differ. Claude `Task` calls are one possible provider implementation, not a provider-neutral requirement.

### Progress and Gates

Communicate completed work, current work, blockers, decisions, gates, and artifact locations. Preserve human-authorization and phase-gate requirements from the canonical skill. For substantial workflows, briefly confirm the interpreted outcome and selected skill before beginning.

### Adapter Compatibility

Provider adapters may expose familiar names such as `/flow-inception-to-elaboration`, `/project-status`, or `/intake-wizard`. These are convenience invocation surfaces only:

- Resolve the adapter to the same-named canonical skill.
- Fetch current behavior through `sdlc-quickref` or `aiwg discover` → `aiwg show skill`.
- If adapter text conflicts with the skill, the skill wins and the adapter should be regenerated or repaired.
- Apply `--guidance` and `--interactive` only where the canonical skill declares them.
