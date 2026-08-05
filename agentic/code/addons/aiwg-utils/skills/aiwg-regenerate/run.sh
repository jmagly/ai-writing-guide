#!/usr/bin/env bash
# aiwg-regenerate script entrypoint (#1266).
#
# Thin executable-skill adapter. Branch inference belongs to the TypeScript CLI
# so direct and skill-backed invocations always share one implementation.

set -euo pipefail
exec aiwg regenerate "$@"
