import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentReaderProps {
  filename: string;
  onClose: () => void;
}

export function DocumentReader({ filename, onClose }: DocumentReaderProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setContent(null);

    api.getDocumentPreview(filename)
      .then((res) => {
        if (active) {
          setContent(res.preview_text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filename]);

  return (
    <div className="flex flex-col w-full relative" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 h-[60px] px-[24px] border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="flex items-center gap-[12px]">
          <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Document Reader
          </div>
          <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            {filename}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F1F5F9] dark:hover:bg-[#334155] text-[#64748B] dark:text-[#94A3B8] transition-colors"
          title="Return to Chat"
        >
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '2rem' }}>
        <div className="mx-auto flex flex-col" style={{ maxWidth: '56rem' }}>
          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-[#64748B] text-sm animate-pulse">
              Parsing and reconstructing document geometry...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              Failed to load document: {error}
            </div>
          ) : content ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed tracking-wide text-[#334155] dark:text-[#CBD5E1]">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ node, ...props }) => (
                    <img 
                      {...props} 
                      className="max-w-full h-auto rounded-lg shadow-sm border border-[#E2E8F0] dark:border-[#334155] my-6 mx-auto bg-white" 
                      loading="lazy"
                      alt={props.alt || "Extracted figure"}
                    />
                  ),
                  p: ({ children }) => <p className="mb-4">{children}</p>,
                }}
              >
                {content || "Empty document."}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-[#64748B] py-20">
              Document empty or missing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
