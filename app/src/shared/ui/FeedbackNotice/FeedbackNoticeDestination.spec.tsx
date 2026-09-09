import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackNoticeDestination, FeedbackNoticeDestinationProvider } from './FeedbackNoticeDestination';
import { FeedbackNoticePresenter } from './FeedbackNoticePresenter';
import type { FeedbackNotice } from './feedbackNotice.types';

const notice: FeedbackNotice = {
  id: 'notice-1',
  tone: 'error',
  message: 'Operation failed',
  source: 'test',
  durationPolicy: 'until-closed',
};

describe('FeedbackNoticeDestination', () => {
  it('renders the same presenter inside the most recently active destination', async () => {
    render(
      <FeedbackNoticeDestinationProvider>
        <div data-testid="outer-destination"><FeedbackNoticeDestination /></div>
        <div data-testid="inner-destination"><FeedbackNoticeDestination /></div>
        <FeedbackNoticePresenter
          notices={[notice]}
          closeNotice={vi.fn()}
          pauseNotice={vi.fn()}
          resumeNotice={vi.fn()}
        />
      </FeedbackNoticeDestinationProvider>
    );

    await waitFor(() => {
      const destinations = document.querySelectorAll('[data-feedback-notice-destination]');
      expect(destinations[1]).toContainElement(screen.getByRole('alert'));
      expect(destinations[0]).not.toContainElement(screen.getByRole('alert'));
    });
  });
});
