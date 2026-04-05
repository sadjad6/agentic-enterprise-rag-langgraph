/** RightPanel — matches the Stitch dashboard right insights panel layout. Dynamic data from props. */

import type { CostMetrics, ModeInfo } from '../lib/api';

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
    <aside
      className="right-panel border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
      style={{
        width: '20rem',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Scrollable Documents section — grows/shrinks, scrolls when many docs */}
      <div
        className="custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          padding: '1.5rem',
          paddingBottom: '0.5rem',
        }}
      >
        <section>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest" style={{ marginBottom: '1rem' }}>
            Retrieved Documents
          </h3>
          <div className="flex flex-col gap-3">
            {documents.length === 0 ? (
              <EmptyDocumentCard />
            ) : (
              documents.map((doc, i) => (
                <DocumentCard key={i} name={doc} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Fixed bottom section — always visible */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 1.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          borderTop: '1px solid',
          borderColor: 'rgb(226 232 240)',
          paddingTop: '1.25rem',
        }}
      >
        <CostTrackingSection totalTokens={totalTokens} metrics={metrics} />
        <SystemInfoSection mode={mode} metrics={metrics} />
        <AnalyticsCTA />
      </div>
    </aside>
  );
}

/* ── Document Cards ───────────────────────────────────────── */

function EmptyDocumentCard() {
  return (
    <div className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors" style={{ padding: '0.75rem' }}>
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-slate-400">description</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate text-slate-400">No documents indexed</p>
          <p className="text-[10px] text-slate-400" style={{ marginTop: '0.125rem' }}>Upload files to get started</p>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ name }: { name: string }) {
  const isPdf = name.toLowerCase().endsWith('.pdf');
  return (
    <div className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer" style={{ padding: '0.75rem' }}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined ${isPdf ? 'text-red-500' : 'text-blue-500'}`}>
          {isPdf ? 'picture_as_pdf' : 'description'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{name}</p>
          <p className="text-[10px] text-slate-500" style={{ marginTop: '0.125rem' }}>Available for search</p>
        </div>
      </div>
    </div>
  );
}

/* ── Cost Tracking ────────────────────────────────────────── */

function CostTrackingSection({ totalTokens, metrics }: { totalTokens: number; metrics: CostMetrics | null }) {
  return (
    <section>
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest" style={{ marginBottom: '1rem' }}>
        Cost Tracking
      </h3>
      <div className="flex flex-col gap-3">
        {/* Tokens Usage Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" style={{ padding: '1rem' }}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider" style={{ marginBottom: '0.25rem' }}>Tokens Usage</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatNumber(totalTokens)}</p>
          <div className="w-full bg-slate-100 h-1 rounded-full" style={{ marginTop: '0.75rem' }}>
            <div className="bg-primary h-1 rounded-full transition-all" style={{ width: totalTokens > 0 ? '45%' : '0%' }} />
          </div>
        </div>

        {/* Session / Total row */}
        <div className="flex gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" style={{ padding: '1rem', flex: 1 }}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider" style={{ marginBottom: '0.25rem' }}>Session</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ${metrics?.total_cost_usd ? metrics.total_cost_usd.toFixed(3) : '0.000'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" style={{ padding: '1rem', flex: 1 }}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider" style={{ marginBottom: '0.25rem' }}>Total</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ${metrics?.total_cost_usd ? metrics.total_cost_usd.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── System Info ──────────────────────────────────────────── */

function SystemInfoSection({ mode, metrics }: { mode: ModeInfo | null; metrics: CostMetrics | null }) {
  const isLocal = mode?.mode === 'local';
  return (
    <section>
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest" style={{ marginBottom: '1rem' }}>
        System Info
      </h3>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        <div className="flex justify-between items-center" style={{ padding: '0.75rem 1rem' }}>
          <span className="text-xs text-slate-500 w-1/3">Mode</span>
          <span className="text-xs font-bold text-primary bg-primary/10 rounded-md text-right whitespace-nowrap" style={{ padding: '0.125rem 0.5rem' }}>
            {isLocal ? 'Local' : 'Cloud'}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4" style={{ padding: '0.75rem 1rem' }}>
          <span className="text-xs text-slate-500 shrink-0">Model</span>
          <span className="text-xs font-bold text-right truncate">
            {isLocal ? 'Ollama (Llama 3)' : 'GPT-4o'}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4" style={{ padding: '0.75rem 1rem' }}>
          <span className="text-xs text-slate-500 shrink-0">Language</span>
          <span className="text-xs font-bold text-right truncate">Auto-detect</span>
        </div>
        <div className="flex justify-between items-center gap-4" style={{ padding: '0.75rem 1rem' }}>
          <span className="text-xs text-slate-500 shrink-0">Requests</span>
          <span className="text-xs font-bold text-emerald-600 text-right">{metrics?.total_requests ?? 0}</span>
        </div>
      </div>
    </section>
  );
}

/* ── Analytics CTA ────────────────────────────────────────── */

function AnalyticsCTA() {
  return (
    <div className="bg-primary rounded-2xl relative overflow-hidden group flex flex-col" style={{ padding: '1.25rem' }}>
      <div className="absolute -right-4 -bottom-4 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" style={{ width: '6rem', height: '6rem' }} />
      <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest" style={{ marginBottom: '0.25rem' }}>Analytics</p>
      <p className="text-white text-sm font-medium relative z-10" style={{ marginBottom: '1rem' }}>
        Detailed usage insights available in Dashboard
      </p>
      <button className="w-full bg-white text-primary rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors relative z-10 text-center" style={{ padding: '0.5rem 0' }}>
        View Analytics
      </button>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
