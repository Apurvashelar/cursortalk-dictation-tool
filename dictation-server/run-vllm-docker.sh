#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/vllm.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  echo "Copy $SCRIPT_DIR/vllm.env.example to $SCRIPT_DIR/vllm.env and update values first."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

: "${VLLM_IMAGE:=vllm/vllm-openai:latest}"
: "${MODEL_DIR:=/home/ubuntu/model}"
: "${HOST:=127.0.0.1}"
: "${PORT:=8000}"
: "${MODEL_ID:=/models}"
: "${QUANTIZATION:=}"
: "${DTYPE:=float16}"
: "${MAX_MODEL_LEN:=2048}"
: "${VLLM_ATTENTION_BACKEND:=TRITON_ATTN}"
: "${EXTRA_ARGS:=--enforce-eager}"

if [[ ! -d "$MODEL_DIR" ]]; then
  echo "Model directory does not exist: $MODEL_DIR"
  exit 1
fi

echo "Starting CursorTalk vLLM container"
echo "  image:      $VLLM_IMAGE"
echo "  model dir:  $MODEL_DIR"
echo "  host:port:  $HOST:$PORT"
echo "  model id:   $MODEL_ID"

docker rm -f cursortalk-vllm >/dev/null 2>&1 || true

ARGS=(
  --model "$MODEL_ID"
  --dtype "$DTYPE"
  --max-model-len "$MAX_MODEL_LEN"
  --port "$PORT"
  --host "$HOST"
)

if [[ -n "$QUANTIZATION" ]]; then
  ARGS+=(--quantization "$QUANTIZATION")
fi

if [[ -n "$EXTRA_ARGS" ]]; then
  # shellcheck disable=SC2206
  EXTRA_ARGS_ARRAY=($EXTRA_ARGS)
  ARGS+=("${EXTRA_ARGS_ARRAY[@]}")
fi

exec docker run --rm \
  --gpus all \
  --network host \
  --ipc=host \
  -e VLLM_ATTENTION_BACKEND="$VLLM_ATTENTION_BACKEND" \
  -v "$MODEL_DIR":"$MODEL_ID":ro \
  --name cursortalk-vllm \
  "$VLLM_IMAGE" \
  "${ARGS[@]}"
