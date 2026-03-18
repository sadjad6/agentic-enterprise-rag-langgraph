/** RightPanel — matches the Stitch dashboard right insights panel exactly. */

import type { CostMetrics } from '../lib/api';
import type { ModeInfo } from '../lib/api';

interface RightPanelProps {
  documents: string[];
  metrics: CostMetrics | null;
  mode: ModeInfo | null;
}

export function RightPanel({ documents, metrics, mode }: RightPanelProps) {
  const totalTokens = metrics
    ? metrics.total_input_tokens + metrics.total_output_tokens
    : 0;

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 hidden xl:flex flex-col">
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">

        {/* Retrieved Documents */}
        <section>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
            Retrieved Documents
          </h3>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="group p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400">description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-400">No documents indexed</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Upload files to get started</p>
                  </div>
                </div>
              </div>
            ) : (
              documents.map((doc, i) => (
                <div key={i} className="group p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{doc}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Available for search</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cost Tracking */}
        <section>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
            Cost Tracking
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {/* Tokens Usage Card */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tokens Usage</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(totalTokens)}</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-3">
                <div className="bg-primary h-1 rounded-full transition-all" style={{ width: totalTokens > 0 ? '45%' : '0%' }} />
              </div>
            </div>

            {/* Session / Total row */}
            <div className="flex gap-3">
              <div className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Session</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ${metrics?.total_cost_usd ? metrics.total_cost_usd.toFixed(3) : '0.000'}
                </p>
              </div>
              <div className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ${metrics?.total_cost_usd ? metrics.total_cost_usd.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Info */}
        <section>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
            System Info
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">Mode</span>
              <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                {mode?.mode === 'local' ? 'Local' : 'Cloud'}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">Model</span>
              <span className="text-xs font-bold">
                {mode?.mode === 'local' ? 'Ollama (Llama 3)' : 'GPT-4o'}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">Language</span>
              <span className="text-xs font-bold">Auto-detect</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">Requests</span>
              <span className="text-xs font-bold text-emerald-600">{metrics?.total_requests || 0}</span>
            </div>
          </div>
        </section>

        {/* Analytics CTA */}
        <div className="p-5 bg-primary rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 size-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Analytics</p>
          <p className="text-white text-sm font-medium mb-4 relative z-10">
            Detailed usage insights available in Dashboard
          </p>
          <button className="w-full py-2 bg-white text-primary rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors relative z-10">
            View Analytics
          </button>
        </div>

      </div>
    </aside>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
