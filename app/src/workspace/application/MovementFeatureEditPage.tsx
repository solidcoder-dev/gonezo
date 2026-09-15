import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { SharingPort } from '../../sharing/application/sharing.port';
import type { MovementFeatureEditRequest } from '../../movements/application/movementFeatureEditRequest';
import { PostedMovementItemsEditorComponent } from '../../transactions/application/PostedMovementItemsEditorComponent';
import { PostedMovementShareEditorComponent } from '../../sharing/application/PostedMovementShareEditorComponent';

type MovementFeatureEditPageProps = {
  core: LedgerPort & SharingPort;
  request: MovementFeatureEditRequest;
  onClose: () => void;
  onSaved: () => void;
  onError: (error: { message: string }) => void;
};

export function MovementFeatureEditPage({ core, request, onClose, onSaved, onError }: MovementFeatureEditPageProps) {
  if (request.feature === 'items') {
    return <PostedMovementItemsEditorComponent movement={request.movement} ledger={core} onClose={onClose} onSaved={onSaved} onError={onError} />;
  }
  return <PostedMovementShareEditorComponent movement={request.movement} sharing={core} onClose={onClose} onSaved={onSaved} onError={onError} />;
}
