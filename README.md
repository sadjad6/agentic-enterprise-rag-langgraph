# 🧠 Enterprise RAG Assistant

A portfolio implementation of an **agentic RAG (Retrieval-Augmented Generation) assistant** with LangGraph workflows, German/English query handling, Weaviate hybrid retrieval, local and cloud LLM configuration, and estimated token/cost tracking. It includes optional regex-based PII masking for queries; GDPR compliance has not been established.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Tailwind)             │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐    │
│  │  Chat   │ │ Document │ │   Cost    │ │   Mode Toggle    │    │
│  │Interface│ │  Upload  │ │ Dashboard │ │  (Local/Cloud)   │    │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └──────────────────┘    │
│       └───────────┴─────────────┴───────────────┐                │
│                                                 ▼                │
│                 Vercel deployment configuration                  │
└─────────────────────────────┬────────────────────────────────────┘
                              │ REST API
┌─────────────────────────────▼────────────────────────────────────┐
│                 FastAPI Backend (Railway config)                 │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  /query  │  /upload  │  /metrics  │  /health  │  /mode    │   │
│  └────┬─────┴─────┬─────┴──────┬─────┴─────┬─────┴─────┬────┘   │
│       │           │            │           │           │         │
│  ┌────▼────┐ ┌────▼─────┐ ┌───▼────┐ ┌────▼─────┐ ┌───▼────┐   │
│  │LangGraph│ │ Document │ │  Cost  │ │  Health  │ │  Mode  │   │
│  │  Agent  │ │Processor │ │Tracker │ │  Check   │ │ Switch │   │
│  │         │ │(PDF/TXT/ │ │(Token  │ │          │ │        │   │
│  │ Nodes:  │ │ Markdown)│ │ Count) │ │          │ │        │   │
│  │•Decision│ └──────────┘ └────────┘ └──────────┘ └────────┘   │
│  │•Tools   │                                                    │
│  │•Response│    ┌──────────────────────────────────────────┐     │
│  └────┬────┘    │           LLM Provider                   │     │
│       │         │  Local: Ollama ←→ Cloud: GPT-4o-mini     │     │
│       │         └──────────────────────────────────────────┘     │
│  ┌────▼──────────────────────────────────────┐                   │
│  │              RAG Pipeline                  │                   │
│  │  Hybrid Search (Vector + BM25)             │                   │
│  │  Source Citations • Multilingual (DE/EN)   │                   │
│  └────┬───────────────────────────────────────┘                   │
│       │                                                          │
│  ┌────▼────┐  ┌───────────┐  ┌──────────────────┐               │
│  │Optional  │  │  Slack    │  │  Teams           │               │
│  │PII mask │  │  Bot      │  │  Bot             │               │
│  └─────────┘  └───────────┘  └──────────────────┘               │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────▼───────────────────┐
              │        Weaviate (Vector DB)         │
              │  Local: Docker  │  Cloud: Free Tier │
              └────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.12+, [uv](https://docs.astral.sh/uv/)
- Node.js 18+, npm
- Docker & Docker Compose
- (Optional) Ollama for local LLM
- **OCR Dependencies (If running locally via `uvicorn` on Windows):** 
  - [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (must be added to PATH)
  - [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases) (must be added to PATH)
  *(Note: The provided Dockerfile handles this automatically if deploying via Docker)*

### 1. Clone & Configure

```bash
git clone https://github.com/sadjad6/agentic-enterprise-rag-langgraph.git
cd agentic-enterprise-rag-langgraph
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Infrastructure (Docker)

```bash
docker-compose up -d weaviate ollama
# Pull a local model (optional)
docker exec -it $(docker ps -qf "ancestor=ollama/ollama") ollama pull llama3.2:1b
docker exec -it $(docker ps -qf "ancestor=ollama/ollama") ollama pull nomic-embed-text
```

### 3. Start Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## System Modes

| Feature | Local configuration | Cloud configuration |
|---------|---------------------|---------------------|
| LLM | Ollama (`llama3.2:1b` default) | OpenAI (`gpt-4o-mini` default) |
| Embeddings | Ollama (`nomic-embed-text`) | OpenAI (`text-embedding-3-small`) |
| Vector DB | Docker Weaviate | Weaviate Cloud |
| Model API cost | No model API charge; local compute still costs | Usage-based API charges |

Switch modes via the UI toggle or `POST /mode` endpoint. The endpoint changes an in-memory setting, while the vector-store connection is cached; restart after changing the configured vector-store mode. Local mode does not guarantee that data stays on the local network: LLM and embedding providers contain an OpenAI fallback when local provider construction fails and credentials are present. Review the configuration and data flow before using sensitive documents.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/query` | Query (RAG or Agent mode) |
| POST | `/upload` | Upload & ingest document |
| GET | `/documents` | List indexed documents |
| GET | `/metrics` | Cost tracking data |
| POST | `/metrics/reset` | Reset metrics |
| GET | `/health` | System health check |
| GET/POST | `/mode` | Get/set system mode |
| POST | `/integrations/slack/events` | Slack bot webhook |
| POST | `/integrations/teams/webhook` | Teams bot webhook |

## Demo Queries

```
# English - Document search
"What is the company's data retention policy?"

# German - Automatic language detection
"Welche Sicherheitsrichtlinien gelten für Remote-Arbeit?"

# Agent with calculator tool
"What is sqrt(144) + 15 * 3?"

# Agent with external API
"What is the current weather in Berlin?"
```

## Testing

```bash
cd backend
uv sync --extra dev
uv run pytest tests/ -v
```

```bash
cd frontend
npm install
npm run test:run
npm run build
```

## Evaluation

`backend/evaluation/evaluate.py` contains sample checks for answer presence, expected terms and sources, language, and tool use. It does not report a published quality benchmark. The script currently omits the `session_id` required by `POST /query`; add that field before running the evaluation command.

## Deployment

Railway and Vercel configuration files are included. This repository does not establish that a public deployment is running.

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set build directory to `backend/`
3. Add environment variables from `.env`
4. Railway auto-detects `railway.toml`

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Set `VITE_API_URL` to your Railway backend URL
4. Deploy

## Tech Stack

**Backend:** Python 3.12 · FastAPI · LangChain · LangGraph · Weaviate v4 · Ollama · OpenAI  
**Frontend:** React · TypeScript · Tailwind CSS · Recharts · Lucide Icons  
**Infrastructure:** Docker · Railway/Vercel deployment configuration

## License

MIT

