package com.gonezo.taxonomy.domain

data class CategoryWithUsage(
  val category: Category,
  val usageCount: Long,
)
