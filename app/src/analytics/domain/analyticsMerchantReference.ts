export type AnalyticsMerchantReference = Readonly<{
  key: string;
  displayName: string;
}>;

export function analyticsMerchantReference(merchant: string | null | undefined): AnalyticsMerchantReference | undefined {
  const displayName = merchant?.trim().replace(/\s+/gu, ' ');
  if (!displayName) return undefined;
  const key = displayName.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return { key, displayName };
}
