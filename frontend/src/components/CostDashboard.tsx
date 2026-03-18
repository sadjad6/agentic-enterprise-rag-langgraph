/** CostDashboard — token usage and cost tracking visualization. */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Zap, Hash, TrendingUp } from 'lucide-react';
import type { CostMetrics } from '../lib/api';

interface CostDashboardProps {
  metrics: CostMetrics | null;
}

const CHART_COLORS = ['#6c63ff', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];

export function CostDashboard({ metrics }: CostDashboardProps) {
  if (!metrics) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <TrendingUp size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No metrics yet. Start querying to see usage data.
          </p>
        </div>
      </div>
    );
  }

  const modelData = Object.entries(metrics.by_model).map(([name, data]) => ({
    name,
    requests: data.requests,
    cost: data.cost_usd,
    tokens: data.input_tokens + data.output_tokens,
  }));

  const recentData = metrics.recent_requests.slice(-10).map((r, i) => ({
    name: `Q${i + 1}`,
    input: r.input_tokens,
    output: r.output_tokens,
    cost: r.cost_usd,
  }));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h2 className="text-lg font-bold gradient-text">Cost & Usage Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Hash size={18} />}
          label="Total Requests"
          value={metrics.total_requests.toString()}
          color="var(--accent-primary)"
        />
        <StatCard
          icon={<Zap size={18} />}
          label="Total Tokens"
          value={formatNumber(metrics.total_input_tokens + metrics.total_output_tokens)}
          color="var(--accent-secondary)"
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Cost"
          value={`$${metrics.total_cost_usd.toFixed(4)}`}
          color="var(--success)"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Avg Cost/Query"
          value={
            metrics.total_requests > 0
              ? `$${(metrics.total_cost_usd / metrics.total_requests).toFixed(6)}`
              : '$0'
          }
          color="var(--warning)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Token Usage Bar Chart */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Recent Token Usage
          </h3>
          {recentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={recentData}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="input" fill="#6c63ff" radius={[4, 4, 0, 0]} name="Input" />
                <Bar dataKey="output" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Output" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: 'var(--text-muted)' }}>
              No data yet
            </p>
          )}
        </div>

        {/* Model Distribution Pie Chart */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Model Distribution
          </h3>
          {modelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={modelData}
                  dataKey="requests"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {modelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: 'var(--text-muted)' }}>
              No data yet
            </p>
          )}
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Recent Requests
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-2">Model</th>
              <th className="text-right py-2">Input</th>
              <th className="text-right py-2">Output</th>
              <th className="text-right py-2">Cost</th>
            </tr>
          </thead>
          <tbody>
            {metrics.recent_requests.slice(-10).reverse().map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-2 font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                  {r.model}
                </td>
                <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {r.input_tokens}
                </td>
                <td className="py-2 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {r.output_tokens}
                </td>
                <td className="py-2 text-right" style={{ color: 'var(--success)' }}>
                  ${r.cost_usd.toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
