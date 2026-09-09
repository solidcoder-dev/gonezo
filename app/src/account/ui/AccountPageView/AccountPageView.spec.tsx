import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountPageView } from './AccountPageView';

describe('AccountPageView', () => {
  it('renders the pageHeader slot once at the top of the content', () => {
    render(
      <AccountPageView
        required={{
          screen: { loadPhase: 'ready', error: '' },
          sections: {
            pageHeader: <div data-testid="page-header">Page header</div>,
            netWorthSummary: null,
            accountHub: null,
            accountSummary: null,
            transactionEntry: null,
            recentTransactions: null,
            transactionsImport: null,
          },
        }}
        provided={{}}
      />,
    );

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});
