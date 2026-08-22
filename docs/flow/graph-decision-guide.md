# Graph Flow Profile Decision Guide

AIWG graph orchestration is optional. The canonical decision record is
`docs/architecture/adr-graph-as-flow-profile.md`; the installable guide,
fixtures, and validator ship in `agentic/code/addons/graph-pattern/`.

Use `aiwg discover "graph flow profile"` to find the addon guidance. Install
with `aiwg use graph-pattern`, then validate with `aiwg graph validate`.

The `aiwg features install graph` command is different: it installs Graphology
for artifact-index traversal and does not enable execution graphs.

See the addon's `docs/decision-guide.md` for the pattern comparison and the
“do not use graph” criteria.
