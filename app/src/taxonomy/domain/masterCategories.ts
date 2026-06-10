import type { TaxonomyCategoryAppliesTo, TaxonomyCategoryView } from './taxonomy.types';

export type MasterCategoryDefinition = TaxonomyCategoryView & {
  keywords: string[];
};

export const MASTER_EXPENSE_CATEGORIES: MasterCategoryDefinition[] = [
  {
    id: 'expense:bills',
    name: 'Bills',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['rent', 'mortgage', 'electricity', 'water', 'internet', 'phone', 'insurance', 'community fees', 'subscriptions', 'loans', 'credit cards', 'repayments'],
  },
  {
    id: 'expense:groceries',
    name: 'Groceries',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['supermarket', 'food for home', 'household essentials'],
  },
  {
    id: 'expense:dining',
    name: 'Dining',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['restaurants', 'cafes', 'takeaway', 'delivery'],
  },
  {
    id: 'expense:transport',
    name: 'Transport',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['fuel', 'bus', 'taxi', 'parking', 'car costs', 'public transport'],
  },
  {
    id: 'expense:health',
    name: 'Health',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['pharmacy', 'doctor', 'dentist', 'medical costs'],
  },
  {
    id: 'expense:shopping',
    name: 'Shopping',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['clothes', 'tech', 'personal purchases'],
  },
  {
    id: 'expense:entertainment',
    name: 'Entertainment',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['cinema', 'hobbies', 'events', 'leisure', 'games'],
  },
  {
    id: 'expense:travel',
    name: 'Travel',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['flights', 'hotels', 'trips', 'holidays'],
  },
  {
    id: 'expense:other',
    name: 'Other',
    appliesTo: 'expense',
    status: 'active',
    keywords: ['anything that does not fit'],
  },
];

export const MASTER_INCOME_CATEGORIES: MasterCategoryDefinition[] = [
  {
    id: 'income:work-income',
    name: 'Work Income',
    appliesTo: 'income',
    status: 'active',
    keywords: ['salary', 'freelance', 'side jobs', 'client work', 'business income'],
  },
  {
    id: 'income:investments',
    name: 'Investments',
    appliesTo: 'income',
    status: 'active',
    keywords: ['dividends', 'interest', 'investment returns'],
  },
  {
    id: 'income:reimbursements',
    name: 'Reimbursements',
    appliesTo: 'income',
    status: 'active',
    keywords: ['someone pays you back their part', 'shared expenses', 'work expenses paid back'],
  },
  {
    id: 'income:gifts-benefits',
    name: 'Gifts & Benefits',
    appliesTo: 'income',
    status: 'active',
    keywords: ['gifts', 'grants', 'government aid', 'subsidies'],
  },
  {
    id: 'income:other',
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
  'expense:bills',
  'expense:groceries',
  'expense:dining',
  'expense:transport',
  'expense:health',
  'expense:shopping',
  'expense:entertainment',
  'expense:travel',
  'expense:other',
];

export const FREQUENT_INCOME_CATEGORY_IDS = [
  'income:work-income',
  'income:investments',
  'income:reimbursements',
  'income:gifts-benefits',
  'income:other',
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
