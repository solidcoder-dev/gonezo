import type { MovementReuseSuggestionsPort, MovementReuseSuggestionVariant, MovementReuseTemplate, MovementReuseTemplatePort } from '../../movements/application/movementReuseSuggestions.port';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

export function useTransactionMovementReuseModel(input: {
  port: MovementReuseSuggestionsPort & MovementReuseTemplatePort;
  accountIds: string[];
  enabled: boolean;
  query: string;
  accountId: string | null;
  applyTemplate: (template: MovementReuseTemplate) => void;
}) {
  return useMovementReuseSuggestionsModel({
    port: input.port,
    accountIds: input.accountIds,
    enabled: input.enabled,
    query: input.query,
    onSelected: ({ variant }: { variant: MovementReuseSuggestionVariant; title: string }) => {
      void (async () => {
        const template = await input.port.movementReuseGetTemplate({ representativeMovementId: variant.representativeMovementId });
        input.applyTemplate(template);
      })();
    },
  });
}
