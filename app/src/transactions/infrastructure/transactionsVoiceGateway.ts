import type {
  TransactionVoiceExtractDraftInput,
  TransactionVoiceExtractDraftResult,
  TransactionVoiceFinalizeInput,
  TransactionVoiceFinalizeResult,
  TransactionVoiceStartInput,
  TransactionVoiceStartResult,
  TransactionVoiceStopInput,
  TransactionVoiceStopResult,
} from '../../shared/domain/corePort';

export type TransactionsVoiceGatewayPort = {
  transactionVoiceStart(input: TransactionVoiceStartInput): Promise<TransactionVoiceStartResult>;
  transactionVoiceStop(input: TransactionVoiceStopInput): Promise<TransactionVoiceStopResult>;
  transactionVoiceExtractDraft(input: TransactionVoiceExtractDraftInput): Promise<TransactionVoiceExtractDraftResult>;
  transactionVoiceFinalize(input: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult>;
};

export function createTransactionsVoiceGateway(core: TransactionsVoiceGatewayPort): TransactionsVoiceGatewayPort {
  return {
    transactionVoiceStart: core.transactionVoiceStart,
    transactionVoiceStop: core.transactionVoiceStop,
    transactionVoiceExtractDraft: core.transactionVoiceExtractDraft,
    transactionVoiceFinalize: core.transactionVoiceFinalize,
  };
}
