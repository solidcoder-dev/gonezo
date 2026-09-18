import { fireEvent, render, screen } from '@testing-library/react';
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

function renderGate(port: AnalyticsContributionConsentPort) {
  return render(<MemoryRouter><AuthenticationSessionProvider session={{ userId: 'user-A', logout: async () => undefined }}>
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
});
