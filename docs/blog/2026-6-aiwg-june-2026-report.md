---
title: "AIWG — June 2026 Report"
slug: "2026-6-aiwg-june-2026-report"
date: "2026-06-30"
project: "aiwg"
type: report
tags: [report, "2026-06", "aiwg"]
summary: "A new dashboard to watch and steer your AI agents, search that finds the right tool from plain words, support for more AI tools, and leaner startup context that keeps agents reliable."
hero: "https://docs.aiwg.io/assets/blog/2026-6-aiwg-2026-6-0.png"
reading_time: 9
status: "published"
canonical: "https://aiwg.io/blog/2026-6-aiwg-june-2026-report"
pillar: "1 report"
audience: "AIWG users and evaluators who want the June 2026 release summary"
aiwg_refs: ["@aiwg/cockpit", "OpenHuman provider", "aiwg discover", "aiwg show rule", "aiwg doctor", "RULES-ONDEMAND.md"]
---

# AIWG — June 2026

*AIWG is a toolkit that helps AI coding agents work in a clear, reliable way. It gives them skills, rules, and shared memory so they make fewer mistakes and stay easy to follow.*

## TL;DR

June was a building month. The headline is **Cockpit** — a new opt-in dashboard where you can watch your AI agents work and start or stop them in one place. Search got much better: you can now find the right tool by typing what you want in plain words. AIWG now works on more AI coding apps, including a new one called OpenHuman. And agents now start with a short summary of what's available and pull the full details only when needed — so they use far less space and stay reliable. Late in the month, the rule system got the same treatment: only the must-have rules load at startup, and the rest stay one command away. Updates shipped to npm steadily through the month.

## By the numbers

| What's public | Value |
|---|---|
| Published packages | `aiwg` · `@aiwg/cockpit` (opt-in) — on npm |
| New this month | `@aiwg/cockpit` (the agent dashboard) · OpenHuman support · tiered rules |
| Key capabilities | watch & steer agents · plain-words search · lean startup context · works across many AI tools |
| Docs | docs.aiwg.io |
| Source | github.com/jmagly/aiwg |

## Highlights

**1. Cockpit: a dashboard for your agents.**
What it is: a screen that shows the AI agents you have running, and lets you start, watch, and stop their work. It ships as an opt-in extra (`@aiwg/cockpit`), so the main toolkit stays small.
How you'd use it: open Cockpit, pick how you want the agent set up, start a session, and watch it work in a live terminal. When it's done, end it from the same screen.
Why it helps: agents often run in the background where you can't see them. Now you can watch what they do and step in when you need to, all in one place.

**2. Search that understands plain words.**
What it is: a better way to find the right skill or tool, even when you don't know its exact name.
How you'd use it: type what you're trying to do, like "review my code for security problems." AIWG looks several ways at once and shows you the best matches.
Why it helps: you stop hunting through long lists and get to work faster.

**3. Works on more AI tools.**
What it is: AIWG now sets itself up cleanly on more AI coding apps, including a new one called OpenHuman, plus Cursor, Warp, Codex, and others.
How you'd use it: run one setup command, and AIWG puts its skills and rules in the right spot for that app.
Why it helps: you can move between tools and keep the same helpers and habits. You don't start over each time.

**4. A lighter start that keeps agents reliable.**
What it is: at the start of a task, an agent now loads only a short summary of what's available. It pulls the full details for a tool only when it actually needs them. By the end of the month, rules were split the same way: the must-have rules load first, and the rest stay available on demand.
How you'd use it: nothing to do — it happens on its own when you run a task.
Why it helps: the agent saves a lot of room and doesn't get crowded out. That means steadier, more reliable answers, even on big projects.

**5. Turn talks and videos into research notes.**
What it is: AIWG can now take a talk, lecture, podcast, or video and turn it into a clean research note you can search and cite — with the exact spot in the recording.
How you'd use it: hand AIWG a recording, and it makes a note with a quote and a timestamp you can point to.
Why it helps: spoken sources become as easy to use and trust as written ones.

