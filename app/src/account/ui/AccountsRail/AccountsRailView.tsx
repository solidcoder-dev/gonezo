import type { AccountsRailViewProps } from './AccountsRailView.contract';
import styles from './AccountsRailView.module.css';

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
          <article className={styles.accountCard} key={account.accountId}>
            <div className={styles.accountHeader}>
              <button
                type="button"
                className={styles.accountNameButton}
                onClick={() => provided.commands.selectAccount(account.accountId)}
                disabled={required.status.disabled}
              >
                <span>{account.name}</span>
              </button>
              <button
                type="button"
                className={styles.settingsButton}
                aria-label={account.isDefault ? 'Account settings' : `Account settings for ${account.name}`}
                onClick={() => provided.commands.manageAccount(account.accountId)}
                disabled={required.status.disabled}
              >
                <i className="bi bi-gear" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              className={styles.balanceButton}
              onClick={() => provided.commands.selectAccount(account.accountId)}
              disabled={required.status.disabled}
            >
              {account.formattedBalance}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { AccountsRailViewProps } from './AccountsRailView.contract';
