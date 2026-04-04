/** Custom hooks for managing application state. */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, type QueryResponse, type CostMetrics, type ModeInfo } from '../lib/api';

/* ── Chat Message Types ────────────────────────────────────── */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: QueryResponse['sources'];
  language?: string;
  cost_usd?: number;
  tokens?: { input: number; output: number };
  agent_steps?: number;
  tool_results?: QueryResponse['tool_results'];
  timestamp: Date;
}

/* ── useChat Hook ──────────────────────────────────────────── */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const idCounter = useRef(0);

  const sendMessage = useCallback(async (query: string, queryMode: 'rag' | 'agent' = 'rag') => {
    const userMsg: ChatMessage = {
      id: `msg-${++idCounter.current}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.query({ query, mode: queryMode });
      const assistantMsg: ChatMessage = {
        id: `msg-${++idCounter.current}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        language: response.language,
        cost_usd: response.cost_usd,
        tokens: response.tokens_used,
        agent_steps: response.agent_steps,
        tool_results: response.tool_results,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${++idCounter.current}`,
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearChat };
}

/* ── useMode Hook ──────────────────────────────────────────── */
export function useMode() {
  const [mode, setModeState] = useState<ModeInfo | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchMode = useCallback(async () => {
    try {
      const m = await api.getMode();
      setModeState(m);
    } catch {
      /* backend not yet available */
    }
  }, []);

  const setMode = useCallback(async (targetMode: 'local' | 'cloud') => {
    // We don't need to check if mode is null, we can force a set if the user clicks.
    setIsToggling(true);
    try {
      const updated = await api.setMode(targetMode);
      setModeState(updated);
    } catch (err) {
      console.error('Mode toggle failed:', err);
    } finally {
      setIsToggling(false);
    }
  }, []);

  useEffect(() => { fetchMode(); }, [fetchMode]);

  return { mode, setMode, isToggling };
}

/* ── useMetrics Hook ───────────────────────────────────────── */
export function useMetrics(pollIntervalMs = 10000) {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const m = await api.getMetrics();
      setMetrics(m);
    } catch {
      /* backend not yet available */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState is in a callback, not synchronous
    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchMetrics, pollIntervalMs]);

  return { metrics, refresh: fetchMetrics };
}

/* ── useDocuments Hook ─────────────────────────────────────── */
export function useDocuments() {
  const [documents, setDocuments] = useState<string[]>([]);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents);
    } catch {
      /* backend not yet available */
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState is in a callback, not synchronous
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  return { documents, refresh: fetchDocuments };
}
