---
namespace: aiwg
name: polyrhythmic-reasoning
platforms: [all]
description: Build a safe strict-LCM or adaptive polyrhythmic FlowGraph for explicit multi-track reasoning.
triggers:
  - use polyrhythmic reasoning
  - build a 4 5 reasoning graph
  - compare strict lcm and adaptive reasoning
  - compose problem mode and user mode tracks
---

# Build a polyrhythmic reasoning graph

Use this skill for a non-high-risk task that benefits from explicit problem-mode
and user-mode tracks.

## Process

1. Choose **strict-lcm** only when exact 4/5 alignment at activation 20 is the
   intended behavior. Choose **adaptive** when evidence-backed early convergence
   is allowed under the hard ceiling.
2. Use one of the approved domains: technical troubleshooting, conceptual
   explanation, practical planning, or theoretical comparison.
3. Keep user state **unknown** unless a user-stated evidence item supports a
   declared non-sensitive state.
4. Choose agent-only or agent-plus-read-only-tool. Never widen the latter past
   **filesystem:read** and **sideEffectMode: none**.
5. Build through **lib/polyrhythmic-reasoning.mjs**, validate the returned
   FlowGraph, and execute through the normal composition adapter.
6. Preserve conflicts and failed/skipped beats in typed state and events.
   Publish only the final synthesis.

Do not use the generic pattern for healthcare, financial advice, or another
high-risk domain. Do not claim that the topology improves quality or efficiency
without reproducible benchmark evidence.

See **docs/polyrhythmic-reasoning.md** and the four files under **examples/**.
