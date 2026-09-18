import { useState } from 'react';
import type { MovementReuseSuggestionsPort, MovementReuseSuggestionVariant, MovementReuseTemplate, MovementReuseTemplatePort } from '../../movements/application/movementReuseSuggestions.port';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

export function useTransactionMovementReuseModel(input: {
  port: MovementReuseSuggestionsPort & MovementReuseTemplatePort; accountIds: string[]; enabled: boolean; query: string; accountId: string | null;
  applySetup: (template: MovementReuseTemplate) => void; applyWithDetails: (template: MovementReuseTemplate) => void;
}) {
  const [pendingTemplate, setPendingTemplate] = useState<MovementReuseTemplate | null>(null);
  const [templateError, setTemplateError] = useState('');
  const [appliedVersion, setAppliedVersion] = useState(0);
  const suggestions = useMovementReuseSuggestionsModel({
    port: input.port, accountIds: input.accountIds, enabled: input.enabled, query: input.query,
    onSelected: ({ variant }: { variant: MovementReuseSuggestionVariant; title: string }) => {
      void input.port.movementReuseGetTemplate({ representativeMovementId: variant.representativeMovementId }).then((template) => {
        setTemplateError('');
        const hasDetails = (template.details?.items.length ?? 0) > 0
          || (template.details?.sharing.length ?? 0) > 0;
        if (hasDetails) setPendingTemplate(template); else applySetup(template);
      }).catch(() => setTemplateError('Unable to load movement reuse details'));
    },
  });
  function applySetup(template: MovementReuseTemplate) {
    input.applySetup(template);
    setAppliedVersion((version) => version + 1);
  }
  function reuseSetupOnly() { if (pendingTemplate) applySetup(pendingTemplate); setPendingTemplate(null); }
  function reuseWithDetails() {
    if (pendingTemplate) {
      input.applyWithDetails(pendingTemplate);
      setAppliedVersion((version) => version + 1);
    }
    setPendingTemplate(null);
  }
  function cancelReuse() { setPendingTemplate(null); }
  return {
    state: { ...suggestions.state, pendingTemplate, requiresDetailsDecision: pendingTemplate !== null, appliedVersion, error: suggestions.state.error || templateError },
    actions: { ...suggestions.actions, reuseSetupOnly, reuseWithDetails, cancelReuse },
  };
}
