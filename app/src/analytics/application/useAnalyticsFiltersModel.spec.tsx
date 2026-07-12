import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAnalyticsFiltersModel, type AnalyticsFiltersModelPort } from './useAnalyticsFiltersModel';

function createCore(): AnalyticsFiltersModelPort {
  return {
    analyticsListCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    analyticsGetFilterFacets: vi.fn(async () => ({
      accounts: [
        { id: 'acc-eur', name: 'Main EUR', currency: 'EUR' },
        { id: 'acc-usd', name: 'Travel USD', currency: 'USD' },
      ],
      tags: [
        { id: 'tag-trip', name: 'Trip' },
        { id: 'tag-home', name: 'Home' },
      ],
    })),
  };
}

describe('useAnalyticsFiltersModel', () => {
  it('starts with the new default filters', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filters).toEqual({
      currency: 'EUR',
      period: '30D',
      tagIds: [],
      accountIds: [],
      includeIgnoredMovements: false,
    });
    expect('movementTypes' in result.current.filters).toBe(false);
  });

  it('applies currency changes only after Apply and clears selected accounts', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.commands.openMoreFiltersSheet();
    });
    act(() => {
      result.current.commands.setDraftAccountIds(['acc-eur']);
    });
    act(() => {
      result.current.commands.applyMoreFiltersDraft();
    });

    expect(result.current.filters.accountIds).toEqual(['acc-eur']);

    act(() => {
      result.current.commands.openCurrencySheet();
    });
    act(() => {
      result.current.commands.setDraftCurrency('USD');
    });

    expect(result.current.filters.currency).toBe('EUR');

    act(() => {
      result.current.commands.applyDraftCurrency();
    });

    await waitFor(() => expect(result.current.filters.currency).toBe('USD'));
    expect(result.current.filters.accountIds).toEqual([]);
  });

  it('keeps the previous period when the sheet closes without Apply', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.commands.openPeriodSheet();
      result.current.commands.setDraftPeriod('90D');
      result.current.commands.closePeriodSheet();
    });

    expect(result.current.filters.period).toBe('30D');
  });

  it('applies ignored movements only from More filters', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.commands.openMoreFiltersSheet();
    });
    act(() => {
      result.current.commands.setDraftIncludeIgnoredMovements(true);
    });
    act(() => {
      result.current.commands.applyMoreFiltersDraft();
    });

    await waitFor(() => expect(result.current.filters.includeIgnoredMovements).toBe(true));
  });

  it('resets only More filters draft values', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.commands.openTagSheet();
    });
    act(() => {
      result.current.commands.toggleDraftTagId('tag-trip');
    });
    act(() => {
      result.current.commands.applyDraftTagIds();
    });
    act(() => {
      result.current.commands.openMoreFiltersSheet();
    });
    act(() => {
      result.current.commands.setDraftAccountIds(['acc-eur']);
      result.current.commands.setDraftIncludeIgnoredMovements(true);
    });
    act(() => {
      result.current.commands.resetMoreFiltersDraft();
    });
    act(() => {
      result.current.commands.applyMoreFiltersDraft();
    });

    await waitFor(() => expect(result.current.filters.tagIds).toEqual(['tag-trip']));
    expect(result.current.filters.currency).toBe('EUR');
    expect(result.current.filters.period).toBe('30D');
    expect(result.current.filters.accountIds).toEqual([]);
    expect(result.current.filters.includeIgnoredMovements).toBe(false);
  });

  it('keeps previous tags when the tags sheet closes without Apply', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.commands.openTagSheet();
      result.current.commands.toggleDraftTagId('tag-home');
      result.current.commands.closeTagSheet();
    });

    expect(result.current.filters.tagIds).toEqual([]);
  });

  it('scopes available accounts to the selected currency', async () => {
    const core = createCore();
    const { result } = renderHook(() => useAnalyticsFiltersModel({
      core,
      enabled: true,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.availableAccounts.map((account) => account.id)).toEqual(['acc-eur']);

    act(() => {
      result.current.commands.openCurrencySheet();
    });
    act(() => {
      result.current.commands.setDraftCurrency('USD');
    });
    act(() => {
      result.current.commands.applyDraftCurrency();
    });

    await waitFor(() => expect(result.current.availableAccounts.map((account) => account.id)).toEqual(['acc-usd']));
  });
});
