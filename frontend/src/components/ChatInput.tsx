/** ChatInput — sticky input area matching the Stitch design exactly. */

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  isLocal: boolean;
  isToggling: boolean;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export function ChatInput({
  input,
  isLoading,
  isLocal,
  isToggling,
  onInputChange,
  onSubmit,
  onToggleMode,
}: ChatInputProps) {
  return (
    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Input field — use flex layout instead of absolute positioning for reliability */}
        <form onSubmit={onSubmit}>
          <div
            className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            style={{ padding: '0.5rem 0.75rem' }}
          >
            {/* Attach icon */}
            <button
              type="button"
              className="shrink-0 p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">attach_file</span>
            </button>

            {/* Text input */}
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              disabled={isLoading}
              className="flex-1 min-w-0 bg-transparent border-none py-2.5 text-sm placeholder:text-slate-400 outline-none focus:ring-0"
              placeholder="Ask follow-up questions or request analysis..."
              type="text"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-md shadow-primary/20 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>

        {/* Mode Toggles */}
        <div className="flex items-center justify-between px-2 mt-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => !isLocal && onToggleMode()}
              disabled={isToggling}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                isLocal
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              LOCAL (GDPR SAFE)
            </button>
            <button
              onClick={() => isLocal && onToggleMode()}
              disabled={isToggling}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                !isLocal
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              CLOUD (GPT-4o)
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
