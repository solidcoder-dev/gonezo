import type { ViewProps } from '../../../shared/ui/ViewProps';
import { SegmentedControlView } from '../../../shared/ui/SegmentedControlView';
import type { ShareDraft, ShareMemberDraft, ShareMode, ShareSettlementChoice, SharingGroupSuggestion, SharingPersonSuggestion } from '../../domain/shareDraft';
import { formatShareCents } from '../../application/shareDraftCalculator';
import type { ShareEditorModel } from '../../domain/shareEditorModel';
import { ShareSettlementDropdownView } from './ShareSettlementDropdownView';
import styles from './ShareExpenseEditorView.module.css';

export type { ShareDraft, ShareMemberDraft, ShareMode } from '../../domain/shareDraft';

export type ShareExpenseEditorViewProps = ViewProps<Record<string, never>, { readonly peopleSuggestions?: readonly SharingPersonSuggestion[]; readonly groupSuggestions?: readonly SharingGroupSuggestion[] }, { readonly amount: string; readonly currencyCode?: string; readonly draft?: ShareDraft; readonly movementType?: 'expense' | 'income'; readonly editorModel?: ShareEditorModel }, { readonly disabled?: boolean }, { readonly applyShare: (summary: { peopleCount: number; total: string }, draft: ShareDraft) => void; readonly openParticipantSelection?: () => void }>;

const AVATAR_TONES: Record<ShareMemberDraft['avatarTone'], string> = { you: styles.avatarYou, emma: styles.avatarEmma, luis: styles.avatarLuis, maria: styles.avatarMaria, john: styles.avatarJohn, alex: styles.avatarAlex, alexandra: styles.avatarAlexandra, ali: styles.avatarAli, custom: styles.avatarCustom };
function isParticipant(person: ShareMemberDraft): person is Extract<ShareMemberDraft, { role: 'participant' }> { return person.role === 'participant'; }

export function ShareExpenseEditorView({ required, provided }: ShareExpenseEditorViewProps) {
  const model = required.state.editorModel;
  if (!model) return null;
  const currency = required.state.currencyCode ?? '';
  const disabled = required.status.disabled ?? false;
  return <div className={`${styles.shareEditor} d-flex flex-column flex-grow-1`}>
    <div className="flex-grow-1 overflow-y-auto overflow-x-hidden">
      <div className="d-flex flex-column gap-4">
      <section className="d-flex align-items-baseline gap-2" aria-label="Share total"><span className="text-secondary">Total</span><strong className={styles.totalAmount}>{formatShareCents(Math.round(Number(required.state.amount) * 100))}</strong><span className="text-secondary">{currency}</span></section>
      <button type="button" className="btn d-flex align-items-center gap-2 w-100 text-start" onClick={provided.commands.openParticipantSelection} disabled={disabled}>
        <i className="bi bi-search" aria-hidden="true" />
        <span className="flex-grow-1">Add people or groups</span>
        <span className="small text-body-secondary">{Math.max(0, model.state.people.length - 1) || null}</span>
        <i className="bi bi-chevron-right text-body-secondary" aria-hidden="true" />
      </button>
      <SegmentedControlView<ShareMode> required={{ config: { ariaLabel: 'Share mode', columns: 2, compact: true }, data: { options: [{ value: 'parts', label: 'As parts' }, { value: 'amounts', label: 'As amounts' }] }, state: { value: model.state.mode }, status: { disabled } }} provided={{ commands: { select: model.commands.selectMode } }} />
      <section aria-label="Share people" className="d-grid gap-2"><div className="d-flex justify-content-between text-secondary small"><span>Participants</span><span>{model.state.people.filter((person) => person.role === 'participant' || person.includedInAllocation !== false).length}</span></div><ul className="list-unstyled m-0 p-0 d-grid" aria-label="Share people">{model.state.people.filter((person) => person.role === 'participant' || person.includedInAllocation !== false).map((person) => { const participant = isParticipant(person); return <li key={person.id} className={`${styles.personRow} d-flex flex-nowrap align-items-center gap-2 py-3`}><span className={`${styles.avatar} ${AVATAR_TONES[person.avatarTone]}`} aria-hidden="true">{person.role === 'owner' ? 'You' : person.name.slice(0, 1)}</span><div className="d-grid min-w-0 flex-grow-1"><strong className="text-truncate">{person.name}</strong>{participant ? <ShareSettlementDropdownView name={person.name} movementType={model.state.movementType} value={person.settlementChoice} disabled={disabled} onChange={(choice: ShareSettlementChoice) => model.commands.updateSettlement(person.id, choice)} /> : <span className="text-secondary small">Payer</span>}</div>{model.state.mode === 'parts' ? <div className={`${styles.partsControl} d-grid justify-items-center`}><div className="input-group flex-nowrap"><button type="button" className="btn btn-light" aria-label={`Decrease parts for ${person.name}`} disabled={disabled || person.parts <= 1} onClick={() => model.commands.updateParts(person.id, person.parts - 1)}><i className="bi bi-dash-lg" aria-hidden="true" /></button><input className={`form-control text-center fw-semibold ${styles.partsInput}`} aria-label={`${person.name} parts`} type="number" min="1" step="1" value={person.parts} onChange={(event) => model.commands.updateParts(person.id, Number(event.target.value))} inputMode="numeric" /><button type="button" className="btn btn-light" aria-label={`Increase parts for ${person.name}`} disabled={disabled} onClick={() => model.commands.updateParts(person.id, person.parts + 1)}><i className="bi bi-plus-lg" aria-hidden="true" /></button></div><span className="text-secondary small text-center">{person.amount} {currency}</span></div> : <label className={`${styles.amountField} d-flex align-items-center`}><span className="visually-hidden">{person.name} amount</span><input aria-label={`${person.name} amount`} type="number" min="0" step="0.01" value={person.amount} onChange={(event) => model.commands.updateAmount(person.id, event.target.value)} inputMode="decimal" placeholder="0.00" disabled={disabled} /><span className="text-secondary small">{currency}</span></label>}<button type="button" className={`gz-icon-button ${styles.removePersonButton}`} aria-label={`Remove ${person.name}`} disabled={disabled} onClick={() => model.commands.removePerson(person.id)}><i className="bi bi-trash" aria-hidden="true" /></button></li>; })}</ul></section>
      {model.state.mode === 'amounts' ? <section className={`${styles.amountSummary} d-grid`} aria-label="Allocation summary" aria-live="polite"><span>Total allocated</span><strong>{formatShareCents(model.validation.totalCents)} {currency}</strong><span>Remaining</span><strong>{formatShareCents(model.validation.remainingCents)} {currency}</strong></section> : null}
      {!model.validation.valid ? <p className={`${styles.shareWarning} m-0`} role="alert" aria-live="assertive"><i className="bi bi-exclamation-circle" aria-hidden="true" />{model.validation.message ?? 'Assign the full total before applying.'}</p> : null}
      </div>
    </div>
    <div className={`${styles.stickyAction} mt-auto`}><button type="button" className="btn btn-primary w-100" disabled={disabled || !model.validation.valid} onClick={() => provided.commands.applyShare({ peopleCount: model.state.people.length, total: formatShareCents(model.validation.totalCents) }, { mode: model.state.mode, people: model.state.people })}>Apply share</button></div>
  </div>;
}
