import type { CurrencyAccountsSheetViewProps } from './CurrencyAccountsSheetView.contract';
import styles from './CurrencyAccountsSheetView.module.css';

export function CurrencyAccountsSheetView({ required, provided }: CurrencyAccountsSheetViewProps) {
  const { data, status } = required;

  if (status.loadPhase === 'loading') {
    return <p className={styles.message}>Loading accounts...</p>;
  }
  if (status.loadPhase === 'error') {
    return <p className={styles.message} role="alert">{status.error ?? 'Unable to load accounts.'}</p>;
  }
  if (status.loadPhase === 'empty') {
    return <p className={styles.message}>No accounts in {data.currency}.</p>;
  }

  return (
    <ul className={styles.list} aria-label={`${data.currency} accounts`}>
      {data.accounts.map((account) => (
        <li
          className={`${styles.accountRow} ${account.status === 'archived' ? styles.archivedRow : ''}`}
          key={account.accountId}
        >
          <button
            className={styles.accountMain}
            type="button"
            disabled={account.status === 'archived'}
            aria-label={account.name}
            onClick={() => provided.commands.selectAccount(account.accountId)}
          >
            <i className={`${styles.accountIcon} ${accountIconClass(account.type)}`} aria-hidden="true" />
            <span className={styles.details}>
              <span className={styles.name}>{account.name}</span>
              <span className={styles.meta}>
                <span>{account.currency}</span>
                {account.isDefault ? <span>Favorite</span> : null}
                {account.status === 'archived' ? <span className={styles.archived}>Archived</span> : null}
              </span>
            </span>
            <span className={styles.balance}>{account.formattedBalance}</span>
          </button>
          <button
            className={styles.settingsButton}
            type="button"
            aria-label={`Manage ${account.name}`}
            onClick={() => provided.commands.manageAccount(account.accountId)}
          >
            <i className="bi bi-gear" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function accountIconClass(type: string): string {
  return type === 'bank' || type === 'checking' || type === 'savings' ? 'bi bi-bank' : 'bi bi-wallet2';
}

export type { CurrencyAccountsSheetViewProps } from './CurrencyAccountsSheetView.contract';
