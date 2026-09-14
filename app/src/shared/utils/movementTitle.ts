export function displayedMovementTitle(input: {
  merchant?: string;
  description?: string;
  fallback: string;
  preferDescription?: boolean;
}): string {
  const merchant = input.merchant?.trim();
  const description = input.description?.trim();
  if (input.preferDescription) return description || merchant || input.fallback;
  return merchant || description || input.fallback;
}