**6. Safer setup that never touches your own files.**
What it is: setting up or removing AIWG now stays in its own lane. It only cleans up the files AIWG itself manages.
How you'd use it: run setup or removal as usual — your own files are left alone.
Why it helps: you can add or remove AIWG without worry, and removal no longer crashes on odd input.

## Features shipped

**The Cockpit dashboard.** This was the month's biggest push. You can now see a live board of your running agents, start a session and choose its setup, and end a session from the screen. There is an "approval inbox" so you can okay an agent's next step. The board is built from the real jobs agents are running, not a stand-in. The "start a session" button is now a single clear picker: choose the machine, the runtime, the loadout, and the safety posture, then attach. The live view is a true terminal, so colors and full-screen tools show up right instead of as raw codes. Late-month updates added a read-only observe view and a persistent sessions-and-instances sidebar. One command brings the whole thing up. Cockpit connects to the real place agents run — the "sandbox," a safe, walled-off space where an agent can work without touching the rest of your computer.

**Finding things.** Besides the plain-words search above, AIWG can now search the full text of your project's notes and rank results by what fits best. It can also search by meaning, so close ideas turn up even when the words differ. And it keeps a clean, checkable list of what's available, so nothing goes missing quietly.

**A research and media helper.** AIWG got much better at turning documents into organized, searchable knowledge. It can read scanned pages, link related notes together, check that sources are trustworthy, and keep citations tidy. New this month: it can also take time-based media — talks, lectures, podcasts, and videos — and turn them into research notes with exact timestamps. The media collector hands its results straight to the research helper, so a recording flows into your notes without a manual step.

**Running many agents at once.** Releases and other routines now run as saved, repeatable workflows you can find and run on demand. A "mission" runner can coordinate work across more than one AI tool at the same time — for example, one agent handing tasks to another that runs on a different app.

**A safety check for outside code.** Projects pull in code written by other people. AIWG added a tool that checks that outside code for known problems, so you find trouble early.

## Fixes

Most fixes made Cockpit steadier: the live terminal now shows up correctly, sessions recover and reconnect, the home screen keeps working against a real setup instead of going blank, and clashes over network ports are avoided. Picking a tool now hands the agent the plain tool name, so it resolves the right thing. A few important safety fixes make sure setup **never deletes your own files** — it only cleans up the files AIWG itself manages — and removing AIWG no longer crashes on unexpected input. Search also got better at understanding full-sentence questions, including very short ones.

## Performance & reliability

The big reliability win was the lighter start: an agent now loads a short summary of what's available and fetches full details on demand, so it stays well within the space each AI app allows. By the end of the month, a full Claude startup dropped from about 193K tokens to about 110K by loading only the highest-priority rules at startup and leaving the rest on demand. A size guard keeps that startup summary small on purpose, and `aiwg doctor` now reports the startup-context budget directly. The release process is steadier too — updates keep flowing even if one step has a hiccup. Tests were cleaned up so they don't trip over shared temporary folders.

## Breaking changes & migrations

Two changes may need action if you used the old way:

- The **"address issues" helper is now a skill, not a command.** If you called the old command, switch to the skill.
- **Routines moved to a simpler, saved-workflow format.** If you maintained old workflow definitions, update them to the new style.

Cursor users: rules now save in Cursor's own format, which happens on its own the next time you refresh. Nothing else changed in a way that breaks older setups.

## Releases

Updates shipped steadily through the month — small and frequent, so fixes reach you quickly. Each one is public on npm.

