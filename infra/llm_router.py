"""One public port in front of two vLLM servers inside the Modal container.

Convex uses a single AI_BASE_URL for chat and embeddings (decision in #122), while vLLM serves
one model per process. This router starts both processes, opens its port only after both are
healthy (uvicorn binds after lifespan startup, so Modal's web_server startup check waits for the
models), and forwards /v1/embeddings to bge-m3 and everything else to the chat model.
Authorization is passed through untouched; each vLLM checks the same --api-key.
"""

import asyncio
import json
import os
import subprocess
from contextlib import asynccontextmanager

import httpx
from starlette.applications import Starlette
from starlette.background import BackgroundTask
from starlette.requests import Request
from starlette.responses import StreamingResponse
from starlette.routing import Route

CHAT_PORT = int(os.environ.get("CHAT_PORT", "8001"))
EMBED_PORT = int(os.environ.get("EMBED_PORT", "8002"))
HEALTH_TIMEOUT_S = int(os.environ.get("HEALTH_TIMEOUT_S", "900"))

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "transfer-encoding",
    "te",
    "trailer",
    "upgrade",
    "proxy-authorization",
    "proxy-authenticate",
    "host",
    "content-length",
}


def upstream_port(path: str) -> int:
    return EMBED_PORT if path.rstrip("/").endswith("/embeddings") else CHAT_PORT


def vllm_command(env_name: str) -> list[str]:
    return json.loads(os.environ[env_name])


async def wait_healthy(client: httpx.AsyncClient, port: int, proc: subprocess.Popen) -> None:
    deadline = asyncio.get_running_loop().time() + HEALTH_TIMEOUT_S
    while asyncio.get_running_loop().time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"vLLM on port {port} exited with code {proc.returncode}")
        try:
            if (await client.get(f"http://127.0.0.1:{port}/health", timeout=5)).status_code == 200:
                return
        except httpx.TransportError:
            pass
        await asyncio.sleep(2)
    raise RuntimeError(f"vLLM on port {port} not healthy after {HEALTH_TIMEOUT_S}s")


@asynccontextmanager
async def lifespan(app: Starlette):
    processes: list[subprocess.Popen] = []
    app.state.client = httpx.AsyncClient(timeout=httpx.Timeout(None, connect=10))
    try:
        if os.environ.get("ROUTER_SPAWN", "1") == "1":
            # Sequential start: vLLM sizes its memory budget from what is free when it starts,
            # so two processes profiling the same GPU at once can over-commit it.
            for env_name, port in (("EMBED_CMD", EMBED_PORT), ("CHAT_CMD", CHAT_PORT)):
                proc = subprocess.Popen(vllm_command(env_name))
                processes.append(proc)
                await wait_healthy(app.state.client, port, proc)
        yield
    finally:
        await app.state.client.aclose()
        for proc in processes:
            proc.terminate()


async def proxy(request: Request) -> StreamingResponse:
    client: httpx.AsyncClient = request.app.state.client
    url = f"http://127.0.0.1:{upstream_port(request.url.path)}{request.url.path}"
    if request.url.query:
        url += f"?{request.url.query}"
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    upstream = await client.send(
        client.build_request(request.method, url, headers=headers, content=await request.body()),
        stream=True,
    )
    return StreamingResponse(
        upstream.aiter_raw(),
        status_code=upstream.status_code,
        headers={k: v for k, v in upstream.headers.items() if k.lower() not in HOP_BY_HOP},
        background=BackgroundTask(upstream.aclose),
    )


app = Starlette(
    routes=[Route("/{path:path}", proxy, methods=["GET", "POST", "DELETE", "OPTIONS"])],
    lifespan=lifespan,
)
