import type {
  TransactionVoiceCaptureInput,
  TransactionVoiceCaptureResult,
  TransactionVoiceFinalizeInput,
  TransactionVoiceFinalizeResult,
} from '../../shared/domain/corePort';

export type TransactionsVoiceGatewayPort = {
  transactionVoiceCapture(input: TransactionVoiceCaptureInput): Promise<TransactionVoiceCaptureResult>;
  transactionVoiceFinalize(input: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult>;
};

export function createTransactionsVoiceGateway(core: TransactionsVoiceGatewayPort): TransactionsVoiceGatewayPort {
  return {
    transactionVoiceCapture: core.transactionVoiceCapture,
    transactionVoiceFinalize: core.transactionVoiceFinalize,
  };
}
