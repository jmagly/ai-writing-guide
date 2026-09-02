# Choose a Documentation Audience

Every new or substantially revised document must identify its reader and
publication target before content is written.

## Review questions

1. Is the reader an end user, an agent/operator, or a contributor/maintainer?
2. Is the page a tutorial, how-to, reference, or explanation?
3. Should it appear on `docs.aiwg.io`, in the installed/release agent corpus,
   or only in contributor/development surfaces?
4. Does the page state a copyable user prompt before implementation details?
5. Does the public page state the user
   ask, expected agent behavior, approval boundary, outcome, and verification?

Agent/operator references belong in `docs/agents/`. Exact commands and flags
belong in `docs/cli/`, which is the sole CLI reference section. Public user
journeys link there when a reader explicitly wants terminal-level operation;
they do not duplicate command blocks or flag tables.

Every user procedure should lead with a prompt that a reader can paste into a
supported agent. The prompt states the desired outcome, the evidence to inspect,
the approval boundary, and what the agent must report when finished. Follow it
with expected results and recovery prompts, not command syntax.

Do not mechanically rewrite historical release notes or example fixtures.

## Clarity for new computer users

Public docs must not assume that readers know what a terminal, project root,
provider, repository, command flag, generated file, or restart/reload means.
Define unfamiliar terms where the user first needs them. For every required
action, state:

- where it happens (terminal, file browser, or agent conversation);
- what the action changes and why;
- whether approval is expected;
- what success looks like; and
- how to stop or recover safely when the result differs.

Use respectful adult language. Avoid both unexplained shorthand and
patronizing reassurance.
