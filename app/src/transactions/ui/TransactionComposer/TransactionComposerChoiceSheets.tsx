import { SheetView } from '../../../shared/ui/SheetView';
import type { ComposerMode } from './TransactionComposerView';
import { accountIconClass, COMPOSER_MODES } from './transactionComposerPresentation';

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
            closeLabel: 'Close movement type',
            panelClassName: 'composer-sheet composer-choice-sheet',
            contentClassName: 'composer-choice-content',
          },
          data: {
            body: (
              <ul className="composer-choice-list" aria-label="Movement types">
                {COMPOSER_MODES.map((item) => {
                  const selected = item.value === selectedMode;
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        className={`composer-choice-row composer-choice-row--${item.value}`}
                        aria-label={selected ? `Selected movement type ${item.label}` : `Select movement type ${item.label}`}
                        disabled={disabled}
                        onClick={() => {
                          provided.selectMode(item.value);
                          provided.closeMovementTypeSheet();
                        }}
                      >
                        <span className="composer-choice-icon" aria-hidden>
                          <i className={item.iconClassName} />
                        </span>
                        <span className="composer-choice-name">{item.label}</span>
                        <span className={selected ? 'composer-choice-check composer-choice-check--selected' : 'composer-choice-check'} aria-hidden>
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
            closeLabel: 'Close account chooser',
            panelClassName: 'composer-sheet composer-choice-sheet',
            contentClassName: 'composer-choice-content',
          },
          data: {
            body: (
              <ul className="composer-account-choice-list" aria-label="Accounts">
                {sourceAccountOptions.map((account) => {
                  const selected = account.id === sourceAccountId;
                  return (
                    <li key={account.id}>
                      <button
                        type="button"
                        className="composer-account-choice-row"
                        aria-label={selected ? `Selected account ${account.name}` : `Select account ${account.name}`}
                        disabled={disabled}
                        onClick={() => {
                          provided.selectSourceAccount(account.id);
                          provided.closeSourceAccountSheet();
                        }}
                      >
                        <span className="composer-account-choice-icon" aria-hidden>
                          <i className={accountIconClass(account.type)} />
                        </span>
                        <span className="composer-choice-name">{account.name}</span>
                        {selected ? <span className="composer-default-pill">Selected</span> : null}
                        <span className={selected ? 'composer-choice-check composer-choice-check--selected' : 'composer-choice-check'} aria-hidden>
                          {selected ? <i className="bi bi-check-lg" /> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
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
