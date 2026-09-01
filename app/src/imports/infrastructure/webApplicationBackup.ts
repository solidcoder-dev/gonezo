import type { ApplicationBackupDocument, MovementsBackupPostedMovementItem } from '../application/imports.port';
import type { WebAppState } from '../../core/infrastructure/webAppState';
import { resolveBackupSectionOrder } from '../application/backupSectionDependencies';

const FORMAT = 'gonezo-backup' as const;
const FORMAT_VERSION = 1 as const;

export type ApplicationBackupErrorCode =
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_FORMAT_VERSION'
  | 'UNSUPPORTED_SECTION_VERSION'
  | 'MISSING_SECTION'
  | 'INVALID_REFERENCE'
  | 'INVALID_DATA'
  | 'DEPENDENCY_ERROR'
  | 'IMPORT_FAILED'
  | 'IO_FAILED';

export class ApplicationBackupError extends Error {
  readonly code: ApplicationBackupErrorCode;

  constructor(code: ApplicationBackupErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = 'ApplicationBackupError';
  }
}

export function exportWebApplicationBackup(state: WebAppState, createdAt: string): ApplicationBackupDocument {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    createdAt,
    sections: {
      taxonomy: { version: 1, data: {
        categories: [...state.taxonomyCategories].sort((left, right) => left.id.localeCompare(right.id)),
        tags: [...state.taxonomyTags].sort((left, right) => left.id.localeCompare(right.id)),
        transactionTags: [...state.taxonomyTransactionTags.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([transactionId, tagIds]) => ({ transactionId, tagIds: [...tagIds].sort() })),
      } },
      ledger: { version: 1, data: {
        accounts: [...state.ledgerAccounts].sort((left, right) => left.id.localeCompare(right.id)),
        postedMovements: state.ledgerTransactions
          .map((movement) => ({
            ...movement,
            status: movement.status,
            tagIds: [...(state.taxonomyTransactionTags.get(movement.id) ?? [])].sort(),
            splitItems: movement.items,
          }))
          .sort((left, right) => left.id.localeCompare(right.id)) as MovementsBackupPostedMovementItem[],
      } },
      recurrence: { version: 1, data: {
        movements: [...state.recurringMovements].sort(byId),
        occurrences: [...state.recurringMovementOccurrences].sort(byId),
      } },
      expected: { version: 1, data: { movements: [...state.expectedMovements].sort(byId) } },
      sharing: { version: 1, data: {
        persons: [...state.sharingPersons].sort(byId),
        expenseShares: [...state.expenseShares].sort(byId),
        recurringSharingPlans: [...state.recurringSharingPlans].sort(byId),
        plannedExpenseShares: [...state.plannedExpenseShares].sort(byId),
      } },
      analytics: { version: 1, data: { exclusions: [...state.analyticsExclusions].sort(byId) } },
      preferences: { version: 1, data: { defaultAccountId: state.defaultAccountId } },
    },
  };
}

export function validateWebApplicationBackup(value: unknown): ApplicationBackupDocument {
  try {
    return validateWebApplicationBackupDocument(value);
  } catch (error) {
    if (error instanceof ApplicationBackupError) throw error;
    const message = error instanceof Error ? error.message : 'Invalid application backup data';
    const code = message.includes('reference') ? 'INVALID_REFERENCE' : 'INVALID_DATA';
    throw new ApplicationBackupError(code, message, { cause: error });
  }
}

