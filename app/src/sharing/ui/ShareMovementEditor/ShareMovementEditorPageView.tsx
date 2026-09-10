import type { ShareExpenseEditorViewProps } from '../ShareExpenseEditor/ShareExpenseEditorView';
import { ShareExpenseEditorView } from '../ShareExpenseEditor/ShareExpenseEditorView';

type ShareMovementEditorPageViewProps = ShareExpenseEditorViewProps & {
  title: string;
  onClose: () => void;
};

export function ShareMovementEditorPageView({ title, onClose, required, provided }: ShareMovementEditorPageViewProps) {
  return (
    <main className="min-vh-100 bg-body" aria-label={title}>
      <header className="d-flex align-items-center gap-3 px-4" style={{ minHeight: 56 }}>
        <button type="button" className="btn btn-link p-0" aria-label="Back" onClick={onClose}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <h1 className="h6 mb-0">{title}</h1>
      </header>
      <ShareExpenseEditorView required={required} provided={provided} />
    </main>
  );
}
