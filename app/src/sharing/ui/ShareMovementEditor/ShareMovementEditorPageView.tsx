import type { ShareExpenseEditorViewProps } from '../ShareExpenseEditor/ShareExpenseEditorView';
import { ShareEditorFlow } from '../../application/ShareEditorFlow';

type ShareMovementEditorPageViewProps = ShareExpenseEditorViewProps & {
  title: string;
  onClose: () => void;
};

export function ShareMovementEditorPageView({ title, onClose, required, provided }: ShareMovementEditorPageViewProps) {
  return <ShareEditorFlow title={title} onClose={onClose} required={required} provided={provided} />;
}
