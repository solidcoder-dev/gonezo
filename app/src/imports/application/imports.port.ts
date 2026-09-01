import type { LedgerAccountItem, LedgerTransactionBreakdownItem, LedgerTransactionType } from '../../ledger/application/ledger.port';

export type PortableRecurringSharingPlan = {
  id: string;
  recurringMovementId: string;
  payerPersonId: string;
  mode: 'parts' | 'amounts';
  payerParts?: number;
  currency: string;
  participants: Array<{ id: string; personId: string; parts?: number; amount?: string; reimbursable: boolean; order: number }>;
  createdAt: string;
  updatedAt: string;
};

export type PortablePlannedExpenseShare = {
  id: string;
  expectedMovementId: string;
  sourcePlanId?: string;
  payerPersonId: string;
  mode: 'parts' | 'amounts';
  payerParts?: number;
  totalAmount: string;
  currency: string;
  participants: Array<{ id: string; personId: string; parts?: number; amount: string; reimbursable: boolean; order: number }>;
  status: 'pending' | 'materialized' | 'cancelled';
  materializedTransactionId?: string;
  materializedShareId?: string;
  createdAt: string;
  updatedAt: string;
};
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';

export type MovementsBackupPostedMovementItem = {
  id: string;
  accountId: string;
  type: LedgerTransactionType;
  status: 'draft' | 'posted' | 'voided';
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  linkedTransactionId?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  tagIds: string[];
  splitItems: LedgerTransactionBreakdownItem[];
};

export type MovementsBackupExport = {
  schemaVersion: 2;
  exportedAt: string;
  accounts: LedgerAccountItem[];
  categories: TaxonomyCategoryItem[];
  tags: TaxonomyTagItem[];
  postedMovements: MovementsBackupPostedMovementItem[];
};

export type MovementsBackupExportResult = {
  fileName: string;
  exportedAt: string;
  savedTo?: string;
  postedMovementCount: number;
  accountCount: number;
  categoryCount: number;
  tagCount: number;
};

export type MovementsBackupImportInput = {
  fileBase64: string;
};

export type MovementsBackupImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type MovementsBackupImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: MovementsBackupImportRowResult[];
};

export type MobillsImportPolicy = {
  createMissingAccounts?: boolean;
  createMissingCategories?: boolean;
  createMissingTags?: boolean;
  duplicatePolicy?: 'skip' | 'fail' | 'import_anyway';
};

export type MobillsImportInput = {
  fileBase64: string;
  policy?: MobillsImportPolicy;
};

export type MobillsImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type MobillsImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: MobillsImportRowResult[];
};

export interface MobillsImportPort {
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
}

export interface MovementsBackupPort {
  movementsExportBackup(): Promise<MovementsBackupExportResult>;
  movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult>;
}

export type ApplicationBackupDocument = {
  format: 'gonezo-backup';
  formatVersion: 1;
  createdAt: string;
  sections: {
    taxonomy: { version: 1; data: {
      categories: unknown[];
      tags: unknown[];
      transactionTags: Array<{ transactionId: string; tagIds: string[] }>;
    } };
    ledger: { version: 1; data: {
      accounts: unknown[];
      postedMovements: unknown[];
    } };
    recurrence: { version: 1; data: {
      movements: unknown[];
      occurrences: unknown[];
    } };
    expected: { version: 1; data: { movements: unknown[] } };
    sharing: { version: 1; data: { persons: unknown[]; expenseShares: unknown[]; recurringSharingPlans: PortableRecurringSharingPlan[]; plannedExpenseShares: PortablePlannedExpenseShare[] } };
    analytics: { version: 1; data: { exclusions: unknown[] } };
    preferences: { version: 1; data: { defaultAccountId: string | null } };
  };
};

export type ApplicationBackupExportResult = {
  fileName: string;
  createdAt: string;
  json: string;
};

export type ApplicationBackupImportInput = { fileBase64: string };

export type ApplicationBackupPort = {
  applicationExportBackup(): Promise<ApplicationBackupExportResult>;
  applicationImportBackup(input: ApplicationBackupImportInput): Promise<void>;
};
