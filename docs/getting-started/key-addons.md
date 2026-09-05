# Key Addons

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Addons extend AIWG's core capabilities. They're optional — deploy the ones that match your workflow. Some are essential for serious use; others are specialized for specific contexts.

---

## Al — Iterative task completion

Al is the most-used addon in AIWG. It transforms single-pass AI execution into iterative completion loops that keep running until verifiable criteria are met.

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

You give Al a task and a completion criterion. It executes, checks whether the criterion is met, learns from what happened, and tries again. It doesn't stop because it ran out of ideas — it stops when the work is actually done.

### Common uses

Fix failing tests:
```
/ralph "Fix all failing tests" --completion "npm test passes"
```

Resolve security findings:
```
/ralph "Fix the security issues from the audit" --completion "security-gate passes"
```

Write until quality threshold is met:
```
/ralph "Write the API documentation" --completion "writing-validator score >= 0.85"
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

Most AI-assisted work fails at the verification step — you generate something, it seems right, it turns out not to be. Al makes verification explicit and automatic. The loop doesn't complete until the criterion is actually satisfied, not just approximated.

---

## RLM — Recursive Language Models

RLM enables agents to work with codebases and document sets too large to fit in a single context window. Instead of loading everything at once, it treats large contexts as an external environment that the agent selectively accesses.

```bash
aiwg use rlm
```

### When you need it

- Analyzing a codebase with 500+ files
- Processing a research corpus of 200+ papers
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

RLM decomposes the task recursively — spawning sub-agents to handle portions of the context, then synthesizing their results. Up to 3x cheaper than loading full context because agents only read what's relevant.

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

Check content for AI-pattern language:
```
/writing-validator path/to/content.md
```

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

The `security-sentinel` behavior (if you have behaviors enabled) runs automatically on file saves and before deploys — no manual invocation needed.

---

## Context Curator — Focus agent attention

Filters context to remove distractors before task execution. The Context Curator pre-reads available artifacts and removes irrelevant content before passing context to working agents.

This addresses a specific LLM failure pattern (Archetype 3): when irrelevant context is present, models sometimes anchor on it instead of the actual task. The curator removes that noise automatically.

Particularly useful in large SDLC projects where `.aiwg/` has accumulated many artifacts and you want an agent focused on a specific phase.

---

## Auto Memory — Persistent agent memory

```bash
aiwg use auto-memory
```

Agents accumulate memory across sessions — what approaches worked, what the user corrected, project-specific conventions. Instead of re-explaining context at the start of every session, the agent recalls what it already knows about how you work.

Memory is organized by type: user preferences, project state, feedback on past work, and references to external systems. Old memories get updated when they're no longer accurate.

---

## Semantic Memory Kernel — Shared artifact operations

```bash
aiwg use semantic-memory   # core addon, auto-installed
```

Core addon (installed automatically on every project) that factors common semantic memory operations — ingest, lint, cross-reference maintenance, contradiction detection, event logging — out of individual frameworks and into a shared kernel. Any framework or addon that declares a `memory.topology` contract in its `manifest.json` gets these capabilities for free.

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

Use it for domains that don't fit a pre-packaged framework: book companions, personal knowledge bases, research deep-dives, team wikis. Install once, pick a profile, start ingesting sources. The kernel handles contradiction detection, cross-reference maintenance, and log rendering.

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

## Installing addons

```bash
aiwg use ralph              # Al iterative loops
aiwg use rlm                # Recursive language models
aiwg use writing            # Voice framework + writing quality
aiwg use all                # All frameworks and addons (auto-discovers all addons except devOnly ones)
```

Individual `aiwg use <addon>` calls remain valid for targeted installs. `aiwg use all` auto-discovers every addon in `agentic/code/addons/` and deploys them all, skipping only those marked `devOnly` in their manifest (currently only `aiwg-dev`).

Or install specific addons:

```bash
aiwg use sdlc               # Includes security, testing quality, guided implementation
```

List what's installed:

```bash
aiwg list
```
