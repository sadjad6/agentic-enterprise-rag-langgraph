/** ChatMessage — user/assistant message bubbles matching Stitch design. */

import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '../hooks/useApp';

/* ── User Avatar URL (matches Stitch) ─────────────────────── */
const USER_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuATqnnDHOavf9fAzJu1ulDUqUh-CcA5U9RwiG3N3i_ObaUpEXXFd-cFyoj2EjdWkLUnn_7yQChOS5NbNln4550L8UQ08TYjykmRQSXlFFSf_q_AtoUyKkKInjzdaQ0-PJYry9SA5m0axvn4Hfsgj7LzAQdHmpMTQxKPUx-FxTIyF66eVRe0m4Wi3rjUuVfMDG3J1u-jI1jRHnvGS33LaholBpV6TCwdXOaqYSQwCBRRuPTZSx7_0jJaSzrFRgliqzQPdfitiZFwZijt';

/* ── Message Bubble ───────────────────────────────────────── */

export function MessageBubble({ message }: { message: ChatMessageType }) {
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
        <div className="size-8 rounded-full bg-slate-100 shrink-0 overflow-hidden">
          <img alt="User" className="w-full h-full rounded-full object-cover" src={USER_AVATAR_URL} />
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
        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
          <ReactMarkdown
            components={{
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 font-medium" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-2 font-medium" {...props} />,
              li: ({ node, ...props }) => <li {...props} />,
              p: ({ node, ...props }) => <p {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
              ),
              pre: ({ node, ...props }) => (
                <pre
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto my-3"
                  {...props}
                />
              ),
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <code className="text-slate-600 dark:text-slate-400 font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="text-emerald-600 font-medium bg-emerald-50 px-1 py-0.5 rounded" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Source chips — Stitch style */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.map((s, i) => (
              <div
                key={`s-${i}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700"
              >
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
              <div
                key={`t-${i}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200"
              >
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

/* ── Empty State ──────────────────────────────────────────── */

export function EmptyState() {
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

/* ── Loading Indicator ────────────────────────────────────── */

export function LoadingIndicator() {
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
