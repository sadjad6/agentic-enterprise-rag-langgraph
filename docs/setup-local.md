# Local Mode Setup (GDPR-Safe)

This guide walks through setting up the Enterprise RAG Assistant in **Local Mode**, where all data remains on your machine. No API keys are sent to external services.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Frontend package manager |
| Docker Desktop | latest | Runs Weaviate and Ollama containers |
| Git | latest | Source control |

> [!IMPORTANT]
> Docker Desktop must be running **before** you start the infrastructure containers.

---

## Step 1 — Clone the Repository

```bash
git clone <repo-url>
cd agentic-enterprise-rag-langgraph
```

## Step 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and verify the following values are set for local mode:

```dotenv
# System Mode — must be "local"
SYSTEM_MODE=local

# Ollama (Local LLM)
OLLAMA_BASE_URL=http://localhost:11600
OLLAMA_MODEL=mistral
OLLAMA_EMBED_MODEL=nomic-embed-text

# Weaviate (Local Vector DB)
WEAVIATE_LOCAL_URL=http://localhost:8080
WEAVIATE_GRPC_PORT=50051

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

> [!NOTE]
> You do **not** need `OPENAI_API_KEY`, `WEAVIATE_CLOUD_URL`, or any cloud credentials for local mode. Leave them as placeholder values.

## Step 3 — Start Infrastructure (Docker)

Start the Weaviate vector database and Ollama LLM server:

```bash
docker-compose up -d weaviate ollama
```

Verify both containers are running:

```bash
docker ps
```

You should see two containers:
- `weaviate` listening on ports `8080` (REST) and `50051` (gRPC)
- `ollama` listening on port `11600`

### Pull the Required Models

Ollama needs to download the LLM and embedding models on first run:

```bash
# Pull the LLM model (≈4 GB)
docker exec -it $(docker ps -qf "ancestor=ollama/ollama") ollama pull mistral

# Pull the embedding model (≈300 MB)
docker exec -it $(docker ps -qf "ancestor=ollama/ollama") ollama pull nomic-embed-text
```

> [!TIP]
> On Windows PowerShell, replace the `$(...)` subshell with the actual container ID from `docker ps`.
>
> ```powershell
> docker exec -it <container_id> ollama pull mistral
> docker exec -it <container_id> ollama pull nomic-embed-text
> ```

### Verify Ollama is Ready

```bash
curl http://localhost:11600/api/tags
```

You should see both `mistral` and `nomic-embed-text` listed.

### Verify Weaviate is Ready

```bash
curl http://localhost:8080/v1/.well-known/ready
```

Should return `HTTP 200`.

## Step 4 — Start the Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

You should see:

```
Starting Enterprise RAG Assistant...
System mode: local
Uvicorn running on http://0.0.0.0:8000
```

### Verify the Backend

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "mode": "local",
  "components": { ... }
}
```

## Step 5 — Start the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend is now available at [http://localhost:5173](http://localhost:5173).

## Step 6 — Test the Full Pipeline

1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Verify the header shows **LOCAL MODE** with a green badge.
3. Upload a test document (PDF, TXT, or MD) using the sidebar.
4. Ask a question about the uploaded document.
5. Confirm the response includes source citations from your document.

### Quick Smoke Test via API

```bash
# Upload a document
curl -X POST http://localhost:8000/upload \
  -F "file=@path/to/your/document.pdf"

# Query the system
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize the uploaded document", "mode": "rag"}'
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on port 11600 | Ollama container not running | `docker-compose up -d ollama` |
| `Connection refused` on port 8080 | Weaviate container not running | `docker-compose up -d weaviate` |
| `model not found` errors | Models not pulled yet | Run `ollama pull mistral` inside the container |
| Slow first response (30s+) | Model loading into VRAM on first query | Wait for the first response; subsequent queries are faster |
| Backend crashes on startup | Missing `.env` file | Run `cp .env.example .env` |
| Frontend shows "Network Error" | Backend not running or wrong port | Ensure backend is running on port 8000 |

---

## Hardware Recommendations

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16 GB+ |
| vRAM (GPU) | — | 6 GB+ (for faster Ollama inference) |
| Disk | 10 GB free | 20 GB free |
| CPU | 4 cores | 8+ cores |

> [!NOTE]
> Ollama runs on CPU if no GPU is detected, but inference will be significantly slower. For best performance, use a machine with a CUDA-compatible NVIDIA GPU.