function validateWebApplicationBackupDocument(value: unknown): ApplicationBackupDocument {
  if (!isRecord(value) || value.format !== FORMAT || value.formatVersion !== FORMAT_VERSION) {
    const code = isRecord(value) && value.format === FORMAT ? 'UNSUPPORTED_FORMAT_VERSION' : 'INVALID_FORMAT';
    throw new ApplicationBackupError(code, 'Unsupported Gonezo application backup format or version');
  }
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) {
    throw new Error('Backup createdAt must be a valid timestamp');
  }
  if (!isRecord(value.sections)) {
    throw new Error('Backup sections are required');
  }
  const sectionNames = ['taxonomy', 'ledger', 'recurrence', 'expected', 'sharing', 'analytics', 'preferences'] as const;
  for (const name of sectionNames) {
    const section = value.sections[name];
    if (!isRecord(section) || section.version !== 1 || !isRecord(section.data)) {
      throw new Error(`Unsupported or invalid ${name} backup section`);
    }
  }
  const document = value as ApplicationBackupDocument;
  document.sections.sharing.data.recurringSharingPlans ??= [];
  document.sections.sharing.data.plannedExpenseShares ??= [];
  const requiredArrays: Array<[unknown, string]> = [
    [document.sections.taxonomy.data.categories, 'categories'],
    [document.sections.taxonomy.data.tags, 'tags'],
    [document.sections.taxonomy.data.transactionTags, 'transactionTags'],
    [document.sections.ledger.data.accounts, 'accounts'],
    [document.sections.ledger.data.postedMovements, 'postedMovements'],
    [document.sections.recurrence.data.movements, 'recurrence movements'],
    [document.sections.recurrence.data.occurrences, 'recurrence occurrences'],
    [document.sections.expected.data.movements, 'expected movements'],
    [document.sections.sharing.data.persons, 'sharing persons'],
    [document.sections.sharing.data.expenseShares, 'expense shares'],
    [document.sections.sharing.data.recurringSharingPlans, 'recurring sharing plans'],
    [document.sections.sharing.data.plannedExpenseShares, 'planned expense shares'],
    [document.sections.analytics.data.exclusions, 'analytics exclusions'],
  ];
  requiredArrays.forEach(([items, label]) => array(items, label));
  resolveBackupSectionOrder();
  const accountIds = uniqueIds(document.sections.ledger.data.accounts as Array<{ id: string }>, 'account');
  const movementIds = uniqueIds(document.sections.ledger.data.postedMovements as Array<{ id: string }>, 'movement');
  const categoryIds = uniqueIds(document.sections.taxonomy.data.categories as Array<{ id: string }>, 'category');
  const tagIds = uniqueIds(document.sections.taxonomy.data.tags as Array<{ id: string }>, 'tag');
  for (const movement of document.sections.ledger.data.postedMovements as MovementsBackupPostedMovementItem[]) {
    requireTimestamp(movement.occurredAt, 'movement occurredAt');
    requireMoney(movement.amount, 'movement amount');
    requireReference(accountIds, movement.accountId, 'movement account');
    if (movement.categoryId) requireReference(categoryIds, movement.categoryId, 'movement category');
    for (const tagId of movement.tagIds) requireReference(tagIds, tagId, 'movement tag');
    for (const item of movement.splitItems) {
      requireMoney(item.amount, 'split item amount');
      if (item.categoryId) requireReference(categoryIds, item.categoryId, 'item category');
    }
  }
  for (const assignment of document.sections.taxonomy.data.transactionTags) {
    requireReference(movementIds, requireString(assignment.transactionId, 'transactionId'), 'transaction tag movement');
    for (const tagId of assignment.tagIds) requireReference(tagIds, tagId, 'transaction tag');
  }
  const recurringIds = uniqueIds(document.sections.recurrence.data.movements as Array<{ id: string }>, 'recurring movement');
  const occurrenceIds = uniqueIds(document.sections.recurrence.data.occurrences as Array<{ id: string }>, 'recurrence occurrence');
  const expectedIds = uniqueIds(document.sections.expected.data.movements as Array<{ id: string }>, 'expected movement');
  const personIds = uniqueIds(document.sections.sharing.data.persons as Array<{ id: string }>, 'sharing person');
  const expenseShareIds = uniqueIds(document.sections.sharing.data.expenseShares as Array<{ id: string }>, 'expense share');
  const planIds = uniqueIds(document.sections.sharing.data.recurringSharingPlans, 'recurring sharing plan');
  for (const occurrence of document.sections.recurrence.data.occurrences) {
    const item = requireRecord(occurrence, 'recurrence occurrence');
    requireReference(recurringIds, requireString(item.recurringMovementId, 'recurringMovementId'), 'occurrence recurring movement');
  }
  for (const movement of document.sections.recurrence.data.movements) {
    const item = requireRecord(movement, 'recurring movement');
    requireReference(accountIds, requireString(item.sourceAccountId, 'sourceAccountId'), 'recurring movement account');
    if (item.targetAccountId) requireReference(accountIds, requireString(item.targetAccountId, 'targetAccountId'), 'recurring movement target account');
    if (item.categoryId) requireReference(categoryIds, requireString(item.categoryId, 'categoryId'), 'recurring movement category');
  }
  for (const movement of document.sections.expected.data.movements) {
    const item = requireRecord(movement, 'expected movement');
    requireReference(accountIds, requireString(item.accountId, 'accountId'), 'expected movement account');
    if (item.originRecurringMovementId) requireReference(recurringIds, requireString(item.originRecurringMovementId, 'originRecurringMovementId'), 'expected recurring movement');
    if (item.originOccurrenceId) requireReference(occurrenceIds, requireString(item.originOccurrenceId, 'originOccurrenceId'), 'expected occurrence');
    if (item.categoryId) requireReference(categoryIds, requireString(item.categoryId, 'categoryId'), 'expected movement category');
  }
  for (const share of document.sections.sharing.data.expenseShares) {
    const item = requireRecord(share, 'expense share');
    requireReference(personIds, requireString(item.payerPersonId, 'payerPersonId'), 'expense share payer');
    requireReference(movementIds, requireString(item.transactionId, 'transactionId'), 'expense share movement');
    for (const participant of array(item.participants, 'expense share participants')) {
      const participantRecord = requireRecord(participant, 'share participant');
      requireReference(personIds, requireString(participantRecord.personId, 'personId'), 'share participant person');
      if (participantRecord.expectedMovementId) requireReference(expectedIds, requireString(participantRecord.expectedMovementId, 'expectedMovementId'), 'share participant expected movement');
    }
  }
  for (const plan of document.sections.sharing.data.recurringSharingPlans) {
    const item = requireRecord(plan, 'recurring sharing plan');
    requireReference(personIds, requireString(item.payerPersonId, 'payerPersonId'), 'recurring plan payer');
    requireReference(recurringIds, requireString(item.recurringMovementId, 'recurringMovementId'), 'recurring plan movement');
    for (const participant of array(item.participants, 'recurring plan participants')) {
      requireReference(personIds, requireString(requireRecord(participant, 'recurring plan participant').personId, 'personId'), 'recurring plan participant person');
    }
  }
  for (const planned of document.sections.sharing.data.plannedExpenseShares) {
    const item = requireRecord(planned, 'planned expense share');
    requireReference(expectedIds, requireString(item.expectedMovementId, 'expectedMovementId'), 'planned share expected movement');
    if (item.sourcePlanId) requireReference(planIds, requireString(item.sourcePlanId, 'sourcePlanId'), 'planned share source plan');
    if (item.materializedShareId) requireReference(expenseShareIds, requireString(item.materializedShareId, 'materializedShareId'), 'materialized expense share');
    requireReference(personIds, requireString(item.payerPersonId, 'payerPersonId'), 'planned share payer');
    for (const participant of array(item.participants, 'planned share participants')) {
      requireReference(personIds, requireString(requireRecord(participant, 'planned share participant').personId, 'personId'), 'planned share participant person');
    }
  }
  if (document.sections.preferences.data.defaultAccountId) {
    requireReference(accountIds, document.sections.preferences.data.defaultAccountId, 'default account');
  }
  return document;
}

