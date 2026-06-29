import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareExpenseEditorView } from './ShareExpenseEditorView';

function renderShareEditor(applyShare = vi.fn()) {
  render(
    <ShareExpenseEditorView
      required={{
        config: {},
        data: {},
        state: { amount: '20.00', currencyCode: 'EUR' },
        status: { disabled: false },
      }}
      provided={{ commands: { applyShare } }}
    />,
  );
  return applyShare;
}

describe('ShareExpenseEditorView', () => {
  it('adds people below the payer with newest person second and removes people', () => {
    renderShareEditor();

    fireEvent.change(screen.getByLabelText('Search people to add'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: /Emma/i }));
    fireEvent.change(screen.getByLabelText('Search people to add'), { target: { value: 'Luis' } });
    fireEvent.click(screen.getByRole('button', { name: /Luis/i }));

    const rows = within(screen.getByRole('list', { name: 'Share people' })).getAllByRole('listitem');
    expect(within(rows[0]).getByText('You (Payer)')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Luis')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Emma')).toBeInTheDocument();

    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Remove Luis' }));
    expect(screen.queryByText('Luis')).not.toBeInTheDocument();
  });

  it('allows adding a typed person when there are no matches', () => {
    renderShareEditor();

    fireEvent.change(screen.getByLabelText('Search people to add'), { target: { value: 'Nora' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Nora/i }));

    expect(screen.getByText('Nora')).toBeInTheDocument();
  });

  it('lets the payer edit parts and amount depending on the selected mode and resets values on mode change', () => {
    renderShareEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Increase parts for You (Payer)' }));
    expect(screen.getByLabelText('You (Payer) parts')).toHaveValue(2);

    fireEvent.click(screen.getByRole('tab', { name: 'As amounts' }));
    expect(screen.getByLabelText('Your amount')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Your amount'), { target: { value: '8.00' } });
    expect(screen.getByLabelText('Your amount')).toHaveValue(8);

    fireEvent.click(screen.getByRole('tab', { name: 'As parts' }));
    expect(screen.getByLabelText('You (Payer) parts')).toHaveValue(1);
  });

  it('shows amount totals, blocks over-total apply and applies a valid share', () => {
    const applyShare = renderShareEditor();

    fireEvent.change(screen.getByLabelText('Search people to add'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: /Emma/i }));
    fireEvent.click(screen.getByRole('tab', { name: 'As amounts' }));
    fireEvent.change(screen.getByLabelText('Your amount'), { target: { value: '12.00' } });
    fireEvent.change(screen.getByLabelText('Emma amount'), { target: { value: '11.00' } });

    expect(screen.getByText(/Can't exceed 20.00 EUR total/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply share' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Emma amount'), { target: { value: '8.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply share' }));

    expect(applyShare).toHaveBeenCalledWith({ peopleCount: 2, total: '20.00' });
  });
});
