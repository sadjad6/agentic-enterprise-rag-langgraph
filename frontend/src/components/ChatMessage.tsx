/** ChatMessage — message bubbles and empty state matching the Stitch design perfectly. */

import ReactMarkdown from 'react-markdown';
import type { ChatMessage as MessageType } from '../hooks/useApp';

const USER_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuATqnnDHOavf9fAzJu1ulDUqUh-CcA5U9RwiG3N3i_ObaUpEXXFd-cFyoj2EjdWkLUnn_7yQChOS5NbNln4550L8UQ08TYjykmRQSXlFFSf_q_AtoUyKkKInjzdaQ0-PJYry9SA5m0axvn4Hfsgj7LzAQdHmpMTQxKPUx-FxTIyF66eVRe0m4Wi3rjUuVfMDG3J1u-jI1jRHnvGS33LaholBpV6TCwdXOaqYSQwCBRRuPTZSx7_0jJaSzrFRgliqzQPdfitiZFwZijt';

interface ChatMessageProps {
  message: MessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex flex-row-reverse w-full" style={{ gap: '1rem', maxWidth: '56rem', margin: '0 auto' }}>
        <div className="bg-slate-100 shrink-0 overflow-hidden" style={{ width: '2rem', height: '2rem', borderRadius: '9999px' }}>
          <img alt="User" className="w-full h-full object-cover" src={USER_AVATAR_URL} />
        </div>
        <div className="bg-primary text-white" style={{ padding: '1rem 1.5rem', borderRadius: '1rem', borderTopRightRadius: 0 }}>
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex w-full" style={{ gap: '1rem', maxWidth: '56rem', margin: '0 auto' }}>
      <div className="bg-primary/10 text-primary flex items-center justify-center shrink-0" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}>
        <span className="material-symbols-outlined block" style={{ fontSize: '1.25rem' }}>smart_toy</span>
      </div>
      
      <div className="flex flex-col flex-1 min-w-0" style={{ gap: '0.75rem' }}>
        <div className="text-sm text-slate-700 dark:text-slate-300 markdown-body" style={{ lineHeight: '1.625' }}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Source chips if any */}
        {(message.sources?.length ?? 0) > 0 && (
          <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
            {message.sources!.map((source, idx) => {
              const matchesPdf = source.source.toLowerCase().endsWith('.pdf');
              return (
                <div 
                  key={idx} 
                  className="flex items-center text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  style={{ gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '0.875rem' }}>
                    {matchesPdf ? 'picture_as_pdf' : 'public'}
                  </span>
                  [{idx + 1}] {source.source}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingIndicator() {
  return (
    <div className="flex w-full" style={{ gap: '1rem', maxWidth: '56rem', margin: '0 auto' }}>
      <div className="bg-primary/10 text-primary flex items-center justify-center shrink-0" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}>
        <span className="material-symbols-outlined block animate-pulse" style={{ fontSize: '1.25rem' }}>generating_tokens</span>
      </div>
      <div className="flex items-center italic text-slate-400 text-sm" style={{ gap: '0.5rem' }}>
        Thinking...
        <div className="flex" style={{ gap: '0.25rem' }}>
          <span className="bg-slate-300 rounded-full animate-bounce" style={{ width: '0.25rem', height: '0.25rem' }} />
          <span className="bg-slate-300 rounded-full animate-bounce" style={{ width: '0.25rem', height: '0.25rem', animationDelay: '0.1s' }} />
          <span className="bg-slate-300 rounded-full animate-bounce" style={{ width: '0.25rem', height: '0.25rem', animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center" style={{ marginTop: '4rem' }}>
      <div className="bg-primary/10 text-primary flex items-center justify-center" style={{ width: '4rem', height: '4rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
        <span className="material-symbols-outlined block" style={{ fontSize: '2rem' }}>auto_awesome</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100" style={{ marginBottom: '0.5rem' }}>
        Enterprise RAG Assistant
      </h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto" style={{ lineHeight: '1.5' }}>
        Upload documents and ask questions. The AI agent uses semantic search and multi-step reasoning to find accurate answers.
      </p>
    </div>
  );
}
