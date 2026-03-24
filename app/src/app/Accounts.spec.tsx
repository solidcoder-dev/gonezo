import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Accounts } from './Accounts';
import type { AccountsCorePort } from '../account/application/useAccountPageOrchestrator';
import type { LedgerTransactionListItem } from '../domain/corePort';

function makeCore(transactionCount = 0): AccountsCorePort {
  const transactions: LedgerTransactionListItem[] = Array.from({ length: transactionCount }).map((_, index) => ({
    id: `tx-${index + 1}`,
    accountId: 'acc-1',
    occurredAt: `2026-03-0${(index % 9) + 1}`,
    description: `Description ${index + 1}`,
    merchant: `Merchant ${index + 1}`,
    amount: `${index + 1}.00`,
    currency: 'USD',
    type: index % 2 === 0 ? 'expense' : 'income',
    status: 'posted',
    items: [],
  }));

  return {
    ledgerListSupportedCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    ledgerListAccounts: vi.fn(async () => ({
      items: [
        {
          id: 'acc-1',
          name: 'Main',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings',
          type: 'savings',
          currency: 'USD',
          status: 'active',
        },
      ],
    })),
    ledgerGetAccountSummary: vi.fn(async () => ({
      accountId: 'acc-1',
      name: 'Main',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    })),
    ledgerListTransactions: vi.fn(async () => ({ items: transactions })),
    ledgerOpenAccount: vi.fn(async () => ({ id: 'acc-1' })),
    ledgerRenameAccount: vi.fn(async () => undefined),
    ledgerArchiveAccount: vi.fn(async () => undefined),
    ledgerDeleteAccount: vi.fn(async () => undefined),
    ledgerRecordExpense: vi.fn(async () => ({ id: 'tx-exp' })),
    ledgerRecordIncome: vi.fn(async () => ({ id: 'tx-inc' })),
    ledgerRecordTransfer: vi.fn(async () => ({ transferOutId: 'tx-tr-out', transferInId: 'tx-tr-in' })),
    ledgerCreateExpenseDraft: vi.fn(async () => ({ id: 'tx-draft' })),
    ledgerAddTransactionItem: vi.fn(async () => undefined),
    ledgerPostDraftTransaction: vi.fn(async () => undefined),
    ledgerVoidTransaction: vi.fn(async () => undefined),
    taxonomyListCategories: vi.fn(async () => ({
      items: [
        { id: 'cat-food', name: 'Food', appliesTo: 'expense' as const, status: 'active' as const },
        { id: 'cat-salary', name: 'Salary', appliesTo: 'income' as const, status: 'active' as const },
      ],
    })),
    taxonomyCreateCategory: vi.fn(async () => ({ id: 'cat-created' })),
    taxonomyListTags: vi.fn(async () => ({
      items: [
        { id: 'tag-home', name: 'home', status: 'active' as const },
        { id: 'tag-london', name: 'london', status: 'active' as const },
      ],
    })),
    mobillsImport: vi.fn(async () => ({
      totalRows: 0,
      importedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rows: [],
    })),
    orchestrationCategorizeTransaction: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationApplyTransactionTags: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationListTransactionTaxonomy: vi.fn(async () => ({ items: [] })),
  };
}

async function openMode(mode: 'Expense' | 'Income' | 'Transfer') {
  fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));
  fireEvent.click(await screen.findByRole('button', { name: mode }));
}

