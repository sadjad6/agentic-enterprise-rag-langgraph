# Testing Guide

This guide covers running unit tests, integration tests, and manual testing workflows for both Local and Cloud modes.

---

## Test Structure

```
backend/tests/
├── __init__.py
├── test_agent.py          # LangGraph agent node tests
├── test_anonymizer.py     # GDPR PII anonymization tests
├── test_api.py            # FastAPI endpoint tests
├── test_cost_tracker.py   # Token/cost tracking tests
└── test_rag_pipeline.py   # RAG retrieval pipeline tests
```

---

## Running Unit Tests

### Prerequisites

Install development dependencies:

```bash
cd backend
uv sync --group dev
```

### Run All Tests

```bash
cd backend
uv run pytest tests/ -v
```

### Run a Specific Test File

```bash
uv run pytest tests/test_api.py -v
uv run pytest tests/test_anonymizer.py -v
uv run pytest tests/test_cost_tracker.py -v
uv run pytest tests/test_rag_pipeline.py -v
uv run pytest tests/test_agent.py -v
```

### Run a Specific Test Function

```bash
uv run pytest tests/test_api.py::test_health_endpoint -v
```

### Run with Coverage (If Available)

```bash
uv run pytest tests/ -v --tb=short
```

---

## Test Descriptions

### `test_api.py` — API Endpoint Tests

Tests the FastAPI HTTP endpoints directly using the test client:

| Test | Validates |
|------|-----------|
| Health endpoint | Returns `200` with `status: healthy` |
| Mode endpoint | Returns current system mode |
| Query endpoint | Accepts queries and returns structured responses |
| Upload endpoint | Accepts file uploads and returns chunk counts |
| Documents endpoint | Lists indexed documents |
| Metrics endpoint | Returns cost/token tracking data |

### `test_anonymizer.py` — GDPR PII Tests

Tests the PII anonymization module:

| Test | Validates |
|------|-----------|
| Email detection | Redacts `user@example.com` → `[EMAIL]` |
| Phone detection | Redacts phone numbers → `[PHONE]` |
| No-PII pass-through | Clean text passes through unchanged |
| Mixed content | Multiple PII types in one string |
| Edge cases | Empty strings, special characters |

### `test_cost_tracker.py` — Cost Tracking Tests

Tests the token counting and cost calculation logic:

| Test | Validates |
|------|-----------|
| Token recording | Input/output tokens are tracked per request |
| Cost calculation | USD cost computed correctly from token counts |
| Metrics aggregation | Per-model and per-session breakdowns work |
| Reset functionality | Metrics can be cleared |
| Edge cases | Zero tokens, missing model info |

### `test_rag_pipeline.py` — RAG Pipeline Tests

Tests the retrieval-augmented generation pipeline:

| Test | Validates |
|------|-----------|
| Document chunking | PDFs/TXT split into correct chunk sizes |
| Embedding generation | Chunks are embedded and stored |
| Hybrid search | Vector + BM25 retrieval returns relevant results |
| Source citation | Responses include source metadata |
| Language detection | DE/EN queries detected correctly |

### `test_agent.py` — Agent Node Tests

Tests the LangGraph agentic workflow:

| Test | Validates |
|------|-----------|
| Decision node | Routes to correct tool or direct response |
| Tool execution | Calculator and external API tools work |
| Response formatting | Final response is well-structured |

---

## Testing by Mode

### Testing Local Mode

1. Start infrastructure:
   ```bash
   docker-compose up -d weaviate ollama
   ```

2. Set `SYSTEM_MODE=local` in `.env`.

3. Start backend:
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload --port 8000
   ```

4. Run unit tests:
   ```bash
   cd backend
   uv run pytest tests/ -v
   ```

5. Manual smoke test:
   ```bash
   # Health check
   curl http://localhost:8000/health

   # Check mode
   curl http://localhost:8000/mode

   # Upload a document
   curl -X POST http://localhost:8000/upload -F "file=@test.pdf"

   # Query
   curl -X POST http://localhost:8000/query \
     -H "Content-Type: application/json" \
     -d '{"query": "What is in the document?", "mode": "rag"}'

   # Agent query with calculator
   curl -X POST http://localhost:8000/query \
     -H "Content-Type: application/json" \
     -d '{"query": "What is sqrt(144) + 15 * 3?", "mode": "agent"}'
   ```

### Testing Cloud Mode

1. Set `SYSTEM_MODE=cloud` in `.env` with valid API keys.

2. Start backend (no Docker needed):
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload --port 8000
   ```

3. Run the same test commands as local mode.

4. Additionally verify cost tracking:
   ```bash
   # Check metrics after running queries
   curl http://localhost:8000/metrics

   # Reset metrics
   curl -X POST http://localhost:8000/metrics/reset
   ```

---

## Testing the Frontend

### TypeScript Compilation Check

```bash
cd frontend
npx tsc --noEmit
```

Zero errors means the codebase is type-safe.

### Linting

```bash
cd frontend
npm run lint
```

### Manual UI Testing Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Open `http://localhost:5173` | Dashboard loads with 3-column layout |
| 2 | Verify mode badge in header | Shows LOCAL MODE or CLOUD MODE |
| 3 | Click "New Chat" | Chat history clears, empty state shows |
| 4 | Type a message and send | User bubble appears, assistant responds |
| 5 | Toggle LOCAL ↔ CLOUD | Mode switches, header badge updates |
| 6 | Upload a document | File appears in sidebar Collections |
| 7 | Ask about uploaded document | Response includes source citations |
| 8 | Check Right Panel | Cost tracking and System Info update |
| 9 | Resize browser window | Layout remains responsive |
| 10 | Test German query | `"Was ist DSGVO?"` — Response in German |

---

## Multilingual Testing

The system auto-detects language and responds in the same language:

```bash
# English query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the data retention policy?", "mode": "rag"}'

# German query — response should be in German
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Welche Sicherheitsrichtlinien gelten für Remote-Arbeit?", "mode": "rag"}'
```

---

## Linting the Backend

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
```

To auto-fix:

```bash
uv run ruff check --fix .
uv run ruff format .
```
