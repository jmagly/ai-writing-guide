# AIWG v2026.5.11 Launch Campaign

Status: Copy ready for operator approval — image generation + posting pending browser bridge (issue #1482)
Release: v2026.5.11
Date: 2026-05-25
Owner: roctibot / maintainer review

## Campaign Goal

Drive awareness and qualified installs for AIWG v2026.5.11 by positioning the release as a practical upgrade for people using AI coding agents in real projects: better Codex/provider detection, clearer local issue workflows, first-class media transcript prep, and a stronger release/documentation gate.

## Source Links

Use these as canonical campaign destinations.

| Destination | URL | Notes |
| --- | --- | --- |
| Main site | https://aiwg.io | Primary CTA for general audiences |
| Docs | https://docs.aiwg.io | Learning CTA |
| Start Here | https://docs.aiwg.io/getting-started/start-here.html | Beginner CTA |
| Release | https://github.com/jmagly/aiwg/releases/tag/v2026.5.11 | Release notes |
| GitHub mirror | https://github.com/jmagly/aiwg | Social proof / public repo |
| npm | https://www.npmjs.com/package/aiwg/v/2026.5.11 | Install proof |
| Discord | https://discord.gg/BuAusFMxdA | Community CTA |
| Telegram | https://t.me/+isN9TIm_4mlmZmEx | Community CTA |
| X/Twitter | https://x.com/AIWGio | Official X profile |
| Reddit | https://www.reddit.com/r/AIWG | Official subreddit |

## Positioning

Core message:

AIWG v2026.5.11 makes AI agent work more reliable in mixed-provider workspaces, easier to audit through local issue sync, and more useful for time-based media workflows.

Plain-language version:

If your AI coding setup has grown beyond one chat window, AIWG now does a better job recognizing the active provider, keeping issue state understandable, and preparing media transcripts for downstream review.

Developer version:

v2026.5.11 tightens Codex-aware provider detection, documents local issue import/export and sync paths, adds `transcribe-media` for timestamped sidecars, and routes release tags through the signed `tools/release/cut-tag.sh` gate.

## Audience

Primary:

- Developers using Claude Code, Codex, Cursor, Copilot, OpenCode, Warp, or mixed AI-agent workspaces.
- Solo maintainers and small teams who want agent workflows with repeatable docs, issues, and release gates.
- AI tooling builders who care about provenance, provider routing, and command surfaces that do not replace skill orchestration.

Secondary:

- Media/research users who need transcripts and timestamped review artifacts.
- Open-source maintainers evaluating AI-assisted release processes.

## Content Pillars

1. Provider reliability: Codex-aware runtime/process detection in mixed workspaces.
2. Local issue clarity: documented import/export and live sync paths.
3. Media workflow expansion: `transcribe-media` produces transcript sidecars for acquired audio/video.
4. Release trust: signed tag wrapper, changelog, announcement, broad doc-sync scope.
5. Community invitation: install, try the Start Here path, ask questions in Discord, Telegram, X, or r/AIWG.

## Channel Plan

| Channel | Role | CTA | Asset |
| --- | --- | --- | --- |
| X/Twitter | Hook + thread for broad discovery | Release, docs, Discord | 16:9 launch card |
| Discord | Community announcement with install command | Release, docs, ask for feedback | 16:9 launch card |
| Telegram | Short mobile-first release note | Release, install, community reply | 1:1 or 4:5 card |
| Reddit | Seed first community post and invite technical feedback | Release, GitHub, docs, Discord | Optional diagram/card |

## New-Channel Setup Sprint

X and Reddit are brand-new surfaces. Before the release post, complete enough setup that visitors know what AIWG is, where to start, and where to ask questions.

### X Profile

Display name:

```text
AIWG
```

Bio:

```text
Structured workflows for AI coding agents. Skills, providers, docs, issue sync, release gates, and practical orchestration for real projects.
```

Website:

```text
https://aiwg.io
```

Location:

```text
Open source
```

First follow targets:

- GitHub
- OpenAI Developers
- Anthropic
- Cursor
- Warp
- npm
- Open source / developer tooling accounts relevant to AIWG users

Pinned post candidate:

```text
AIWG is an open-source framework for making AI coding assistants more useful in real projects: provider-aware guidance, reusable skills, structured artifacts, issue workflows, and release gates.

Start here:
https://docs.aiwg.io/getting-started/start-here.html

Install:
npm install -g aiwg

GitHub:
https://github.com/jmagly/aiwg
```

### Reddit Community

Community description:

```text
AIWG is an open-source framework for structured AI coding assistant workflows: provider-aware guidance, reusable skills, documentation workflows, issue sync, release gates, and practical agent orchestration.
```

Welcome post title:

```text
Welcome to r/AIWG: structured workflows for AI coding agents
```

Welcome post body:

```text
Welcome to r/AIWG.

AIWG is an open-source framework for making AI coding assistants more useful in real projects. It focuses on structured workflows, provider-aware guidance, reusable skills, documentation artifacts, issue sync, and release gates.

Useful links:

- Site: https://aiwg.io
- Start Here: https://docs.aiwg.io/getting-started/start-here.html
- GitHub: https://github.com/jmagly/aiwg
- Latest release: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
- Discord: https://discord.gg/BuAusFMxdA
- Telegram: https://t.me/+isN9TIm_4mlmZmEx
- X: https://x.com/AIWGio

Good posts here:

- questions about installing or using AIWG
- provider-specific feedback from Codex, Claude Code, Cursor, Copilot, OpenCode, Warp, and related tools
- examples of workflows that helped or failed
- release feedback and bug reports
- ideas for skills, docs, and integrations

Please avoid posting secrets, private repository data, or customer information in screenshots or logs.
```

### First 48-Hour Posting Order

1. Set profile/community descriptions and links.
2. Publish Reddit welcome post and pin it if available.
3. Publish X pinned intro post.
4. Publish release thread on X with launch card.
5. Publish Discord and Telegram release posts.
6. Publish Reddit release post after the welcome post, framed as technical release notes and feedback request.
7. Reply to early comments with install/help links rather than repeating sales copy.

## X/Twitter Thread

### Tweet 1

AIWG v2026.5.11 is live.

This release tightens Codex/provider detection, documents local issue sync, adds media transcript prep, and strengthens the release-doc gate.

Install:
`npm install -g aiwg@2026.5.11`

Release:
https://github.com/jmagly/aiwg/releases/tag/v2026.5.11

### Tweet 2

Mixed AI-agent workspaces are normal now.

v2026.5.11 improves provider detection so Codex sessions are treated as Codex sessions even when Claude, Cursor, or other provider files coexist in the repo.

Less guessing. Better generated guidance.

### Tweet 3

Local issue workflows got clearer.

AIWG now has documented paths for issue import/export and live sync, using the project config as the source of truth for where issue state belongs.

Good for teams that want local work artifacts without losing tracker alignment.

### Tweet 4

Media-curator now has `transcribe-media`.

It records source metadata, media and transcript hashes, timestamped segments, optional speaker labels, and degraded plans when local transcription tooling is unavailable.

This is the first concrete bridge toward research-ready media artifacts.

### Tweet 5

The release process also got stricter.

Release tags now route through `tools/release/cut-tag.sh`, with lockstep version checks, changelog and announcement checks, and the release-signing key split preserved.

Signed release:
https://github.com/jmagly/aiwg/releases/tag/v2026.5.11

### Tweet 6

Try AIWG:

Site: https://aiwg.io
Start Here: https://docs.aiwg.io/getting-started/start-here.html
GitHub: https://github.com/jmagly/aiwg
X: https://x.com/AIWGio
Discord: https://discord.gg/BuAusFMxdA
Telegram: https://t.me/+isN9TIm_4mlmZmEx

What should we tighten next?

## Single X/Twitter Post

AIWG v2026.5.11 is live.

Highlights:
- Better Codex/provider detection
- Local issue import/export and sync docs
- `transcribe-media` for timestamped transcript sidecars
- Signed release wrapper and stronger doc gates

Install: `npm install -g aiwg@2026.5.11`
https://aiwg.io

## Discord Announcement

**AIWG v2026.5.11 is live**

This release is about making AI-agent work more predictable in real mixed-provider projects.

**Highlights**

- **Better provider detection**: a Codex session stays Codex-aware even in repos that also contain Claude, Cursor, or other provider files (prefers active runtime evidence over passive files).
- **Local-first issue management**: manage issues as plain files in your repo — no heavyweight issue server required; sync to a remote tracker on demand (only when you ask), with project config as the source of truth for where issue state lives.
- **Media transcript prep**: `transcribe-media` now creates timestamped transcript sidecars with hashes, source metadata, optional speaker labels, and degraded plans when local tooling is unavailable.
- **Release trust**: release tags now go through the signed `tools/release/cut-tag.sh` gate with version, changelog, announcement, and signing-key checks.

Install:

```bash
npm install -g aiwg@2026.5.11
```

Links:

- Site: https://aiwg.io
- Start Here: https://docs.aiwg.io/getting-started/start-here.html
- Release: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
- GitHub: https://github.com/jmagly/aiwg

**Help us spread the word** — we just launched on X and Reddit, and a boost from the community goes a long way:

- Like / repost the X thread: https://x.com/AIWGio/status/2059061866563850740
- Upvote / comment on Reddit: https://www.reddit.com/r/AIWG/comments/1tnqmo5/aiwg_v2026511_better_provider_detection/

If you try this release in a mixed-provider workspace, we want to hear what provider detection gets right and what still feels noisy.

## Telegram Post

(Plain text — Telegram won't render markdown asterisks in a pasted message. Bullets use •.)

AIWG v2026.5.11 is live.

What's new for real mixed-provider workspaces:
• Better provider detection — a Codex session stays Codex even when Claude or Cursor files share the repo (prefers active runtime evidence over passive files).
• Local-first issue management — manage issues as plain files in your repo, no heavyweight issue server required; sync to a remote tracker on demand.
• transcribe-media — timestamped transcript sidecars with media+transcript hashes, source metadata, and optional speaker labels.
• Stricter signed release gate — version lockstep + changelog/announcement checks, with commit-signing and release-tag-signing keys kept separate.

Install:
npm install -g aiwg@2026.5.11

Release notes: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
Start here: https://docs.aiwg.io/getting-started/start-here.html
Site: https://aiwg.io

We just launched across X and Reddit — a boost from the community really helps:
• Like / repost the X thread: https://x.com/AIWGio/status/2059061866563850740
• Upvote / comment on Reddit: https://www.reddit.com/r/AIWG/comments/1tnqmo5/aiwg_v2026511_better_provider_detection/

More: GitHub https://github.com/jmagly/aiwg · Discord https://discord.gg/BuAusFMxdA · X https://x.com/AIWGio

## LinkedIn Intro Post (AIWG.io page — POST FIRST; consider Featuring it)

Evergreen "what is AIWG" introduction for the brand-new page, first-person brand voice. Post this before the release announcement; consider pinning/Featuring it on the page. Suggested image: `thread-6-community.png` (evergreen ecosystem visual) — or generate a dedicated brand image.

```text
We're AIWG — an open-source framework that makes AI coding assistants dependable on real, long-running projects.

Teams now run Codex, Claude Code, Cursor, Copilot, OpenCode, and Warp — often several in the same repo — and the guidance, skills, and project context that keep them on track end up scattered and easy to lose.

AIWG gives you one source of truth and deploys it across ~10 AI coding tools:

• Provider-aware guidance — maintain agents, skills, and rules once, deploy them everywhere, with active-provider detection so each session gets the guidance that fits the tool you're actually in.

• Reusable skills — ~400 skills (plus agents and rules) invoked by capability and surfaced through discovery, not memorized.

• Structured project artifacts — requirements, architecture, ADRs, tests, and plans live as plain files in a local .aiwg/ directory: your project's working memory, fully git-reviewable.

• Strict release gates — signed, checked release tags, so what ships is what you reviewed.

No magic — just better execution for real projects.

Get started:
npm install -g aiwg
Site: https://aiwg.io
Start here: https://docs.aiwg.io/getting-started/start-here.html
GitHub: https://github.com/jmagly/aiwg

Join the community:
Discord: https://discord.gg/BuAusFMxdA
Telegram: https://t.me/+isN9TIm_4mlmZmEx
X: https://x.com/AIWGio

Follow along for releases, skills, and workflow ideas.

#AICoding #DeveloperTools #OpenSource #SoftwareEngineering #AIAgents #DevEx
```

## LinkedIn Post (AIWG.io company page)

First-person brand voice (posting AS the AIWG.io page — "we", not third-person "AIWG"). Professional tone; no chat-community "upvote us" CTA. Lead line shows before "see more". Attach the launch card for the visual.

```text
AIWG v2026.5.11 is live.

We're an open-source framework that gives AI coding assistants — Codex, Claude Code, Cursor, Copilot, OpenCode, and Warp — structured workflows, provider-aware guidance, reusable skills, and strict release gates from a single source of truth.

Here's what we shipped:

• Better provider detection — in mixed-provider repos, we now prefer active runtime evidence over passive config files, so a Codex session stays Codex even when Claude or Cursor files share the repo.

• Local-first issue management — manage issues as plain files in your repo, with no heavyweight issue server required. Import, export, and sync to a remote tracker on demand; your project config stays the source of truth for issue state.

• transcribe-media — timestamped transcript sidecars with media and transcript hashes, source metadata, and optional speaker labels, plus explicit degraded plans when local transcription tooling isn't available.

• Stricter signed release gate — release tags route through a signed gate enforcing version lockstep and changelog/announcement checks, with commit-signing and release-tag-signing keys kept separate.

Try it:
npm install -g aiwg@2026.5.11

Release notes: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
Start here: https://docs.aiwg.io/getting-started/start-here.html
Site: https://aiwg.io

We'd love your feedback — tell us how provider detection behaves in your mixed-provider repos.

#AICoding #DeveloperTools #OpenSource #SoftwareEngineering #AIAgents #DevEx
```

Attach: `concept-a-launch-card-v1-fullres.png` (operator attaches; LinkedIn favors a visual).

## Reddit Post

Title:
AIWG v2026.5.11: better provider detection, local issue sync docs, and media transcript sidecars

Body:

I just released AIWG v2026.5.11.

AIWG is an open-source framework for giving AI coding assistants structured workflows, provider-specific guidance, agent/skill catalogs, and project artifacts across tools like Codex, Claude Code, Cursor, Copilot, OpenCode, Warp, and others.

This release is smaller than a framework launch, but it fixes several things that matter once you use agentic tooling in real projects.

**What changed**

**Provider detection in mixed workspaces**

It is common for one repo to have files for multiple AI assistants. v2026.5.11 improves active-provider detection so Codex sessions get Codex-oriented output even when Claude or other provider files also exist.

**Local issue workflows**

The docs now explain issue import/export and live sync paths more clearly, using project config as the source of truth for where issue tracking lives.

**Media transcript prep**

The media-curator framework now includes `transcribe-media`. It records source metadata, media and transcript hashes, timestamped segments, optional speaker labels, and explicit degraded plans when local transcription tooling is not available.

**Release gate tightening**

Release tags now route through `tools/release/cut-tag.sh`, preserving the split between regular commit signing and release tag signing while checking version lockstep, changelog entry, and release announcement presence.

Install:

```bash
npm install -g aiwg@2026.5.11
```

Links:

- Site: https://aiwg.io
- Docs: https://docs.aiwg.io
- Start Here: https://docs.aiwg.io/getting-started/start-here.html
- Release: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
- GitHub: https://github.com/jmagly/aiwg
- X: https://x.com/AIWGio
- Discord: https://discord.gg/BuAusFMxdA
- Telegram: https://t.me/+isN9TIm_4mlmZmEx

The thing I would most like feedback on: if you use more than one AI assistant in the same repo, does the provider routing now match how you expect the active session to behave?

## Community Replies

### Provider detection question

If you are testing v2026.5.11, the useful signal is whether AIWG correctly treats the active session as Codex/Claude/etc. when your repo contains multiple provider configs. The new release should prefer active runtime/process evidence over passive files.

### Media workflow question

`transcribe-media` is intended as a first concrete step, not the whole research-media bridge. It creates transcript sidecars with timestamps, hashes, source metadata, optional speaker labels, and degraded plans when transcription tooling is missing.

### Install help

Start with:

```bash
npm install -g aiwg@2026.5.11
aiwg version
```

Then use the beginner guide:
https://docs.aiwg.io/getting-started/start-here.html

## Visual Direction

Avoid generic robot art. The release is about workflow reliability, provenance, and practical agent orchestration. Use crisp product/editorial visuals that feel like developer tooling, not sci-fi.

### Concept A: Mixed Workspace Routing

Hero idea: a clean terminal/workbench interface with several provider lanes converging into one highlighted Codex-aware route. Abstract enough to avoid fake UI text, but clearly about routing and agent workflows.

Best for: X/Twitter thread card, Discord announcement.

Prompt:

```text
Create a polished launch graphic for an open-source developer tool release called "AIWG v2026.5.11". Visual concept: a clean dark developer workbench with multiple AI assistant lanes converging into one active route, suggesting provider detection and workflow orchestration. Include subtle terminal panels, issue cards, transcript segments, and signed release/checkmark motifs as abstract UI shapes. Style: premium technical editorial, crisp, high contrast, modern but not sci-fi, no humanoid robots, no mascots, no stock-photo people. Use restrained accent colors across cyan, green, and warm amber on a neutral dark background. Leave safe negative space for platform cropping. Text in image should be limited to: "AIWG v2026.5.11" and "Provider detection. Issue sync. Media transcripts." Aspect ratio 16:9.
```

### Concept B: Release Trust Stack

Hero idea: a signed release pipeline with tag, changelog, docs, package, and community nodes.

Best for: Reddit technical post, Discord release thread.

Prompt:

```text
Create a polished technical launch card for "AIWG v2026.5.11". Visual concept: a release trust pipeline, with abstract nodes for signed tag, changelog, documentation, package, and community feedback. The image should feel like an open-source release control room: precise, trustworthy, practical. Avoid fake dense text, robots, people, and clutter. Use a neutral graphite background with cyan, green, and amber accents. Include only this visible text: "AIWG v2026.5.11" and "Signed release. Clearer workflows." Aspect ratio 16:9.
```

### Concept C: Media Transcript Sidecars

Hero idea: waveform, timestamp segments, and source hashes becoming reviewable sidecars.

Best for: follow-up post focused on media-curator.

Prompt:

```text
Create a modern developer-tool campaign image for AIWG's media transcript workflow. Visual concept: an audio/video waveform resolving into timestamped transcript cards and provenance hash markers, arranged as a clean sidecar artifact. Style: technical editorial, accessible, precise, not flashy. No people, no robots, no fake readable paragraphs. Use a light neutral background with graphite UI elements and cyan/green accents. Include only this visible text: "transcribe-media" and "Timestamped transcript sidecars". Aspect ratio 4:5.
```

## Profile And Community Assets

Generate these before posting the launch thread so new visitors do not land on empty default surfaces.

| Asset | Suggested Size | Use | Notes |
| --- | --- | --- | --- |
| X profile avatar | 800x800 source, crop-safe circle | X profile | Simple AIWG mark; readable at small sizes |
| X header | 1500x500 | X profile header | No critical text near edges; reinforce site/docs/community |
| Reddit community icon | 800x800 source, crop-safe circle | r/AIWG icon | Can match X avatar for brand consistency |
| Reddit banner | 1920x384 source | r/AIWG desktop banner | Keep center-weighted composition; Reddit crops by viewport |
| Launch card | 1600x900 | X, Discord, Reddit posts | Concept A from visual direction |
| Portrait card | 1080x1350 | Telegram and mobile reposts | Adapted from launch card after approval |

### First Image To Generate

Recommended first image: one reusable 16:9 launch card, because it can seed X, Discord, and Reddit while profile-specific banners are still being tuned.

Use Concept A unless a more brand-mark-focused profile image is needed first.

## Suggested Asset Set

| Asset | Size | Use | Concept |
| --- | --- | --- | --- |
| Launch card | 1600x900 | X, Discord, Reddit | Concept A |
| Square/portrait card | 1080x1080 or 1080x1350 | Telegram, reposts | Concept A cropped/adapted |
| Technical follow-up card | 1600x900 | Reddit/Discord comment update | Concept B |
| Media workflow card | 1080x1350 | Follow-up post | Concept C |

## Gemini Collaboration Prompt

Use this prompt in Gemini if generating an alternate copy pass:

```text
You are helping prepare an open-source launch campaign for AIWG v2026.5.11.

Facts:
- AIWG is an open-source framework for structured AI coding assistant workflows across providers.
- Release: v2026.5.11.
- Install: npm install -g aiwg@2026.5.11.
- Main site: https://aiwg.io.
- Docs: https://docs.aiwg.io.
- Start Here: https://docs.aiwg.io/getting-started/start-here.html.
- Release notes: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11.
- GitHub mirror: https://github.com/jmagly/aiwg.
- X/Twitter: https://x.com/AIWGio.
- Discord: https://discord.gg/BuAusFMxdA.
- Telegram: https://t.me/+isN9TIm_4mlmZmEx.
- Public npm publishing is handled by GitHub.
- Key release points: better Codex/provider detection in mixed workspaces; local issue import/export and sync docs; transcribe-media for timestamped transcript sidecars; signed release wrapper and broader doc gates.

Write platform-native copy for X/Twitter, Discord, Telegram, and Reddit. Tone: clear, technically credible, not hypey. Avoid vague AI claims. Include links and CTAs. Make Reddit transparent and useful, not ad-like.
```

## Gemini-Refined Copy (2026-05-25) — APPROVED-FOR-REVIEW

Refined via logged-in Gemini Pro (issue #1482). One off-brand change was **reverted**: Gemini
swapped "framework" → "agentic ecosystem"; AIWG brands as a *framework*, so the original term is kept.
Tweet-length note: verify thread tweets against the 280-char limit unless posting from X Premium
(several are close; tweet 1 and tweet 4 are the tightest fits).

### X Pinned Intro Post (refined)

```text
AIWG is an open-source framework that gives AI coding assistants structured workflows, provider-aware guidance, reusable skills, and strict release gates. No magic, just better execution for real projects.

Site: https://aiwg.io
Install: npm install -g aiwg
Start here: https://docs.aiwg.io/getting-started/start-here.html
GitHub: https://github.com/jmagly/aiwg
```

### X Launch Thread (refined)

```text
1/ AIWG v2026.5.11 is live. This release tightens provider detection, documents local-first issue workflows, adds media transcript workflows, and enforces a strict signed release gate.
Install: npm install -g aiwg@2026.5.11
https://aiwg.io

2/ Mixed-provider repos are the norm. v2026.5.11 improves provider detection by preferring active runtime evidence over passive files. A Codex session stays a Codex session even if Claude or Cursor files coexist. Less guessing, better guidance.

3/ Manage issues as plain local files in your repo — no heavyweight issue server required. Import, export, and sync to a remote tracker on demand (only when you ask, not in the background). Your project config is the source of truth for issue state.

4/ New transcribe-media workflow: generates timestamped transcript sidecars with media+transcript hashes, source metadata, and optional speaker labels. Includes explicit degraded plans if your local transcription tooling is missing.

5/ Release infrastructure is stricter. Tags now route through a signed tools/release/cut-tag.sh gate. Enforces version lockstep, checks for changelog/announcement presence, and preserves the split between commit-signing and release-tag-signing keys.

6/ Explore AIWG:
Site: https://aiwg.io
Start: https://docs.aiwg.io/getting-started/start-here.html
GitHub: https://github.com/jmagly/aiwg
Discord: https://discord.gg/BuAusFMxdA
What should we tighten up next?
```

### X Single Post (refined)

```text
AIWG v2026.5.11 is live.

Highlights:
- Active runtime provider detection (Codex/Claude/Cursor)
- Local-first issue management (no server needed; sync on demand)
- Timestamped transcript sidecars
- Strict tools/release/cut-tag.sh release gates

Install: npm install -g aiwg@2026.5.11
https://aiwg.io
```

### Reddit Welcome Post (refined)

```text
Title: Welcome to r/AIWG: structured workflows for AI coding agents

Welcome to r/AIWG. AIWG is an open-source framework designed to make AI coding assistants more useful in real projects by providing structured workflows, provider-aware guidance, reusable skills, project artifacts, issue sync, and release gates.

Useful links:
- Site: https://aiwg.io
- Start Here: https://docs.aiwg.io/getting-started/start-here.html
- GitHub: https://github.com/jmagly/aiwg
- Latest Release: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11
- Discord: https://discord.gg/BuAusFMxdA

What to post here:
- Install and usage questions.
- Provider-specific feedback from Codex, Claude Code, Cursor, Copilot, OpenCode, and Warp.
- Real-world workflows that succeeded or failed.
- Release feedback and bug reports.
- Ideas for new skills, documentation, and integrations.

Note: Please scrub your logs. Avoid posting secrets, private API keys, or proprietary repo data in screenshots or text dumps.
```

### Reddit Release Post (refined)

```text
Title: AIWG v2026.5.11: better provider detection, local-first issue management, and transcript sidecars

Hey everyone, I just released AIWG v2026.5.11.

If you're new here, AIWG is an open-source framework that gives AI coding assistants (Codex, Claude Code, Cursor, Copilot, OpenCode, Warp) structured workflows, provider-specific guidance, reusable skills, and project artifacts.

This release focuses on fixing the friction points that show up once you start heavily relying on agentic tooling in real projects:

- **Tighter provider detection.** Handles mixed-provider workspaces much better. It now prefers active runtime/process evidence over passive provider files. If you're running a Codex session, AIWG treats it as Codex, even if you have Claude or Cursor files sitting in the repo.
- **Local-first issue management.** Manage issues as plain files in your repo — no heavyweight issue server required. Documented import/export to a remote tracker, with sync performed on demand (only when you ask, not continuously). The project config is the definitive source of truth for where issue state lives.
- **Media workflows.** Added transcribe-media for timestamped transcript sidecars — media+transcript hashes, source metadata, optional speaker labels, and explicit degraded plans if your local transcription tools aren't available.
- **Strict release gates.** Release tags now route through a signed tools/release/cut-tag.sh gate: version lockstep checks, changelog/announcement presence, and a preserved split between commit-signing and release-tag-signing keys.

Install: npm install -g aiwg@2026.5.11
Release notes: https://github.com/jmagly/aiwg/releases/tag/v2026.5.11

Links:
- Site: https://aiwg.io
- Start here: https://docs.aiwg.io/getting-started/start-here.html
- GitHub: https://github.com/jmagly/aiwg
- Discord: https://discord.gg/BuAusFMxdA
- Telegram: https://t.me/+isN9TIm_4mlmZmEx
- X: https://x.com/AIWGio

Feedback request: if you use more than one AI assistant in the same repo, does the new provider routing match how you expect the active session to behave?
```

## Launch Card — Alt Text (for accessibility on all posts)

```text
Dark editorial launch graphic titled "AIWG v2026.5.11." Multiple developer-workflow lanes — terminal panels (git merge, npm install, python deploy), issue cards (#204 Fix auth issue, Open: Performance review), and transcript segments (User: Analyze logs / Assistant: Working / Transcription complete) — converge left-to-right into one highlighted cyan route that ends in checkmarks and a "Signed" release badge. Tagline: "Provider detection. Issue sync. Media transcripts." Cyan, green, and amber accents on a neutral dark background.
```

## Link Policy (RESOLVED 2026-05-25, operator directive)

- **Gitea (`git.integrolabs.net`) is INTERNAL ONLY** — never referenced in any public copy. All public
  release-notes links now use the GitHub releases page (`https://github.com/jmagly/aiwg/releases/tag/v2026.5.11`).
- **Front public CTAs with the site (https://aiwg.io) and npm** (`npm install -g aiwg@2026.5.11`).
- **When listing other networks/socials, GitHub is listed first**, then Discord / Telegram / X / Reddit.

## Approved Visual Assets (FINAL, 2026-05-25)

All in `.aiwg/marketing/social/v2026.5.11/assets/`. Visual direction: circuit-glow — translucent
cyan→green light-lines blending structured circuit routing with bundling curves, near-black ground.

| Asset | File | Source | Notes |
| --- | --- | --- | --- |
| Launch card (16:9) | `concept-a-launch-card-v1-fullres.png` (1024×572) | Gemini | Concept A; seeds X/Discord/Reddit posts |
| X header (3:1) | `x-header-chatgpt-v1.png` (2172×724) | ChatGPT | Wordmark + tagline, glow node, quiet bottom-left for avatar |
| Reddit banner (5:1) | `reddit-banner-chatgpt-v1.png` (2804×561) | ChatGPT | Center-weighted for Reddit viewport crop |
| Avatar / icon (1:1) | `aiwg-pfp-FINAL.png` (1254×1254) | ChatGPT (ref-guided by both banners) | Shared X avatar + Reddit icon; no flare; circle-crop safe |

Operator also has downloaded copies in `~/Downloads`.

### Release Launch Thread — per-tweet image set (FINAL, 2026-05-25)

Deliberately varied in **both style and content** (operator directive) — six distinct looks, not one repeated aesthetic. All ChatGPT-generated (no watermark), in `assets/` + `~/Downloads/`.

| Tweet | File | Style | Content |
| --- | --- | --- | --- |
| 1/ release live | `concept-a-launch-card-v1-fullres.png` | editorial workflow-lanes | v2026.5.11 launch card |
| 2/ provider detection | `thread-2-provider-detection.png` | light isometric infographic | CODEX/CLAUDE/CURSOR lanes, CLAUDE active, runtime > passive files |
| 3/ local-first issues | `thread-3-issue-sync.png` | flat editorial (warm) | local issue files, NO ISSUE SERVER REQUIRED, sync on demand |
| 4/ transcribe-media | `thread-4-transcribe-media.png` | dark neon media/waveform | media → timestamped transcript sidecars + hash/metadata badges |
| 5/ release gate | `thread-5-release-gate.png` | dark gold security badge | SIGNED gate, validation checks, commit vs release keys kept separate |
| 6/ community | `thread-6-community.png` | bright network constellation | AIWG core + npm chip, GitHub/Docs/Discord/Telegram/Reddit/X nodes |

## Approval Checklist

- [x] Confirm official X/Twitter profile URL.
- [x] Confirm official Reddit community: https://www.reddit.com/r/AIWG.
- [x] Release-link policy resolved: Gitea is internal-only and purged from all public copy; GitHub releases is the public release-notes link; site + npm fronted; GitHub first among socials.
- [x] Generate first launch-card image and review before producing variants. (Concept A v1 approved 2026-05-25; full-res in assets/)
- [x] Add alt text after final image selection. (drafted above for Concept A launch card)
- [ ] Gemini-refined copy reviewed/approved by operator.
- [ ] X profile fields applied (name, bio, website, location) — gated on approval.
- [ ] r/AIWG community description + welcome post applied — gated on approval.
- [ ] Launch posts submitted (X, Reddit, Discord, Telegram) — gated on approval.
- [ ] Published post URLs recorded after posting.

## Published Post URLs (live tracking)

| Post | Status | URL |
| --- | --- | --- |
| r/AIWG welcome (pinned) | LIVE | https://www.reddit.com/r/AIWG/comments/1tno9os/welcome_to_raiwg_structured_workflows_for_ai/ |
| X intro thread (pinned, 6 parts) | LIVE | head: https://x.com/AIWGio/status/2059043303320920420 |
| X release launch thread (6 parts) | LIVE | head: https://x.com/AIWGio/status/2059061866563850740 |
| X single release post | N/A | superseded by the full launch thread (operator chose thread) |
| Reddit release post (Release Announcement flair) | LIVE | https://www.reddit.com/r/AIWG/comments/1tnqmo5/aiwg_v2026511_better_provider_detection/ |
| Discord announcement | LIVE (operator-posted) | URL pending capture |
| Telegram post | LIVE (operator-posted) | URL pending capture |
| LinkedIn page (AIWG.io) | LIVE | https://www.linkedin.com/showcase/aiwg-io/ |
| LinkedIn intro post (first-person, Featured) | pending (operator paste) | — |
| LinkedIn release post (first-person) | pending (operator paste) | — |

## X Intro Thread (pinned) — parts 2-6 (Gemini-written, 2026-05-25)

Part 1 (LIVE): "AIWG: open-source framework that gives AI coding assistants structured workflows, provider-aware guidance, reusable skills, and strict release gates. No magic — just better execution for real projects. Install: npm install -g aiwg / aiwg.io"

```text
2/ Maintain one source of agents, skills, and rules. Deploy them across ~10 AI coding tools. AIWG actively detects the provider in mixed repos, ensuring instructions automatically fit the session you are actually working in.   (224)

3/ Access ~400 reusable skills, alongside your agents and rules. There is no need to hardcode or memorize commands — skills are invoked by capability and easily surfaced using aiwg discover.   (191)

4/ Your project's working memory, formalized. Requirements, architecture, ADRs, tests, and plans live as plain text files in a local .aiwg/ directory. Everything is strictly structured, fully versioned, and git-reviewable.   (226)

5/ Execute with structured SDLC operations. Documented local issue import/export and live sync. Release tags route through a signed gate, enforcing strict version, changelog, and announcement checks before shipping.   (229)

6/ Build better workflows:
Install: npm install -g aiwg
Start: https://docs.aiwg.io/getting-started/start-here.html
Code: https://github.com/jmagly/aiwg
Discord: https://discord.gg/BuAusFMxdA
Telegram: https://t.me/+isN9TIm_4mlmZmEx
Reddit: https://www.reddit.com/r/AIWG   (~216)
```

Image concepts (circuit-glow brand, one per part) -> generated to assets/thread-2.png .. thread-6.png:
- 2: cyan node branching to multiple endpoints (provider routing across tools)
- 3: organized grid of glowing green clusters (searchable skill library)
- 4: cyan wireframe directory tree solidifying into a data block (structured .aiwg/ artifacts)
- 5: green signed gate scanning a packet before routing (release gate)
- 6: constellation of cyan/green nodes connecting (community)

### X intro thread (pinned) — published URLs
- 1/ (pinned): https://x.com/AIWGio/status/2059043303320920420
- 2/ providers: https://x.com/AIWGio/status/2059049542176108996
- 3/ skills: https://x.com/AIWGio/status/2059049764432335157
- 4/ artifacts: https://x.com/AIWGio/status/2059049994301083955
- 5/ release gate: https://x.com/AIWGio/status/2059050163558097005
- 6/ community: https://x.com/AIWGio/status/2059050569361215622
