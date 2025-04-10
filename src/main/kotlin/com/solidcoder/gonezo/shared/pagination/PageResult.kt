package com.solidcoder.gonezo.shared.pagination

data class PageResult<T>(
    val content: List<T>,
    val totalElements: Long,
    val totalPages: Int,
    val page: Int,
    val size: Int
)
