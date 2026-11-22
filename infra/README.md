# Model PLLuM i embeddingi na Modal.com (#96, #122)

Jeden adres zgodny z OpenAI dla produkcji:

- `POST /v1/chat/completions` → `CYFRAGOVPL/PLLuM-12B-chat-2512` (Apache-2.0, bez bramki na Hugging Face),
- `POST /v1/embeddings` → `bge-m3` (1024 wymiary, wymagane przez indeks `knowledgeChunks`).

Oba modele działają w jednym kontenerze na jednym GPU, każdy w osobnym procesie vLLM. Mały router (`llm_router.py`) wystawia jeden port i kieruje `/v1/embeddings` do `bge-m3`, a resztę do czatu. Dzięki temu `AI_BASE_URL` i `AI_API_KEY` w Convex zostają wspólne i adaptera nie trzeba zmieniać (decyzja w #122).

| Plik            | Rola                                                        |
| --------------- | ----------------------------------------------------------- |
| `modal_llm.py`  | aplikacja Modal: obraz, GPU, wolumeny z wagami, skalowanie  |
| `llm_router.py` | uruchamia oba procesy vLLM po kolei i przekazuje zapytania  |
| `smoke_llm.py`  | test wdrożonego adresu (czat + 1024 wymiary) i rozgrzewanie |

## GPU

| `LLM_GPU`         | Czat                                 | Uwagi                                             |
| ----------------- | ------------------------------------ | ------------------------------------------------- |
| `L40S` (domyślne) | BF16, pełna jakość                   | 48 GB, droższa karta                              |
| `L4`              | FP8 (kwantyzacja przy ładowaniu wag) | 24 GB, taniej; 12B w BF16 (~24 GB) nie mieści się |

Aktualne stawki: [modal.com/pricing](https://modal.com/pricing). Płacisz tylko, gdy kontener działa (`min_containers=0`, uśpienie po 5 min bezczynności).

## Wdrożenie (jednorazowo)

```bash
pip install modal
modal setup
python -c "import secrets; print(secrets.token_urlsafe(32))"   # klucz API
modal secret create llm-secrets VLLM_API_KEY="<klucz>"
modal deploy infra/modal_llm.py
```

Adres pojawi się w wyniku `modal deploy`: `https://<workspace>--hackathon-polish-llm-serve.modal.run`. Zmienne `LLM_GPU`, `LLM_MIN_CONTAINERS` i `LLM_CHAT_MODEL` ustawiasz w powłoce przed `modal deploy` (PowerShell: `$env:LLM_GPU="L4"; modal deploy infra/modal_llm.py`).

Test i pierwsze pobranie wag (kilka minut przy pierwszym starcie, potem wagi są w wolumenie `huggingface-cache`):

```bash
AI_BASE_URL="https://<workspace>--hackathon-polish-llm-serve.modal.run/v1" \
AI_API_KEY="<klucz>" AI_MODEL="CYFRAGOVPL/PLLuM-12B-chat-2512" python infra/smoke_llm.py
```

## Podpięcie tylko pod produkcję

Robi człowiek, na polecenie zespołu. Dev i preview zostają na `AI_PROVIDER=mock`.

```bash
npx convex env set --prod AI_PROVIDER openai-compatible
npx convex env set --prod AI_BASE_URL "https://<workspace>--hackathon-polish-llm-serve.modal.run/v1"
npx convex env set --prod AI_API_KEY "<klucz>"
npx convex env set --prod AI_MODEL "CYFRAGOVPL/PLLuM-12B-chat-2512"
npx convex env set --prod AI_EMBEDDING_MODEL bge-m3
npx convex env set --prod AI_TIMEOUT_MS 120000
```

## Przed prezentacją i po niej

Zimny start trwa dłużej niż maksymalny `AI_TIMEOUT_MS` (120 s), więc pierwsze zapytania po uśpieniu kończą się błędem `timeout`. Przed demo:

```bash
LLM_MIN_CONTAINERS=1 modal deploy infra/modal_llm.py   # stale ciepły kontener
python infra/smoke_llm.py                              # rozgrzanie, ze zmiennymi jak wyżej
```

Po demo: `modal deploy infra/modal_llm.py` (z powrotem `0`) albo `modal app stop hackathon-polish-llm`.

## Co nie jest jeszcze sprawdzone

- Wdrożenie na prawdziwym GPU. Lokalnie sprawdzono router (kolejny start, routing, przekazanie `Authorization`, awarię procesu) na atrapach vLLM oraz walidację definicji aplikacji przez SDK Modal 1.6.4.
- Czy szablon czatu PLLuM-2512 przyjmuje rolę `system`. `smoke_llm.py` wysyła ją celowo; błąd 400 w tym miejscu oznacza problem z szablonem.
- Podział pamięci GPU (`0.10` dla `bge-m3`, `0.80` dla czatu), zwłaszcza na L4.
