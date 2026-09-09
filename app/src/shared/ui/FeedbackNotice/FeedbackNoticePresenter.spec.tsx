import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackNoticePresenter } from './FeedbackNoticePresenter';
import type { FeedbackNotice } from './feedbackNotice.types';

const notice: FeedbackNotice = {
  id: 'notice-1',
  tone: 'error',
  message: 'Save failed',
  source: 'transaction.create',
  details: {
    code: 'save-failed',
    operation: 'transaction.create',
    fields: [{ label: 'Safe field', value: 'safe value' }],
  },
  durationPolicy: 'until-closed',
};

describe('FeedbackNoticePresenter', () => {
  it('copies only the safe diagnostic fields after confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackNoticePresenter
        notices={[notice]}
        closeNotice={vi.fn()}
        pauseNotice={vi.fn()}
        resumeNotice={vi.fn()}
        writeText={writeText}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Save failed\nCode: save-failed\nOperation: transaction.create'));
    expect(writeText.mock.calls[0][0]).not.toContain('safe value');
  });

  it('keeps the notice and reports a local selectable copy error when writing fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'));
    render(
      <FeedbackNoticePresenter
        notices={[notice]}
        closeNotice={vi.fn()}
        pauseNotice={vi.fn()}
        resumeNotice={vi.fn()}
        writeText={writeText}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Copy error');
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });
});
