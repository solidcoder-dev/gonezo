export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

export function sameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}
