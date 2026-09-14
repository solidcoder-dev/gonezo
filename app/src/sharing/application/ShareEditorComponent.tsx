import type { ShareExpenseEditorViewProps } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import { ShareExpenseEditorView } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import { useShareEditorModel } from './useShareEditorModel';

export function ShareEditorComponent({ required, provided }: ShareExpenseEditorViewProps) {
  const editorModel = useShareEditorModel({ amount: required.state.amount, draft: required.state.draft, movementType: required.state.movementType ?? 'expense', peopleSuggestions: required.data.peopleSuggestions, groupSuggestions: required.data.groupSuggestions, disabled: required.status.disabled ?? false });
  return <ShareExpenseEditorView required={{ ...required, state: { ...required.state, editorModel } }} provided={provided} />;
}
