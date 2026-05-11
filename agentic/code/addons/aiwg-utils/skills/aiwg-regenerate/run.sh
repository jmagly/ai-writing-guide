#!/usr/bin/env bash
# aiwg-regenerate script entrypoint (#1266).
#
# Thin, deterministic wrapper that shells out to `aiwg regenerate "$@"`.
# Existence of this entrypoint lets `aiwg run skill aiwg-regenerate` work on
# every platform without going through the agent-mediated instructional skill.
#
# Forwards all CLI arguments verbatim. Exit code is the CLI's exit code.

set -euo pipefail

exec aiwg regenerate "$@"
