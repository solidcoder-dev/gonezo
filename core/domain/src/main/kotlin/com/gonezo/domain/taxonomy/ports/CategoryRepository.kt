package com.gonezo.domain.taxonomy.ports

import com.gonezo.domain.taxonomy.Category
import com.gonezo.domain.taxonomy.CategoryAppliesTo
import com.gonezo.domain.taxonomy.CategoryId

interface CategoryRepository {
  fun save(category: Category)

  fun findById(id: CategoryId): Category?

  fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category>

  fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category?

  fun listAll(): List<Category>
}
