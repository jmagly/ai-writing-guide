# Choose a Documentation Audience

Every new or substantially revised document must identify its reader and
publication target before content is written.

## Review questions

1. Is the reader an end user, an agent/operator, or a contributor/maintainer?
2. Is the page a tutorial, how-to, reference, or explanation?
3. Should it appear on `docs.aiwg.io`, in the installed/release agent corpus,
   or only in contributor/development surfaces?
4. Does a public command genuinely require direct user action?
5. If an agent owns the command, does the public page instead state the user
   ask, expected agent behavior, approval boundary, outcome, and verification?

Agent/operator references belong in `docs/agents/` with the metadata and stable
ID defined in the [documentation information architecture](../architecture/documentation-information-architecture.md).
Public exceptions must use a direct-touch command from the documented allowlist
or label the command as an operator/recovery escape hatch.

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