- **2026.6.0** (Jun 12) — adds the new **OpenHuman** AI tool; search now understands plain questions; releases and the research helper become repeatable, smarter tools.
- **2026.6.1** (Jun 15) — first look at **Cockpit** (early build); leaner agents and more accurate docs.
- **2026.6.2** (Jun 18) — stronger checks that Cockpit really works inside a live sandbox.
- **2026.6.3** (Jun 20) — Cockpit becomes usable: a real running board, a one-click "start a session," and a true live terminal.
- **2026.6.4** (Jun 21) — safer setup: removing AIWG can't crash or delete your files; project add-ons now install on more AI tools.
- **2026.6.5** (Jun 21) — steadier releases so updates publish cleanly.
- **2026.6.6** (Jun 21) — more release fixes; re-runs no longer fail.
- **2026.6.7** (Jun 21) — polished the Cockpit package page and its publishing checks.
- **2026.6.8** (Jun 21) — more Cockpit package-page polish.
- **2026.6.9** (Jun 22) — media help for any kind of collection, not just music; turn talks and videos into research notes.
- **2026.6.10** (Jun 22) — a clean re-cut of the media and research work with fixed doc links (prefer this over 2026.6.9).
- **2026.6.11** (Jun 23) — the lighter start: agents load a short summary first and pull full details on demand.
- **2026.6.12** (Jun 28) — Cockpit can now run a live session inside a virtual machine, from start to finish.
- **2026.6.13** (Jun 30) — tiered rules keep startup context under budget; `aiwg doctor` reports the budget; Cockpit adds observe mode and steadier session navigation.

## Dependencies & security

AIWG added a tool that checks the outside code your project depends on for known problems. Most of the month's package changes were for the new Cockpit app, which is built from several parts. The Cockpit package now carries proper source details so its published builds can be verified. No security alerts needed fixing this month.

## Docs & developer experience

Starting Cockpit is now a one-command job, instead of fiddly manual setup. The docs site at **docs.aiwg.io** got a "Docs Map" — a picture of how the pieces connect that you can click through. The user-facing links and version stamp now point at the public home, **github.com/jmagly/aiwg**, instead of an internal address. A quick-reference helper makes it easier to find features you didn't know were there. On-demand rule indexes now show where to fetch lower-priority rules when you need the full detail.

## Tests & CI

The team added real end-to-end tests for Cockpit — actually starting a session and checking it works, on more than one kind of machine, including a virtual machine over a private link to the sandbox. The automatic checks that run before each release were made steadier, and new checks keep both the agent startup summary and the full Claude startup context from growing too large.

## Cross-project impact

- **Cockpit** now talks to the **sandbox** (the safe space agents run in), including live sessions inside a virtual machine, so the two improve together.
- Cockpit's tool-picker is powered by **fortemi-react** (the in-browser version of the memory service).
- The media collector now hands recordings straight to the **research** helper, so the two work as one pipeline.
- AIWG's own docs publish through **Pagenary** (the publishing tool), so the whole family uses its own parts.
- Tiered rule loading improves startup behavior across providers while keeping full rules available through `aiwg show rule`.
- Setup got better on more AI apps, so your experience is more the same wherever you work.

## Known issues & open threads

- A **chat-style view** of an agent (next to the raw terminal) is designed but not built yet.
- Signing in to one AI tool inside a managed sandbox session still needs a manual step; making that automatic is a follow-up.
- On the new OpenHuman tool, AIWG's skills install and load correctly, but OpenHuman's own "installed" tab doesn't list them yet — an upstream limit on their side, not an AIWG setup problem.

## What's next

More Cockpit polish, including the chat-style agent view and clearer tabs. More live-session testing across regular machines, containers, and virtual machines. More context-budget checks as the rule and skill catalog grows. And more of the research and media work. Small, steady updates will keep coming.

## Appendix

- **Published packages:** `aiwg` · `@aiwg/cockpit` (new this month, opt-in) — on npm.
- **Releases:** 2026.6.0 through 2026.6.13, published to npm through June.
- **Source / docs:** github.com/jmagly/aiwg · docs.aiwg.io · window: all of June 2026.
- **Tracking:** part of the June update cycle.
