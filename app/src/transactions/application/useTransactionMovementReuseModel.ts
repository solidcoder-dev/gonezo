import type { Dispatch, SetStateAction } from 'react';
import type { MovementReuseSuggestionsPort, MovementReuseSuggestionVariant } from '../../movements/application/movementReuseSuggestions.port';
import { createMovementReuseTemplate } from './movementReuseTemplate';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

const EMPTY_REUSE_PORT: MovementReuseSuggestionsPort = {
  movementReuseSearchGroups: async () => ({ groups: [] }),
  movementReuseListVariants: async () => ({ variants: [] }),
};

export function useTransactionMovementReuseModel(input: {
  port?: MovementReuseSuggestionsPort;
  accountIds: string[];
  enabled: boolean;
  accountId: string | null;
  setNote: (value: string) => void;
  setCategoryId: (value: string) => void;
  prefillTags: (values: string[]) => void;
  setIgnored: Dispatch<SetStateAction<boolean>>;
  onAccountChanged?: (account: { id: string; name: string }) => void;
}) {
  return useMovementReuseSuggestionsModel({
    port: input.port ?? EMPTY_REUSE_PORT,
    accountIds: input.accountIds,
    enabled: input.enabled,
    onSelected: (variant: MovementReuseSuggestionVariant, title?: string) => {
      const type = variant.financialType === 'transfer' || variant.financialType === 'transfer_in' || variant.financialType === 'transfer_out' ? 'transfer' : variant.financialType;
      const template = createMovementReuseTemplate({ title: title ?? '', accountId: variant.accountId, type, categoryId: variant.category?.id, tagNames: variant.tags.map((tag) => tag.name) });
      input.setNote(template.note);
      input.setCategoryId(template.categoryId ?? '');
      input.prefillTags(template.tagNames);
      input.setIgnored(template.movementIgnored ?? false);
      if (template.accountId !== input.accountId) input.onAccountChanged?.({ id: template.accountId, name: variant.accountName });
    },
  });
}
