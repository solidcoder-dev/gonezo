import type { AccountsRailViewProps } from './AccountsRailView.contract';
import styles from './AccountsRailView.module.css';

function accountIconClass(type?: string): string {
  if (type === 'bank' || type === 'checking' || type === 'savings') {
    return 'bi bi-bank';
  }
  return 'bi bi-wallet2';
}

function accountIconKey(type?: string): string {
  if (type === 'bank' || type === 'checking' || type === 'savings') {
    return 'bank';
  }
  return 'cash';
}

export function AccountsRailView({ required, provided }: AccountsRailViewProps) {
  return (
    <section className={styles.card} aria-busy={required.status.loading}>
      <div className={styles.header}>
        <h2>Accounts</h2>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add account"
          onClick={provided.commands.createAccount}
          disabled={required.status.disabled}
        >
          <i className="bi bi-plus-lg" aria-hidden />
        </button>
      </div>

      <div className={styles.rail} aria-label="Accounts list">
        {required.data.accounts.map((account) => (
          <button
            type="button"
            className={styles.accountCard}
            key={account.accountId}
            aria-label={account.name}
            onClick={() => {
              provided.commands.selectAccount(account.accountId);
              provided.commands.manageAccount(account.accountId);
            }}
            disabled={required.status.disabled}
          >
            <div className={styles.accountHeader}>
              <span className={styles.accountIcon} data-testid={`account-icon-${accountIconKey(account.type)}`}>
                <i className={accountIconClass(account.type)} aria-hidden />
              </span>
              <span className={styles.accountName}>{account.name}</span>
            </div>
            <span className={styles.balance}>
              {account.formattedBalance}
            </span>
            {account.trend ? (
              <span className={styles.trend} aria-label={account.trend.ariaLabel}>
                <AccountTrendLine points={account.trend.points} />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function AccountTrendLine({ points }: { points: Array<{ value: number }> }) {
  if (points.length < 2) {
    return null;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 48 - ((point.value - min) / range) * 40;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const area = `${path} L 100 56 L 0 56 Z`;

  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={styles.trendArea} d={area} />
      <path className={styles.trendLine} d={path} />
    </svg>
  );
}

export type { AccountsRailViewProps } from './AccountsRailView.contract';
