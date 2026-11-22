"""PLLuM 12B (chat) + bge-m3 (embeddings) on Modal.com behind one OpenAI-compatible URL (#96, #122).

Deploy:  modal deploy infra/modal_llm.py
Config is read from the deploying shell and baked into the image env, so the container sees the
same values the decorators did:
  LLM_GPU              L40S (default, BF16) or L4 (24 GB: chat model quantised to FP8 on the fly)
  LLM_MIN_CONTAINERS   0 (default, scale to zero) or 1 (warm, before the demo)
  LLM_CHAT_MODEL       CYFRAGOVPL/PLLuM-12B-chat-2512 (default)
Secret `llm-secrets` must hold VLLM_API_KEY (vLLM reads it natively) and, for gated models, HF_TOKEN.
"""

import json
import os
import subprocess
from pathlib import Path

import modal

APP_NAME = "hackathon-polish-llm"
GPU = os.environ.get("LLM_GPU", "L40S")
MIN_CONTAINERS = int(os.environ.get("LLM_MIN_CONTAINERS", "0"))
CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL", "CYFRAGOVPL/PLLuM-12B-chat-2512")
# Must stay bge-m3: the knowledgeChunks vector index has 1024 dimensions and AI_EMBEDDING_MODEL
# defaults to this served name.
EMBED_MODEL = "BAAI/bge-m3"
EMBED_SERVED_NAME = "bge-m3"
PUBLIC_PORT, CHAT_PORT, EMBED_PORT = 8000, 8001, 8002
MAX_MODEL_LEN = 8192
MINUTES = 60

if GPU not in ("L40S", "L4"):
    raise ValueError("LLM_GPU must be L40S or L4")

# 12B in BF16 is ~24 GB of weights, which alone fills an L4.
chat_quantization = ["--quantization", "fp8"] if GPU == "L4" else []

embed_cmd = [
    "vllm", "serve", EMBED_MODEL,
    "--served-model-name", EMBED_SERVED_NAME,
    "--runner", "pooling",
    "--host", "127.0.0.1", "--port", str(EMBED_PORT),
    "--max-model-len", str(MAX_MODEL_LEN),
    "--gpu-memory-utilization", "0.10",
    "--enforce-eager",
]  # fmt: skip
chat_cmd = [
    "vllm", "serve", CHAT_MODEL,
    "--served-model-name", CHAT_MODEL,
    "--host", "127.0.0.1", "--port", str(CHAT_PORT),
    "--max-model-len", str(MAX_MODEL_LEN),
    "--gpu-memory-utilization", "0.80",
    "--enforce-eager",  # skips CUDA graph capture: faster cold start, slightly slower decoding
    *chat_quantization,
]  # fmt: skip

image = (
    modal.Image.from_registry("nvidia/cuda:12.9.0-devel-ubuntu22.04", add_python="3.12")
    .entrypoint([])
    # vLLM already depends on uvicorn, starlette and httpx, which the router uses.
    .uv_pip_install("vllm==0.21.0")
    .env(
        {
            "HF_XET_HIGH_PERFORMANCE": "1",
            "LLM_GPU": GPU,
            "LLM_CHAT_MODEL": CHAT_MODEL,
            "CHAT_PORT": str(CHAT_PORT),
            "EMBED_PORT": str(EMBED_PORT),
            "CHAT_CMD": json.dumps(chat_cmd),
            "EMBED_CMD": json.dumps(embed_cmd),
        }
    )
    .add_local_file(Path(__file__).parent / "llm_router.py", "/root/llm_router.py")
)

hf_cache = modal.Volume.from_name("huggingface-cache", create_if_missing=True)
vllm_cache = modal.Volume.from_name("vllm-cache", create_if_missing=True)

app = modal.App(APP_NAME)


@app.function(
    image=image,
    gpu=GPU,
    min_containers=MIN_CONTAINERS,
    scaledown_window=5 * MINUTES,
    timeout=10 * MINUTES,
    volumes={"/root/.cache/huggingface": hf_cache, "/root/.cache/vllm": vllm_cache},
    secrets=[modal.Secret.from_name("llm-secrets")],
)
@modal.concurrent(max_inputs=32)
@modal.web_server(port=PUBLIC_PORT, startup_timeout=20 * MINUTES)
def serve():
    subprocess.Popen(
        ["uvicorn", "llm_router:app", "--host", "0.0.0.0", "--port", str(PUBLIC_PORT)],
        cwd="/root",
    )
