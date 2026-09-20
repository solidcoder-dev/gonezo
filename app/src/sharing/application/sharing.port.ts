
export type SharingPersonItem = {
  id: string;
  name: string;
  email?: string;
};

export type SharingListPeopleResult = {
  items: SharingPersonItem[];
};

export type SharingRenamePersonInput = { personId: string; displayName: string };

export type SharingListGroupSuggestionsResult = { items: SharingGroupSuggestion[] };

export type SharingApplyShareParticipantInput = {
  person: SharingPersonReference;
  amount: string;
  settlementChoice?: 'not_required' | 'pending' | 'settled';
  reimbursable?: boolean;
};

export type SharingPersonReference =
  | { currentUser: true; personId?: never; displayName?: never }
  | { personId: string; displayName?: never }
  | { displayName: string; personId?: never };

export type SharingApplyShareToPostedMovementInput = {
  transactionId: string;
  payer: SharingPersonReference;
  participants: SharingApplyShareParticipantInput[];
  appliedAt?: string;
};

export type SharingApplyShareToPostedMovementResult = {
  shareId: string;
  transactionId: string;
  participants: Array<{
    participantId: string;
    personId: string;
    displayName: string;
    amount: string;
    settlementChoice?: 'not_required' | 'pending' | 'settled';
    reimbursable?: boolean;
    expectedMovementId?: string;
  }>;
};

export type SharingReplaceMovementShareInput = SharingApplyShareToPostedMovementInput & { updatedAt?: string };
export type SharingReplaceMovementShareResult = { shareId: string; transactionId: string };
export type SharingRemoveMovementShareInput = { transactionId: string; removedAt?: string };

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
    settlementChoice?: 'not_required' | 'pending' | 'settled';
    reimbursable?: boolean;
    expectedMovementId?: string;
    repaymentStatus: 'not_expected' | 'pending' | 'paid' | 'dismissed' | 'missing_expected';
  }>;
  analytics: {
    personalExpenseAmount: string;
    excludedLentAmount: string;
    excludedReimbursementIncomeAmount: string;
    personalIncomeAmount?: string;
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
  sharingRenamePerson?(input: SharingRenamePersonInput): Promise<void>;
  sharingListGroupSuggestions?(): Promise<SharingListGroupSuggestionsResult>;
  sharingApplyShareToPostedMovement(
    input: SharingApplyShareToPostedMovementInput,
  ): Promise<SharingApplyShareToPostedMovementResult>;
  sharingReplaceMovementShare?(input: SharingReplaceMovementShareInput): Promise<SharingReplaceMovementShareResult>;
  sharingRemoveMovementShare?(input: SharingRemoveMovementShareInput): Promise<void>;
  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult>;
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
  sharingGetPlannedShare?(input: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult>;
}
import type { SharingGroupSuggestion } from '../domain/shareDraft';
