import type { ShareExpenseEditorViewProps } from '../ShareExpenseEditor/ShareExpenseEditorView';
import { ShareEditorComponent } from '../../application/ShareEditorComponent';
import styles from './ShareMovementEditorPageView.module.css';

type ShareMovementEditorPageViewProps = ShareExpenseEditorViewProps & {
  title: string;
  onClose: () => void;
};

export function ShareMovementEditorPageView({ title, onClose, required, provided }: ShareMovementEditorPageViewProps) {
  return (
    <main className="min-vh-100 bg-body" aria-label={title}>
      <header className={`${styles.header} d-flex align-items-center gap-3 px-4`}>
        <button type="button" className={`${styles.backButton} btn btn-link d-inline-flex align-items-center justify-content-center p-0`} aria-label="Back" onClick={onClose}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <h1 className={`${styles.title} mb-0`}>{title}</h1>
      </header>
      <ShareEditorComponent required={required} provided={provided} />
    </main>
  );
}