describe('Accounts UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows switch account action inline with account summary', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Net balance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch account' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('shows import action in account controls when accounts exist', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('opens account management sheet from account controls', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    expect(await screen.findByRole('dialog', { name: 'Manage account' })).toBeInTheDocument();
  });

  it('renames current account from management sheet', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    fireEvent.change(await screen.findByLabelText('Manage account name'), { target: { value: 'Wallet renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await waitFor(() => {
      expect(core.ledgerRenameAccount).toHaveBeenCalledTimes(1);
    });
    expect(core.ledgerRenameAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
      name: 'Wallet renamed',
    });
  });

  it('archives current account from management sheet after confirmation', async () => {
    const core = makeCore();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Archive account' }));

    await waitFor(() => {
      expect(core.ledgerArchiveAccount).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(core.ledgerArchiveAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
    });
  });

  it('deletes current account from management sheet after confirmation', async () => {
    const core = makeCore();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));

    await waitFor(() => {
      expect(core.ledgerDeleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(core.ledgerDeleteAccount).toHaveBeenCalledWith({
      accountId: 'acc-1',
    });
  });

  it('does not delete account when confirmation is canceled', async () => {
    const core = makeCore();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));

    expect(core.ledgerDeleteAccount).not.toHaveBeenCalled();
  });

  it('shows import action in empty state when no accounts exist', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Create your first account' });
    expect(screen.getByRole('button', { name: 'Import from Mobills' })).toBeInTheDocument();
  });

  it('opens and closes the mobills import sheet', async () => {
    const core = makeCore();

    const view = render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    const dialog = await screen.findByRole('dialog', { name: 'Import from Mobills' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('import-sheet');
    expect(view.container.querySelector('.import-sheet-content')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close import sheet' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Import from Mobills' })).not.toBeInTheDocument();
    });
  });

  it('allows csv files in the mobills picker', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('.csv'));
  });

  it('imports a mobills file and shows the summary', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockResolvedValueOnce({
      totalRows: 4,
      importedCount: 3,
      failedCount: 1,
      skippedCount: 0,
      rows: [
        { sourceLine: 2, status: 'imported', transactionId: 'tx-1' },
        { sourceLine: 3, status: 'failed', errorCode: 'INVALID_VALUE', errorMessage: 'Cannot parse value' },
      ],
    });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Imported 3 / 4 rows')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('Failure reasons')).toBeInTheDocument();
    expect(screen.getByText('Invalid value: 1')).toBeInTheDocument();
    expect(screen.getByText('Line 3 (INVALID_VALUE): Cannot parse value')).toBeInTheDocument();
  });

  it('shows account-not-found hint when missing accounts are the failure reason', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockResolvedValueOnce({
      totalRows: 2,
      importedCount: 0,
      failedCount: 2,
      skippedCount: 0,
      rows: [
        {
          sourceLine: 2,
          status: 'failed',
          errorCode: 'ACCOUNT_NOT_FOUND_BILLETERA_EUR',
          errorMessage: 'ACCOUNT_NOT_FOUND:Billetera:EUR',
        },
        {
          sourceLine: 3,
          status: 'failed',
          errorCode: 'ACCOUNT_NOT_FOUND_CASH_USD',
          errorMessage: 'ACCOUNT_NOT_FOUND:Cash:USD',
        },
      ],
    });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Missing account: 2')).toBeInTheDocument();
    expect(
      screen.getByText(/many rows failed because account names were not found/i),
    ).toBeInTheDocument();
  });

  it('uses selected import policy flags when importing', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByLabelText('Create missing categories'));
    fireEvent.click(screen.getByLabelText('Create missing tags'));
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: false,
        createMissingTags: false,
        duplicatePolicy: 'skip',
      },
    });
  });

  it('defaults create-missing-accounts to enabled when importing from empty state', async () => {
    const core = makeCore();
    vi.mocked(core.ledgerListAccounts).mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Create your first account' });
    fireEvent.click(screen.getByRole('button', { name: 'Import from Mobills' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'skip',
      },
    });
  });

  it('uses selected duplicate policy when importing', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText('Duplicate transactions'), { target: { value: 'fail' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => {
      expect(core.mobillsImport).toHaveBeenCalledTimes(1);
    });

    const call = vi.mocked(core.mobillsImport).mock.calls[0];
    expect(call?.[0]).toEqual({
      fileBase64: expect.any(String),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'fail',
      },
    });
  });

  it('shows import failure in sheet when import fails', async () => {
    const core = makeCore();
    vi.mocked(core.mobillsImport).mockRejectedValueOnce(new Error('Import failed hard'));

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const fileInput = await screen.findByLabelText('Mobills file (TSV/CSV)');
    const file = new File(
      ['date\taccount\tvalue\n2026-03-10\tMain\t-10'],
      'mobills.tsv',
      { type: 'text/tab-separated-values' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed hard');
    expect(screen.getByRole('dialog', { name: 'Import from Mobills' })).toBeInTheDocument();
  });

  it('records quick expense from dedicated expense flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
  });

  it('uses current time when submitting a date-only transaction', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-10' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });

    const [firstCall] = vi.mocked(core.ledgerRecordExpense).mock.calls;
    expect(firstCall?.[0].occurredAt.startsWith('2026-03-10T')).toBe(true);
    expect(firstCall?.[0].occurredAt.endsWith('Z')).toBe(true);
  });

  it('categorizes quick expense with an existing category', async () => {
    const core = makeCore();
    const view = render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));
    expect(view.container.querySelector('datalist option[value="Food"]')).not.toBeNull();
    expect(view.container.querySelector('datalist option[value="Salary"]')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
      expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledTimes(1);
    });
    expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      transactionType: 'expense',
      categoryId: 'cat-food',
    });
  });

  it('creates and uses a new category when expense selects create option', async () => {
    const core = makeCore();
    vi.mocked(core.taxonomyListCategories).mockResolvedValueOnce({ items: [] });
    vi.mocked(core.taxonomyCreateCategory).mockResolvedValueOnce({ id: 'cat-new-expense' });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Dining out' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.taxonomyCreateCategory).toHaveBeenCalledTimes(1);
      expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledTimes(1);
    });

    expect(core.taxonomyCreateCategory).toHaveBeenCalledWith({
      name: 'Dining out',
      appliesTo: 'expense',
    });
    expect(core.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      transactionType: 'expense',
      categoryId: 'cat-new-expense',
    });
  });

  it('refreshes categories from backend when opening transaction composer', async () => {
    const core = makeCore();
    vi.mocked(core.taxonomyListCategories)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [{ id: 'cat-travel', name: 'Travel', appliesTo: 'expense' as const, status: 'active' as const }],
      });

    const view = render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));

    await waitFor(() => {
      expect(core.taxonomyListCategories).toHaveBeenCalledTimes(2);
    });
    expect(view.container.querySelector('datalist option[value="Travel"]')).not.toBeNull();
  });

  it('records income from dedicated income flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Income');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save income' }));

    await waitFor(() => {
      expect(core.ledgerRecordIncome).toHaveBeenCalledTimes(1);
    });
  });

  it('shows tags input only in advanced options', async () => {
    const core = makeCore();
    const view = render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    expect(view.container.querySelector('datalist option[value="home"]')).not.toBeNull();
    expect(view.container.querySelector('datalist option[value="london"]')).not.toBeNull();
  });

  it('applies tags when saving expense with typed tags', async () => {
    const core = makeCore();
    vi.mocked(core.taxonomyListTags).mockResolvedValueOnce({
      items: [{ id: 'tag-london', name: 'london', status: 'active' as const }],
    });

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'london, trip-2026, london' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledTimes(1);
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledWith({
      transactionId: 'tx-exp',
      tagNames: ['london', 'trip-2026'],
    });
  });

  it('applies tags to both transfer sides', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle advanced options' }));

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'trip, shared' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transfer' }));

    await waitFor(() => {
      expect(core.orchestrationApplyTransactionTags).toHaveBeenCalledTimes(2);
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenNthCalledWith(1, {
      transactionId: 'tx-tr-out',
      tagNames: ['trip', 'shared'],
    });
    expect(core.orchestrationApplyTransactionTags).toHaveBeenNthCalledWith(2, {
      transactionId: 'tx-tr-in',
      tagNames: ['trip', 'shared'],
    });
  });

  it('records transfer from dedicated transfer flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transfer' }));

    await waitFor(() => {
      expect(core.ledgerRecordTransfer).toHaveBeenCalledTimes(1);
    });
  });

  it('supports detailed expense with items using draft flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));

    fireEvent.click(screen.getByRole('button', { name: 'Publish expense' }));

    await waitFor(() => {
      expect(core.ledgerCreateExpenseDraft).toHaveBeenCalledTimes(1);
      expect(core.ledgerAddTransactionItem).toHaveBeenCalledTimes(2);
      expect(core.ledgerPostDraftTransaction).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps detailed expense publish disabled until split reaches zero', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('checkbox'));

    const publishButton = screen.getByRole('button', { name: 'Publish expense' });
    expect(publishButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(publishButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));
    expect(publishButton).toBeEnabled();
  });

  it('closes the composer after expense save even when refresh fails', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Net balance');
    vi.mocked(core.ledgerListAccounts).mockRejectedValueOnce(new Error('refresh failed'));
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Transaction composer' })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('refresh failed');
  });

  it('voids a transaction after undo window expires', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Void' }));
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(1);
  });

  it('allows undo before a void is committed', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Void' }));

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('status')).toHaveTextContent('Void canceled.');
    await vi.advanceTimersByTimeAsync(5000);
    expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(0);
  });

  it('renders transaction category, tags and time using taxonomy assignments', async () => {
    const core = makeCore(1);
    const listTransactionTaxonomy = vi.fn(async () => ({
      items: [
        {
          transactionId: 'tx-1',
          categoryId: 'cat-food',
          tagIds: ['tag-home', 'tag-london'],
          categorizationStatus: 'assigned',
          taggingStatus: 'assigned',
        },
      ],
    }));
    (core as unknown as { orchestrationListTransactionTaxonomy: typeof listTransactionTaxonomy })
      .orchestrationListTransactionTaxonomy = listTransactionTaxonomy;

    vi.mocked(core.ledgerListTransactions).mockResolvedValueOnce({
      items: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          occurredAt: '2026-03-06T09:41:00.000Z',
          description: 'Breakfast',
          merchant: 'Cafe',
          amount: '8.50',
          currency: 'USD',
          type: 'expense',
          status: 'posted',
          items: [],
        },
      ],
    });

    const view = render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });

    await waitFor(() => {
      expect(listTransactionTaxonomy).toHaveBeenCalledWith({ transactionIds: ['tx-1'] });
    });

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('#home')).toBeInTheDocument();
    expect(screen.getByText('#london')).toBeInTheDocument();

    const timeElements = [...view.container.querySelectorAll('time')];
    expect(timeElements.some((element) => (element.textContent ?? '').includes(':'))).toBe(true);
  });

  it('shows See all only when there are more than three transactions', async () => {
    const coreWithMoreThanThree = makeCore(5);

    render(
      <MemoryRouter>
        <Accounts core={coreWithMoreThanThree} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    expect(screen.getByRole('button', { name: 'See all' })).toBeInTheDocument();
  });

  it('hides See all when there are three or fewer transactions', async () => {
    const coreWithThree = makeCore(3);

    render(
      <MemoryRouter>
        <Accounts core={coreWithThree} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    expect(screen.queryByRole('button', { name: 'See all' })).not.toBeInTheDocument();
  });
});
