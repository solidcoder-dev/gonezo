package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId

interface CategoryRepository {
  fun save(category: Category)

  fun findById(id: CategoryId): Category?

  fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category>

  fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category?

  fun listAll(): List<Category>
}
