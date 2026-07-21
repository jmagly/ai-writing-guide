#!/usr/bin/env bash
# aiwg-regenerate script entrypoint (#1266).
#
# Deterministic branch router for the common unqualified invocation. Explicit
# branch flags always win. Otherwise, an established project without an
# extracted snapshot is previewed and adopted transactionally; fresh or already
# adopted projects receive the ordinary canonical refresh.

set -euo pipefail

explicit_branch=false
dry_run=false
apply=false
canonical_controls=false
for arg in "$@"; do
  case "$arg" in
    --workspace|--existing-project|--full-inject|--legacy) explicit_branch=true ;;
    --dry-run) dry_run=true ;;
    --apply) apply=true ;;
    --force|--no-aiwg-md|--no-agents-md|--no-workspace-md) canonical_controls=true ;;
  esac
done

if [[ "$explicit_branch" == true ]]; then
  exec aiwg regenerate "$@"
fi

if [[ -f WORKSPACE.md ]] && grep -qF '<!-- AIWG:project-extraction:start -->' WORKSPACE.md; then
  exec aiwg regenerate --workspace "$@"
fi

existing_project=false
for signal in package.json pyproject.toml Cargo.toml go.mod composer.json pom.xml; do
  if [[ -f "$signal" ]]; then existing_project=true; break; fi
done
if [[ "$existing_project" == false ]]; then
  for signal in README.md README.mdx README.rst README.txt; do
    if [[ -f "$signal" ]]; then existing_project=true; break; fi
  done
fi
if [[ -f WORKSPACE.md ]] && ! grep -qF '<!-- AIWG:workspace-context:start -->' WORKSPACE.md; then
  existing_project=true
fi

if [[ "$existing_project" == true && "$canonical_controls" == false ]]; then
  if [[ "$dry_run" == true || "$apply" == true ]]; then
    exec aiwg regenerate --existing-project "$@"
  fi
  aiwg regenerate --existing-project "$@" --dry-run
  exec aiwg regenerate --existing-project "$@" --apply
fi

exec aiwg regenerate --workspace "$@"
