# Public CLI Remediation Audit

AIWG-owned capabilities must direct operators and agents through stable `aiwg`
commands. Package-manager scripts and internal tool paths are implementation
details, not a user interface.

The audit for issue #2067 covered runtime messages under `src/`, Doctor output,
the agent CLI reference, and the context/memory firewall operator guide.

| Classification | Policy | Current examples |
|---|---|---|
| Product capability | Must use a public AIWG command | Context firewall; optional embeddings, SQLite, graph, webserver, PTY, and terminal features |
| Base bootstrap/update | Direct package installation may be necessary because AIWG itself is absent or broken | Initial install, channel switch, Doctor base-package recovery |
| Contributor/release work | Repository build scripts are allowed when explicitly identified as source or release maintenance | Development checkout build, release index packaging |
| Embedded dispatch | Internal paths are allowed when generated code needs a deterministic repository-local executable and no operator is instructed to invoke it | Generated Git hooks |
| External command | User-selected third-party commands remain literal | MCP server executable and completion-criterion examples |
| Analogy | Non-executable comparisons are allowed | Description of `aiwg run` semantics |

Corrections made in this audit:

- Added `aiwg context-firewall scan` and a plan-first, confirmation-gated
  baseline workflow.
- Routed Doctor and firewall reports to that public command.
- Routed optional-capability remediation through `aiwg features install`.
- Added managed feature definitions for graph traversal and terminal parsing.
- Made optional package consumers resolve the user-owned feature installation,
  rather than merely reporting it as installed.
- Removed the webserver's implicit package mutation; it now fails with a public,
  auditable feature-install command.

The executable contract is
`test/unit/cli/public-remediation-contract.test.ts`. It scans the owned runtime
and operator surfaces on every normal test run. Every remaining internal
entrypoint must match a narrow exemption with a classification and rationale;
an unclassified occurrence fails the suite.
