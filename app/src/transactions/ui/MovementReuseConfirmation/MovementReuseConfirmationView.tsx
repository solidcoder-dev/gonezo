export function MovementReuseConfirmationView(props: {
  itemCount: number;
  shareCount: number;
  historicalAmount: string;
  onSetupOnly: () => void;
  onReuseDetails: () => void;
  onCancel: () => void;
}) {
  const summary = [props.itemCount ? `${props.itemCount} item${props.itemCount === 1 ? '' : 's'}` : '', props.shareCount ? `${props.shareCount} share${props.shareCount === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
  return <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="movement-reuse-confirmation-title">
    <div className="modal-dialog"><div className="modal-content">
      <div className="modal-header"><h2 id="movement-reuse-confirmation-title" className="modal-title fs-5">Reuse movement details?</h2><button type="button" className="btn-close" aria-label="Cancel" onClick={props.onCancel} /></div>
      <div className="modal-body"><p>{summary}</p><p>Reusing details will replace the current amount.</p></div>
      <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={props.onSetupOnly}>Setup only</button><button type="button" className="btn btn-primary" onClick={props.onReuseDetails}>Reuse details</button></div>
    </div></div>
  </div>;
}
