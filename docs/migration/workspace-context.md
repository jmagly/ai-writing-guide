# WORKSPACE.md migration notes

This migration is optional and backward compatible. Preview it with
`aiwg workspace-context migrate --dry-run`; no provider file is rewritten until
`--apply` is supplied. Review the reported duplicate, conflict, scope, and
possible-credential findings first.

After applying, commit `WORKSPACE.md`, provider bootstraps, and attributed files
under `.aiwg/context/providers/`. Transaction preimages under
`.aiwg/context-migrations/` are recoverable local evidence and support
`aiwg workspace-context rollback`. Nested `AGENTS.md`, `CLAUDE.md`, and
`WARP.md` files are not flattened or rewritten.

If an existing `WORKSPACE.md` has no AIWG ownership markers, routine generation
leaves it untouched. The explicit migration command adopts it into the protected
operator region and records a transaction before replacing provider adapters.

For a complete existing-project adoption, use
`aiwg regenerate --existing-project --dry-run`, review the exact synthesized
project block and target list, then rerun with `--apply`. This branch includes
the generated root and normalized AIWG context in the same manifest, migrates an
active `AGENTS.override.md` before replacing it with a WORKSPACE-first bootstrap,
and prints the exact rollback command. It rejects partial-write flags, possible
credentials, and unresolved directive conflicts.
