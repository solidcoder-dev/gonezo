type TaxonomyComposerWorkspaceSlice = {
  transactionCategoryInput: string;
  categoryOptions: Array<{ id: string; name: string }>;
  transactionTagInput: string;
  tagOptions: Array<{ id: string; name: string }>;
  setTransactionCategoryInput: (value: string) => void;
  setTransactionTagInput: (value: string) => void;
};

export function useTaxonomyComposerWorkspace<T extends TaxonomyComposerWorkspaceSlice>(model: T) {
  return {
    state: {
      transactionCategoryInput: model.transactionCategoryInput,
      categoryOptions: model.categoryOptions,
      transactionTagInput: model.transactionTagInput,
      tagOptions: model.tagOptions,
    },
    actions: {
      setTransactionCategoryInput: model.setTransactionCategoryInput,
      setTransactionTagInput: model.setTransactionTagInput,
    },
  };
}
