/** ChatInput — sticky input area matching the Stitch design exactly. */

import { useRef } from 'react';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isLocal: boolean;
  isToggling: boolean;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  onFileSelect?: (file: File) => void;
}

export function ChatInput({
  input,
  isLoading,
  isLocal,
  isToggling,
  onInputChange,
  onSubmit,
  onToggleMode,
  onFileSelect,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // Reset so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md" style={{ padding: '1.5rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Input field */}
        <form onSubmit={onSubmit}>
          <div
            className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            style={{ gap: '0.5rem', borderRadius: '1rem', padding: '0.5rem 0.75rem' }}
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.md"
            />
            {/* Attach icon */}
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={isLoading}
              className="shrink-0 text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors disabled:opacity-50"
              style={{ padding: '0.375rem', borderRadius: '0.5rem' }}
            >
              <span className="material-symbols-outlined block" style={{ fontSize: '1.125rem' }}>attach_file</span>
            </button>

            {/* Text input */}
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={isLoading}
              className="flex-1 min-w-0 bg-transparent border-none text-sm placeholder:text-slate-400 outline-none focus:ring-0"
              style={{ padding: '0.625rem 0' }}
              placeholder="Ask follow-up questions or request analysis..."
              type="text"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem' }}
            >
              <span className="material-symbols-outlined block text-center content-center leading-none" style={{ position: 'relative', left: '1px' }}>send</span>
            </button>
          </div>
        </form>

        {/* Mode Toggles */}
        <div className="flex items-center justify-between" style={{ padding: '0 0.5rem', marginTop: '1rem' }}>
          <div className="flex bg-slate-100 dark:bg-slate-800" style={{ padding: '0.25rem', borderRadius: '0.75rem' }}>
            <button
              onClick={() => !isLocal && onToggleMode()}
              disabled={isToggling}
              className={`text-[11px] font-bold transition-colors ${
                isLocal
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ padding: '0.375rem 1rem', borderRadius: '0.5rem' }}
            >
              LOCAL (GDPR SAFE)
            </button>
            <button
              onClick={() => isLocal && onToggleMode()}
              disabled={isToggling}
              className={`text-[11px] font-bold transition-colors ${
                !isLocal
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ padding: '0.375rem 1rem', borderRadius: '0.5rem' }}
            >
              CLOUD (GPT-4o)
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center" style={{ gap: '0.5rem' }}>
            <span className="material-symbols-outlined block" style={{ fontSize: '0.875rem' }}>security</span>
            End-to-end encrypted session
          </div>
        </div>
      </div>
    </div>
  );
}
