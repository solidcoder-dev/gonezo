import type { ComposerMode } from './TransactionComposerView';
import { accountIconClass } from './transactionComposerPresentation';
import styles from './TransactionComposerContextControls.module.css';

type AccountOption = {
  id: string;
  name: string;
  type?: string;
};

type Props = {
  required: {
    state: {
      selectedMode: Exclude<ComposerMode, 'picker'>;
      selectedModeLabel: string;
      selectedModeIconClassName: string;
      selectedSourceAccount?: AccountOption;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      openMovementTypeSheet: () => void;
      openSourceAccountSheet: () => void;
    };
  };
};

export function TransactionComposerContextControls({ required, provided }: Props) {
  const { selectedMode, selectedModeIconClassName, selectedModeLabel, selectedSourceAccount } = required.state;
  const { disabled } = required.status;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.selector} ${styles.typeSelector} ${styles[`typeSelector--${selectedMode}`]}`}
        aria-label={`Movement type ${selectedModeLabel}`}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={provided.commands.openMovementTypeSheet}
      >
        <i className={selectedModeIconClassName} aria-hidden />
        <span className={styles.value}>{selectedModeLabel}</span>
        <i className={`bi bi-chevron-down ${styles.disclosure}`} aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.selector} ${styles.accountSelector}`}
        aria-label={`Source account ${selectedSourceAccount?.name ?? 'Select account'}`}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={provided.commands.openSourceAccountSheet}
      >
        <i className={`${accountIconClass(selectedSourceAccount?.type)} ${styles.accountIcon}`} aria-hidden />
        <span className={styles.value}>{selectedSourceAccount?.name ?? 'Select account'}</span>
        <i className={`bi bi-chevron-down ${styles.disclosure}`} aria-hidden />
      </button>
    </div>
  );
}
