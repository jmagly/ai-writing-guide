# Bringing AIWG into an Existing Project

You already have a codebase. Maybe it's yours, maybe you inherited it. Either way, you want an AI assistant that actually understands what's in there — not one that has to be reminded every session what the project does and how it's structured.

This guide gets AIWG loaded and oriented in under ten minutes.

---

## Step 1 — Install

```bash
npm install -g aiwg
```

---

## Step 2 — Deploy to your project

```bash
cd /path/to/your/project
aiwg use sdlc
```

This installs the agents, commands, and rules into `.claude/`. Claude Code picks them up automatically on the next session.

---

## Step 3 — Let the AI read the codebase

Open Claude Code:

```bash
claude .
```

Then run the codebase intake scan:

```
/intake-from-codebase
```

This scans your project — directory structure, key files, existing tests, README, package.json, config files — and generates a project intake document in `.aiwg/intake/`. It figures out:

- What the project does
- What tech stack it uses
- What the existing architecture looks like
- What tests exist (and what's missing)

You don't have to answer questions or fill out forms. It reads the code.

---

## Step 4 — Review what it found

The intake document lands at `.aiwg/intake/`. Read it and correct anything that's wrong:

```
What did you learn about this project?
```

Or open `.aiwg/intake/project-intake.md` directly and edit it. This document drives everything else — fix inaccuracies now.

---

## Step 5 — Set up project context

Run the project setup command so future sessions load the right context:

```
/aiwg-setup-project
```

This wires the intake into the Claude Code configuration so the AI has persistent context across sessions. You don't have to re-explain the project every time you open a new terminal.

---

## Now the AI knows your project

Ask it anything:

```
What are the riskiest parts of this codebase?
```

```
Find functions with no test coverage
```

```
Where does the authentication flow start and what does it do?
```

```
What would break first if we changed the user model?
```

```
Summarize the architecture for a new engineer joining the team
```

The AI answers as a team member who has read all the code — not as a generic assistant starting from zero.

---

## If the project has no documentation

That's a common situation. AIWG can generate it:

```
Write architecture documentation based on what you've read
```

```
Create a README from what you know about this project
```

```
Generate use cases from the existing code
```

The resulting docs go into `.aiwg/` and can be committed as part of the project.

---

## If you inherited code you don't fully understand

This is exactly what AIWG is built for. Run:

```
Explain this codebase to me as if I just joined the team today
```

Then dig into specific areas:

```
What does the billing module do and how does it connect to the rest of the system?
```

```
Walk me through what happens when a user logs in
```

```
Which parts of this code look like technical debt?
```

---

## Ongoing use

Once the project is loaded, AIWG is most useful in your normal workflow:

- Ask the agent for project status at the start of each session ("where are we?", "what's next?")
- For iterative tasks, ask the agent to keep working until a measurable check passes ("fix all failing tests; keep iterating until `npm test` passes")
- Ask for a security review periodically as a quality gate ("run a security review on this branch")

The agent invokes the underlying AIWG workflows — `/project-status`, agent loops, `/flow-security-review-cycle` — from inside the conversation. You stay in chat.

See [New Project](new-project.md) for a full description of the SDLC workflow once you're oriented.
