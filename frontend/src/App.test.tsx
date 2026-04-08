import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const hookState = vi.hoisted(() => ({
  chat: {
    messages: [],
    isLoading: false,
    sendMessage: vi.fn(),
    clearChat: vi.fn(),
    sessions: [{ id: 'session-1', title: 'First Session', messages: [], lastModified: 1 }],
    activeSessionId: 'session-1' as string | null,
    selectSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
  },
  mode: {
    mode: { mode: 'local', description: 'Local mode' },
    setMode: vi.fn(),
    isToggling: false,
  },
  metrics: {
    metrics: {
      total_requests: 3,
      total_input_tokens: 120,
      total_output_tokens: 45,
      total_cost_usd: 0.0,
      by_model: {},
      by_session: {},
      recent_requests: [],
    },
  },
  documents: {
    documents: ['policy.pdf'],
    refresh: vi.fn(),
    addDocument: vi.fn(),
  },
  dashboard: {
    analytics: null,
    isLoading: false,
    refresh: vi.fn(),
  },
}));

const deleteDocumentMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks/useApp', () => ({
  useChat: () => hookState.chat,
  useMode: () => hookState.mode,
  useMetrics: () => hookState.metrics,
  useDocuments: () => hookState.documents,
  useDashboard: () => hookState.dashboard,
}));

vi.mock('./lib/api', () => ({
  api: {
    deleteDocument: deleteDocumentMock,
  },
}));

vi.mock('./components/DocumentReader', () => ({
  DocumentReader: ({ filename }: { filename: string }) => <div>Document Preview: {filename}</div>,
}));

vi.mock('./components/Dashboard', () => ({
  Dashboard: () => <div>Dashboard Route</div>,
}));

describe('App routes', () => {
  beforeEach(() => {
    hookState.chat.clearChat.mockClear();
    hookState.chat.selectSession.mockClear();
    deleteDocumentMock.mockReset();
  });

  it('renders the chat route and analytics CTA', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('First Session').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'View Analytics' })).toBeInTheDocument();
  });

  it('navigates to dashboard from the analytics CTA', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'View Analytics' }));

    expect(screen.getByText('Dashboard Route')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Analytics' })).not.toBeInTheDocument();
  });

  it('navigates to dashboard from the sidebar', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /dashboard/i }));

    expect(screen.getByText('Dashboard Route')).toBeInTheDocument();
  });

  it('renders the upload route directly', () => {
    render(
      <MemoryRouter initialEntries={['/upload']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Upload Documents')[0]).toBeInTheDocument();
  });

  it('renders the document preview route directly', () => {
    render(
      <MemoryRouter initialEntries={['/documents/policy.pdf']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Document Preview: policy.pdf')).toBeInTheDocument();
  });
});
