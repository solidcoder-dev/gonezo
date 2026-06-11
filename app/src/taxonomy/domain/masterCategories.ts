import type { TaxonomyCategoryAppliesTo, TaxonomyCategoryView } from './taxonomy.types';

export type MasterCategoryDefinition = TaxonomyCategoryView & {
  keywords: string[];
};

export const MASTER_EXPENSE_CATEGORIES: MasterCategoryDefinition[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Bills',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['rent', 'mortgage', 'electricity', 'water', 'internet', 'phone', 'insurance', 'community fees', 'subscriptions', 'loans', 'credit cards', 'repayments'],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Groceries',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['supermarket', 'food for home', 'household essentials'],
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    name: 'Dining',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['restaurants', 'cafes', 'takeaway', 'delivery'],
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    name: 'Transport',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['fuel', 'bus', 'taxi', 'parking', 'car costs', 'public transport'],
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    name: 'Health',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['pharmacy', 'doctor', 'dentist', 'medical costs'],
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    name: 'Shopping',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['clothes', 'tech', 'personal purchases'],
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    name: 'Entertainment',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['cinema', 'hobbies', 'events', 'leisure', 'games'],
  },
  {
    id: '00000000-0000-4000-8000-000000000108',
    name: 'Travel',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['flights', 'hotels', 'trips', 'holidays'],
  },
  {
    id: '00000000-0000-4000-8000-000000000109',
    name: 'Other',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['anything that does not fit'],
  },
];

export const MASTER_INCOME_CATEGORIES: MasterCategoryDefinition[] = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'Work Income',
    appliesTo: 'income',
    status: 'active',
    keywords: ['salary', 'freelance', 'side jobs', 'client work', 'business income'],
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    name: 'Investments',
    appliesTo: 'income',
    status: 'active',
    keywords: ['dividends', 'interest', 'investment returns'],
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    name: 'Reimbursements',
    appliesTo: 'income',
    status: 'active',
    keywords: ['someone pays you back their part', 'shared expenses', 'work expenses paid back'],
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    name: 'Gifts & Benefits',
    appliesTo: 'income',
    status: 'active',
    keywords: ['gifts', 'grants', 'government aid', 'subsidies'],
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    name: 'Other',
    appliesTo: 'income',
    status: 'active',
    keywords: ['any income that does not fit'],
  },
];

export const MASTER_CATEGORIES = [
  ...MASTER_EXPENSE_CATEGORIES,
  ...MASTER_INCOME_CATEGORIES,
];

export const FREQUENT_EXPENSE_CATEGORY_IDS = [
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000108',
  '00000000-0000-4000-8000-000000000109',
];

export const FREQUENT_INCOME_CATEGORY_IDS = [
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000205',
];

export function listMasterCategories(appliesTo?: TaxonomyCategoryAppliesTo): MasterCategoryDefinition[] {
  return MASTER_CATEGORIES.filter((category) => !appliesTo || category.appliesTo === appliesTo);
}

export function findMasterCategoryById(categoryId?: string): MasterCategoryDefinition | undefined {
  if (!categoryId) {
    return undefined;
  }
  return MASTER_CATEGORIES.find((category) => category.id === categoryId);
}
