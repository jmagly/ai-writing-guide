# Beginner Language Map

Use this guide when you know what you want in plain language but do not know the AIWG term for it.

The main pattern is:

1. Describe your situation in ordinary words.
2. Ask the agent how AIWG can help.
3. Let the agent translate your words into two to four AIWG search phrases.
4. Pick one recommended path.
5. Stay with that path until you understand what it does and get one useful result.

Good starter prompts:

```text
How best can we use AIWG for our situation?
I do not know what AIWG has. Help me find the right thing.
What should we focus on first?
Create a workflow from AIWG capabilities that fits this project.
```

The agent should answer with a short recommendation, not a catalog.

## If You Are The Agent

When a user gives an abstract or novice request:

1. Restate their goal in plain language.
2. Generate two to four candidate AIWG capability phrases.
3. Run `aiwg discover "<phrase>"` for each phrase, or give the commands to the user if the provider cannot run the CLI.
4. Compare the top results by purpose.
5. Run `aiwg show skill <name>` or `aiwg show agent <name>` for the top candidate before recommending it.
6. Recommend one first action and one fallback.
7. Ask one clarifying question only when the top paths would send the user in materially different directions.

Provider behavior varies. If the agent cannot run CLI commands in the current tool, it should give the user the exact `aiwg discover` commands to run from the project folder.

## Intent Map

| If you say... | AIWG direction | Try this discovery phrase | Steward prompt | First useful action |
|---|---|---|---|---|
| "Help me start a project." | SDLC intake and requirements | `intake wizard` | "Help me turn this idea into a project plan." | Start an intake for the project idea. |
| "Help me choose what to use." | Steward, framework quickrefs, discover | `aiwg steward` | "Help me choose the right AIWG framework or skill." | Ask for one recommended path and one fallback. |
| "I do not know what AIWG has." | Discovery and capability lookup | `capability discovery` | "Translate my goal into AIWG search terms." | Run two or three `aiwg discover` searches. |
| "Help my AI remember what we decided." | Memory, knowledge base, project artifacts | `memory ingest` | "Help me preserve project decisions between sessions." | Choose memory, KB, or project artifact flow. |
| "Help me know what is next." | Project status and orchestration | `project status` | "Tell me where this project stands and what to do next." | Generate or refresh project status. |
| "Help the AI not quit early." | Agent loops and verification gates | `ralph loop` | "Use an iterative loop with a clear completion check." | Define the task and completion criterion. |
| "Help check quality." | Tests, review, gates, validation | `test coverage` | "Find the highest-risk quality gap first." | Run a focused quality or test coverage check. |
| "Help with research papers." | Research framework, citation, GRADE | `research workflow` | "Help me build a cited research corpus." | Start a research workflow or citation plan. |
| "Help with infra or servers." | Ops framework and extensions | `ops runbook` | "Help me document and operate this infrastructure." | Pick a runbook, inventory, or audit path. |
| "Help with security." | Security engineering and reviews | `security assessment` | "Help me find the right security review path." | Start with a scoped security assessment. |
| "Help write better content." | Voice, writing quality, marketing | `apply voice profile` | "Help me make this writing clearer and consistent." | Choose voice, writing validation, or marketing flow. |
| "Help make this less chaotic." | Planning, orchestration, status, gates | `orchestrate project` | "Help me impose a simple operating rhythm on this work." | Pick one planning/status workflow. |
| "Help me build a custom workflow." | Project-local extension or skill authoring | `skill architect` | "Help me turn this repeated process into an AIWG workflow." | Decide whether this is a skill, agent, addon, or docs recipe. |
| "Help with CI, builds, or deployment." | Dev ops extension and release gates | `pipeline safety ci` | "Help me make the build or deployment path safer." | Start with pipeline safety or release readiness. |

## Keep The Choice Small

For a beginner, a good AIWG recommendation has this shape:

```text
Your goal sounds like: <plain-language restatement>

I would start with: <one path>
Why: <one short reason>

Run:
aiwg discover "<phrase>"

Then:
aiwg show skill <name>

Fallback if that does not fit:
aiwg discover "<fallback phrase>"
```

Avoid listing every framework, addon, skill, and agent. The user can ask for breadth later.

## Examples

### "How best can we use AIWG globally?"

Candidate phrases:

```bash
aiwg discover "aiwg steward"
aiwg discover "workspace health"
aiwg discover "project status"
```

Start with the steward. Ask it to choose one path for the current project or team. Use workspace health only when the question is about installation or deployment state.

### "Create new workflows that fit our situation."

Candidate phrases:

```bash
aiwg discover "skill architect"
aiwg discover "project local extension"
aiwg discover "orchestrate project"
```

Start by describing the repeated work in plain language. If it is a reusable agent behavior, use the skill or extension authoring path. If it is a one-time project flow, use orchestration first.

### "What should we focus on first?"

Candidate phrases:

```bash
aiwg discover "project status"
aiwg discover "risk cycle"
aiwg discover "SDLC project health check"
```

Start with project status when you want next actions. Use risk cycle when the concern is uncertainty or blockers. Use SDLC project health when the project is already following the SDLC framework.

## Related Guides

- [Getting Started](README.md)
- [Quick Start](../quickstart.md)
- [Key Addons](key-addons.md)
- [Simple Language Translations](../simple-language-translations.md)
