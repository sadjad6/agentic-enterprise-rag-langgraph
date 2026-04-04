# Enterprise RAG Assistant — Documentation

Welcome to the comprehensive documentation for the Enterprise RAG Assistant. Use the guides below based on what you need.

---

## 📚 Documentation Index

### Setup

| Guide | Description |
|-------|-------------|
| [Local Mode Setup](setup-local.md) | Run everything on your machine with Ollama + Docker Weaviate (GDPR-safe, zero external API calls) |
| [Cloud Mode Setup](setup-cloud.md) | Use OpenAI GPT-4o-mini + Weaviate Cloud (faster, pay-per-token) |

### Operations

| Guide | Description |
|-------|-------------|
| [Deployment](deployment.md) | Deploy to production with Railway (backend) and Vercel (frontend) |
| [Testing](testing.md) | Run unit tests, integration tests, and manual QA checklists for both modes |
| [Evaluation](evaluation.md) | Measure retrieval accuracy, answer quality, and language detection using the built-in evaluation framework |
| [API Reference](api-reference.md) | Complete endpoint documentation with request/response examples |

---

## Quick Decision Guide

### Which mode should I use?

| Scenario | Recommended Mode |
|----------|-----------------|
| Handling sensitive/GDPR data | 🔒 **Local** |
| Running on a machine without GPU | ☁️ **Cloud** |
| Development and testing | 🔒 **Local** (free, no API costs) |
| Production deployment | ☁️ **Cloud** (faster, more reliable) |
| Offline / air-gapped environment | 🔒 **Local** |
| Best answer quality | ☁️ **Cloud** (GPT-4o-mini outperforms local models) |

### What do I need running?

| Component | Local Mode | Cloud Mode |
|-----------|-----------|------------|
| Docker (Weaviate + Ollama) | ✅ Required | ❌ Not needed |
| OpenAI API Key | ❌ Not needed | ✅ Required |
| Weaviate Cloud Account | ❌ Not needed | ✅ Required |
| Backend (`uv run uvicorn ...`) | ✅ Required | ✅ Required |
| Frontend (`npm run dev`) | ✅ Required | ✅ Required |
