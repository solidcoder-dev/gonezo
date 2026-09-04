import type { MovementReuseSuggestionsPort, MovementReuseSuggestionVariant, MovementReuseTemplate, MovementReuseTemplatePort } from '../../movements/application/movementReuseSuggestions.port';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

const EMPTY_REUSE_PORT: MovementReuseSuggestionsPort = {
  movementReuseSearchGroups: async () => ({ groups: [] }),
  movementReuseListVariants: async () => ({ variants: [] }),
};

export function useTransactionMovementReuseModel(input: {
  port?: MovementReuseSuggestionsPort;
  accountIds: string[];
  enabled: boolean;
  query: string;
  accountId: string | null;
  applyTemplate: (template: MovementReuseTemplate) => void;
}) {
  return useMovementReuseSuggestionsModel({
    port: input.port ?? EMPTY_REUSE_PORT,
    accountIds: input.accountIds,
    enabled: input.enabled,
    query: input.query,
    onSelected: ({ variant, title }: { variant: MovementReuseSuggestionVariant; title: string }) => {
      const templatePort = input.port as (MovementReuseSuggestionsPort & Partial<MovementReuseTemplatePort>) | undefined;
      void (async () => {
        const template = templatePort?.movementReuseGetTemplate
          ? await templatePort.movementReuseGetTemplate({ representativeMovementId: variant.representativeMovementId })
          : {
            representativeMovementId: variant.representativeMovementId,
            title,
            accountId: variant.accountId,
            accountName: variant.accountName,
            financialType: variant.financialType,
            category: variant.category,
            tags: variant.tags,
            itemNames: [],
            sharingPeople: [],
            ignored: false,
          };
        input.applyTemplate(template);
      })();
    },
  });
}
