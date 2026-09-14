import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareEditorFlow } from '../../application/ShareEditorFlow';
import type { ShareDraft, SharingGroupSuggestion } from '../../domain/shareDraft';
import selectionStyles from '../ParticipantSelection/ShareParticipantSelectionView.module.css';

function renderShareEditor(
  applyShare = vi.fn(),
  draft?: ShareDraft,
  options: { movementType?: 'expense' | 'income'; groupSuggestions?: readonly SharingGroupSuggestion[] } = {},
) {
  render(
    <ShareEditorFlow
      title="Share expense"
      onClose={vi.fn()}
      required={{
        config: {},
        data: { groupSuggestions: options.groupSuggestions },
        state: { amount: '20.00', currencyCode: 'EUR', draft, movementType: options.movementType },
        status: { disabled: false },
      }}
      provided={{ commands: { applyShare } }}
    />,
  );
  return applyShare;
}

function openParticipantSelection() {
    fireEvent.click(screen.getByRole('button', { name: /Add people or groups/ }));
}

describe('ShareExpenseEditorView', () => {
  it('adds people below the payer with newest person second and removes people', () => {
    renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Luis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Luis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    const rows = within(screen.getByRole('list', { name: 'Share people' })).getAllByRole('listitem');
    expect(within(rows[0]).getByText('You (Payer)')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Luis')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Emma')).toBeInTheDocument();

    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Remove Luis' }));
    expect(screen.queryByText('Luis')).not.toBeInTheDocument();
    expect(within(rows[0]).queryByRole('button', { name: 'Remove You (Payer)' })).not.toBeInTheDocument();
  });

  it('keeps Confirm in a sticky footer outside the selection scroll region', () => {
    renderShareEditor();
    openParticipantSelection();

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toHaveClass('btn-primary', 'w-100');
    expect(confirm.parentElement).toHaveClass(selectionStyles.stickyAction, 'position-sticky', 'bottom-0');
    expect(confirm.parentElement?.previousElementSibling).toHaveClass('flex-grow-1', 'overflow-y-auto');
  });

  it('does not add the same person twice', () => {
    renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });

    expect(screen.getAllByText('Emma')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Emma$/ })).not.toBeInTheDocument();
  });

  it('cancelling participant selection restores the previous draft', () => {
    renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.queryByText('Emma')).not.toBeInTheDocument();
    expect(screen.getByText('You (Payer)')).toBeInTheDocument();
  });

  it('confirming participant selection preserves the selected draft', () => {
    renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Emma')).toBeInTheDocument();
  });

  it('adds only unselected people from a historical group', () => {
    renderShareEditor(vi.fn(), undefined, {
      groupSuggestions: [{
        key: 'emma|luis',
        people: [{ id: 'emma', name: 'Emma' }, { id: 'luis', name: 'Luis' }],
        usageCount: 2,
        lastUsedAt: '2026-06-02T10:00:00Z',
      }],
    });

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
    fireEvent.click(screen.getByRole('button', { name: /Emma, Luis/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getAllByText('Emma')).toHaveLength(1);
    expect(screen.getAllByText('Luis')).toHaveLength(1);
  });

  it('allows adding a typed person when there are no matches', () => {
    renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Nora' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Nora/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Nora')).toBeInTheDocument();
  });

  it('lets the payer edit parts and amount depending on the selected mode and resets values on mode change', () => {
    renderShareEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Increase parts for You (Payer)' }));
    expect(screen.getByLabelText('You (Payer) parts')).toHaveValue(2);

    fireEvent.click(screen.getByRole('radio', { name: 'As amounts' }));
    expect(screen.getByLabelText('You (Payer) amount')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('You (Payer) amount'), { target: { value: '8.00' } });
    expect(screen.getByLabelText('You (Payer) amount')).toHaveValue(8);

    fireEvent.click(screen.getByRole('radio', { name: 'As parts' }));
    expect(screen.getByLabelText('You (Payer) parts')).toHaveValue(1);
  });

  it('keeps the owner included by default and keeps the apply action available for long lists', () => {
    renderShareEditor(vi.fn(), {
      mode: 'parts',
      people: Array.from({ length: 20 }, (_, index) => ({
        id: `person-${index}`,
        role: 'participant' as const,
        name: `Person ${index}`,
        parts: 1,
        amount: '0.95',
        settlementChoice: 'not_required' as const,
        avatarTone: 'custom' as const,
      })).concat([{ id: 'owner', role: 'owner' as const, name: 'You (Payer)', parts: 1, amount: '0.95', avatarTone: 'you' as const }]),
    });

    expect(screen.getByText('You (Payer)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply share' })).toBeInTheDocument();
  });

  it('shows amount totals, blocks over-total apply and applies a valid share', () => {
    const applyShare = renderShareEditor();

    openParticipantSelection();
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'Emma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('radio', { name: 'As amounts' }));
    fireEvent.change(screen.getByLabelText('You (Payer) amount'), { target: { value: '12.00' } });
    fireEvent.change(screen.getByLabelText('Emma amount'), { target: { value: '11.00' } });

    expect(screen.getByText(/Remove 3.00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply share' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Emma amount'), { target: { value: '8.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply share' }));

    expect(applyShare).toHaveBeenCalledWith(
      { peopleCount: 2, total: '20.00' },
      expect.objectContaining({
        mode: 'amounts',
        people: expect.arrayContaining([
          expect.objectContaining({ name: 'Emma', amount: '8.00' }),
        ]),
      }),
    );
  });

  it('uses a vertical scrolling content region without elastic grid tracks', () => {
    renderShareEditor();

    const content = screen.getByText('Total').parentElement?.parentElement?.parentElement;
    expect(content).toHaveClass('flex-grow-1', 'overflow-y-auto', 'overflow-x-hidden');
    expect(content?.firstElementChild).toHaveClass('d-flex', 'flex-column', 'gap-4');
    expect(content).not.toHaveClass('d-grid');
  });

  it('restores a previously applied share draft', () => {
    renderShareEditor(vi.fn(), {
      mode: 'amounts',
      people: [
        { id: 'owner', role: 'owner', name: 'You (Payer)', parts: 1, amount: '12.00', avatarTone: 'you' },
        { id: 'emma-1', role: 'participant', name: 'Emma', email: 'emma@example.com', settlementChoice: 'pending', parts: 1, amount: '8.00', avatarTone: 'emma' },
      ],
    });

    expect(screen.getByRole('radio', { name: 'As amounts' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Emma')).toBeInTheDocument();
    expect(screen.getByLabelText('Emma amount')).toHaveValue(8);
    expect(screen.getByRole('button', { name: 'Emma settlement status' })).toHaveTextContent('Pending');
  });

  it.each([
    ['expense', 'Reimbursed', 'No reimbursement'],
    ['income', 'Paid out', 'No payout'],
  ] as const)('keeps %s settlement labels', (movementType, settledLabel, notRequiredLabel) => {
    renderShareEditor(vi.fn(), {
      mode: 'amounts',
      people: [
        { id: 'owner', role: 'owner', name: 'You (Payer)', parts: 1, amount: '20.00', avatarTone: 'you' },
        { id: 'emma-1', role: 'participant', name: 'Emma', settlementChoice: 'settled', parts: 1, amount: '0.00', avatarTone: 'emma' },
      ],
    }, { movementType });

    fireEvent.click(screen.getByRole('button', { name: 'Emma settlement status' }));
    expect(screen.getByRole('option', { name: settledLabel })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: notRequiredLabel })).toBeInTheDocument();
  });
});
