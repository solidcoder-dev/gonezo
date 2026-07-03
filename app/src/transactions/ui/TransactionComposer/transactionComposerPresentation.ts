import type { ComposerMode } from './TransactionComposerView';

export const COMPOSER_MODES: Array<{ value: Exclude<ComposerMode, 'picker'>; label: string; iconClassName: string }> = [
  { value: 'expense', label: 'Expense', iconClassName: 'bi bi-arrow-down' },
  { value: 'income', label: 'Income', iconClassName: 'bi bi-arrow-up' },
  { value: 'transfer', label: 'Transfer', iconClassName: 'bi bi-arrow-left-right' },
];

export function accountIconClass(type?: string): string {
  if (type === 'bank' || type === 'checking' || type === 'savings') {
    return 'bi bi-bank';
  }
  return 'bi bi-wallet2';
}
