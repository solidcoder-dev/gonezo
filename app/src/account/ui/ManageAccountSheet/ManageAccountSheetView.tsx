import { SheetView } from '../../../shared/ui/SheetView';
import type { ManageAccountSheetViewProps } from './ManageAccountSheetView.contract';

export function ManageAccountSheetView({ required, provided }: ManageAccountSheetViewProps) {
  const { data, state, status } = required;

  if (!state.open) return null;

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Manage account',
          title: 'Manage account',
          closeLabel: 'Close account management',
        },
        data: {
          body: status.loading ? (
            <p>Loading account...</p>
          ) : (
            <form className="stack" onSubmit={provided.commands.submitRename} aria-busy={status.managing}>
              {status.error ? <p role="alert">{status.error}</p> : null}
              <label className="stack">
                Account name
                <input
                  aria-label="Manage account name"
                  value={state.name}
                  onChange={(event) => provided.commands.setName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                  disabled={status.managing}
                />
              </label>
              <div className="quick-row">
                <button type="submit" disabled={status.managing || !data.summary}>Save name</button>
                <button type="button" className="text-button" onClick={() => void provided.commands.archive()} disabled={status.managing || !data.summary}>Archive account</button>
              </div>
              <button type="button" className="danger-button" onClick={() => void provided.commands.delete()} disabled={status.managing || !data.summary}>Delete account</button>
            </form>
          ),
        },
        state: { open: state.open },
        status: {},
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}

export type { ManageAccountSheetViewProps } from './ManageAccountSheetView.contract';
