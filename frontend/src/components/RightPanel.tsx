import type { CostMetrics } from '../lib/api';


interface RightPanelProps {
  documents: string[];
  metrics: CostMetrics | null;
}

export function RightPanel({ documents, metrics }: RightPanelProps) {
  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 hidden xl:flex flex-col">
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
        
        {/* Retrieved Documents */}
        <section>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
            Indexed Documents
          </h3>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500">No documents indexed yet.</p>
            ) : (
              documents.map((doc, i) => (
                <div key={i} className="group p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-500">picture_as_pdf</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{doc}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Available for search</p>
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
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Requests</p>
              <p className="text-xl font-bold text-slate-900">{metrics?.total_requests || 0}</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-3">
                <div className="bg-primary h-1 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tokens Usage</p>
                <p className="text-sm font-bold text-slate-900">
                  {metrics ? formatNumber(metrics.total_input_tokens + metrics.total_output_tokens) : '0'}
                </p>
              </div>
              <div className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                <p className="text-sm font-bold text-slate-900">
                  ${metrics?.total_cost_usd ? metrics.total_cost_usd.toFixed(4) : '0.000'}
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
              <span className="text-xs text-slate-500">Infrastructure</span>
              <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">Hybrid</span>
            </div>
          </div>
        </section>

      </div>
    </aside>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
