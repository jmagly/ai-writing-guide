---
namespace: aiwg
name: steward-quickref
platforms: [all]
kernel: true
description: AUTO-INVOKE for steward feature-domain routing — authoring an expansion (extension/addon/framework), creating or selecting a persona/SOUL identity, or scaffolding a project. Thin discover anchors for the three domains the framework quickrefs don't own.
triggers:
  - author an expansion
  - create a persona
  - select a persona
  - scaffold a project
  - steward routing
  - which aiwg feature do i use
  - expansion persona or project
---

# Steward Quickref

Thin routing anchor for the three cross-cutting **feature domains** that no
single framework quickref owns: **expansion authoring**, **persona/SOUL
identity**, and **project creation**. This file holds *guidance + anchoring
phrases only* — it never inlines skill or agent bodies. The capability index
does the heavy lifting: each row gives the `aiwg discover` phrase that ranks
the owning capability top-3 (the four discover facets fuse the result —
see `src/artifacts/discover-facets.ts`).

> **Always discover, then show.** These phrases are the entry points; fetch the
> selected artifact with `aiwg show <type> <name>`. Do not browse the
> filesystem (`skill-discovery` rule).

## Steward Tiering

`aiwg-steward.md` is the Tier-1 dispatch core. This quickref is Tier 2. When
the steward needs detailed lookup tables, route to Tier 3 with
`aiwg discover "aiwg-steward routing reference"` or
`aiwg discover "aiwg-steward worked examples"`. If a route is ambiguous, ask
one clarifying question; if a target is stale or missing, file a correction
issue through the AIWG issue-filing flow with the broken target and observed
command output.

## Domain 1 — Expansion authoring (extension / addon / framework)

"How do I *build* an AIWG expansion?" — extensions, addons, and frameworks.

| You want to… | Discover phrase | Owning capability |
|---|---|---|
| Author an extension | `aiwg discover "author an expansion"` | `scaffold-extension` |
| Create an addon | `aiwg discover "create an addon"` | `scaffold-addon` |
| Build a framework | `aiwg discover "scaffold a framework"` | `scaffold-framework` |
| Pilot then graduate a project-local bundle | `aiwg discover "project-local bundle"` | `new-bundle`, `promote` |
| Package a standalone/community plugin repository | `aiwg discover "standalone plugin repository"` | `package-plugin` |

## Domain 2 — Persona / SOUL identity (author **and** select)

"How do I *make* or *choose* an identity/voice?" Personas live at
`agentic/code/agents/personas/`; SOUL profiles are managed by the `soul-*`
skills.

| You want to… | Discover phrase | Owning capability |
|---|---|---|
| Create / author a persona (SOUL) | `aiwg discover "create a persona"` | `soul-create` |
| Select / switch a persona identity | `aiwg discover "select a persona"` | persona agents + `soul-apply` |
| See the persona roster | `aiwg discover "persona"` | `agentic/code/agents/personas/*` |
| Manage SOUL lifecycle (enable/disable/blend) | `aiwg discover "soul"` | `soul-enable`, `soul-disable`, `soul-blend` |

> Runtime persona *selection UX* (catalog-pick) is an open research area — see
> spike #1625; for now, discover the persona then activate via the SOUL skills.

## Domain 3 — Project creation (`aiwg new` + project-local)

"How do I *start* an AIWG project?"

| You want to… | Discover phrase | Owning capability |
|---|---|---|
| Scaffold a new project | `aiwg discover "scaffold a project"` | `new-project` |
| Create a project-local bundle | `aiwg discover "project-local bundle"` | `new-bundle` |

## Domain 4 — Provider capability (native vs emulated)

"Does my provider support X natively, or does AIWG emulate it?" Route through
the steward, which reads `capability-matrix.yaml`.

| You want to… | Discover phrase / route |
|---|---|
| Check provider support for a capability | `aiwg discover "provider capability"` → `steward` |

## Steward routing protocol

When a request maps to one of these domains:

1. **Volunteer the affordance** (Norman signifier): if a user is working near a
   domain but hasn't found it, surface it — "you can also author expansions,
   create/select a persona, or scaffold a project; want me to discover one?"
2. **Discover, don't dead-end.** Run the domain's `aiwg discover` phrase.
3. **Re-query on low confidence.** If the first pass is weak, broaden the
   phrase or try an adjacent domain phrase before concluding "not found" — the
   `skill-discovery` rule forbids decline-without-search.
4. **Show the selection.** `aiwg show <type> <name>` for the chosen capability.
