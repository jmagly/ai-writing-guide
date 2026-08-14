# Just Try It

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is installed and `aiwg use all` has completed for your provider.

You don't want to read documentation. You want to see something happen. That's fine.

---

## One-minute setup

Install AIWG and deploy it to your project:

```bash
npm install -g aiwg
cd /path/to/any/project     # or make an empty folder
aiwg use all --provider <provider>
```

That's it—ask the current agent whether AIWG is active. Most providers can use
the regenerated context immediately; restart only if verification finds cached
startup instructions.

If you pointed at an **existing project** (not an empty folder), run this once **inside the tool** first, so AIWG reconciles its context with what's already there:

```
/aiwg-regenerate
```

(No slash command? Ask it: "run aiwg-regenerate to wire AIWG into this project.")

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
aiwg use all --provider <provider>
```

Then (this is a brand-new folder, so nothing to reconcile — just ask):

```
What would a senior engineer say about this code?
```

It will answer as one. That's what AIWG does.

---

## What you just installed

`aiwg use all --provider <provider>` copied the complete agent, command, skill,
and rule surface into the provider's native locations, built the capability
index, connected the provider to `WORKSPACE.md` and `AIWG.md`, and verified the
result. It reports whether the workspace is ready now or needs a provider
restart.

On an **existing project**, or to pull in the latest AIWG on a project you set up earlier, run `/aiwg-regenerate` inside the tool: it re-tailors that context to your actual codebase and preserves any edits you've made.

---

## What to explore next

Once you've seen it in action, pick a path:

- **Starting a real project?** → [New Project](new-project.md)
- **You have existing code?** → [Existing Project](existing-project.md)
- **Want structured auditing?** → [Audit Existing Code](audit-existing-code.md)
