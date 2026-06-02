import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionMainFieldsView } from './TransactionMainFieldsView';

describe('TransactionMainFieldsView', () => {
  it('renders expense amount, merchant and formatted date fields', () => {
    const changeAmount = vi.fn();
    const changeNote = vi.fn();
    const changeDate = vi.fn();

    render(
      <TransactionMainFieldsView
        required={{
          config: {
            amountLabel: 'Amount',
            dateInputLabel: 'Date',
            datePlaceholder: '2026-05-14',
            noteLabel: 'Merchant',
            notePlaceholder: 'Cafe',
          },
          data: {
            transferTargetOptions: [],
          },
          state: {
            mode: 'expense',
            amount: '12',
            date: '2026-05-10',
            note: 'Coffee',
            transferTargetAccountId: '',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeAmount,
            changeDate,
            changeNote,
            changeTransferTarget: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Market' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '20260511' } });

    expect(changeAmount).toHaveBeenCalledWith('24');
    expect(changeNote).toHaveBeenCalledWith('Market');
    expect(changeDate).toHaveBeenCalledWith('2026-05-11');
    expect(screen.queryByLabelText('Destination account')).not.toBeInTheDocument();
  });

  it('renders transfer destination, amount, description and calendar action', () => {
    const dateInputRef = createRef<HTMLInputElement>();
    const showPicker = vi.fn();

    render(
      <TransactionMainFieldsView
        required={{
          config: {
            amountLabel: 'Amount out (USD)',
            dateInputLabel: 'Execution date',
            datePlaceholder: '2026-05-14',
            noteLabel: 'Description',
            notePlaceholder: 'Description',
            dateInputRef,
          },
          data: {
            transferTargetOptions: [
              { id: 'acc-2', name: 'Savings', currency: 'EUR' },
            ],
          },
          state: {
            mode: 'transfer',
            amount: '50',
            date: '2026-05-15',
            note: 'Move cash',
            transferTargetAccountId: 'acc-2',
          },
          status: {
            disabled: false,
            amountError: 'Amount required',
            dateError: 'Invalid date',
          },
        }}
        provided={{
          commands: {
            changeAmount: vi.fn(),
            changeDate: vi.fn(),
            changeNote: vi.fn(),
            changeTransferTarget: vi.fn(),
          },
        }}
      />,
    );

    const nativeDateInput = dateInputRef.current;
    expect(nativeDateInput).not.toBeNull();
    Object.defineProperty(nativeDateInput, 'showPicker', { value: showPicker });

    expect(screen.getByLabelText('Destination account')).toHaveValue('acc-2');
    expect(screen.getByRole('option', { name: 'Savings (EUR)' })).toBeInTheDocument();
    expect(screen.getByText('Amount required')).toBeInTheDocument();
    expect(screen.getByText('Invalid date')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('disables manual date editing and the calendar action when the scheduler controls the date', () => {
    render(
      <TransactionMainFieldsView
        required={{
          config: {
            amountLabel: 'Amount',
            dateInputLabel: 'Next execution date',
            datePlaceholder: '2026-05-18',
            noteLabel: 'Merchant',
            notePlaceholder: 'Cafe',
          },
          data: {
            transferTargetOptions: [],
          },
          state: {
            mode: 'expense',
            amount: '12',
            date: '2026-06-11',
            note: 'Gym',
            transferTargetAccountId: '',
          },
          status: {
            disabled: false,
            dateDisabled: true,
          },
        }}
        provided={{
          commands: {
            changeAmount: vi.fn(),
            changeDate: vi.fn(),
            changeNote: vi.fn(),
            changeTransferTarget: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Next execution date')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });
});
