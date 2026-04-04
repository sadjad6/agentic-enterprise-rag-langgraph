# API Reference

Complete reference for all Enterprise RAG Assistant API endpoints.

**Base URL:** `http://localhost:8000` (local) or your Railway deployment URL.

**Interactive Docs:** Visit `/docs` for the auto-generated Swagger UI.

---

## Endpoints

### `POST /query` — Query the System

Send a question and receive an AI-generated answer with source citations.

**Request Body:**

```json
{
  "query": "What is the data retention policy?",
  "mode": "rag",
  "session_id": "optional-session-id",
  "access_level": "public",
  "anonymize": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ | The question to answer |
| `mode` | `"rag"` \| `"agent"` | ❌ | Query mode (default: `"agent"`) |
| `session_id` | string | ❌ | Session ID for tracking |
| `access_level` | string | ❌ | Access control level |
| `anonymize` | boolean | ❌ | Enable PII anonymization |

**Response:**

```json
{
  "answer": "The data retention policy states that...",
  "sources": [
    {
      "source": "data_policy.pdf",
      "chunk_index": 3,
      "score": 0.89,
      "excerpt": "Section 4.2 — Data shall be retained for..."
    }
  ],
  "language": "en",
  "tokens_used": { "input": 512, "output": 256 },
  "cost_usd": 0.0023,
  "mode_used": "cloud",
  "pii_detected": false,
  "agent_steps": 2,
  "tool_results": []
}
```

**Mode Differences:**

| Mode | Behavior |
|------|----------|
| `rag` | Direct retrieval + generation (faster, cheaper) |
| `agent` | LangGraph agentic workflow with tool access (calculator, web search) |

---

### `POST /upload` — Upload a Document

Upload and index a document for RAG retrieval.

**Request:** `multipart/form-data`

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@document.pdf" \
  -G -d "access_level=public"
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | ✅ | PDF, TXT, or Markdown file |
| `access_level` | string (query) | ❌ | Access level tag (default: `"public"`) |

**Supported Formats:** `.pdf`, `.txt`, `.md`

**Response:**

```json
{
  "status": "success",
  "filename": "document.pdf",
  "chunks_created": 14,
  "language_detected": "en",
  "access_level": "public"
}
```

---

### `GET /documents` — List Indexed Documents

Returns all documents that have been uploaded and indexed.

**Response:**

```json
{
  "documents": ["data_policy.pdf", "hr_handbook.txt"],
  "count": 2
}
```

---

### `GET /metrics` — Get Cost Metrics

Returns token usage and cost tracking data for the current session.

**Response:**

```json
{
  "total_requests": 15,
  "total_input_tokens": 7500,
  "total_output_tokens": 3200,
  "total_cost_usd": 0.032,
  "by_model": {
    "gpt-4o-mini": {
      "requests": 15,
      "input_tokens": 7500,
      "output_tokens": 3200,
      "cost_usd": 0.032
    }
  },
  "by_session": {},
  "recent_requests": []
}
```

---

### `POST /metrics/reset` — Reset Metrics

Clears all accumulated cost and token metrics.

**Response:**

```json
{
  "status": "reset"
}
```

---

### `GET /health` — Health Check

Returns system health status and component readiness.

**Response:**

```json
{
  "status": "healthy",
  "mode": "local",
  "components": {
    "llm": { "status": "healthy" },
    "vectorstore": { "status": "healthy" },
    "embeddings": { "status": "healthy" }
  }
}
```

---

### `GET /mode` — Get Current Mode

**Response:**

```json
{
  "mode": "local",
  "description": "GDPR-safe local processing with Ollama"
}
```

---

### `POST /mode` — Set System Mode

Switch between local and cloud mode at runtime.

**Request Body:**

```json
{
  "mode": "cloud"
}
```

| Value | Description |
|-------|-------------|
| `"local"` | Ollama LLM + local Weaviate (GDPR-safe) |
| `"cloud"` | OpenAI GPT-4o-mini + Weaviate Cloud |

**Response:**

```json
{
  "mode": "cloud",
  "description": "Cloud processing with GPT-4o-mini"
}
```

---

### `POST /integrations/slack/events` — Slack Bot Webhook

Receives Slack events for the bot integration. Configure this URL in your Slack app's Event Subscriptions.

---

### `POST /integrations/teams/webhook` — Teams Bot Webhook

Receives Microsoft Teams messages via incoming webhook.

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (invalid API key, cloud mode only) |
| `422` | Validation error (missing required fields) |
| `500` | Internal server error |
| `503` | Service unavailable (LLM or vector DB down) |
