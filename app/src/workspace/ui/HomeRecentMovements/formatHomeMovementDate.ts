export function formatHomeMovementDate(occurredOn: string, now: Date): string | undefined {
  const occurredDate = new Date(occurredOn);
  if (Number.isNaN(occurredDate.getTime())) {
    return undefined;
  }
  const dayDifference = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    - Date.UTC(occurredDate.getFullYear(), occurredDate.getMonth(), occurredDate.getDate());
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 24 * 60 * 60 * 1000) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(occurredDate);
}
