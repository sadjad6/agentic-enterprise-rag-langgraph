/** ChatInterface — matches the Stitch dashboard main chat area exactly. */

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../hooks/useApp';
import type { ModeInfo } from '../lib/api';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (query: string, mode: 'rag' | 'agent') => void;
  mode?: ModeInfo | null;
}

export function ChatInterface({ messages, isLoading, onSend, mode }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [queryMode, setQueryMode] = useState<'rag' | 'agent'>('agent');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isLocal = mode?.mode === 'local';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), queryMode);
    setInput('');
  };

  return (
    <>
      {/* Header — exact Stitch match */}
      <ChatHeader isLocal={isLocal} />

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Sticky Input Area — exact Stitch match */}
      <ChatInputArea
        input={input}
        isLoading={isLoading}
        queryMode={queryMode}
        isLocal={isLocal}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onModeChange={setQueryMode}
      />
    </>
  );
}

/* ── Header ────────────────────────────────────────────────── */

function ChatHeader({ isLocal }: { isLocal: boolean }) {
  return (
    <header className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enterprise AI Chat</h2>
        <div className="h-4 w-[1px] bg-slate-200" />
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
          isLocal
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-purple-50 text-purple-700 border-purple-100'
        }`}>
          <span className={`size-1.5 rounded-full animate-pulse ${isLocal ? 'bg-emerald-500' : 'bg-purple-500'}`} />
          {isLocal ? 'LOCAL MODE' : 'CLOUD MODE'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <span className="material-symbols-outlined">share</span>
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </header>
  );
}

/* ── Input Area ────────────────────────────────────────────── */

interface ChatInputAreaProps {
  input: string;
  isLoading: boolean;
  queryMode: 'rag' | 'agent';
  isLocal: boolean;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onModeChange: (mode: 'rag' | 'agent') => void;
}

function ChatInputArea({ input, isLoading, queryMode, isLocal, onInputChange, onSubmit, onModeChange }: ChatInputAreaProps) {
  return (
    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Input field */}
        <form onSubmit={onSubmit} className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button type="button" className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-lg">attach_file</span>
            </button>
          </div>
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isLoading}
            className="w-full pl-14 pr-16 py-4 bg-slate-50 dark:bg-slate-900 border-0 focus:ring-2 focus:ring-primary/20 rounded-2xl text-sm placeholder:text-slate-400 outline-none"
            placeholder="Ask follow-up questions or request analysis..."
            type="text"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-md shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>

        {/* Mode Toggles — exact Stitch match */}
        <div className="flex items-center justify-between px-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => onModeChange('agent')}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                queryMode === 'agent'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {isLocal ? 'LOCAL (GDPR SAFE)' : 'AGENT WORKFLOW'}
            </button>
            <button
              onClick={() => onModeChange('rag')}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                queryMode === 'rag'
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {isLocal ? 'STANDARD RAG' : 'CLOUD (GPT-4o)'}
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">security</span>
            End-to-end encrypted session
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────── */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-4xl ml-auto">
        <div className="flex flex-col items-end gap-2">
          <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed max-w-lg">
            {message.content}
          </div>
          {message.timestamp && (
            <span className="text-[10px] text-slate-400 font-medium">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="size-8 rounded-full bg-slate-100 shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 max-w-4xl">
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl">smart_toy</span>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed markdown-body">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Source chips — Stitch style */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.map((s, i) => (
              <div key={`s-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                [{i + 1}] {s.source}
              </div>
            ))}
          </div>
        )}

        {/* Tool chips */}
        {message.tool_results && message.tool_results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.tool_results.map((t, i) => (
              <div key={`t-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                <span className="material-symbols-outlined text-sm">build</span>
                {t.tool}
              </div>
            ))}
          </div>
        )}

        {/* Metadata row */}
        {(message.language || (message.cost_usd && message.cost_usd > 0) || (message.agent_steps && message.agent_steps > 0)) && (
          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {message.language && <span>🌍 {message.language}</span>}
            {message.cost_usd !== undefined && message.cost_usd > 0 && <span>💰 ${message.cost_usd.toFixed(6)}</span>}
            {message.agent_steps !== undefined && message.agent_steps > 0 && <span>🔄 {message.agent_steps} steps</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
        <span className="material-symbols-outlined text-5xl text-primary">auto_awesome</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise RAG Assistant</h2>
      <p className="text-sm text-slate-500 max-w-md">
        Upload documents and ask questions. The AI agent uses semantic search
        and multi-step reasoning to find accurate answers.
      </p>
    </div>
  );
}

/* ── Loading Indicator ─────────────────────────────────────── */

function LoadingIndicator() {
  return (
    <div className="flex gap-4 max-w-4xl">
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl animate-pulse">generating_tokens</span>
      </div>
      <div className="flex items-center gap-2 italic text-slate-400 text-sm">
        Thinking...
        <div className="flex gap-1">
          <span className="size-1 bg-slate-300 rounded-full animate-bounce" />
          <span className="size-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <span className="size-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
