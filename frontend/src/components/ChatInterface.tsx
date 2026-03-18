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
      {/* Header */}
      <header className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enterprise AI Chat</h2>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
          {mode?.mode === 'local' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-100 dark:border-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LOCAL MODE
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[11px] font-bold border border-purple-100 dark:border-purple-800">
              <span className="size-1.5 rounded-full bg-purple-500 animate-pulse"></span>
              CLOUD MODE
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">share</span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto w-full p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && <EmptyState />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <LoadingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Sticky Input Area */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-4">
          <form onSubmit={handleSubmit} className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-lg">attach_file</span>
              </button>
            </div>
            
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="w-full pl-14 pr-16 py-4 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-primary/20 focus:ring-2 focus:ring-primary/20 rounded-2xl text-sm placeholder:text-slate-400 outline-none transition-all dark:text-white"
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

          {/* Mode Toggles */}
          <div className="flex items-center justify-between px-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setQueryMode('agent')}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                  queryMode === 'agent' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                AGENT WORKFLOW
              </button>
              <button 
                onClick={() => setQueryMode('rag')}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                  queryMode === 'rag' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                STANDARD RAG
              </button>
            </div>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 hidden sm:flex">
              <span className="material-symbols-outlined text-sm">security</span>
              End-to-end encrypted session
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-4xl ml-auto animate-fade-in w-full">
        <div className="flex flex-col items-end gap-2 w-full max-w-lg">
          <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed w-full">
            {message.content}
          </div>
        </div>
        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 max-w-4xl w-full animate-fade-in">
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl">smart_toy</span>
      </div>
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed markdown-body">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Sources & Tools */}
        {(message.sources?.length || message.tool_results?.length) ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.sources?.map((s, i) => (
              <div key={`s-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span className="truncate max-w-[200px]">{s.source}</span>
                <span className="opacity-60 ml-1">{(s.score).toFixed(2)}</span>
              </div>
            ))}
            {message.tool_results?.map((t, i) => (
              <div key={`t-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-medium border border-orange-200 dark:border-orange-800">
                <span className="material-symbols-outlined text-sm">build</span>
                {t.tool}
              </div>
            ))}
          </div>
        ) : null}
        
        {/* Metadata */}
        <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
          {message.language && (<span>🌍 {message.language}</span>)}
          {message.cost_usd !== undefined && message.cost_usd > 0 && (<span>💰 ${(message.cost_usd).toFixed(6)}</span>)}
          {message.agent_steps !== undefined && message.agent_steps > 0 && (<span>🔄 {message.agent_steps} steps</span>)}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in w-full">
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

function LoadingIndicator() {
  return (
    <div className="flex gap-4 max-w-4xl w-full">
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl animate-pulse">generating_tokens</span>
      </div>
      <div className="flex items-center gap-2 italic text-slate-400 text-sm">
        Thinking...
        <div className="flex gap-1">
          <span className="size-1 bg-slate-300 rounded-full animate-bounce"></span>
          <span className="size-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="size-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  );
}
