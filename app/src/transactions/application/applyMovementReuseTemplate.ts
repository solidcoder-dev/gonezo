import type { MovementReuseTemplate as ReadTemplate } from '../../movements/application/movementReuseSuggestions.port';
import { createMovementReuseTemplate, type MovementReuseTemplate } from './movementReuseTemplate';
import type { ComposerMode } from './transactions.types';

type MovementReuseApplicationActions = {
  setComposerMode: (mode: ComposerMode) => void;
  setComposerAdvancedOpen: (open: boolean) => void;
  setTransactionNote: (note: string) => void;
  setTransactionCategoryId: (categoryId: string) => void;
  prefillTaxonomy: (tagNames: string[]) => void;
  prefillExpenseSplit: (items: MovementReuseTemplate['splitItems']) => void;
  prefillShareDraft: (draft: MovementReuseTemplate['shareDraft']) => void;
  setMovementIgnored: (ignored: boolean) => void;
  setTransferToAccountId: (accountId: string) => void;
  syncForTransferMode: () => void;
};

export function applyMovementReuseTemplate(
  template: ReadTemplate,
  currentAccountId: string | null,
  actions: MovementReuseApplicationActions,
  onAccountChanged?: (account: { id: string; name: string }) => void,
) {
  const mode = template.financialType === 'transfer' || template.financialType === 'transfer_in' || template.financialType === 'transfer_out'
    ? 'transfer'
    : template.financialType;
  const reusable = createMovementReuseTemplate({
    title: template.title,
    accountId: template.accountId,
    type: mode,
    categoryId: template.category?.id,
    tagNames: template.tags.map((tag) => tag.name),
    items: template.itemNames.map((name) => ({ name })),
    sharing: template.sharingPeople.length > 0 ? { people: template.sharingPeople } : undefined,
    targetAccountId: template.targetAccountId,
    ignored: template.ignored,
  });

  actions.setComposerMode(reusable.mode);
  actions.setComposerAdvancedOpen(true);
  actions.setTransactionNote(reusable.note);
  actions.setTransactionCategoryId(reusable.categoryId ?? '');
  actions.prefillTaxonomy(reusable.tagNames);
  actions.prefillExpenseSplit(reusable.splitItems);
  actions.prefillShareDraft(reusable.shareDraft);
  actions.setMovementIgnored(reusable.mode === 'expense' || reusable.mode === 'income' ? reusable.movementIgnored === true : false);
  if (reusable.mode === 'transfer') {
    actions.setTransferToAccountId(reusable.transferTargetAccountId ?? '');
    actions.syncForTransferMode();
  }
  if (reusable.accountId !== currentAccountId) {
    onAccountChanged?.({ id: reusable.accountId, name: template.accountName });
  }
}
