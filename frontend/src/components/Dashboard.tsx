/** Dashboard — route-backed analytics view matching the active UI shell. */

import {
  Activity,
  BarChart3,
  Bot,
  DollarSign,
  FileText,
  MessageSquare,
  MessagesSquare,
  Upload,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from './Header';
import type { DashboardAnalytics, DashboardBreakdownItem, ModeInfo } from '../lib/api';

interface DashboardProps {
  analytics: DashboardAnalytics | null;
  isLoading: boolean;
  mode: ModeInfo | null;
}

const CHART_COLORS = ['#1132d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Dashboard({ analytics, isLoading, mode }: DashboardProps) {
  const isLocal = mode?.mode === 'local';

  return (
    <div className="flex flex-col w-full relative" style={{ height: '100%' }}>
      <Header isLocal={isLocal} title="Analytics Dashboard" />

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/70" style={{ padding: '2rem' }}>
        <div className="mx-auto flex flex-col" style={{ maxWidth: '72rem', gap: '1.5rem' }}>
          {isLoading ? (
            <LoadingState />
          ) : !analytics || !analytics.has_data ? (
            <EmptyDashboard />
          ) : (
            <>
              <SummaryGrid analytics={analytics} />
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)] gap-6">
                <UsageTimeline analytics={analytics} />
                <BreakdownPanel
                  title="Mode Distribution"
                  description="How requests are split between Local and Cloud modes."
                  items={analytics.mode_breakdown}
                />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
                <ModelUsage analytics={analytics} />
                <SystemSnapshot analytics={analytics} mode={mode} />
              </div>
              <RecentActivity analytics={analytics} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-slate-200 rounded-2xl"
          style={{ minHeight: index < 4 ? '7rem' : '14rem' }}
        />
      ))}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-[1.5rem]" style={{ minHeight: '32rem', padding: '3rem' }}>
      <div className="bg-primary/10 text-primary flex items-center justify-center" style={{ width: '4rem', height: '4rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
        <BarChart3 size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900" style={{ marginBottom: '0.5rem' }}>
        Analytics will appear here
      </h2>
      <p className="text-sm text-slate-500 max-w-xl" style={{ lineHeight: '1.6' }}>
        Start a conversation or upload documents to generate durable analytics. This dashboard tracks usage trends, sessions, tokens, cost, and recent activity.
      </p>
    </div>
  );
}

