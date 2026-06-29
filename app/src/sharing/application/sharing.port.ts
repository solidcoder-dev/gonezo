export type SharingPersonItem = {
  id: string;
  name: string;
  email?: string;
};

export type SharingListPeopleResult = {
  items: SharingPersonItem[];
};

export type SharingApplyShareParticipantInput = {
  personName: string;
  amount: string;
  reimbursable: boolean;
};

export type SharingApplyShareToPostedTransactionInput = {
  transactionId: string;
  payerName: string;
  participants: SharingApplyShareParticipantInput[];
  appliedAt?: string;
};

export type SharingApplyShareToPostedTransactionResult = {
  shareId: string;
  transactionId: string;
  participants: Array<{
    participantId: string;
    personId: string;
    displayName: string;
    amount: string;
    reimbursable: boolean;
    expectedMovementId?: string;
  }>;
};

export type SharingGetMovementDetailsInput = {
  transactionId: string;
};

export type SharingMovementDetailsResult = {
  shareId: string;
  transactionId: string;
  participants: Array<{
    participantId: string;
    personId: string;
    displayName: string;
    amount: string;
    reimbursable: boolean;
    expectedMovementId?: string;
    repaymentStatus: 'not_expected' | 'pending' | 'paid' | 'dismissed' | 'missing_expected';
  }>;
  analytics: {
    personalExpenseAmount: string;
    excludedLentAmount: string;
    excludedReimbursementIncomeAmount: string;
  };
} | null;

export interface SharingPort {
  sharingListPeople(): Promise<SharingListPeopleResult>;
  sharingApplyShareToPostedTransaction(
    input: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult>;
  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult>;
}
