import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useApp';

const queryMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    query: queryMock,
    getMode: vi.fn(),
    setMode: vi.fn(),
    getMetrics: vi.fn(),
    getDocuments: vi.fn(),
    getDashboardAnalytics: vi.fn(),
  },
}));

describe('useChat', () => {
  beforeEach(() => {
    localStorage.clear();
    queryMock.mockReset();
    queryMock.mockResolvedValue({
      answer: 'Hello',
      sources: [
        {
          citation_id: 1,
          source: 'policy.pdf',
          chunk_index: 0,
          score: 0.9,
          excerpt: 'Policy excerpt',
        },
      ],
      language: 'en',
      tokens_used: { input: 1, output: 1 },
      cost_usd: 0,
      mode_used: 'rag',
      pii_detected: false,
      agent_steps: 0,
      tool_results: [],
    });
  });

  it('sends a generated session_id with the first query', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Summarize the policy');
    });

    await waitFor(() =>
      expect(queryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Summarize the policy',
          session_id: 'session-123456',
        }),
      ),
    );

    expect(result.current.sessions[0].id).toBe('session-123456');
  });

  it('rehydrates persisted sources with citation ids from local storage', () => {
    localStorage.setItem(
      'aether_chat_sessions',
      JSON.stringify([
        {
          id: 'session-1',
          title: 'Saved session',
          lastModified: 1,
          messages: [
            {
              id: 'assistant-1',
              role: 'assistant',
              content: 'Answer [1]',
              timestamp: '2026-04-09T10:00:00.000Z',
              sources: [
                {
                  citation_id: 1,
                  source: 'policy.pdf',
                  chunk_index: 0,
                  score: 0.88,
                  excerpt: 'Persisted supporting excerpt',
                },
              ],
            },
          ],
        },
      ]),
    );

    const { result } = renderHook(() => useChat());

    expect(result.current.sessions[0].messages[0].sources?.[0]).toMatchObject({
      citation_id: 1,
      source: 'policy.pdf',
      excerpt: 'Persisted supporting excerpt',
    });
  });
});
