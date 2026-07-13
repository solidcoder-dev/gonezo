import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusSection } from './StatusSection';

function makeProps(overrides: Partial<Parameters<typeof StatusSection>[0]> = {}) {
  return {
    required: {
      screen: {
        loadPhase: 'ready' as const,
        error: '',
      },
      toast: {
        message: 'Voice processing failed',
        tone: 'warning' as const,
        actionLabel: 'Download ZIP',
      },
      ...overrides.required,
    },
    provided: {
      commands: {
        dismiss: vi.fn(),
        runAction: vi.fn(),
        ...overrides.provided?.commands,
      },
    },
  };
}

describe('StatusSection', () => {
  it('renders warning toasts with warning tone and contextual action', () => {
    render(<StatusSection {...makeProps()} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--warning');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('renders info toasts with polite status semantics', () => {
    render(<StatusSection {...makeProps({
      required: {
        screen: {
          loadPhase: 'ready' as const,
          error: '',
        },
        toast: {
          message: 'Voice draft created. Review the interpreted values.',
          tone: 'info' as const,
          actionLabel: 'Download ZIP',
        },
      },
    })} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('toast--info');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeInTheDocument();
  });

  it('renders success toasts with polite status semantics', () => {
    render(<StatusSection {...makeProps({
      required: {
        screen: {
          loadPhase: 'ready' as const,
          error: '',
        },
        toast: {
          message: 'Diagnostic ZIP exported.',
          tone: 'success' as const,
          actionLabel: '',
        },
      },
    })} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('toast--success');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('runs the toast action and dismiss callback', () => {
    const runAction = vi.fn();
    const dismiss = vi.fn();
    render(<StatusSection {...makeProps({
      provided: {
        commands: {
          dismiss,
          runAction,
        },
      },
    })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(runAction).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('hides the action button when no action label is present', () => {
    render(<StatusSection {...makeProps({
      required: {
        screen: {
          loadPhase: 'ready' as const,
          error: '',
        },
        toast: {
          message: 'Message only',
          tone: 'warning' as const,
          actionLabel: '',
        },
      },
    })} />);

    expect(screen.queryByRole('button', { name: 'Download ZIP' })).not.toBeInTheDocument();
  });
});