function SummaryGrid({ analytics }: { analytics: DashboardAnalytics }) {
  const items = [
    { label: 'Conversations', value: analytics.summary.total_conversations.toString(), icon: <MessagesSquare size={18} />, tone: 'text-primary bg-primary/10' },
    { label: 'User Messages', value: analytics.summary.total_user_messages.toString(), icon: <MessageSquare size={18} />, tone: 'text-sky-600 bg-sky-50' },
    { label: 'Assistant Replies', value: analytics.summary.total_assistant_responses.toString(), icon: <Bot size={18} />, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Indexed Documents', value: analytics.summary.indexed_documents.toString(), icon: <FileText size={18} />, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Requests', value: analytics.summary.total_requests.toString(), icon: <Activity size={18} />, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Tokens', value: formatCompact(analytics.summary.total_tokens), icon: <BarChart3 size={18} />, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'Uploads', value: analytics.summary.total_uploads.toString(), icon: <Upload size={18} />, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Total Cost', value: `$${analytics.summary.total_cost_usd.toFixed(4)}`, icon: <DollarSign size={18} />, tone: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm" style={{ padding: '1.25rem' }}>
          <div className={`inline-flex items-center justify-center ${item.tone}`} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.875rem', marginBottom: '0.875rem' }}>
            {item.icon}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest" style={{ marginBottom: '0.375rem' }}>
            {item.label}
          </p>
          <p className="text-2xl font-bold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsageTimeline({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <section className="bg-white border border-slate-200 rounded-[1.25rem] shadow-sm" style={{ padding: '1.5rem' }}>
      <h3 className="text-sm font-bold text-slate-900">Usage Over Time</h3>
      <p className="text-xs text-slate-500" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
        Last 30 days of query and upload activity.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={analytics.activity_over_time}>
          <defs>
            <linearGradient id="queriesGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#1132d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1132d4" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="uploadsGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '0.75rem', borderColor: '#e2e8f0', fontSize: '12px' }} />
          <Area type="monotone" dataKey="queries" stroke="#1132d4" fill="url(#queriesGradient)" strokeWidth={2} />
          <Area type="monotone" dataKey="uploads" stroke="#10b981" fill="url(#uploadsGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

function BreakdownPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: DashboardBreakdownItem[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-[1.25rem] shadow-sm" style={{ padding: '1.5rem' }}>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
        {description}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          No usage data yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={items} dataKey="requests" nameKey="name" innerRadius={56} outerRadius={90} paddingAngle={3}>
              {items.map((item, index) => (
                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '0.75rem', borderColor: '#e2e8f0', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="flex flex-col" style={{ gap: '0.625rem', marginTop: '0.5rem' }}>
        {items.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center min-w-0" style={{ gap: '0.625rem' }}>
              <span style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
              <span className="truncate text-slate-700">{item.name}</span>
            </div>
            <span className="font-semibold text-slate-900">{item.requests}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelUsage({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <section className="bg-white border border-slate-200 rounded-[1.25rem] shadow-sm" style={{ padding: '1.5rem' }}>
      <h3 className="text-sm font-bold text-slate-900">Model Usage</h3>
      <p className="text-xs text-slate-500" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
        Request volume and token footprint by model.
      </p>
      {analytics.model_breakdown.length === 0 ? (
        <p className="text-sm text-slate-400" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          No model breakdown available yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.model_breakdown}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '0.75rem', borderColor: '#e2e8f0', fontSize: '12px' }} />
            <Bar dataKey="requests" fill="#1132d4" radius={[8, 8, 0, 0]} />
            <Bar dataKey="tokens" fill="#93c5fd" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function SystemSnapshot({
  analytics,
  mode,
}: {
  analytics: DashboardAnalytics;
  mode: ModeInfo | null;
}) {
  const latest = analytics.recent_activity[0];

  return (
    <section className="bg-white border border-slate-200 rounded-[1.25rem] shadow-sm" style={{ padding: '1.5rem' }}>
      <h3 className="text-sm font-bold text-slate-900">Current Snapshot</h3>
      <p className="text-xs text-slate-500" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
        Live overview sourced from the persisted analytics stream.
      </p>
      <div className="flex flex-col" style={{ gap: '0.875rem' }}>
        <SnapshotRow label="Active Mode" value={mode?.mode === 'local' ? 'Local' : mode?.mode === 'cloud' ? 'Cloud' : 'Unknown'} />
        <SnapshotRow label="Recent Event" value={latest ? latest.event_type : 'No activity'} />
        <SnapshotRow label="Recent Session" value={latest?.session_id || 'N/A'} />
        <SnapshotRow label="Input Tokens" value={formatCompact(analytics.summary.total_input_tokens)} />
        <SnapshotRow label="Output Tokens" value={formatCompact(analytics.summary.total_output_tokens)} />
        <SnapshotRow label="Avg Cost / Request" value={analytics.summary.total_requests > 0 ? `$${(analytics.summary.total_cost_usd / analytics.summary.total_requests).toFixed(5)}` : '$0.00000'} />
      </div>
    </section>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl bg-slate-50/80" style={{ padding: '0.875rem 1rem' }}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function RecentActivity({ analytics }: { analytics: DashboardAnalytics }) {
  return (
    <section className="bg-white border border-slate-200 rounded-[1.25rem] shadow-sm overflow-hidden">
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
        <p className="text-xs text-slate-500" style={{ marginTop: '0.25rem' }}>
          Latest persisted queries and uploads across the application.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th style={{ padding: '0.875rem 1.5rem' }}>Type</th>
              <th style={{ padding: '0.875rem 1rem' }}>When</th>
              <th style={{ padding: '0.875rem 1rem' }}>Session</th>
              <th style={{ padding: '0.875rem 1rem' }}>Context</th>
              <th style={{ padding: '0.875rem 1rem' }}>Tokens</th>
              <th style={{ padding: '0.875rem 1.5rem' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {analytics.recent_activity.map((item) => (
              <tr key={`${item.event_type}-${item.created_at}-${item.session_id ?? item.filename ?? 'row'}`} className="border-t border-slate-100">
                <td style={{ padding: '0.875rem 1.5rem' }}>
                  <span className={`inline-flex items-center text-xs font-semibold ${item.event_type === 'query' ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-700'}`} style={{ gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px' }}>
                    {item.event_type === 'query' ? <MessageSquare size={14} /> : <Upload size={14} />}
                    {item.event_type}
                  </span>
                </td>
                <td className="text-slate-600" style={{ padding: '0.875rem 1rem' }}>{formatDateTime(item.created_at)}</td>
                <td className="text-slate-700 font-medium" style={{ padding: '0.875rem 1rem' }}>{item.session_id || 'N/A'}</td>
                <td className="text-slate-600" style={{ padding: '0.875rem 1rem' }}>
                  {item.event_type === 'query'
                    ? `${item.query_mode ?? 'unknown'} · ${item.model ?? 'unknown'}`
                    : `${item.filename ?? 'upload'} · ${item.language?.toUpperCase() ?? 'N/A'}`}
                </td>
                <td className="text-slate-700" style={{ padding: '0.875rem 1rem' }}>
                  {item.event_type === 'query' ? formatCompact(item.input_tokens + item.output_tokens) : `${item.chunks_created} chunks`}
                </td>
                <td className="text-slate-900 font-semibold" style={{ padding: '0.875rem 1.5rem' }}>
                  {item.event_type === 'query' ? `$${item.cost_usd.toFixed(5)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
