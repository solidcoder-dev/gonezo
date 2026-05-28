import type {
  LedgerAccountItem,
  LedgerTransactionBreakdownItem,
  LedgerTransactionType,
} from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';

export type MovementsBackupPostedMovementItem = {
  id: string;
  accountId: string;
  type: LedgerTransactionType;
  status: 'posted';
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
