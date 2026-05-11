#!/usr/bin/env bash
# aiwg-refresh script entrypoint (#1267).
#
# Thin, deterministic wrapper that shells out to `aiwg refresh "$@"`.
# Existence of this entrypoint lets `aiwg run skill aiwg-refresh` work on
# every platform (hermes, Claude, Codex, …) without going through the
# agent-mediated instructional skill.
#
# Forwards all CLI arguments verbatim. Exit code is the CLI's exit code.

set -euo pipefail

exec aiwg refresh "$@"
