# Testing Guide

This guide covers the automated backend and frontend test flows for the repository.

---

## Test Structure

```text
backend/tests/
- test_agent.py
- test_analytics_integration.py
- test_analytics_service.py
- test_anonymizer.py
- test_api.py
- test_cost_tracker.py
- test_rag_pipeline.py

frontend/src/
- App.test.tsx
- components/Dashboard.test.tsx
- components/DocumentUpload.test.tsx
- hooks/useApp.test.tsx
- test/setup.ts
```

---

## Running Backend Tests

Install backend development dependencies before invoking pytest:

```bash
cd backend
uv sync --extra dev
uv run pytest tests -v
```

Run a specific backend file:

```bash
uv run pytest tests/test_api.py -v
uv run pytest tests/test_analytics_service.py -v
uv run pytest tests/test_analytics_integration.py -v
```

The backend suite covers:
- FastAPI API surface, including `/analytics/dashboard`
- Persistent analytics aggregation and reset behavior
- Query and upload analytics recording side effects
- Existing RAG, agent, anonymizer, and cost-tracker logic

---

## Running Frontend Tests

Install frontend dependencies and run the Vitest suite:

```bash
cd frontend
npm install
npm run test:run
```

For local watch mode:

```bash
npm test
```

The frontend suite covers:
- Route rendering for `/chat`, `/upload`, `/documents/:filename`, and `/dashboard`
- Navigation from the right-panel Analytics CTA and sidebar Dashboard link
- Dashboard loading, empty, and populated analytics states
- Chat `session_id` propagation in `useChat`
- Upload calls with and without an active session

---

## Build and Lint Verification

Frontend build:

```bash
cd frontend
npm run build
```

Backend lint:

```bash
cd backend
uv sync --extra dev
uv run ruff check .
uv run ruff format --check .
```

---

## CI

GitHub Actions runs both stacks automatically:
- Backend: `uv sync --extra dev` then `uv run pytest tests -v`
- Frontend: `npm ci`, `npm run test:run`, and `npm run build`
