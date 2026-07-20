function userLocale(preferred?: string): string {
  if (preferred) {
    return preferred;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
}

export function formatCurrencyAmount(amount: string, currency: string, preferredLocale?: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  try {
    return new Intl.NumberFormat(userLocale(preferredLocale), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function currencySymbol(currency: string, preferredLocale?: string): string {
  try {
    const parts = new Intl.NumberFormat(userLocale(preferredLocale), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatIsoDate(dateIso: string, preferredLocale?: string): string {
  if (!dateIso) {
    return '';
  }
  try {
    const parsed = dateIso.length === 10 ? new Date(`${dateIso}T00:00:00`) : new Date(dateIso);
    if (Number.isNaN(parsed.getTime())) {
      return dateIso;
    }
    return new Intl.DateTimeFormat(userLocale(preferredLocale), { dateStyle: 'medium' }).format(parsed);
  } catch {
    return dateIso;
  }
}

export function formatIsoDateTime(dateIso: string, preferredLocale?: string): string {
  if (!dateIso) {
    return '';
  }
  try {
    const parsed = dateIso.length === 10 ? new Date(`${dateIso}T00:00:00`) : new Date(dateIso);
    if (Number.isNaN(parsed.getTime())) {
      return dateIso;
    }
    const locale = userLocale(preferredLocale);
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
    const time = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);
    return `${date} ${time}`;
  } catch {
    return dateIso;
  }
}
