# Deployment Guide

This guide covers deploying the Enterprise RAG Assistant to production using **Railway** (backend) and **Vercel** (frontend).

---

## Architecture Overview

```
┌──────────────────────┐         ┌──────────────────────┐
│   Vercel (Frontend)  │  REST   │  Railway (Backend)   │
│   React + Tailwind   │────────▶│  FastAPI + LangGraph │
│   Static Site (CDN)  │         │  Docker Container    │
└──────────────────────┘         └────────┬─────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                    ┌─────────▼─────────┐  ┌──────────▼─────────┐
                    │   OpenAI API      │  │  Weaviate Cloud    │
                    │   (LLM + Embed)   │  │  (Vector DB)       │
                    └───────────────────┘  └────────────────────┘
```

> [!IMPORTANT]
> Production deployment uses **Cloud Mode** only. Local mode (Ollama + Docker Weaviate) is intended for local development and GDPR-sensitive environments with self-hosted infrastructure.

---

## Prerequisites

| Service | Purpose | Required |
|---------|---------|----------|
| [Railway](https://railway.app/) | Backend hosting | ✅ |
| [Vercel](https://vercel.com/) | Frontend hosting | ✅ |
| [OpenAI](https://platform.openai.com/) | LLM + embeddings | ✅ |
| [Weaviate Cloud](https://console.weaviate.cloud/) | Vector database | ✅ |
| [GitHub](https://github.com/) | Source control + CI/CD triggers | ✅ |

---

## Part 1 — Deploy Backend to Railway

### 1.1 Connect Your Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard).
2. Click **New Project** → **Deploy from GitHub Repo**.
3. Select your `agentic-enterprise-rag-langgraph` repository.
4. Railway detects the `railway.toml` configuration automatically.

### 1.2 Configure Build Settings

In the Railway service settings:

| Setting | Value |
|---------|-------|
| Root Directory | `backend/` |
| Builder | Nixpacks (auto-detected from `railway.toml`) |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

### 1.3 Set Environment Variables

Add the following environment variables in Railway's **Variables** tab:

```
SYSTEM_MODE=cloud
OPENAI_API_KEY=sk-your-production-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
WEAVIATE_CLOUD_URL=https://your-cluster.weaviate.network
WEAVIATE_CLOUD_API_KEY=your-weaviate-api-key
FRONTEND_URL=https://your-app.vercel.app
LOG_LEVEL=info
```

> [!CAUTION]
> Never commit secrets to Git. Always use Railway's environment variable management.

### 1.4 Deploy

Railway deploys automatically on every push to the `main` branch. You can also trigger manual deploys from the dashboard.

### 1.5 Verify

After deployment, your backend is available at a Railway-generated URL (e.g., `https://your-app.up.railway.app`).

```bash
curl https://your-app.up.railway.app/health
```

---

## Part 2 — Deploy Frontend to Vercel

### 2.1 Connect Your Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** → **Project** → Import your GitHub repository.
3. Set the **Root Directory** to `frontend/`.

### 2.2 Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### 2.3 Set Environment Variables

Add the following in Vercel's **Environment Variables** section:

```
VITE_API_URL=https://your-app.up.railway.app
```

> [!IMPORTANT]
> The `VITE_API_URL` must point to your Railway backend URL **without** a trailing slash.

### 2.4 Deploy

Vercel deploys automatically on every push to `main`. Your frontend is available at `https://your-app.vercel.app`.

---

## Part 3 — Post-Deployment Checklist

### CORS Configuration

Ensure the backend's `FRONTEND_URL` environment variable matches your Vercel domain exactly. The backend allows CORS requests from this origin:

```python
# backend/app/main.py
allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"]
```

If your Vercel domain is `https://my-rag-app.vercel.app`, set:
```
FRONTEND_URL=https://my-rag-app.vercel.app
```

### Health Check

Verify the full stack is operational:

```bash
# Backend health
curl https://your-backend.up.railway.app/health

# Frontend loads
curl -I https://your-frontend.vercel.app

# End-to-end query
curl -X POST https://your-backend.up.railway.app/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, is the system working?", "mode": "agent"}'
```

### Custom Domain (Optional)

Both Railway and Vercel support custom domains:
- **Railway**: Settings → Domains → Add custom domain
- **Vercel**: Settings → Domains → Add domain

---

## Part 4 — CI/CD Pipeline

### Automatic Deployments

Both Railway and Vercel deploy automatically when changes are pushed to `main`:

```
git push origin main
  → Railway rebuilds backend (Dockerfile)
  → Vercel rebuilds frontend (Vite)
```

### Branch Previews

Vercel automatically creates preview deployments for pull requests. To enable the same on Railway, enable **PR Environments** in the service settings.

---

## Rollback

### Railway
1. Go to your service → **Deployments** tab.
2. Click the three-dot menu on a previous deployment.
3. Select **Rollback**.

### Vercel
1. Go to your project → **Deployments** tab.
2. Click the deployment you want to restore.
3. Click **Promote to Production**.

---

## Cost Estimates

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|----------------------|
| Railway | $5 credit/month | $5–15 (depending on traffic) |
| Vercel | Hobby plan (free) | $0 for personal projects |
| OpenAI | Pay-per-token | $1–20 (depending on usage) |
| Weaviate Cloud | Free sandbox | $0 (sandbox) / $25+ (production) |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Frontend shows CORS errors | `FRONTEND_URL` mismatch | Set `FRONTEND_URL` in Railway to your exact Vercel domain |
| Backend build fails on Railway | Missing dependencies | Ensure `pyproject.toml` lists all deps |
| `502 Bad Gateway` on Railway | App crashed or port mismatch | Check Railway logs; ensure `$PORT` is used |
| Vercel build fails | TypeScript errors | Run `npx tsc --noEmit` locally to fix type errors first |
| Weaviate connection timeout | Firewall or wrong URL | Verify `WEAVIATE_CLOUD_URL` is correct and cluster is active |
