# Evaluation Guide

This guide explains how to evaluate the Enterprise RAG Assistant's retrieval accuracy, answer quality, language detection, and tool usage using the built-in evaluation framework.

---

## Overview

The evaluation framework runs a set of predefined test queries against the live system and scores each response on:

| Metric | Description |
|--------|-------------|
| **Topic Coverage** | How many expected topics appear in the response |
| **Language Accuracy** | Whether the response language matches the query language |
| **Source Relevance** | Whether the correct source document was retrieved |
| **Tool Selection** | Whether the agent selected the correct tool (for agent queries) |
| **Answer Content** | Whether the response contains specific expected values |

---

## Test Dataset

The evaluation dataset is located at:

```
backend/evaluation/test_dataset.json
```

It contains 8 test cases covering:

| ID | Language | Type | Description |
|----|----------|------|-------------|
| `eval-001` | EN | RAG | Data retention policy lookup |
| `eval-002` | DE | RAG | German privacy policy lookup |
| `eval-003` | EN | RAG | Employee onboarding steps |
| `eval-004` | EN | Agent | Budget calculation using calculator tool |
| `eval-005` | EN | Agent | Weather lookup using external API tool |
| `eval-006` | DE | RAG | German security policy for remote work |
| `eval-007` | EN | RAG | Q4 financial report summarization |
| `eval-008` | EN | Agent | Math calculation (`sqrt(144) + 15 * 3 = 57`) |

---

## Running the Evaluation

### Prerequisites

1. The backend must be running (local or cloud mode).
2. For RAG-type test cases, the relevant documents should be indexed first.

### Prepare Test Documents

For the evaluation to score RAG retrieval properly, upload the expected source documents before running:

```bash
# Upload documents that match the expected_source fields in the test dataset
curl -X POST http://localhost:8000/upload -F "file=@data_policy.pdf"
curl -X POST http://localhost:8000/upload -F "file=@hr_onboarding.pdf"
curl -X POST http://localhost:8000/upload -F "file=@security_policy.pdf"
curl -X POST http://localhost:8000/upload -F "file=@q4_report.pdf"
```

> [!NOTE]
> If you don't have these specific documents, the evaluation still runs but RAG source-matching scores will be lower. Agent/tool test cases (eval-004, eval-005, eval-008) work independently of uploaded documents.

### Run the Evaluation

```bash
cd backend
uv run python -m evaluation.evaluate --base-url http://localhost:8000
```

### Against a Deployed Instance

```bash
cd backend
uv run python -m evaluation.evaluate --base-url https://your-app.up.railway.app
```

---

## Understanding the Output

### Console Output

```
============================================================
Running evaluation: 8 test cases
Target: http://localhost:8000
============================================================

  [eval-001] What is the company's data retention policy?...  ✅
  [eval-002] Wie lautet die Datenschutzrichtlinie des Unter... ✅
  [eval-003] What are the onboarding steps for new employees... ✅
  [eval-004] Calculate the total budget if Q1 is 50000 and ... ✅
  [eval-005] What is the current weather in Berlin?...         ✅
  [eval-006] Welche Sicherheitsrichtlinien gelten für Remot... ✅
  [eval-007] Summarize the key points from the Q4 financial... ✅
  [eval-008] What is sqrt(144) + 15 * 3?...                   ✅

============================================================
Results: 8/8 queries succeeded
Average topic coverage: 87.5%
Language detection accuracy: 8/8
============================================================

Detailed results written to backend/evaluation/evaluation_results.json
```

### Detailed Results File

The full evaluation output is saved to:

```
backend/evaluation/evaluation_results.json
```

Each entry contains:

```json
{
  "id": "eval-008",
  "query": "What is sqrt(144) + 15 * 3?",
  "status": "pass",
  "language_correct": true,
  "has_answer": true,
  "topic_coverage": 1.0,
  "answer_contains_expected": true,
  "correct_tool_used": true
}
```

---

## Scoring Breakdown

### Topic Coverage

Checks if each expected topic keyword appears in the answer (case-insensitive):

```
Score = (matched topics) / (total expected topics)
```

Example: If expected topics are `["data retention", "policy", "GDPR"]` and the answer contains "data retention" and "policy" but not "GDPR", the score is `2/3 = 0.67`.

### Language Detection

Compares the `language` field in the API response against the expected language in the test case. Supports `en` (English) and `de` (German).

### Source Relevance

Checks if the expected source document name appears in any of the returned source citations. Only evaluated for RAG-type queries that have an `expected_source` field.

### Tool Selection

For agent queries with `requires_tool`, verifies that the agent actually invoked the named tool (e.g., `calculator`, `external_api`).

### Answer Content

For test cases with `expected_answer_contains`, checks if the exact string appears in the response (e.g., `"57"` for the math calculation).

---

## Evaluating Local vs Cloud

Run the evaluation against both modes to compare:

```bash
# Set SYSTEM_MODE=local in .env, restart backend
uv run python -m evaluation.evaluate --base-url http://localhost:8000

# Set SYSTEM_MODE=cloud in .env, restart backend
uv run python -m evaluation.evaluate --base-url http://localhost:8000
```

### Expected Differences

| Metric | Local (Ollama/Mistral) | Cloud (GPT-4o-mini) |
|--------|----------------------|---------------------|
| Topic Coverage | 70–85% | 85–95% |
| Language Detection | Good for EN, variable for DE | Excellent for both |
| Tool Selection | May struggle with complex routing | Reliable |
| Response Time | 5–30s (CPU-dependent) | 1–5s |
| Cost | $0.00 | $0.001–0.005/query |

---

## Adding Custom Test Cases

Edit `backend/evaluation/test_dataset.json` to add your own evaluation queries:

```json
{
  "id": "eval-custom-001",
  "query": "Your test question here",
  "language": "en",
  "expected_topics": ["keyword1", "keyword2"],
  "expected_source": "your_document.pdf"
}
```

### For Agent/Tool Test Cases

```json
{
  "id": "eval-custom-002",
  "query": "Calculate 25 * 4",
  "language": "en",
  "expected_topics": ["calculation"],
  "requires_tool": "calculator",
  "expected_answer_contains": "100"
}
```

### Available Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Unique test case identifier |
| `query` | ✅ | The question to send to the API |
| `language` | ✅ | Expected response language (`en` or `de`) |
| `expected_topics` | ✅ | Keywords to check for in the answer |
| `expected_source` | ❌ | Document name expected in source citations |
| `requires_tool` | ❌ | Tool name the agent should invoke |
| `expected_answer_contains` | ❌ | Exact string expected in the answer |
