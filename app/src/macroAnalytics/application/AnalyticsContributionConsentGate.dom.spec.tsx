import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthenticationSessionProvider } from '../../authentication/application/authenticationSession';
import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import { AnalyticsContributionConsentGate } from './AnalyticsContributionConsentGate';

class MemoryConsentPort implements AnalyticsContributionConsentPort {
  readonly decisions = new Map<string, AnalyticsContributionConsent>();
  async get(userId: string) { return this.decisions.get(userId) ?? null; }
  async save(decision: AnalyticsContributionConsent) { this.decisions.set(decision.userId, decision); }
}

function renderGate(port: AnalyticsContributionConsentPort, userId = 'user-A') {
  return render(<MemoryRouter><AuthenticationSessionProvider session={{ userId, logout: async () => undefined }}>
    <AnalyticsContributionConsentGate port={port} clock={() => '2026-09-18T10:00:00.000Z'}>
      <p>Gonezo workspace</p>
    </AnalyticsContributionConsentGate>
  </AuthenticationSessionProvider></MemoryRouter>);
}

describe('AnalyticsContributionConsentGate', () => {
  it.each([
    ['Allow contribution', 'GRANTED'],
    ['Not now', 'DECLINED'],
  ] as const)('%s records the choice and allows normal app use', async (action, status) => {
    const port = new MemoryConsentPort();
    renderGate(port);

    expect(await screen.findByRole('heading', { name: 'Contribute to aggregated insights?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: action }));

    expect(await screen.findByText('Gonezo workspace')).toBeInTheDocument();
    expect(await port.get('user-A')).toMatchObject({ status, noticeVersion: 1 });
  });

  it('shows a retry when reading the saved choice fails', async () => {
    let attempts = 0;
    const port = new MemoryConsentPort();
    port.get = async (userId) => {
      attempts += 1;
      if (attempts === 1) throw new Error('storage unavailable');
      return port.decisions.get(userId) ?? null;
    };
    renderGate(port);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));

    expect(await screen.findByText('Gonezo workspace')).toBeInTheDocument();
  });

  it('keeps both decisions available when saving fails so the user can retry', async () => {
    const port = new MemoryConsentPort();
    const save = port.save.bind(port);
    let shouldFail = true;
    port.save = async (decision) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('storage unavailable');
      }
      await save(decision);
    };
    renderGate(port);

    fireEvent.click(await screen.findByRole('button', { name: 'Allow contribution' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(await screen.findByText('Gonezo workspace')).toBeInTheDocument();
    expect(await port.get('user-A')).toMatchObject({ status: 'DECLINED' });
  });

  it('does not expose the previous user workspace while loading the next user choice', async () => {
    const port = new MemoryConsentPort();
    port.decisions.set('user-A', { userId: 'user-A', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00.000Z' });
    let finishUserBRead!: (consent: AnalyticsContributionConsent | null) => void;
    port.get = async (userId) => userId === 'user-B'
      ? new Promise((resolve) => { finishUserBRead = resolve; })
      : port.decisions.get(userId) ?? null;
    const view = renderGate(port);
    expect(await screen.findByText('Gonezo workspace')).toBeInTheDocument();

    view.rerender(<MemoryRouter><AuthenticationSessionProvider session={{ userId: 'user-B', logout: async () => undefined }}>
      <AnalyticsContributionConsentGate port={port} clock={() => '2026-09-18T10:00:00.000Z'}><p>Gonezo workspace</p></AnalyticsContributionConsentGate>
    </AuthenticationSessionProvider></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Gonezo workspace')).not.toBeInTheDocument());
    finishUserBRead(null);

    expect(await screen.findByRole('heading', { name: 'Contribute to aggregated insights?' })).toBeInTheDocument();
  });
});
