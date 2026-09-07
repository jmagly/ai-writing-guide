# Key Addons

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

Addons extend AIWG's core capabilities. Start from the complete setup path,
then focus on the addon that matches the result you need.

---

## Al — Iterative task completion

Al turns a bounded task into an iterative loop with an explicit completion
check. Use it after you can name the task, the files in scope, and the command
or evidence that proves completion.

```bash
aiwg use ralph
```

### How it works

```
Execute → Verify → Learn → Iterate
   ↑                          ↓
   └──────────────────────────┘
   until: criteria met OR limits reached
```

You give Al a task and a completion criterion. It executes, checks whether the
criterion is met, learns from what happened, and tries again until the criterion
passes, a limit is reached, or it needs your input.

### Common uses

Fix failing tests:
```
/ralph "Fix all failing tests" --completion "npm test passes"
```

Resolve security findings:
```
/ralph "Fix the security issues from the audit" --completion "security-gate passes"
```

Prepare a documentation review:
```
/ralph "Write the API documentation and prepare a review of facts, examples and editorial findings"
```

Resolve issues:
```
/ralph "Fix issue #42" --completion "issue can be closed"
```

### Checking and controlling loops

```bash
/ralph-status          # Current loop state
/ralph-abort           # Stop the loop
/ralph-resume          # Resume a paused loop
/ralph-attach          # Attach to a running external loop
```

### Why it matters

Many AI-assisted tasks fail at the verification step: the first answer seems
plausible, then tests or review expose a gap. Al makes the completion criterion
explicit and records the loop state so you can inspect what changed.

---

## RLM — Recursive Language Models

RLM enables agents to work with codebases and document sets too large to fit in a single context window. Instead of loading everything at once, it treats large contexts as an external environment that the agent selectively accesses.

```bash
aiwg use rlm
```

### When you need it

- Analyzing a codebase that is too large to read in one session
- Processing a research corpus that exceeds the active context window
- Running queries across large documentation sets
- Parallel fan-out over many files simultaneously

### How it works

```bash
# Focused sub-agent on a specific file
/rlm-query src/auth/login.ts "identify security issues"

# Parallel fan-out across many files
/rlm-batch "src/**/*.ts" "extract all exported function signatures"

# Check execution cost
/rlm-status --cost
```

RLM decomposes the task recursively, lets focused workers read bounded slices,
then synthesizes their results. Check `/rlm-status --cost` when cost matters;
actual savings depend on the task shape and provider.

---

## Voice Framework — Consistent writing style

The voice framework is what makes AI-generated content sound like it was written by a person, not a language model. It defines writing profiles that the AI applies consistently across all generated text.

```bash
aiwg use writing    # deploys voice framework
```

### Built-in profiles

| Profile | Use for |
|---------|---------|
| `technical-authority` | Documentation, API references, architecture explainers |
| `friendly-explainer` | Tutorials, onboarding, "how this works" guides |
| `executive-brief` | Stakeholder updates, proposals, board-ready summaries |
| `casual-conversational` | Blog posts, team updates, social content |

### Creating a custom profile

From samples of your writing:
```
/voice-create
```

Paste 3–5 samples. AIWG analyzes the patterns and generates a profile that captures your style.

From a description:
```
Create a voice profile: direct, slightly technical, no jargon, short sentences.
Occasional dry humor. Writing for engineers, not managers.
```

### Applying and validating

Apply a profile to existing content:
```
/voice-apply path/to/document.md --profile technical-authority
```

Review content for editorial phrase patterns:
```
/writing-validator path/to/content.md
```

Legacy score fields and threshold results are deprecated heuristics, not human authorship evidence or publication gates. Review findings in context; zero highlights is not required.

Flags passive voice overuse, vague hedging language, AI-characteristic phrase patterns, and structural issues.

---

## Testing Quality — Coverage and mutation testing

Ensures tests actually catch what they claim to catch.

```bash
aiwg use sdlc    # testing quality is included in the SDLC addon
```

Key capabilities:

```bash
/test-sync        # Detect orphaned tests, obsolete coverage, missing cases
/mutation-test    # Run mutation testing to validate test effectiveness
```

Mutation testing introduces small changes to your code (mutations) and checks whether your tests catch them. If a test passes after a mutation that should break it, that test isn't doing its job. This finds the gap between "tests pass" and "tests are meaningful."

---

## Security Addon — Continuous security validation

```bash
aiwg use sdlc    # security addon is included
```

Security gates run at key points:

```bash
/security-gate                    # Manual gate check
/flow-security-review-cycle       # Full review with multi-agent analysis
```

