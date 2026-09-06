import { SheetView } from '../../../shared/ui/SheetView';
import type { ComposerMode } from './TransactionComposerView';
import { accountIconClass, COMPOSER_MODES } from './transactionComposerPresentation';
import styles from './TransactionComposerChoiceSheets.module.css';

type SourceAccountOption = {
  id: string;
  name: string;
  type?: string;
};

type TransactionComposerChoiceSheetsProps = {
  required: {
    disabled: boolean;
    movementTypeSheetOpen: boolean;
    sourceAccountSheetOpen: boolean;
    selectedMode: Exclude<ComposerMode, 'picker'>;
    sourceAccountId: string;
    favoriteAccountId?: string | null;
    sourceAccountOptions: SourceAccountOption[];
  };
  provided: {
    closeMovementTypeSheet: () => void;
    closeSourceAccountSheet: () => void;
    selectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
    selectSourceAccount: (accountId: string) => void;
  };
};

export function TransactionComposerChoiceSheets({ required, provided }: TransactionComposerChoiceSheetsProps) {
  const {
    disabled,
    movementTypeSheetOpen,
    selectedMode,
    sourceAccountId,
    favoriteAccountId,
    sourceAccountOptions,
    sourceAccountSheetOpen,
  } = required;

  return (
    <>
      <SheetView
        required={{
          config: {
            ariaLabel: 'Movement type',
            title: 'Movement type',
            showHandle: true,
            dragToClose: true,
            closeOnBackdrop: true,
            panelClassName: styles.sheet,
            contentClassName: styles.content,
          },
          data: {
            body: (
              <ul className={styles.list} aria-label="Movement types">
                {COMPOSER_MODES.map((item) => {
                  const selected = item.value === selectedMode;
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        className={`${styles.row} ${styles[item.value]}`}
                        aria-label={selected ? `Selected movement type ${item.label}` : `Select movement type ${item.label}`}
                        disabled={disabled}
                        onClick={() => {
                          provided.selectMode(item.value);
                          provided.closeMovementTypeSheet();
                        }}
                      >
                        <span className={styles.icon} aria-hidden>
                          <i className={item.iconClassName} />
                        </span>
                        <span className={styles.name}>{item.label}</span>
                        <span className={selected ? `${styles.check} ${styles.selected}` : styles.check} aria-hidden>
                          {selected ? <i className="bi bi-check-lg" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ),
          },
          state: { open: movementTypeSheetOpen },
          status: { disabled },
        }}
        provided={{ commands: { close: provided.closeMovementTypeSheet } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Choose account',
            title: 'Choose account',
            showHandle: true,
            dragToClose: true,
            closeOnBackdrop: true,
            panelClassName: styles.sheet,
            contentClassName: styles.content,
          },
          data: {
            body: (
              <div className={styles.accountGroups} aria-label="Accounts">
                <span className={styles.sectionLabel}>Favorite</span>
                <ul className={styles.list}>
                {sourceAccountOptions.filter((account) => account.id === favoriteAccountId).map((account) => {
                  const selected = account.id === sourceAccountId;
                  return (
                    <li key={account.id}>
                      <button
                        type="button"
                        className={styles.accountRow}
                        aria-label={selected ? `Selected account ${account.name}` : `Select account ${account.name}`}
                        disabled={disabled}
                        onClick={() => {
                          provided.selectSourceAccount(account.id);
                          provided.closeSourceAccountSheet();
                        }}
                      >
                        <span className={styles.accountIcon} aria-hidden>
                          <i className={accountIconClass(account.type)} />
                        </span>
                        <span className={styles.name}>{account.name}</span>
                        <span className={styles.favoriteBadge}>Favorite</span>
                        <span className={selected ? `${styles.check} ${styles.selected}` : styles.check} aria-hidden>
                          {selected ? <i className="bi bi-check-lg" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
                </ul>
                <span className={styles.sectionLabel}>All accounts</span>
                <ul className={styles.list}>
                {sourceAccountOptions.filter((account) => account.id !== favoriteAccountId).map((account) => {
                  const selected = account.id === sourceAccountId;
                  return (
                    <li key={account.id}>
                      <button type="button" className={styles.accountRow} aria-label={selected ? `Selected account ${account.name}` : `Select account ${account.name}`} disabled={disabled} onClick={() => { provided.selectSourceAccount(account.id); provided.closeSourceAccountSheet(); }}>
                        <span className={styles.accountIcon} aria-hidden><i className={accountIconClass(account.type)} /></span>
                        <span className={styles.name}>{account.name}</span>
                        <span className={selected ? `${styles.check} ${styles.selected}` : styles.check} aria-hidden>{selected ? <i className="bi bi-check-lg" /> : null}</span>
                      </button>
                    </li>
                  );
                })}
                </ul>
              </div>
            ),
          },
          state: { open: sourceAccountSheetOpen },
          status: { disabled },
        }}
        provided={{ commands: { close: provided.closeSourceAccountSheet } }}
      />
    </>
  );
}
