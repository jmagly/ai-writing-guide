---
title: "Your agent should search the toolbox before pretending it knows every tool"
slug: "2026-07-aiwg-discovery-first"
date: "2026-07-21"
publish_at: ""
summary: "Discovery-first agent tooling turns a giant prompt menu into a debuggable routing layer: ask by intent, inspect the match, then run the right capability."
hero: "https://docs.aiwg.io/assets/blog/2026-07-aiwg-discovery-first-hero.png"
reading_time: 6
status: "scheduled"
canonical: "https://aiwg.io/blog/2026-07-aiwg-discovery-first"
tags: ["ai-coding", "developer-tools", "discovery"]
pillar: "2 how/process"
audience: "operators and teams maintaining growing agent capability catalogs"
aiwg_refs: ["aiwg discover", "aiwg show", "Discover-First Protocol"]
---

# Your agent should search the toolbox before pretending it knows every tool

![Your agent should search the toolbox before pretending it knows every tool](/assets/blog/2026-07-aiwg-discovery-first-hero.png)

*Hero image: AI-generated with ChatGPT from a brand-specified prompt; no product screenshot, live UI state, or rendered text is represented as factual evidence.*

Agent systems often get worse in a very specific way as they grow.

They begin with a few useful prompts. Then come agents, rules, skills, workflows, templates, and extensions. Eventually someone tries to make the whole system “easy to use” by loading a catalog of everything into every session.

It feels organized because all the names are visible.

It is not organized. It is an expensive memory test.

The useful question is not “can the agent repeat our catalog?” It is: **can the system find the right capability from the way a person naturally describes the work?**


![Feature visual for Your agent should search the toolbox before pretending it knows every tool](/assets/blog/2026-07-aiwg-discovery-first-cli.svg)

*Representative CLI routing: the important behavior is not memorizing every command name; it is asking for the capability and inspecting the match before acting.*

## Try the no-name test

Think of one capability you know exists. Do not use its internal name.

Search for the job:

```bash
aiwg discover "fact-check launch copy"
```

Try “prepare a release,” “write a social thread,” “audit incident evidence,” or the phrase a new teammate would actually say.

Now inspect the result. Did the exact capability appear? Did a generic neighbor outrank it? Did nothing useful surface?

If the system only works when you already know the artifact name, it does not have discovery. It has autocomplete for insiders.

## Long lists confuse visibility with access

A command catalog solves a small problem: it lets someone scan what exists. It does not solve routing.

Loaded into every session, a large catalog creates new problems. It consumes context before work begins. It becomes stale as the repository changes. Examples receive more attention than metadata. Near-match names encourage the agent to improvise instead of checking the source.

Most importantly, the failure is opaque. When the agent selects the wrong item from memory, the team cannot easily tell whether the name was missing, the description was weak, or the model simply latched onto a nearby example.

A discovery result is different. It exposes candidates, ranking, capability descriptions, and source identifiers. The route can be inspected.

## Metadata is the user interface

In a large agentic system, metadata is not decoration around the real instructions. It is how the real instructions become reachable.

A useful capability needs:

- a plain description of the job it performs;
- trigger phrases in operator language;
- aliases for different communities;
- a declared artifact type;
- relationships to supporting templates, rules, or agents;
- enough source context to explain when it applies and when it should stop.

Internal names still matter for maintainers. They give artifacts stable identities. But operators should not have to recite implementation vocabulary to get work done.

The public interface is intent.

## Discovery makes failure debuggable

Suppose someone asks for a launch-copy fact check and the system routes to a general copy editor instead of claim verification.

Without discovery, the explanation is often “the agent chose poorly.”

With discovery, the team can reproduce the query, inspect the ranking, and ask concrete questions:

- Does the verification skill mention “fact-check launch copy”?
- Is the artifact in the active index?
- Did a generic description overmatch?
- Is the query phrased differently by the target audience?
- Does the selected quick reference point to the right capability domain?

Now the failure can improve the system. Add the missing trigger. Clarify the capability boundary. Repair the index. Add a regression query.

That is a trust feature. Serious agent systems need failures that produce work, not mystique.

## Progressive disclosure keeps context useful

Discovery also enables a healthier context architecture.

Keep a small set of quick references active. They orient the agent to major domains and teach it how to search. Leave the full capability bodies at rest. When a request arrives, search the index, surface the best match, then load the source needed for the task.

This is progressive disclosure for agent instructions: enough context to route, followed by the exact context needed to act.

The benefit is not merely fewer tokens. The agent has less irrelevant instruction competing for attention. The operator sees which capability was chosen. The source can evolve without expanding every startup prompt.

AIWG uses this pattern through `aiwg discover` and `aiwg show`. Discovery searches across operational artifacts; show retrieves the selected source. The user remains in ordinary conversation while the agent performs the lookup.

## Teams need shared routing, not private prompt menus

When every operator maintains a personal prompt collection, team behavior fragments.

One person remembers the security gate. Another uses an older release process. A third drafts public copy without the proof workflow because they never learned its name.

Shared discovery changes the question from “which prompt did you use?” to:

- What capability did the request route to?
- Was its source current?
- Did it include the expected gates?
- Which phrase failed to find it?
- What metadata change would make the route reliable next time?

That creates an improvement loop the whole team can participate in.

## Use the failed-query rule

Pick one recurring task and search for it as a newcomer would.

If the correct capability ranks, inspect it and continue.

If it does not rank, do not paste a larger command list into the project instructions. Record three things:

1. the exact phrase you used;
2. the capability you expected;
3. the irrelevant result that appeared instead.

That is enough to begin a useful metadata or ranking fix.

The scalable agent interface is not “remember more names.” It is “find the right source from the operator’s intent, and make the route inspectable.”

**Next action:** try one natural-language query with AIWG’s [official discovery interface](https://docs.aiwg.io/pages/cli-reference.html). If the right result appears, use it. If it does not, preserve the failed phrase and report it.

## Tools & transparency

This article was drafted with AI assistance, then edited for voice, claims, and publication fit. Product behavior should be verified against the AIWG repository and docs on the day this post is promoted. The hero image is AI-generated. The supporting CLI visual is an illustrative reconstruction of the workflow shape, not a captured proof of one exact terminal session.