The `security-sentinel` behavior can run on file saves or before deploys when
behaviors are enabled and configured for the provider.

---

## Context Curator — Focus agent attention

Filters context to remove distractors before task execution. The Context Curator pre-reads available artifacts and removes irrelevant content before passing context to working agents.

This addresses a common failure pattern: when irrelevant context is present,
models sometimes anchor on it instead of the actual task. The curator helps
remove that noise before work starts.

Particularly useful in large SDLC projects where `.aiwg/` has accumulated many artifacts and you want an agent focused on a specific phase.

---

## Auto Memory — Persistent agent memory

```bash
aiwg use auto-memory
```

Agents can accumulate memory across sessions: approaches that worked, user
corrections, and project-specific conventions. Use it when repeated context is
slowing down normal work.

Memory is organized by type: user preferences, project state, feedback on past work, and references to external systems. Old memories get updated when they're no longer accurate.

---

## Semantic Memory Kernel — Shared artifact operations

```bash
aiwg use semantic-memory   # core addon, auto-installed
```

Core addon used by memory-aware frameworks. It factors common semantic memory
operations — ingest, lint, cross-reference maintenance, contradiction
detection, event logging — out of individual frameworks and into a shared
kernel. Frameworks or addons that declare a `memory.topology` contract in
their `manifest.json` can use these shared capabilities.

Five skills ship:

- **`memory-ingest`** reads a source (file, directory, URL) and writes summarized pages, cross-references, and index entries per the consumer's topology declaration
- **`memory-lint`** runs 8 health checks — broken mentions, orphan pages, stale claims, missing cross-refs, index drift, log integrity, provenance coverage, domain-specific rules
- **`memory-query-capture`** turns a valuable query response into a durable page so explorations compound over time
- **`memory-log-append`** writes structured JSON Lines events to a consumer's `.log.jsonl`
- **`memory-log-render`** generates a greppable Markdown view from the JSONL stream

You don't invoke these directly most of the time — five existing skills (`induct-research`, `intake-from-codebase`, `workspace-health`, `corpus-health`, `cleanup-audit`) delegate to the kernel under the hood while keeping their public names.

---

## LLM Wiki — Obsidian-native knowledge base

```bash
aiwg use llm-wiki
# interactive prompt picks one of: book-companion | personal | research-deep-dive | business-team | generic
```

A thin topology on top of the semantic memory kernel that ships five page-template profiles. Cross-references use `[[wikilink]]` style — directly consumable by Obsidian's graph view, Dataview queries, and Marp slide rendering.

Use it for domains that do not fit a packaged framework: book companions,
personal knowledge bases, research deep-dives, and team wikis. Pick a profile,
ingest sources, then review the generated pages and cross-references.

Docs on Obsidian integration (Web Clipper, Graph View, Dataview patterns, hotkeys) ship with the addon.

---

## Guided Implementation — Structured feature delivery

For complex features that need to be broken down carefully before implementation:

```bash
/flow-guided-implementation "Add OAuth2 to the API"
```

Breaks the implementation into phases, validates each phase before proceeding, and produces a construction-ready brief. Designed for features where jumping straight to code without planning tends to produce incomplete or architecturally wrong results.

---

## Network Analysis — Governed saved-capture evidence

```bash
aiwg use network-analysis --provider <provider>
```

Use Network Analysis for an authorized saved PCAP or PCAPNG. It runs bounded,
metadata-first TShark recipes and returns digest-bound evidence with frame or
stream locators. Optional Termshark review stays local and requires a separate
operator action.

Wireshark/TShark, Capinfos, and Termshark are third-party programs and are not
bundled. The addon never starts live capture, changes privileges, scans hosts,
or uploads payload. Give the agent the capture authority, purpose, expected
traffic, retention policy, and question before analysis.

---

## Enabling Addons

Complete setup is the default route for new users. These commands remain useful
when you intentionally want a targeted addon or framework:

```bash
aiwg use ralph              # Al iterative loops
aiwg use rlm                # Recursive language models
aiwg use writing            # Voice framework + writing quality
aiwg use all                # Complete supported AIWG surface for this project
```

Individual `aiwg use <addon>` calls remain valid for targeted deployments.
Use [Install, Connect, and Verify](install-connect-verify.md) when you are not
sure which setup route applies.

Or install specific addons:

```bash
aiwg use sdlc               # Includes security, testing quality, guided implementation
```

List what's installed:

```bash
aiwg list
```

Success means the addon is discoverable in the current provider session and
you have one output to review: a loop report, source plan, quality report,
memory page, or other artifact tied to the task you chose.
