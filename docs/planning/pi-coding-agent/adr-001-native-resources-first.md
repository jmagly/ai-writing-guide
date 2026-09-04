# ADR-001: Integrate Pi through native resources before extensions

Status: proposed
Date: 2026-09-03

## Context

AIWG needs a Pi coding-agent provider. Pi is intentionally a small harness: it natively loads context files, Agent Skills, prompt templates, themes, and TypeScript extensions, while omitting built-in MCP, subagents, plan mode, permission popups, and to-do management.

An extension could emulate more of AIWG's provider surface, but project extensions execute arbitrary code with the user's permissions and are trust-gated. Pi already supports the two most important AIWG assets without executable integration code: `.agents/skills` and `AGENTS.md`. It also has native prompt templates suitable for static AIWG commands.

## Decision

The first Pi provider release will use native, declarative resources:

- bootstrap context through `AGENTS.md`;
- deploy skills to `.agents/skills`;
- deploy translated commands to `.pi/prompts`;
- project personas as role skills;
- aggregate rules in the existing context graph;
- declare MCP, native subagents, and hooks unsupported or deferred.

No `.pi/settings.json` or executable extension will be generated in the initial release.

## Alternatives considered

### Treat Pi as a Codex alias

Rejected. Although both scan `AGENTS.md` and `.agents/skills`, their command locations, extension models, trust behavior, sessions, automation protocols, and provider capabilities differ.

### Ship an AIWG Pi package first

Deferred. A package can bundle skills, prompts, and extensions, but package installation changes Pi settings and may install dependencies. AIWG's existing deployment lifecycle and receipts should remain authoritative before introducing a second package manager.

### Build a TypeScript extension first

Deferred. Extensions enable the richest integration but enlarge the executable trust boundary and create an API compatibility obligation. Declarative projection delivers useful support with lower risk.

### Use only `.pi/skills`

Rejected. `.agents/skills` is a native Pi discovery location and AIWG's existing cross-provider canonical project path. Duplicating skills creates collision and drift risk.

## Consequences

Positive:

- useful integration requires no executable provider plugin;
- the canonical cross-provider skill deployment is reused;
- trust and uninstall behavior stay auditable through AIWG receipts;
- the first implementation avoids unstable experimental Pi APIs.

Negative:

- multi-agent flows degrade to single-context role execution;
- provider-specific runtime UI and event capture are unavailable initially;
- MCP-backed capabilities require CLI alternatives or user-installed extensions;
- prompt translation needs collision and unsupported-metadata diagnostics.

## Review gate

Accept this ADR when conformance proves native discovery and clean removal for context, skills, and prompts, and documentation clearly distinguishes Pi the harness from Pi's model providers.
