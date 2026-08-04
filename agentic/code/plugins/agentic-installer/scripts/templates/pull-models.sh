#!/usr/bin/env bash
# templates/pull-models.sh — Pull Ollama models after deployment (#677)
# Platform: linux, macos
# Params: OLLAMA_GEN_MODEL (required), OLLAMA_CONTAINER (default: ollama)
set -euo pipefail
source "$(dirname "$0")/../lib/params.sh"

aiwg_require_param OLLAMA_GEN_MODEL
OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-ollama}"

echo "Pulling Ollama model: ${OLLAMA_GEN_MODEL}"
echo "(This may take several minutes on first run — the model is downloaded once and cached.)"
echo ""

# Resolve the running container name from the service label
CONTAINER_ID=$(docker compose ps -q "${OLLAMA_CONTAINER}" 2>/dev/null || true)
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "ERROR: Ollama container '${OLLAMA_CONTAINER}' is not running."
  echo "Run the deploy step first."
  exit 1
fi

docker exec "${CONTAINER_ID}" ollama pull "${OLLAMA_GEN_MODEL}"

MODEL_BASE="${OLLAMA_GEN_MODEL%%:*}"
if docker exec "${CONTAINER_ID}" ollama list | grep -q "${MODEL_BASE}"; then
  echo "Model ${OLLAMA_GEN_MODEL} is ready."
else
  echo "ERROR: Model pull appeared to succeed but model is not listed by 'ollama list'."
  exit 1
fi
