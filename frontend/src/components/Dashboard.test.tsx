import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import type { DashboardAnalytics } from '../lib/api';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AreaChart: () => <div />,
  Area: () => <div />,
  BarChart: () => <div />,
  Bar: () => <div />,
  CartesianGrid: () => <div />,
  Cell: () => <div />,
  PieChart: () => <div />,
  Pie: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

const analytics: DashboardAnalytics = {
  summary: {
    total_conversations: 2,
    total_user_messages: 4,
    total_assistant_responses: 4,
    total_requests: 4,
    total_uploads: 1,
    total_tokens: 300,
    total_input_tokens: 180,
    total_output_tokens: 120,
    total_cost_usd: 0.1234,
    indexed_documents: 3,
  },
  activity_over_time: [
    { date: '2026-04-01', queries: 2, uploads: 1, tokens: 100, cost_usd: 0.01 },
    { date: '2026-04-02', queries: 1, uploads: 0, tokens: 50, cost_usd: 0.0 },
  ],
  mode_breakdown: [
    { name: 'local', requests: 3, tokens: 200, cost_usd: 0 },
    { name: 'cloud', requests: 1, tokens: 100, cost_usd: 0.1234 },
  ],
  model_breakdown: [
    { name: 'llama3.2:1b', requests: 3, tokens: 200, cost_usd: 0 },
    { name: 'gpt-4o-mini', requests: 1, tokens: 100, cost_usd: 0.1234 },
  ],
  recent_activity: [
    {
      event_type: 'query',
      created_at: '2026-04-05T10:00:00+00:00',
      session_id: 'session-1',
      query_mode: 'rag',
      system_mode: 'local',
      model: 'llama3.2:1b',
      input_tokens: 10,
      output_tokens: 5,
      cost_usd: 0,
      filename: null,
      chunks_created: 0,
      language: null,
    },
    {
      event_type: 'upload',
      created_at: '2026-04-05T09:00:00+00:00',
      session_id: 'session-1',
      query_mode: null,
      system_mode: 'local',
      model: null,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      filename: 'policy.pdf',
      chunks_created: 7,
      language: 'en',
    },
  ],
  has_data: true,
};

describe('Dashboard', () => {
  it('renders a loading state', () => {
    const { container } = render(
      <Dashboard analytics={null} isLoading mode={{ mode: 'local', description: 'Local mode' }} />,
    );

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders an empty state when no analytics exist', () => {
    render(
      <Dashboard
        analytics={{ ...analytics, has_data: false }}
        isLoading={false}
        mode={{ mode: 'local', description: 'Local mode' }}
      />,
    );

    expect(screen.getByText('Analytics will appear here')).toBeInTheDocument();
  });

  it('renders populated analytics content', () => {
    render(
      <Dashboard analytics={analytics} isLoading={false} mode={{ mode: 'local', description: 'Local mode' }} />,
    );

    expect(screen.getByText('Usage Over Time')).toBeInTheDocument();
    expect(screen.getByText('Model Usage')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getAllByText('session-1').length).toBeGreaterThan(0);
    expect(screen.getByText(/policy\.pdf/)).toBeInTheDocument();
  });
});
