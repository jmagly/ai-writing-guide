#!/usr/bin/env bash
#
# Manual provider test harness for the external agent loop (#1585 LFD controls).
#
# Runs a single, bounded ralph-external loop against a chosen provider in a
# throwaway scratch workspace, so you can manually verify the LFD controls
# (budget stops, exploration quota, stall rule, hypothesis records) end-to-end
# against a REAL provider CLI — not just the stub UAT.
#
# Live-testable providers depend on which CLIs are installed and authenticated
# on THIS workstation. Per the operator note, codex is the primary live target;
# other providers run only where their CLI is present.
#
# Usage:
#   tools/ralph-external/manual-provider-test.sh [--provider <name>] [options]
#
#   --provider <name>     claude | codex | opencode | factory (default: codex)
#                         (the 'stub' provider is UAT-only, not a runtime provider)
#   --objective "<text>"  Task objective (default: a trivial, safe file-write task)
#   --completion "<text>" Completion criteria (default matches the default objective)
#   --scenario <name>     Preset that exercises a specific LFD control:
#                           budget    → tiny wall-clock ceiling → budget stop
#                           quota     → declared exploration quota k=1
#                           stall     → observe stall-rule directive across cycles
#                           plain     → no LFD controls (default)
#   --max-iterations <n>  Iteration cap (default: 3)
#   --keep                Keep the scratch workspace after the run (default: cleaned)
#   --dry-run             Print the command that would run, then exit
#
# Env:
#   AIWG_MANUAL_TEST_DIR  Override the scratch workspace parent (default: mktemp -d)
#
# This script is a manual, operator-run diagnostic — it is NOT part of CI.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INDEX="${REPO_ROOT}/tools/ralph-external/index.mjs"

PROVIDER="codex"
OBJECTIVE=""
COMPLETION=""
SCENARIO="plain"
MAX_ITERATIONS="3"
KEEP="0"
DRY_RUN="0"

while [ $# -gt 0 ]; do
  case "$1" in
    --provider) PROVIDER="$2"; shift 2 ;;
    --objective) OBJECTIVE="$2"; shift 2 ;;
    --completion) COMPLETION="$2"; shift 2 ;;
    --scenario) SCENARIO="$2"; shift 2 ;;
    --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
    --keep) KEEP="1"; shift ;;
    --dry-run) DRY_RUN="1"; shift ;;
    -h|--help)
      sed -n '3,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Default trivial, safe task — write a known file, verifiable without a real
# build. Keeps live-provider cost minimal.
if [ -z "${OBJECTIVE}" ]; then
  OBJECTIVE="Create a file named DONE.txt in the current directory containing exactly the word READY."
fi
if [ -z "${COMPLETION}" ]; then
  COMPLETION="A file DONE.txt exists in the working directory and contains READY."
fi

# Scenario → extra LFD flags
LFD_FLAGS=()
case "${SCENARIO}" in
  plain) ;;
  budget)   LFD_FLAGS=(--max-wall-clock-minutes 0.05) ;;
  quota)    LFD_FLAGS=(--exploration-quota 1) ;;
  stall)    ;;  # stall directive emerges from non-improving cycles; no flag
  *) echo "Unknown scenario: ${SCENARIO} (use plain|budget|quota|stall)" >&2; exit 2 ;;
esac

SCRATCH_PARENT="${AIWG_MANUAL_TEST_DIR:-$(mktemp -d)}"
WORKDIR="${SCRATCH_PARENT}/ralph-manual-${PROVIDER}-${SCENARIO}-$$"
mkdir -p "${WORKDIR}"

cleanup() {
  if [ "${KEEP}" = "1" ]; then
    echo ""
    echo "Scratch workspace kept at: ${WORKDIR}"
    echo "LFD artifacts: ${WORKDIR}/.aiwg/ralph-external/"
  else
    rm -rf "${WORKDIR}"
  fi
}
trap cleanup EXIT

CMD=(node "${INDEX}" "${OBJECTIVE}"
  --completion "${COMPLETION}"
  --provider "${PROVIDER}"
  --max-iterations "${MAX_ITERATIONS}"
  --verbose)
if [ "${#LFD_FLAGS[@]}" -gt 0 ]; then
  CMD+=("${LFD_FLAGS[@]}")
fi

echo "=== Manual provider test ==="
echo "Provider:    ${PROVIDER}"
echo "Scenario:    ${SCENARIO}"
echo "Workspace:   ${WORKDIR}"
echo "Command:     ${CMD[*]}"
echo "============================"

if [ "${DRY_RUN}" = "1" ]; then
  echo "(dry-run: not executed)"
  exit 0
fi

# Run in the scratch workspace so the loop's .aiwg/ output is isolated.
cd "${WORKDIR}"
set +e
"${CMD[@]}"
EXIT_CODE=$?
set -e

echo ""
echo "=== Result (exit ${EXIT_CODE}) ==="
LOOP_DIR="${WORKDIR}/.aiwg/ralph-external"
if [ -d "${LOOP_DIR}" ]; then
  echo "LFD artifacts under ${LOOP_DIR}:"
  find "${LOOP_DIR}" -maxdepth 3 -name 'budget-stop-report.json' -o -name 'completion-report.md' -o -name 'iteration-analytics-report.md' 2>/dev/null | sed 's/^/  /'
  echo ""
  echo "Prompts (inspect LFD directives injected per iteration):"
  find "${LOOP_DIR}" -path '*prompts*' -name '*.txt' 2>/dev/null | sort | sed 's/^/  /'
fi

exit ${EXIT_CODE}
