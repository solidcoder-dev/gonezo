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

export type SharingListMovementDetailsInput = {
  transactionIds: string[];
};

export type SharingListMovementDetailsResult = {
  items: Array<Exclude<SharingMovementDetailsResult, null>>;
};

export type SharingGetPlannedShareInput = {
  expectedMovementId: string;
};

export type SharingPlannedShareResult = {
  expectedMovementId: string;
  payer: { personId: string; name: string; parts?: number };
  mode: 'parts' | 'amounts';
  totalAmount: string;
  currency: string;
  participants: Array<{
    participantId: string;
    personId: string;
    name: string;
    parts?: number;
    amount: string;
    reimbursable: boolean;
  }>;
} | null;

export interface SharingPort {
  sharingListPeople(): Promise<SharingListPeopleResult>;
  sharingApplyShareToPostedTransaction(
    input: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult>;
  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult>;
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
  sharingGetPlannedShare?(input: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult>;
}
