function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatFxRate(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const normalized = value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return normalized || '0';
}

export function normalizePositiveFxRate(value: string): string {
  const rate = parseAmount(value);
  return formatFxRate(rate > 0 ? rate : 1);
}

export function calculateTransferDestinationAmount(sourceAmountInput: string, rateInput: string): string | undefined {
  const sourceAmount = parseAmount(sourceAmountInput);
  const rate = parseAmount(rateInput);
  if (sourceAmount <= 0 || rate <= 0) {
    return undefined;
  }
  return formatAmount(sourceAmount * rate);
}

export function calculateTransferFxRate(
  sourceAmountInput: string,
  destinationAmountInput: string,
): string | undefined {
  const sourceAmount = parseAmount(sourceAmountInput);
  const destinationAmount = parseAmount(destinationAmountInput);
  if (sourceAmount <= 0 || destinationAmount <= 0) {
    return undefined;
  }
  return formatFxRate(destinationAmount / sourceAmount);
}

export type TransferFxMode = 'auto_destination' | 'auto_rate';

export type SyncedTransferFxFields = {
  transferAmountIn?: string;
  transferFxRate?: string;
};

export function syncTransferFxFields(input: {
  sourceAmount: string;
  destinationAmount: string;
  rate: string;
  mode: TransferFxMode;
  crossCurrency: boolean;
  normalizeRate?: boolean;
}): SyncedTransferFxFields {
  if (!input.crossCurrency) {
    return {
      transferAmountIn: input.sourceAmount,
      transferFxRate: '1',
    };
  }

  if (input.mode === 'auto_destination') {
    const rate = input.normalizeRate ? normalizePositiveFxRate(input.rate) : input.rate;
    const destinationAmount = calculateTransferDestinationAmount(input.sourceAmount, rate);
    return {
      ...(input.normalizeRate ? { transferFxRate: rate } : {}),
      ...(destinationAmount ? { transferAmountIn: destinationAmount } : {}),
    };
  }

  const rate = calculateTransferFxRate(input.sourceAmount, input.destinationAmount);
  return rate ? { transferFxRate: rate } : {};
}
