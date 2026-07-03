package com.gonezo.multiplatform.core;

import com.gonezo.taxonomy.domain.Category;

final class AndroidTaxonomyViewMapper {
  private AndroidTaxonomyViewMapper() {}

  static AndroidTaxonomyCore.TaxonomyCategoryView toCategoryView(Category category) {
    return new AndroidTaxonomyCore.TaxonomyCategoryView(
      category.getId().toString(),
      category.getName(),
      category.getAppliesTo().getValue(),
      category.getStatus().getValue()
    );
  }
}
