import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

import type { SourceInfo } from '../lib/api';
import type { ChatMessage as MessageType } from '../hooks/useApp';

const USER_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuATqnnDHOavf9fAzJu1ulDUqUh-CcA5U9RwiG3N3i_ObaUpEXXFd-cFyoj2EjdWkLUnn_7yQChOS5NbNln4550L8UQ08TYjykmRQSXlFFSf_q_AtoUyKkKInjzdaQ0-PJYry9SA5m0axvn4Hfsgj7LzAQdHmpMTQxKPUx-FxTIyF66eVRe0m4Wi3rjUuVfMDG3J1u-jI1jRHnvGS33LaholBpV6TCwdXOaqYSQwCBRRuPTZSx7_0jJaSzrFRgliqzQPdfitiZFwZijt';
const CITATION_LINK_PREFIX = 'https://citation.local/';

interface ChatMessageProps {
  message: MessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const normalizedSources = useMemo(
    () =>
      (message.sources ?? []).map((source, index) => ({
        ...source,
        citation_id: source.citation_id ?? index + 1,
      })),
    [message.sources],
  );

  const sourcesByCitationId = useMemo(
    () => new Map(normalizedSources.map(source => [source.citation_id, source])),
    [normalizedSources],
  );

  const markdownContent = useMemo(
    () => injectCitationLinks(message.content),
    [message.content],
  );

  const markdownComponents = useMemo<Components>(() => ({
    a: ({ href, children }) => {
      if (typeof href === 'string' && href.startsWith(CITATION_LINK_PREFIX)) {
        const citationId = Number(href.slice(CITATION_LINK_PREFIX.length));
        const source = Number.isNaN(citationId) ? undefined : sourcesByCitationId.get(citationId);
        const label = Number.isNaN(citationId) ? String(children) : `[${citationId}]`;

        if (!source) {
          return <span>{label}</span>;
        }

        return (
          <CitationMarker
            citationId={citationId}
            label={label}
            source={source}
          />
        );
      }

      return (
        <a className="text-primary underline underline-offset-2" href={href} rel="noreferrer" target="_blank">
          {children}
        </a>
      );
    },
  }), [sourcesByCitationId]);

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

  return (
    <div className="flex w-full" style={{ gap: '1rem', maxWidth: '56rem', margin: '0 auto' }}>
      <div className="bg-primary/10 text-primary flex items-center justify-center shrink-0" style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem' }}>
        <span className="material-symbols-outlined block" style={{ fontSize: '1.25rem' }}>smart_toy</span>
      </div>

      <div className="flex flex-col flex-1 min-w-0" style={{ gap: '0.75rem' }}>
        <div className="text-sm text-slate-700 dark:text-slate-300 markdown-body" style={{ lineHeight: '1.625' }}>
          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </div>

        {normalizedSources.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
            {normalizedSources.map(source => {
              const matchesPdf = source.source.toLowerCase().endsWith('.pdf');
              return (
                <div
                  key={`${source.citation_id}-${source.source}-${source.chunk_index}`}
                  className="flex items-center text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  style={{ gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '0.875rem' }}>
                    {matchesPdf ? 'picture_as_pdf' : 'public'}
                  </span>
                  [{source.citation_id}] {source.source}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CitationMarkerProps {
  citationId: number;
  label: string;
  source: SourceInfo;
}

function CitationMarker({ citationId, label, source }: CitationMarkerProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <span
      className="relative inline-flex align-baseline"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
    >
      <button
        aria-expanded={isActive}
        aria-label={`Citation ${citationId}`}
        className="mx-0.5 inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[0.72rem] font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/35 hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        onBlur={() => setIsActive(false)}
        onFocus={() => setIsActive(true)}
        type="button"
      >
        {label}
      </button>

      <span
        className={`absolute left-0 top-full z-20 mt-2 w-80 max-w-[min(20rem,calc(100vw-4rem))] rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl transition-all duration-200 ${isActive ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'}`}
        aria-hidden={!isActive}
        data-state={isActive ? 'open' : 'closed'}
        role="tooltip"
      >
        <span className="flex items-start justify-between" style={{ gap: '0.75rem' }}>
          <span className="min-w-0">
            <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary/80">Source [{citationId}]</span>
            <span className="mt-1 block truncate text-sm font-semibold text-slate-900">{source.source}</span>
          </span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[0.68rem] font-medium text-slate-500">
            Chunk {source.chunk_index + 1}
          </span>
        </span>

        <span
          className="mt-3 block overflow-hidden rounded-xl bg-slate-50 px-3 py-2.5 text-[0.82rem] leading-6 text-slate-700"
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 6,
          }}
        >
          {source.excerpt}
        </span>
      </span>
    </span>
  );
}

function injectCitationLinks(content: string): string {
  return content.replace(/\[(\d+)\](?!\()/g, (_match, citationId: string) => `[${citationId}](${CITATION_LINK_PREFIX}${citationId})`);
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
