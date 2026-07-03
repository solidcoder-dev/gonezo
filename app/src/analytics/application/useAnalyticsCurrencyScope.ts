import { useEffect, useState } from 'react';

export type AnalyticsCurrencyScopePort = {
  analyticsListCurrencies(): Promise<{ items: string[] }>;
};

type UseAnalyticsCurrencyScopeInput = {
  core: AnalyticsCurrencyScopePort;
  enabled: boolean;
  refreshSignal: boolean;
  onError?: (error: { message: string }) => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAnalyticsCurrencyScope(input: UseAnalyticsCurrencyScopeInput) {
  const { core, enabled, onError, refreshSignal } = input;
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setCurrencies([]);
      setSelectedCurrency('');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCurrencies() {
      setLoading(true);
      try {
        const result = await core.analyticsListCurrencies();
        if (cancelled) {
          return;
        }
        setCurrencies(result.items);
        setSelectedCurrency((current) => (
          current && result.items.includes(current) ? current : result.items[0] ?? ''
        ));
      } catch (err) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(err) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCurrencies();

    return () => {
      cancelled = true;
    };
  }, [core, enabled, onError, refreshSignal]);

  return {
    required: {
      data: { currencies, selectedCurrency },
      status: { loading },
    },
    provided: {
      commands: { selectCurrency: setSelectedCurrency },
    },
  };
}