export function applyWebApplicationBackup(state: WebAppState, document: ApplicationBackupDocument): void {
  const previous = cloneWebState(state);
  try {
    state.taxonomyCategories = document.sections.taxonomy.data.categories.map((item) => ({ ...(item as object) })) as WebAppState['taxonomyCategories'];
    state.taxonomyTags = document.sections.taxonomy.data.tags.map((item) => ({ ...(item as object) })) as WebAppState['taxonomyTags'];
    state.taxonomyTransactionTags = new Map(document.sections.taxonomy.data.transactionTags.map((item) => [item.transactionId, [...item.tagIds]]));
    state.ledgerAccounts = document.sections.ledger.data.accounts.map((item) => ({ ...(item as object) })) as WebAppState['ledgerAccounts'];
    state.ledgerTransactions = (document.sections.ledger.data.postedMovements as MovementsBackupPostedMovementItem[]).map((item) => {
      const { tagIds: _tagIds, splitItems, category: _category, ...transaction } = item;
      void _tagIds;
      void _category;
      return { ...transaction, items: splitItems.map((split) => ({ ...split })) };
    });
    state.recurringMovements = document.sections.recurrence.data.movements.map((item) => ({ ...(item as object) })) as WebAppState['recurringMovements'];
    state.recurringMovementOccurrences = document.sections.recurrence.data.occurrences.map((item) => ({ ...(item as object) })) as WebAppState['recurringMovementOccurrences'];
    state.expectedMovements = document.sections.expected.data.movements.map((item) => ({ ...(item as object) })) as WebAppState['expectedMovements'];
    state.sharingPersons = document.sections.sharing.data.persons.map((item) => ({ ...(item as object) })) as WebAppState['sharingPersons'];
    state.expenseShares = document.sections.sharing.data.expenseShares.map((item) => ({ ...(item as object) })) as WebAppState['expenseShares'];
    state.recurringSharingPlans = document.sections.sharing.data.recurringSharingPlans.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant })) }));
    state.plannedExpenseShares = document.sections.sharing.data.plannedExpenseShares.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant })) }));
    state.analyticsExclusions = document.sections.analytics.data.exclusions.map((item) => ({ ...(item as object) })) as WebAppState['analyticsExclusions'];
    state.defaultAccountId = document.sections.preferences.data.defaultAccountId;
    state.mobillsImportFingerprintToTransactionId = new Map();
  } catch (error) {
    restoreWebState(state, previous);
    throw error;
  }
}

