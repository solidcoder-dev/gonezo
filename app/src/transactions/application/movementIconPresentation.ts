import { normalizeTaxonomyName } from './transactionTaxonomySelection';

export type MovementIconDirection = 'income' | 'expense' | 'transfer';

export type MovementIconPresentation = {
  className: string;
  accessibleLabel: string;
};

type RecognizedTaxonomyIcon = MovementIconPresentation & {
  recognized: boolean;
};

const TAXONOMY_ICON_BY_NAME: Record<string, { className: string; label: string }> = {
  bills: { className: 'bi-receipt', label: 'Bills' },
  beauty: { className: 'bi-scissors', label: 'Beauty' },
  groceries: { className: 'bi-basket', label: 'Groceries' },
  dining: { className: 'bi-cup-hot', label: 'Dining' },
  transport: { className: 'bi-bus-front', label: 'Transport' },
  health: { className: 'bi-heart-pulse', label: 'Health' },
  shopping: { className: 'bi-bag', label: 'Shopping' },
  entertainment: { className: 'bi-controller', label: 'Entertainment' },
  travel: { className: 'bi-airplane', label: 'Travel' },
  'work income': { className: 'bi-briefcase', label: 'Work income' },
  investments: { className: 'bi-graph-up-arrow', label: 'Investments' },
  reimbursements: { className: 'bi-arrow-left-right', label: 'Reimbursements' },
  'gifts & benefits': { className: 'bi-gift', label: 'Gifts and benefits' },
  other: { className: 'bi-three-dots', label: 'Other' },
};

export function resolveTaxonomyIcon(name: string): MovementIconPresentation {
  const normalizedName = normalizeTaxonomyName(name);
  const icon = TAXONOMY_ICON_BY_NAME[normalizedName];
  return icon
    ? { className: `bi ${icon.className}`, accessibleLabel: `${icon.label} movement` }
    : { className: 'bi bi-tag', accessibleLabel: 'Categorized movement' };
}

function recognizedTaxonomyIcon(name: string): RecognizedTaxonomyIcon {
  const normalizedName = normalizeTaxonomyName(name);
  const icon = TAXONOMY_ICON_BY_NAME[normalizedName];
  return icon
    ? { className: `bi ${icon.className}`, accessibleLabel: `${icon.label} movement`, recognized: true }
    : { ...resolveTaxonomyIcon(name), recognized: false };
}

function directionIcon(direction: MovementIconDirection): MovementIconPresentation {
  if (direction === 'income') {
    return { className: 'bi bi-arrow-up-right', accessibleLabel: 'Income movement' };
  }
  if (direction === 'transfer') {
    return { className: 'bi bi-arrow-left-right', accessibleLabel: 'Transfer movement' };
  }
  return { className: 'bi bi-arrow-down-right', accessibleLabel: 'Expense movement' };
}

export function resolveMovementIcon(input: {
  direction: MovementIconDirection;
  tagNames?: string[];
  categoryName?: string;
}): MovementIconPresentation {
  const tagIcon = (input.tagNames ?? [])
    .map(recognizedTaxonomyIcon)
    .find((icon) => icon.recognized);
  if (tagIcon) {
    return { className: tagIcon.className, accessibleLabel: tagIcon.accessibleLabel };
  }

  if (input.categoryName) {
    const categoryIcon = recognizedTaxonomyIcon(input.categoryName);
    if (categoryIcon.recognized) {
      return { className: categoryIcon.className, accessibleLabel: categoryIcon.accessibleLabel };
    }
  }

  return directionIcon(input.direction);
}
