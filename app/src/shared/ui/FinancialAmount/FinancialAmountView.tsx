import type { AmountVisibility } from '../../domain/amountVisibility';
import styles from './FinancialAmountView.module.css';

export type FinancialAmountViewProps = Readonly<{
  formattedAmount: string;
  visibility: AmountVisibility;
  sign?: '+' | '-';
  tone?: 'income' | 'expense';
  className?: string;
}>;

export function FinancialAmountView({ formattedAmount, visibility, sign, tone, className }: FinancialAmountViewProps) {
  const classes = [styles.amount, className, visibility === 'visible' && tone === 'income' ? 'text-success' : null, visibility === 'visible' && tone === 'expense' ? 'text-danger' : null]
    .filter(Boolean)
    .join(' ');

  if (visibility === 'hidden') {
    return <span className={classes} aria-label="Amount hidden">••••••</span>;
  }

  return <span className={classes}>{sign}{formattedAmount}</span>;
}
