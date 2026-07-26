#!/bin/sh
set -eu

if [ -n "${AIWG_FIXTURE_SENTINEL:-}" ]; then
  printf 'executed\n' > "${AIWG_FIXTURE_SENTINEL}"
fi
