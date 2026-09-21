import type {
  AnalyticsAccountBalanceSnapshotInput,
  AnalyticsAccountBalanceSnapshotResult,
} from '../application/analytics.port';
import type { WebAppState } from '../../core/infrastructure/webAppState';
import { addExactDecimals } from '../../shared/domain/exactDecimal';
import { balanceImpact } from '../../ledger/application/movementSemantics';

export function getWebAccountBalanceSnapshot(
  state: WebAppState,
  input: AnalyticsAccountBalanceSnapshotInput,
): AnalyticsAccountBalanceSnapshotResult {
  const cutoff = startOfLocalDate(input.asOfLocalDateExclusive, input.zoneId);
  const currency = input.currency?.trim().toUpperCase();
  const items = state.ledgerAccounts
    .filter((account) => Date.parse(account.createdAt) < cutoff.getTime())
    .filter((account) => !currency || account.currency.toUpperCase() === currency)
    .map((account) => {
      const balanceAmount = state.ledgerTransactions
        .filter((transaction) => transaction.accountId === account.id && transaction.status === 'posted')
        .filter((transaction) => Date.parse(transaction.occurredAt) < cutoff.getTime())
        .reduce((balance, transaction) => addExactDecimals(balance, balanceImpact(transaction.type, transaction.amount)), '0');
      return { accountId: account.id, accountType: account.type, currency: account.currency, balanceAmount };
    })
    .sort((left, right) => left.currency.localeCompare(right.currency)
      || left.accountType.localeCompare(right.accountType)
      || left.accountId.localeCompare(right.accountId));

  return { asOfLocalDateExclusive: input.asOfLocalDateExclusive, zoneId: input.zoneId, items };
}

function startOfLocalDate(localDate: string, zoneId: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new Error('asOfLocalDateExclusive must be a valid YYYY-MM-DD date');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utcDate = new Date(utcMilliseconds(year, month, day));
  if (utcDate.toISOString().slice(0, 10) !== localDate) throw new Error('asOfLocalDateExclusive must be a valid YYYY-MM-DD date');

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let candidate = utcDate.getTime();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(candidate).map(({ type, value }) => [type, Number(value)]));
    const renderedAsUtc = utcMilliseconds(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
    candidate = utcDate.getTime() - (renderedAsUtc - candidate);
  }
  return new Date(candidate);
}

function utcMilliseconds(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}
