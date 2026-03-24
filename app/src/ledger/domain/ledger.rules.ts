export function normalizePositiveAmount(input: string): string {
  const parsed = Number(input);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Amount must be greater than 0.');
  }
  return parsed.toFixed(2);
}

export function isTransferType(type: string): boolean {
  return type === 'transfer_in' || type === 'transfer_out';
}
