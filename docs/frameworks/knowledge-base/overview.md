# Knowledge Base Framework — Overview

## The Problem with Domain-Specific Frameworks

AIWG's existing frameworks — `research-complete`, `media-curator`, `sdlc-complete` — are purpose-built for specific workflows. They assume you know upfront what kind of work you are doing and impose structure to match: GRADE scoring, citation graphs, phase gates, provenance tracking.

That is correct for formal research or software projects. It is wrong for open-ended knowledge accumulation.

When you are doing a competitive analysis of AI tools, working through a backlog of books, or building a personal reference on a hobby domain, you do not know the shape of the knowledge before you have it. Imposing a taxonomy too early creates friction that makes the system not worth maintaining.

## The LLM Wiki Pattern

The knowledge base framework treats the AI as a wiki editor rather than a research assistant. The difference is posture:

- A research assistant brings methodological rigor: sources must be cited, claims must be graded, uncertainty must be quantified.
- A wiki editor brings coverage and cross-referencing: capture what is known, link related things, flag what is incomplete, update when new information arrives.

The wiki pattern scales from a single ingested article to thousands of pages because the structure is content-addressed (each page is its own file) and the health check makes structural maintenance automatic.

## Emergent Taxonomy

The five page types cover most knowledge structures without imposing a hierarchy:

**Entities** are discrete, nameable things that persist through time. They anchor the knowledge base. A person, a company, a tool, a place — all entities. Entity pages answer "what is this thing and how does it relate to other things?"

**Concepts** are ideas, patterns, techniques, or frameworks. They are not things in the world; they are abstractions. Concept pages answer "what does this mean and when does it apply?"

**Sources** are the evidence layer. Every claim in the knowledge base should trace back to one or more sources. Source pages close the loop between "I learned this somewhere" and "here is exactly what that somewhere said."

**Comparisons** are decision aids. When you need to choose between two or more options — tools, approaches, vendors — a comparison page externalizes the analysis so you do not repeat it.

**Syntheses** are the highest-value output. They represent a claim that emerges from combining multiple sources, entities, and concepts — something you could not know from any single page. Good synthesis notes are the reason to maintain a knowledge base at all.

## Relationship to research-complete

Use `research-complete` when:
- You are conducting formal literature review
- Citations must be citable in documents others will read
- Source quality must be graded (GRADE A–D)
- You need a provenance record for compliance or auditability

Use `knowledge-base` when:
- You are accumulating personal or team knowledge without publication intent
- The domain is undefined at the start
- You want to capture and cross-reference without overhead
- Speed of capture matters more than citation precision

The two frameworks are complementary. A research project can export its literature notes into the knowledge base as source summaries. A knowledge base that grows into something publication-worthy can be formalized in `research-complete`.

## Maintenance Model

A knowledge base that is never audited becomes unreliable. The `kb-health` skill handles routine maintenance:

- **Orphan pages** accumulate when entities are created during ingest but never linked from other pages. The health check surfaces them so you can integrate or delete them.
- **Broken links** occur when pages are renamed or deleted. The health check catches them before they become invisible errors.
- **Stale pages** are pages that have not been updated since a more recent source was added. They are flagged as advisory — sometimes a page is correct and needs no update.
- **The index** is regenerated automatically on every health check run so navigation always reflects current contents.

The recommended maintenance cadence is: run `kb-health` after every batch ingest session and before any synthesis work.

## Anti-Patterns

**Over-structuring early.** Do not create a deep folder hierarchy before you have content to fill it. Start flat — all entities in `entities/`, all concepts in `concepts/` — and create subdirectories only when a directory has more than ~20 pages.

**Capturing without connecting.** A source summary with no connections to entity or concept pages is a dead end. The `kb-ingest` skill always creates connections; when adding pages manually, always populate the Relationships or Connected Pages section.

**Synthesis as summary.** A synthesis note should make a claim that is not in any single source. If it just restates what one source says, it belongs in that source's summary, not a synthesis note.

**Letting orphans accumulate.** Run `kb-health` regularly. An orphan page is a page that has no relationship to the rest of the knowledge base — it has no value until it is linked.
