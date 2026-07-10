import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { SpendingDashboardCategoryView } from '../ui/SpendingDashboard/SpendingDashboardView.contract';

const CATEGORY_COLORS = ['#ffb7b2', '#c6efd4', '#ffe08a', '#b9d4f7', '#d7d2ff'];
const MAX_VISIBLE_CATEGORIES = 5;
const MAX_PRIMARY_CATEGORIES = 4;

export type SpendingCategoryBreakdownItem = {
  key: string;
  name: string;
  amountValue: string;
  percentage: number;
};

export type SpendingCategoryBreakdownPresentation = {
  visibleCategories: SpendingDashboardCategoryView[];
  allCategories: SpendingDashboardCategoryView[];
};

function toViewCategory(
  category: SpendingCategoryBreakdownItem,
  color: string,
  currency: string,
): SpendingDashboardCategoryView {
  return {
    key: category.key,
    name: category.name,
    amount: formatCurrencyAmount(category.amountValue, currency),
    percentage: category.percentage,
    color,
  };
}

export function presentSpendingCategoryBreakdown(
  categories: SpendingCategoryBreakdownItem[],
  currency: string,
): SpendingCategoryBreakdownPresentation {
  const allCategories = categories.map((category, index) =>
    toViewCategory(category, CATEGORY_COLORS[index % CATEGORY_COLORS.length], currency),
  );

  if (categories.length <= MAX_VISIBLE_CATEGORIES) {
    return {
      visibleCategories: allCategories,
      allCategories,
    };
  }

  const primaryCategories = categories.slice(0, MAX_PRIMARY_CATEGORIES).map((category, index) =>
    toViewCategory(category, CATEGORY_COLORS[index % CATEGORY_COLORS.length], currency),
  );
  const remainingCategories = categories.slice(MAX_PRIMARY_CATEGORIES);
  const othersAmount = remainingCategories.reduce((total, category) => total + Number(category.amountValue), 0);
  const othersPercentage = remainingCategories.reduce((total, category) => total + category.percentage, 0);

  return {
    visibleCategories: [
      ...primaryCategories,
      {
        key: 'others',
        name: 'Others',
        amount: formatCurrencyAmount(String(othersAmount), currency),
        percentage: othersPercentage,
        color: CATEGORY_COLORS[CATEGORY_COLORS.length - 1],
      },
    ],
    allCategories,
  };
}
