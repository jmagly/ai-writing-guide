# Starting a New Project

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is installed and the self-verifying `aiwg use all` flow has connected your provider to this project.

You have an idea. You want to build something. AIWG runs a structured intake conversation, generates the foundation documents your project needs, then assigns AI agents to carry the work forward.

This is the full setup — requirements, architecture, test strategy, security baseline — generated from a single conversation.

---

## Step 1 — Install and connect

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
Explain the plan before changing anything, preserve my existing work, and ask
me only for choices you cannot safely determine.
```

---

## Step 2 — Create your project folder

```bash
mkdir my-project && cd my-project
git init
```

---

## Step 3 — Deploy the complete AIWG system

```bash
aiwg use all --provider <provider>
```

The agentic installer performs this for you. The command deploys the complete
system, refreshes its indices and project context, verifies the provider
adapter, and reports one readiness result.

---

## Step 4 — Open your provider and start intake

Then tell it what you're building:

```
I want to build a REST API for a task management app. Users can create tasks,
assign them to teammates, and get notifications when tasks are due.
```

Or use the explicit intake command:

```
/intake-wizard "task management API with team assignments and notifications"
```

The AI will ask clarifying questions, then generate:

- **Intake form** — problem statement, users, goals, constraints
- **Use cases** — what the system does, who it does it for
- **Architecture sketch** — components, tech stack recommendations
- **Risk register** — what could go wrong early

These go into `.aiwg/` in your project. You can read them, edit them, and they guide everything that comes next.

---

## Step 5 — Start building

Once intake is complete, the AI knows your project. You can now use natural language to drive development:

```
Create the user model based on the requirements
```

```
Write unit tests for the task assignment feature
```

```
Run a security review on the authentication flow
```

```
What phase are we in and what's next?
```

The AI will answer in context — it knows your architecture, your requirements, and what decisions have already been made.

---

## What the `.aiwg/` folder contains

Everything generated during the project lives here:

```
.aiwg/
├── intake/         ← Your project definition
├── requirements/   ← Use cases and user stories
├── architecture/   ← Architecture decisions (ADRs)
├── testing/        ← Test strategy and plans
├── security/       ← Threat model
├── planning/       ← Phase plans, iteration notes
└── reports/        ← Status and audit reports
```

You can commit this folder. It becomes part of your project history. New team members can read it to understand the project, and new AI sessions can load it to pick up context.

---

## Moving through phases

AIWG uses a structured lifecycle: Inception → Elaboration → Construction → Transition.

To move between phases, just say so:

```
Let's move to elaboration
```

```
Transition to construction — we're done with design
```

The AI will run a gate check, verify what needs to be done, and orchestrate the transition.

---

## If you already have some code

Run `/intake-from-codebase` instead of `/intake-wizard` — it scans what you have and fills in the intake from the code rather than asking you from scratch. See [Existing Project](existing-project.md).
