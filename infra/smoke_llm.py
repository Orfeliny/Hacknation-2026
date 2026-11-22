"""Smoke test of the deployed endpoint, the way the Convex adapter calls it.

Usage (same names as Convex env, values from the Modal deploy):
  AI_BASE_URL=https://<workspace>--hackathon-polish-llm-serve.modal.run/v1 \
  AI_API_KEY=<key> AI_MODEL=CYFRAGOVPL/PLLuM-12B-chat-2512 python infra/smoke_llm.py

The first call after scale-to-zero waits for the cold start (several minutes), which also makes
this the warm-up before a demo. Standard library only.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

EMBEDDING_DIMENSIONS = 1024
COLD_START_TIMEOUT_S = 20 * 60


def post(base_url: str, api_key: str, path: str, body: dict) -> dict:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=COLD_START_TIMEOUT_S) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f"FAIL {path}: HTTP {error.code} {error.read().decode(errors='replace')[:500]}")
    print(f"{path}: {time.monotonic() - started:.1f} s")
    return payload


def main() -> None:
    try:
        base_url = os.environ["AI_BASE_URL"]
        api_key = os.environ["AI_API_KEY"]
        model = os.environ["AI_MODEL"]
    except KeyError as missing:
        sys.exit(f"Missing env {missing}")
    embedding_model = os.environ.get("AI_EMBEDDING_MODEL", "bge-m3")

    # A system message is sent on purpose: some Mistral-based chat templates reject the system role.
    chat = post(
        base_url,
        api_key,
        "/chat/completions",
        {
            "model": model,
            "messages": [
                {"role": "system", "content": "Odpowiadasz krótko, po polsku."},
                {"role": "user", "content": "Czym jest ocena okresowa urzędnika? Jedno zdanie."},
            ],
            "max_tokens": 120,
            "temperature": 0.3,
        },
    )
    print("chat:", chat["choices"][0]["message"]["content"].strip())

    texts = ["Ocena okresowa członka korpusu służby cywilnej.", "Indywidualny program rozwoju zawodowego."]
    embeddings = post(base_url, api_key, "/embeddings", {"model": embedding_model, "input": texts})
    vectors = sorted(embeddings["data"], key=lambda item: item["index"])
    dimensions = [len(item["embedding"]) for item in vectors]
    if len(vectors) != len(texts) or any(d != EMBEDDING_DIMENSIONS for d in dimensions):
        sys.exit(f"FAIL /embeddings: expected {len(texts)} x {EMBEDDING_DIMENSIONS}, got {dimensions}")
    print(f"embeddings: {len(vectors)} x {EMBEDDING_DIMENSIONS}")
    print("OK")


if __name__ == "__main__":
    main()
