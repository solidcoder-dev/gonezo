package com.gonezo.multiplatform.core;

import com.gonezo.taxonomy.domain.Category;
import com.gonezo.taxonomy.domain.CategoryWithUsage;

final class AndroidTaxonomyViewMapper {
  private AndroidTaxonomyViewMapper() {}

  static AndroidTaxonomyCore.TaxonomyCategoryView toCategoryView(CategoryWithUsage categoryWithUsage) {
    Category category = categoryWithUsage.getCategory();
    return new AndroidTaxonomyCore.TaxonomyCategoryView(
      category.getId().toString(),
      category.getName(),
      category.getAppliesTo().getValue(),
      category.getStatus().getValue(),
      categoryWithUsage.getUsageCount()
    );
  }
}
