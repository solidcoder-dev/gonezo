import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackNoticeView } from './FeedbackNoticeView';

function renderNotice(overrides: { tone?: 'success' | 'info' | 'warning' | 'error'; actionLabel?: string } = {}) {
  return render(
    <FeedbackNoticeView
      required={{
        config: { tone: overrides.tone ?? 'warning' },
        data: { message: 'Voice processing failed', actionLabel: overrides.actionLabel ?? 'Download ZIP' },
        state: {},
        status: {},
      }}
      provided={{ commands: { runAction: vi.fn(), dismiss: vi.fn() } }}
    />
  );
}

describe('FeedbackNoticeView', () => {
  it('preserves accessible severity, message, action and dismiss controls', () => {
    renderNotice();

    expect(screen.getByRole('alert')).toHaveTextContent('Voice processing failed');
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('runs the supplied commands without owning operation behavior', () => {
    const runAction = vi.fn();
    const dismiss = vi.fn();
    render(
      <FeedbackNoticeView
        required={{ config: { tone: 'success' }, data: { message: 'Saved' }, state: {}, status: {} }}
        provided={{ commands: { runAction, dismiss } }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(runAction).not.toHaveBeenCalled();
  });

  it('exposes safe details and copy as independent notice controls', () => {
    const copy = vi.fn();
    render(
      <FeedbackNoticeView
        required={{
          config: { tone: 'error' },
          data: { message: 'Save failed', details: 'Code: save-failed\nOperation: transaction.create', copyState: 'idle' },
          state: {},
          status: {},
        }}
        provided={{ commands: { runAction: vi.fn(), dismiss: vi.fn(), copy } }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Code: save-failed');
    expect(copy).toHaveBeenCalledTimes(1);
  });
});
