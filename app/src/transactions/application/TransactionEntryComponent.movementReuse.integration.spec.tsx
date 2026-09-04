import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementReuseSuggestionGroup, MovementReuseSuggestionVariant } from '../../movements/application/movementReuseSuggestions.port';
import { TransactionEntryComponent } from './TransactionEntryComponent';
import type { TransactionEntryComponentRequired } from './TransactionEntryComponent.contract';

const primaryVariant: MovementReuseSuggestionVariant = {
  representativeMovementId: 'movement-mercadona',
  accountId: 'account-1',
  accountName: 'Checking',
  financialType: 'expense',
  tags: [],
  itemCount: 0,
  shareCount: 0,
  usageCount: 3,
  lastUsedAt: '2026-01-01T00:00:00.000Z',
  deterministicKey: 'movement-mercadona-checking',
};

const alternateVariant: MovementReuseSuggestionVariant = {
  ...primaryVariant,
  representativeMovementId: 'movement-mercadona-alternate',
  accountId: 'account-2',
  accountName: 'Savings',
  deterministicKey: 'movement-mercadona-alternate-savings',
};

const suggestionGroup: MovementReuseSuggestionGroup = {
  title: 'Mercadona',
  normalizedTitle: 'mercadona',
  variantCount: 2,
  primaryVariant,
};

function makeCore() {
  const core = new Proxy({}, {
    get: (target, property: string) => {
      if (property in target) return target[property as keyof typeof target];
      if (property === 'ledgerListAccounts') {
        return vi.fn().mockResolvedValue({ items: [{ id: 'account-1', name: 'Checking', type: 'cash', currency: 'EUR', status: 'active' }] });
      }
      if (property === 'ledgerGetAccountSummary') {
        return vi.fn().mockResolvedValue({ accountId: 'account-1', name: 'Checking', type: 'cash', currency: 'EUR', balanceAmount: '0.00' });
      }
      if (property === 'taxonomyListCategories' || property === 'taxonomyListTags' || property === 'sharingListPeople' || property === 'expectedListMovements' || property === 'schedulingListMovements') {
        return vi.fn().mockResolvedValue({ items: [] });
      }
      return vi.fn().mockResolvedValue({});
    },
  }) as unknown as TransactionEntryComponentRequired['context']['core'];
  const movementReuseSearchGroups = vi.fn().mockResolvedValue({ groups: [suggestionGroup] });
  const movementReuseListVariants = vi.fn().mockResolvedValue({ variants: [primaryVariant, alternateVariant] });
  const movementReuseGetTemplate = vi.fn().mockResolvedValue({
    representativeMovementId: 'movement-mercadona-alternate',
    title: 'Mercadona',
    accountId: 'account-2',
    accountName: 'Savings',
    financialType: 'expense',
    tags: [],
    itemNames: [],
    sharingPeople: [],
    ignored: false,
  });
  Object.assign(core, { movementReuseSearchGroups, movementReuseListVariants, movementReuseGetTemplate });
  return { core, movementReuseSearchGroups, movementReuseListVariants, movementReuseGetTemplate };
}

function renderComposer(core: TransactionEntryComponentRequired['context']['core']) {
  return render(
    <TransactionEntryComponent
      required={{
        context: { accountId: 'account-1', core },
        config: { enabled: true, openSignal: 1 },
      }}
    />,
  );
}

describe('TransactionEntryComponent movement reuse integration', () => {
  it('wires the runtime movement reuse capabilities into title search', async () => {
    const { core, movementReuseSearchGroups } = makeCore();
    renderComposer(core);

    const title = await screen.findByLabelText('Merchant');
    fireEvent.change(title, { target: { value: 'merc' } });

    await waitFor(() => expect(movementReuseSearchGroups).toHaveBeenCalledWith({
      query: 'merc',
      accountIds: expect.any(Array),
      limit: 5,
    }));
    expect(await screen.findByText('Mercadona')).toBeInTheDocument();
    expect(screen.queryByText('Loading suggestions')).not.toBeInTheDocument();
  });

  it('fails during composition when the current core configuration omits template reuse', () => {
    const { core, movementReuseSearchGroups } = makeCore();
    (core as unknown as { movementReuseGetTemplate?: unknown }).movementReuseGetTemplate = undefined;
    expect(() => renderComposer(core)).toThrow();
    expect(movementReuseSearchGroups).not.toHaveBeenCalled();
  });

  it('uses listVariants for expansion and getTemplate for selection', async () => {
    const { core, movementReuseListVariants, movementReuseGetTemplate } = makeCore();
    renderComposer(core);
    fireEvent.change(await screen.findByLabelText('Merchant'), { target: { value: 'merc' } });
    const group = await screen.findByText('Mercadona');

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 other Mercadona variants' }));
    await waitFor(() => expect(movementReuseListVariants).toHaveBeenCalledWith({
      normalizedTitle: 'mercadona',
      accountIds: expect.any(Array),
    }));
    fireEvent.click(await screen.findByText('Savings'));
    await waitFor(() => expect(movementReuseGetTemplate).toHaveBeenCalledWith({
      representativeMovementId: alternateVariant.representativeMovementId,
    }));
    expect(group).not.toBeInTheDocument();
  });
});
