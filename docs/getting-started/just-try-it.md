# Just Try It

You don't want to read documentation. You want to see something happen. That's fine.

---

## One-minute setup

Install AIWG and deploy it to your project:

```bash
npm install -g aiwg
cd /path/to/any/project     # or make an empty folder
aiwg use sdlc
```

Open Claude Code in that directory:

```bash
claude .
```

Then bootstrap AIWG **from inside the tool** — run the regenerate step so it wires AIWG into your project context (`CLAUDE.md` + `AIWG.md`) and loads as the AIWG orchestrator:

```
/aiwg-regenerate
```

(No slash command? Just ask it: "run aiwg-regenerate to bootstrap AIWG for this project.")

Now ask it anything about your project:

```
What does this codebase do?
```

```
Find the most complex function and explain it.
```

```
What tests are missing?
```

```
Where would a security reviewer look first?
```

AIWG has pre-loaded 50+ specialized agents and rules. The AI will answer with the knowledge of a test engineer, security auditor, or architect — not a generic chatbot.

---

## If you don't have a project to try it on

Make a folder, drop in one or two files, and run:

```bash
mkdir my-test && cd my-test
echo "console.log('hello')" > index.js
aiwg use sdlc
claude .
```

Then, inside the tool, run the bootstrap step once:

```
/aiwg-regenerate
```

Then:

```
What would a senior engineer say about this code?
```

It will answer as one. That's what AIWG does.

---

## What you just installed

`aiwg use sdlc` copied agent definitions, slash commands, skills, and behavioral rules into `.claude/` in your project. Claude Code reads those automatically when it starts.

Running `/aiwg-regenerate` once inside the tool is the step that ties it together: it generates the project context file (`CLAUDE.md` + `AIWG.md`) that primes the AI as the AIWG orchestrator and loads that knowledge on every start. That's the bootstrap — after it runs, you don't need to configure anything else.

---

## What to explore next

Once you've seen it in action, pick a path:

- **Starting a real project?** → [New Project](new-project.md)
- **You have existing code?** → [Existing Project](existing-project.md)
- **Want structured auditing?** → [Audit Existing Code](audit-existing-code.md)
