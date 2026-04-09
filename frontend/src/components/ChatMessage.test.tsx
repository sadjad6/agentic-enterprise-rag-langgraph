import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../hooks/useApp';

function buildAssistantMessage(overrides: Partial<ChatMessageType> = {}): ChatMessageType {
  return {
    id: 'assistant-1',
    role: 'assistant',
    content: 'The retention policy requires seven years [1].',
    timestamp: new Date().toISOString(),
    sources: [
      {
        citation_id: 1,
        source: 'retention-policy.pdf',
        chunk_index: 0,
        score: 0.97,
        excerpt: 'Records must be retained for seven years from the effective date.',
      },
    ],
    ...overrides,
  };
}

describe('ChatMessage citations', () => {
  it('renders inline citation buttons and opens the preview on hover', async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={buildAssistantMessage()} />);

    const citationButton = screen.getByRole('button', { name: 'Citation 1' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    expect(citationButton).toHaveTextContent('[1]');
    expect(tooltip).toHaveAttribute('data-state', 'closed');

    await user.hover(citationButton);

    expect(screen.getByRole('button', { name: 'Citation 1' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('retention-policy.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Records must be retained for seven years/i)).toBeInTheDocument();
  });

  it('renders multiple citations independently', async () => {
    const user = userEvent.setup();
    render(
      <ChatMessage
        message={buildAssistantMessage({
          content: 'The policy covers retention [1] and legal hold exceptions [2].',
          sources: [
            {
              citation_id: 1,
              source: 'retention-policy.pdf',
              chunk_index: 0,
              score: 0.97,
              excerpt: 'Records must be retained for seven years from the effective date.',
            },
            {
              citation_id: 2,
              source: 'legal-hold.docx',
              chunk_index: 3,
              score: 0.91,
              excerpt: 'Legal hold suspends standard deletion schedules until counsel releases the hold.',
            },
          ],
        })}
      />,
    );

    const firstCitation = screen.getByRole('button', { name: 'Citation 1' });
    const secondCitation = screen.getByRole('button', { name: 'Citation 2' });

    await user.hover(firstCitation);

    const firstTooltip = screen
      .getByText('Records must be retained for seven years from the effective date.')
      .closest('[role="tooltip"]');
    const secondTooltip = screen
      .getByText('Legal hold suspends standard deletion schedules until counsel releases the hold.')
      .closest('[role="tooltip"]');

    expect(firstTooltip).toHaveAttribute('data-state', 'open');
    expect(secondTooltip).toHaveAttribute('data-state', 'closed');
    expect(screen.getByRole('button', { name: 'Citation 1' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Citation 2' })).toHaveAttribute('aria-expanded', 'false');

    await user.unhover(firstCitation);
    await user.hover(secondCitation);

    expect(screen.getByRole('button', { name: 'Citation 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Citation 2' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('falls back to inert text for missing citations', () => {
    render(
      <ChatMessage
        message={buildAssistantMessage({
          content: 'This claim references an unknown source [9].',
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Citation 9' })).not.toBeInTheDocument();
    expect(screen.getByText('[9]')).toBeInTheDocument();
  });

  it('supports keyboard focus for citation previews', async () => {
    const user = userEvent.setup();
    render(<ChatMessage message={buildAssistantMessage()} />);

    const citationButton = screen.getByRole('button', { name: 'Citation 1' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    await user.tab();

    const focusedCitation = screen.getByRole('button', { name: 'Citation 1' });

    expect(focusedCitation).toHaveFocus();
    expect(focusedCitation).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveAttribute('data-state', 'open');
  });
});
