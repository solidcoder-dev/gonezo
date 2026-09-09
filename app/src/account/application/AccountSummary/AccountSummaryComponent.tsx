import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { ManageAccountSheetView } from '../../ui/ManageAccountSheet/ManageAccountSheetView';
import type { AccountSummaryComponentProps } from './AccountSummaryComponent.contract';
import { useAccountSummaryModel } from './useAccountSummaryModel';
import './AccountSummaryComponent.css';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';

export type {
  AccountSummaryComponentProps,
  AccountSummaryComponentProvided,
  AccountSummaryComponentRequired,
} from './AccountSummaryComponent.contract';

export function AccountSummaryComponent({ required, provided = {} }: AccountSummaryComponentProps) {
  const { accountId, core } = required.context;
  const model = useAccountSummaryModel({
    ports: { ledger: core },
    accountId,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    confirm: (message) => window.confirm(message),
    events: provided.events,
  });
  const {
    loading,
    managing,
    error,
    summary,
    manageOpen,
    manageName,
  } = model.state;
  const {
    openManage,
    closeManage,
    setManageName,
    submitRename,
    archiveAccount,
    deleteAccount,
  } = model.commands;

  if (!required.config.enabled || !accountId || !summary) {
    return null;
  }

  return (
    <>
      {error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      ) : null}

      <section className="summary-card gz-section-gap" aria-busy={loading}>
        <div className="summary-header">
          {required.config.headerSlot ?? <h2>{summary.name}</h2>}
          <button
            type="button"
            className="gz-icon-button summary-menu-button"
            aria-label="Account settings"
            onClick={openManage}
            disabled={managing}
          >
            <i className="bi bi-gear" aria-hidden />
          </button>
        </div>
        <p className="summary-label">Net balance</p>
        <div className="summary-amount">
          <FinancialAmountView formattedAmount={formatCurrencyAmount(summary.balanceAmount, summary.currency)} visibility={required.config.amountVisibility ?? 'visible'} />
        </div>
      </section>

      {manageOpen ? (
        <ManageAccountSheetView
          required={{
            config: {},
            data: { summary },
            state: { open: true, name: manageName },
            status: { loading, managing, error },
          }}
          provided={{
            commands: {
              close: closeManage,
              setName: setManageName,
              submitRename,
              archive: archiveAccount,
              delete: deleteAccount,
            },
          }}
        />
      ) : null}
    </>
  );
}
