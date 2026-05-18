import { useCallback } from 'react';
import type { TaxonomyGatewayPort } from './taxonomyGateway.port';

export function useTagSuggestions(gateway: TaxonomyGatewayPort) {
  const listTags = useCallback(
    (input?: { includeArchived?: boolean }) => gateway.taxonomyListTags(input),
    [gateway],
  );

  return {
    listTags,
  };
}
