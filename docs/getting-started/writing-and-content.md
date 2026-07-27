# Writing and Content

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

You want the AI to write the way you write — not in that recognizable AI voice that sounds the same as everything else.

AIWG's voice framework lets you define or select a writing style, then apply it consistently across everything the AI generates: documentation, blog posts, proposals, READMEs, emails, technical explainers, whatever.

---

## Quickest path

```bash
npm install -g aiwg
cd /path/to/your/project
aiwg use writing
claude .
```

Then:

```
Write a README for this project in a clear, direct, technical tone
```

```
Rewrite this section so it sounds less like an AI wrote it
```

```
Write a blog post about what we built. Keep it conversational and specific — no generic hype.
```

---

## Built-in voice profiles

AIWG ships four ready-to-use voices:

| Profile | When to use it |
|---|---|
| `technical-authority` | Documentation, API references, architecture explainers |
| `friendly-explainer` | Tutorials, onboarding, "how this works" guides |
| `executive-brief` | Stakeholder updates, proposals, board-ready summaries |
| `casual-conversational` | Blog posts, team updates, social content |

Apply one in a session:

```
Use the technical-authority voice for everything in this session
```

Or specify it per request:

```
Rewrite this in the executive-brief style
```

---

## Creating your own voice profile

If the built-in profiles don't match your brand or personal style, create a custom one.

**Option 1 — From a sample of your existing writing:**

```
/voice-create
```

Paste or link 3–5 samples of writing you like. AIWG analyzes them and generates a voice profile that captures the patterns.

**Option 2 — Describe it:**

```
Create a voice profile for our company blog: direct, slightly opinionated, no jargon,
short sentences, occasional dry humor. Technical audience but not academics.
```

The profile gets saved in `agentic/code/addons/voice-framework/voices/` and is available in future sessions.

---

## Checking your content

After writing, run the validation:

```
/writing-validator path/to/content.md
```

This checks for AI-pattern phrases, passive voice overuse, vague hedging language, and structural issues. It's the same validator AIWG uses on its own documentation.

---

## Rewriting existing content

If you have content that already sounds too "AI":

```
Rewrite this to sound more human. Keep all the information, change the delivery.
```

```
This reads like a template. Make it specific and concrete.
```

```
Strip the filler words and get to the point.
```

Or run the voice-apply skill across a whole file:

```
/voice-apply path/to/document.md --profile technical-authority
```

---

## Common writing tasks

**Documentation:**
```
Write API documentation for this function in technical-authority voice
```

```
Create a troubleshooting guide for the most common errors in this system
```

**Blog and thought leadership:**
```
Write a blog post about why we made this technical decision, written as a practitioner
talking to other practitioners
```

**Proposals and briefs:**
```
Summarize this project for an executive audience in two paragraphs
```

```
Write a proposal for adding authentication to this service — explain the problem,
options we considered, and what we recommend
```

**Team communication:**
```
Write a release announcement for this feature — internal team, casual tone
```

---

## Working across sessions

Voice profiles persist — you don't need to re-specify them. Once you've run `/voice-create` or selected a profile, it's available by name in any session:

```
Use the "company-blog" voice for this
```

See the [Voice Framework guide](../soul-md-guide.md) for advanced usage.
