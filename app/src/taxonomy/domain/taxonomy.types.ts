export type TaxonomyCategoryAppliesTo = 'income' | 'expense';

export type TaxonomyCategoryStatus = 'active' | 'archived';
export type TaxonomyTagStatus = 'active' | 'archived';

export type TaxonomyCategoryView = {
  id: string;
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
  status: TaxonomyCategoryStatus;
};

export type TaxonomyTagView = {
  id: string;
  name: string;
  status: TaxonomyTagStatus;
};
