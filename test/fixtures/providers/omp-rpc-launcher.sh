#!/bin/sh
# Read per-test scripts through the interpreter; never execute freshly written files.
# OMP transport arguments are deliberately absorbed by this test-only launcher.
set -eu
exec /bin/sh "${AIWG_OMP_TEST_SCRIPT:?OMP fixture script is required}"
