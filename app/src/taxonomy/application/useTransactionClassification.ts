import { useCallback } from 'react';
import type { TaxonomyGatewayPort } from '../infrastructure/taxonomyGateway';

export function useTransactionClassification(gateway: TaxonomyGatewayPort) {
  const categorizeTransaction = useCallback(
    (input: { transactionId: string; transactionType: 'income' | 'expense'; categoryId?: string }) =>
      gateway.orchestrationCategorizeTransaction(input),
    [gateway],
  );

  const applyTransactionTags = useCallback(
    (input: { transactionId: string; tagNames: string[] }) =>
      gateway.orchestrationApplyTransactionTags(input),
    [gateway],
  );

  const listTransactionTaxonomy = useCallback(
    (input: { transactionIds: string[] }) => gateway.orchestrationListTransactionTaxonomy(input),
    [gateway],
  );

  return {
    categorizeTransaction,
    applyTransactionTags,
    listTransactionTaxonomy,
  };
}