function cloneWebState(state: WebAppState): WebAppState {
  return {
    ...state,
    ledgerAccounts: state.ledgerAccounts.map((item) => ({ ...item })),
    ledgerTransactions: state.ledgerTransactions.map((item) => ({ ...item, items: item.items.map((split) => ({ ...split })) })),
    taxonomyCategories: state.taxonomyCategories.map((item) => ({ ...item })),
    taxonomyTags: state.taxonomyTags.map((item) => ({ ...item })),
    taxonomyTransactionTags: new Map([...state.taxonomyTransactionTags].map(([id, tags]) => [id, [...tags]])),
    recurringMovements: state.recurringMovements.map((item) => ({ ...item })),
    recurringMovementOccurrences: state.recurringMovementOccurrences.map((item) => ({ ...item })),
    expectedMovements: state.expectedMovements.map((item) => ({ ...item, splitItems: item.splitItems.map((split) => ({ ...split })) })),
    sharingPersons: state.sharingPersons.map((item) => ({ ...item })),
    expenseShares: state.expenseShares.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant })) })),
    recurringSharingPlans: state.recurringSharingPlans.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant })) })),
    plannedExpenseShares: state.plannedExpenseShares.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant })) })),
    analyticsExclusions: state.analyticsExclusions.map((item) => ({ ...item })),
    mobillsImportFingerprintToTransactionId: new Map(state.mobillsImportFingerprintToTransactionId),
  };
}

function restoreWebState(target: WebAppState, source: WebAppState): void {
  Object.assign(target, source);
}

function byId(left: { id: string }, right: { id: string }): number { return left.id.localeCompare(right.id); }
function isRecord(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null; }
function requireRecord(value: unknown, label: string): Record<string, any> {
  if (!isRecord(value)) throw new Error(`Invalid ${label}`);
  return value;
}
function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${label}`);
  return value;
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value;
}
function uniqueIds(items: Array<{ id: string }>, label: string): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error(`Duplicate or invalid ${label} id`);
    ids.add(item.id);
  }
  return ids;
}
function requireReference(ids: Set<string>, value: string, label: string): void {
  if (!ids.has(value)) throw new Error(`Invalid ${label} reference: ${value}`);
}

function requireTimestamp(value: unknown, label: string): void {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}`);
}

function requireMoney(value: unknown, label: string): void {
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) {
    throw new Error(`Invalid ${label}`);
  }
}
