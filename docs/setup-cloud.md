# Cloud Mode Setup

This guide walks through setting up the Enterprise RAG Assistant in **Cloud Mode**, using OpenAI GPT-4o-mini for LLM inference and Weaviate Cloud for vector storage.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Frontend package manager |
| Git | latest | Source control |

### Required Accounts

| Service | What You Need | Free Tier |
|---------|---------------|-----------|
| [OpenAI](https://platform.openai.com/) | API key (`sk-...`) | Pay-per-token |
| [Weaviate Cloud](https://console.weaviate.cloud/) | Cluster URL + API key | ✅ Free sandbox tier |

> [!CAUTION]
> Cloud mode sends data to external APIs (OpenAI, Weaviate Cloud). Do **not** use this mode for GDPR-sensitive or confidential data without proper legal review.

---

## Step 1 — Clone the Repository

```bash
git clone <repo-url>
cd agentic-enterprise-rag-langgraph
```

## Step 2 — Create Your Weaviate Cloud Cluster

1. Go to [Weaviate Cloud Console](https://console.weaviate.cloud/).
2. Click **Create Cluster** → choose **Free Sandbox**.
3. Wait for the cluster to become `Ready`.
4. Copy the **Cluster URL** (e.g., `https://your-cluster.weaviate.network`).
5. Go to **API Keys** → copy the **Admin API Key**.

## Step 3 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set the following values for cloud mode:

```dotenv
# System Mode — must be "cloud"
SYSTEM_MODE=cloud

# OpenAI
OPENAI_API_KEY=sk-your-actual-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small

# Weaviate Cloud
WEAVIATE_CLOUD_URL=https://your-cluster.weaviate.network
WEAVIATE_CLOUD_API_KEY=your-weaviate-api-key

# Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

> [!IMPORTANT]
> Replace `sk-your-actual-openai-api-key` with your real OpenAI API key. Without it, all queries will fail with authentication errors.

## Step 4 — Start the Backend

No Docker containers are needed for cloud mode. Start the backend directly:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

You should see:

```
Starting Enterprise RAG Assistant...
System mode: cloud
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
  "mode": "cloud",
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
2. Verify the header shows **CLOUD MODE** with a purple badge.
3. Upload a test document (PDF, TXT, or MD).
4. Ask a question about the uploaded document.
5. Check the **Cost Tracking** panel on the right to see token usage and costs.

### Quick Smoke Test via API

```bash
# Check mode
curl http://localhost:8000/mode

# Upload a document
curl -X POST http://localhost:8000/upload \
  -F "file=@path/to/your/document.pdf"

# Query the system
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize the uploaded document", "mode": "agent"}'
```

---

## Switching Between Local and Cloud

You can switch modes at runtime without restarting the server:

### Via UI

Click the **LOCAL / CLOUD** toggle at the bottom of the chat input area.

### Via API

```bash
# Switch to cloud
curl -X POST http://localhost:8000/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "cloud"}'

# Switch to local
curl -X POST http://localhost:8000/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "local"}'
```

> [!WARNING]
> Switching to local mode at runtime requires Ollama and local Weaviate to be running. If they are not available, the switch will fail.

---

## Cost Management

Cloud mode incurs costs from OpenAI's API. Monitor usage through:

| Endpoint | Description |
|----------|-------------|
| `GET /metrics` | Current session token usage and cost |
| `POST /metrics/reset` | Reset the cost tracker |

Typical costs per query (GPT-4o-mini):
- **Simple RAG query**: ~$0.001–$0.003
- **Agent query with tools**: ~$0.002–$0.005

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Unauthorized` from OpenAI | Invalid or expired API key | Check `OPENAI_API_KEY` in `.env` |
| `Connection error` to Weaviate Cloud | Wrong cluster URL or key | Verify `WEAVIATE_CLOUD_URL` and `WEAVIATE_CLOUD_API_KEY` |
| `RateLimitError` | OpenAI rate limit exceeded | Wait and retry, or upgrade your OpenAI plan |
| High costs | Excessive token usage | Monitor via `/metrics` and use RAG mode instead of Agent mode for simple queries |
| Frontend shows "Network Error" | Backend not running or CORS issue | Ensure backend is running and `FRONTEND_URL` matches |
