package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TagId

sealed class TaxonomyApplicationException(message: String) : IllegalStateException(message)

class TaxonomyCategoryNotFound(categoryId: CategoryId) : TaxonomyApplicationException("Category not found: $categoryId")

class TaxonomyTagNotFound(tagId: TagId) : TaxonomyApplicationException("Tag not found: $tagId")
