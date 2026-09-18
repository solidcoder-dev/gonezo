import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementReuseTemplate } from '../../movements/application/movementReuseSuggestions.port';
import { useTransactionMovementReuseModel } from './useTransactionMovementReuseModel';

const template: MovementReuseTemplate = {
  representativeMovementId: 'movement-1', title: 'Mercadona', accountId: 'account-1', accountName: 'Main', financialType: 'expense',
  tags: [], itemNames: [], sharingPeople: [], ignored: false,
};
const variant = {
  representativeMovementId: 'movement-1', accountId: 'account-1', accountName: 'Main', financialType: 'expense' as const,
  tags: [], itemCount: 0, shareCount: 0, usageCount: 1, lastUsedAt: '2026-01-01', deterministicKey: 'movement-1',
};

function setup(reuseTemplate = template) {
  const port = {
    movementReuseSearchGroups: vi.fn(), movementReuseListVariants: vi.fn(),
    movementReuseGetTemplate: vi.fn().mockResolvedValue(reuseTemplate),
  };
  const applySetup = vi.fn();
  const applyWithDetails = vi.fn();
  const hook = renderHook(() => useTransactionMovementReuseModel({
    port, accountIds: ['account-1'], enabled: true, query: 'merc', accountId: 'account-1', applySetup, applyWithDetails,
  }));
  return { ...hook, port, applySetup, applyWithDetails };
}

async function select(result: ReturnType<typeof setup>['result']) {
  act(() => result.current.actions.selectVariant({ title: 'Mercadona', variant }));
  await waitFor(() => expect(result.current.state.appliedVersion > 0 || result.current.state.pendingTemplate !== null).toBe(true));
}

describe('useTransactionMovementReuseModel application completion', () => {
  it('increments once after setup without details is applied', async () => {
    const { result, applySetup } = setup();
    await select(result);
    expect(applySetup).toHaveBeenCalledWith(template);
    expect(result.current.state.appliedVersion).toBe(1);
  });

  it('waits for a details decision and increments after the chosen application', async () => {
    const detailedTemplate = { ...template, details: { amount: '10', items: [{ name: 'Food', amount: '10' }], sharing: [] } };
    const { result, applySetup } = setup(detailedTemplate);
    await select(result);
    expect(result.current.state.appliedVersion).toBe(0);
    act(() => result.current.actions.reuseSetupOnly());
    expect(applySetup).toHaveBeenCalledWith(detailedTemplate);
    expect(result.current.state.appliedVersion).toBe(1);

    const second = setup(detailedTemplate);
    await select(second.result);
    act(() => second.result.current.actions.reuseWithDetails());
    expect(second.applyWithDetails).toHaveBeenCalledWith(detailedTemplate);
    expect(second.result.current.state.appliedVersion).toBe(1);
  });

  it('does not increment when details reuse is cancelled or template loading fails', async () => {
    const detailedTemplate = { ...template, details: { amount: '10', items: [{ name: 'Food', amount: '10' }], sharing: [] } };
    const cancelled = setup(detailedTemplate);
    await select(cancelled.result);
    act(() => cancelled.result.current.actions.cancelReuse());
    expect(cancelled.result.current.state.appliedVersion).toBe(0);

    const failed = setup();
    failed.port.movementReuseGetTemplate.mockRejectedValue(new Error('unavailable'));
    act(() => failed.result.current.actions.selectVariant({ title: 'Mercadona', variant }));
    await waitFor(() => expect(failed.result.current.state.error).toBe('Unable to load movement reuse details'));
    expect(failed.result.current.state.appliedVersion).toBe(0);
  });
});
