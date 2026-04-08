/** Custom hooks for managing application state. */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api, type QueryResponse, type CostMetrics, type DashboardAnalytics, type ModeInfo } from '../lib/api';

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
  timestamp: Date | string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
}

const STORAGE_KEY = 'aether_chat_sessions';

/* ── useChat Hook ──────────────────────────────────────────── */
export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const idCounter = useRef(0);

  // Sync to local storage whenever sessions change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // When activeSessionId changes, update the 'messages' view
  useEffect(() => {
    if (activeSessionId) {
      const sess = sessions.find(s => s.id === activeSessionId);
      if (sess) {
        setMessages(sess.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeSessionId, sessions]);

  // Helper to persist current messages to the active session
  const saveMessagesToSession = useCallback((newMessages: ChatMessage[], newSessionId?: string) => {
    const sid = newSessionId || activeSessionId;
    
    // Auto-generate title from the first user message if available
    const firstUserMsg = newMessages.find(m => m.role === 'user');
    let title = 'New Chat';
    if (firstUserMsg && typeof firstUserMsg.content === 'string') {
        const text = firstUserMsg.content;
        title = text.length > 30 ? text.substring(0, 30) + '...' : text;
    }

    setSessions(prev => {
      const exists = prev.find(s => s.id === sid);
      if (exists) {
        return prev.map(s => s.id === sid ? { ...s, messages: newMessages, lastModified: Date.now(), title } : s);
      } else {
        return [{ id: sid!, title, messages: newMessages, lastModified: Date.now() }, ...prev];
      }
    });
  }, [activeSessionId]);

  const sendMessage = useCallback(async (query: string, queryMode: 'rag' | 'agent' = 'rag') => {
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = `session-${Date.now()}`;
      setActiveSessionId(currentSessionId);
    }

    const userMsg: ChatMessage = {
      id: `msg-${++idCounter.current}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistic update
    setMessages(prev => {
       const next = [...prev, userMsg];
       saveMessagesToSession(next, currentSessionId!);
       return next;
    });
    
    setIsLoading(true);

    try {
      const response = await api.query({ query, mode: queryMode, session_id: currentSessionId! });
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
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => {
          const next = [...prev, assistantMsg];
          saveMessagesToSession(next, currentSessionId!);
          return next;
      });
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${++idCounter.current}`,
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => {
          const next = [...prev, errorMsg];
          saveMessagesToSession(next, currentSessionId!);
          return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, saveMessagesToSession]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const clearChat = useCallback(() => {
     setActiveSessionId(null);
     setMessages([]);
  }, []);

  const deleteSession = useCallback((id: string) => {
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [activeSessionId]);

  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  }, []);

  return { 
    messages, 
    isLoading, 
    sendMessage, 
    clearChat, 
    sessions, 
    activeSessionId, 
    selectSession, 
    deleteSession,
    renameSession,
  };
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

export function useDashboard(pollIntervalMs = 15000) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboardAnalytics();
      setAnalytics(data);
    } catch {
      /* backend not yet available */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchDashboard, pollIntervalMs]);

  return { analytics, isLoading, refresh: fetchDashboard };
}

const DOCUMENTS_STORAGE_KEY = 'aether_documents';

export function useDocuments() {
  const [documents, setDocuments] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents ?? []);
    } catch {
      /* backend not yet available */
    }
  }, []);

  const addDocument = useCallback((name: string) => {
    setDocuments(prev => {
      if (!prev.includes(name)) {
        return [...prev, name];
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; setState is in a callback, not synchronous
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  return { documents, refresh: fetchDocuments, addDocument };
}
