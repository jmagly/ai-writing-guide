# AIWG Developer Tools

**For AIWG contributors only.** This addon provides rules and skills to help people building AIWG itself, AIWG addons, and AIWG extensions avoid common structural mistakes.

This addon is **intentionally excluded from `aiwg use all`** and must be installed explicitly.

---

## Installation

```bash
aiwg use aiwg-dev
```

This is a contributor tool. Do not install it in production projects or end-user workspaces.

---

## What It Provides

### Rules (4)

| Rule | Priority | Purpose |
|------|----------|---------|
| `skill-placement` | HIGH | Prevent accidental file placement in `.claude/` or provider dirs instead of `agentic/code/` |
| `no-circular-skill-calls` | HIGH | Prevent infinite loops from skills that call back into their own CLI command |
| `component-completeness` | MEDIUM | Ensure each artifact type has all required files before sharing |
| `addon-boundaries` | MEDIUM | Enforce the `agentic/code/` vs `.aiwg/` source/output boundary |

### Skills (3)

| Skill | Purpose |
|-------|---------|
| `validate-component` | Check a single skill, agent, or command for completeness and correctness |
| `validate-addon` | Check an entire addon directory for release readiness |
| `dev-doctor` | Full development-environment health check across the AIWG repository |

---

## Why This Exists

AIWG is a dogfooding project — it uses itself to build itself. That creates some traps that regularly catch contributors:

- **Placement trap**: Creating a SKILL.md in `.claude/skills/` directly. That directory is a deployment target; files placed there are overwritten on the next `aiwg sync`. Skills must live in `agentic/code/addons/<name>/skills/`.
- **Circular skill trap**: Marking a command `executedViaSkillRunner: true` while the SKILL.md says "run `aiwg <same-command>`". The TypeScript handler is removed, so the CLI call has nowhere to land — infinite loop.
- **Boundary confusion**: Putting framework schemas or templates in `.aiwg/` because it looks like a config directory. `.aiwg/` is project output for THIS project's development; nothing in it ships to users.
- **Incomplete components**: Sharing a skill that has a SKILL.md but is not listed in the addon manifest, or a rule that has no RULES-INDEX.md entry.

The rules in this addon encode these lessons so contributors get caught by their tool before they file a broken PR.

---

## Excluded from `aiwg use all`

The `devOnly: true` flag in `manifest.json` signals to the deployment pipeline that this addon must not be included in `aiwg use all`. It is only deployed when explicitly requested:

```bash
aiwg use aiwg-dev        # Install
aiwg remove aiwg-dev     # Remove
```

End users do not need contributor tooling in their workspaces.

---

## References

- `agentic/code/addons/aiwg-utils/` — Core utilities addon (style reference)
- `docs/development/aiwg-development-guide.md` — Full contributor guide
- `docs/extensions/creating-extensions.md` — Extension creation walkthrough
- `src/extensions/types.ts` — Extension type definitions
