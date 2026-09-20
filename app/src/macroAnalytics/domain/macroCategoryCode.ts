export const macroCategoryCodes = [
  'BILLS', 'GROCERIES', 'DINING', 'TRANSPORT', 'HEALTH', 'SHOPPING', 'ENTERTAINMENT', 'TRAVEL',
  'OTHER_EXPENSE', 'BEAUTY', 'SERVICES', 'WORK_INCOME', 'INVESTMENTS', 'REIMBURSEMENTS',
  'GIFTS_BENEFITS', 'OTHER_INCOME', 'UNMAPPED_EXPENSE', 'UNMAPPED_INCOME',
] as const;

export type MacroCategoryCode = (typeof macroCategoryCodes)[number];
